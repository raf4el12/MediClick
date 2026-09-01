# ADR-0002 — Outbox transaccional para efectos críticos

- **Estado:** Aceptado
- **Fecha:** 2026-08-31
- **Decisores:** Equipo MediClick

## Contexto

MediClick confirma, cancela, expira y reagenda citas en PostgreSQL, pero hoy publica varios
efectos posteriores mediante `EventEmitter2` después del commit. Un crash en esa ventana puede
perder la liberación enviada a lista de espera, una notificación o una proyección FHIR. Reintentar
el comando de negocio tampoco garantiza recuperar el evento: la transición puede haber quedado
persistida y ya no volver a ser elegible.

La entrega durable afecta citas, pagos, lista de espera, mensajes e interoperabilidad. Es difícil
de revertir una vez que los productores y consumidores dependan del envelope, y exige decidir
explícitamente entre consistencia, duplicados, orden y complejidad operacional.

## Decisión

Se adopta una **outbox transaccional en el mismo PostgreSQL y la misma transacción Prisma que la
mutación de negocio**. PostgreSQL sigue siendo la fuente de verdad. El FHIR Resource Store sigue
siendo una proyección reconstruible, de acuerdo con [ADR-0001](./0001-fhir-resource-store.md).

La garantía es **entrega al menos una vez**:

- si la transacción de negocio revierte, no existe evento;
- si hace commit, el evento queda durable antes de responder éxito;
- un evento puede entregarse más de una vez por crash, timeout o lease vencido;
- un consumidor debe tolerar redelivery sin repetir su efecto;
- no se promete orden global ni por agregado. El consumidor rehidrata el estado vigente o, si su
  efecto depende de secuencia, el contrato del tipo incluye una versión monotónica y el consumidor
  conserva su propio checkpoint.

`EventEmitter2` puede permanecer para telemetría o efectos locales prescindibles. No puede ser la
única entrega de un efecto crítico ni ejecutarse en paralelo con la ruta durable para el mismo
consumidor.

## Contrato del evento

Todo evento durable usa un envelope común. Las fechas del payload se serializan como ISO-8601;
no se persisten instancias `Date` ni tipos específicos de Prisma/NestJS.

```ts
interface DurableDomainEvent<Payload extends Record<string, unknown>> {
  eventId: string;          // UUID, identidad estable de esta ocurrencia
  type: string;             // p. ej. appointment.slot_released
  schemaVersion: number;    // versión del payload para este type
  aggregateType: string;    // appointment, patient, waitlist_offer...
  aggregateId: string;
  operationId: string;      // identidad del comando/transición que lo produjo
  clinicId: number | null;
  occurredAt: string;
  payload: Payload;
}
```

Reglas del envelope:

1. `eventId` y el contenido son inmutables después del insert.
2. `operationId` se genera antes de abrir la transacción y se reutiliza durante reintentos de
   serialización. Para webhooks puede ser la identidad verificada del proveedor.
3. La clave de deduplicación es
   `<type>:v<schemaVersion>:<aggregateType>:<aggregateId>:<operationId>` y tiene unicidad en base
   de datos. No se usa solo `aggregateId`, porque una cita puede liberar más de un cupo durante
   varios reagendamientos legítimos.
   Reinsertar la misma clave y el mismo contenido es un no-op; reutilizarla con contenido distinto
   es un conflicto de contrato y hace fallar la transacción.
4. Un reintento HTTP con un nuevo `operationId` solo registra otro evento si la transición
   condicional volvió a cambiar estado. Un no-op no publica.
5. `clinicId` se deriva de la entidad o relación persistida, nunca de un DTO. Es información de
   routing y auditoría, no una concesión de acceso.
6. `clinicId = null` solo se permite cuando el contrato del tipo declara alcance global,
   multi-sede o histórico desconocido. Un consumidor jamás interpreta `null` como permiso global;
   aplica la relación persistida o la política explícita de ese tipo.
7. El payload contiene identificadores y datos mínimos necesarios. No contiene tokens, firmas,
   secretos, historias clínicas ni respuestas financieras crudas. El consumidor rehidrata desde
   PostgreSQL con scope explícito cuando necesita más información.
8. Cambiar significado o forma incompatible incrementa `schemaVersion`. El worker no marca como
   publicado un tipo o versión sin handler conocido.

Los contratos TypeScript versionados viven junto a los eventos compartidos. El schema persistido
es el envelope serializado; no se acopla a entidades de dominio ni a modelos Prisma.

## Módulo y seams

La outbox es un módulo profundo con dos interfaces pequeñas:

- **Productor transaccional:** `record(event)` solo dentro del contexto de transacción que también
  persiste la mutación. El adapter Prisma recibe el cliente transaccional internamente; Prisma no
  entra al dominio ni se expone a los casos de uso.
- **Worker:** reclamar un lote, confirmar publicación o reprogramar/dead-letter. El worker oculta
  `SKIP LOCKED`, leases, backoff, intentos y ownership a los handlers.

No se admite una llamada global `record()` después de que el repositorio haya hecho commit. Cuando
una operación compuesta ya vive dentro de un método atómico de repositorio, ese mismo método
inserta el evento. Cuando cruza varios repositorios, un coordinador transaccional liga los adapters
al mismo contexto opaco.

Para la primera migración, la frontera atómica incluye:

- cancelación: estado de cita, flags de revisión financiera y eventos de cancelación/liberación;
- expiración: reclamo condicional de cada reserva y su evento de liberación;
- reagendamiento: cambio de cupo y evento del cupo anterior;
- confirmación por pago: conciliación financiera/asistencial y evento de confirmación;
- paciente: creación, actualización o soft delete y su evento de proyección.

Que hoy algunas de estas escrituras vivan en repositorios distintos no reduce la frontera: SDD-019
debe unirlas bajo la misma transacción antes de retirar su `emit` posterior al commit.

El seam observable para pruebas es la operación de negocio: estado y evento aparecen juntos o no
aparece ninguno. Los tests del worker prueban reclamo single-winner, lease vencido, redelivery,
backoff y dead letter; no prueban detalles privados de las consultas.

## Persistencia y reclamo

La tabla de outbox conserva como mínimo el envelope, `dedupeKey`, `availableAt`, `attempts`,
`publishedAt`, `deadLetteredAt`, `lastError`, `lockedBy` y `lockedUntil`. Los eventos no se borran
al fallar; una política de retención podrá archivar únicamente eventos publicados antiguos.

Cada iteración del worker:

1. abre una transacción corta;
2. selecciona eventos disponibles mediante `FOR UPDATE SKIP LOCKED`;
3. asigna `lockedBy` y `lockedUntil`, e incrementa `attempts`;
4. hace commit antes de ejecutar handlers o I/O externo;
5. ejecuta los handlers conocidos;
6. marca `publishedAt` si todos terminan, o calcula `availableAt` con backoff y guarda un error
   redactado;
7. después del máximo configurable de intentos, marca `deadLetteredAt` y alerta sin eliminar la
   fila.

Solo el propietario vigente puede confirmar o reprogramar el evento. Si el proceso muere, otro
worker puede reclamarlo cuando venza `lockedUntil`. No se mantiene una transacción PostgreSQL
abierta durante email, FHIR u otro I/O.

Un replay manual conserva `eventId`, `dedupeKey` y payload originales, limpia el estado de dead
letter y vuelve a programar `availableAt`; no crea un evento nuevo para ocultar el historial de
fallos.

## Contrato de consumidores

Cada handler tiene un nombre estable y cumple una de estas estrategias dentro de su propia
transacción:

- registra recepción con unicidad `(consumerName, eventId)` junto con su efecto;
- usa una restricción única sobre el efecto derivado;
- aplica una escritura idempotente y versionada, como el `upsert` de un recurso FHIR con ID
  determinista.

Los consumidores vuelven a lanzar fallos reintentables; no los absorben después de escribir un
log. Un error de datos permanente también queda visible como dead letter. Para un proveedor
externo se envía `<consumerName>:<eventId>` como clave idempotente cuando el proveedor lo soporte.
Si no lo soporta, la semántica al menos una vez implica que un duplicado externo sigue siendo
posible y debe medirse.

Los workers no ejecutan dentro de un request y no reciben el cliente tenant-aware. Toda lectura o
escritura clínica incluye `clinicId` explícito o deriva el alcance desde el agregado persistido. El
paciente continúa siendo multi-sede; no se añade un filtro de sede global a eventos de paciente.

Un ID FHIR determinista evita crear dos recursos lógicos, pero no hace idempotente el historial:
el servicio actual incrementa `versionId` en cada `save`. Antes de conectar la proyección a la
outbox, el adapter FHIR debe aplicar el recibo `(consumerName, eventId)`, el recurso, Provenance y
sus filas de historial en una sola transacción. Reentregar el mismo `eventId` será un no-op; un
evento posterior sí creará una versión nueva.

## Alcance de migración

SDD-019 implementará primero:

1. `appointment.slot_released` hacia el matcher de lista de espera;
2. `appointment.confirmed` y `appointment.cancelled` hacia la proyección FHIR Encounter;
3. `patient.created`, `patient.updated` y `patient.deleted` hacia la proyección FHIR Patient.

Las restricciones de ofertas pendientes sostienen la idempotencia de waitlist. La proyección FHIR
necesita además el recibo transaccional descrito arriba; sus IDs deterministas no bastan porque el
historial es append-only. Antes de retirar cada listener en memoria se agrega su handler durable y
una prueba de redelivery. Email y notificaciones se migran después con una identidad de entrega
propia; hasta entonces pueden seguir locales, pero no se registran como entregados por la outbox.

El rollout es compatible: primero schema y worker apagado, luego escritura dual durable sin
consumo, después handlers y backfill/reconciliación, y finalmente retiro de la ruta en memoria para
ese consumidor. Nunca se habilitan dos rutas activas hacia el mismo efecto.

## Consecuencias

### Positivas

- La mutación de negocio y la obligación de ejecutar sus efectos no pueden divergir por un crash.
- PostgreSQL sigue siendo la única autoridad de integridad; no se introduce un broker obligatorio.
- Los fallos quedan reintentables, medibles y recuperables mediante dead letters.
- El contrato versionado desacopla productores de implementaciones FHIR, waitlist y mensajería.

### Costos y riesgos

- Todos los consumidores críticos deben ser idempotentes; asumir entrega exactamente una vez sería
  incorrecto.
- Aumentan schema, almacenamiento, métricas, runbooks y disciplina de evolución de payloads.
- No existe orden de entrega; un consumidor sensible a secuencia necesita versión monotónica y
  checkpoint propios, no puede inferir orden por `occurredAt`.
- Un handler que absorbe errores o un payload con PII puede invalidar las garantías aun cuando el
  worker funcione correctamente.
- Sin monitoreo de edad, reintentos y dead letters, la durabilidad solo convierte pérdidas
  silenciosas en retrasos silenciosos; SDD-022 debe hacerlos operables.

## Alternativas consideradas

| Alternativa | Motivo de descarte |
|---|---|
| Mantener `EventEmitter2` con reintentos | El proceso puede morir después del commit y antes del emit; no queda obligación durable que reintentar. |
| Publicar directamente en Redis o un broker dentro del caso de uso | No existe commit atómico entre PostgreSQL y el broker; reaparece la escritura dual. |
| Kafka/RabbitMQ como fuente de eventos desde ahora | Añade infraestructura y operación innecesarias para el monolito; la outbox permite incorporar un broker después sin cambiar a productores. |
| Entrega exactamente una vez | No puede garantizarse de extremo a extremo frente a crash e I/O externo; la promesa ocultaría duplicados reales. |
| Mantener locks de filas durante el handler | Retiene conexiones y locks durante I/O, degrada el negocio y dificulta recuperación; se usa lease persistido. |
| Guardar entidades completas en el payload | Duplica PII y modelos internos, dificulta versionado y convierte la outbox en otra fuente de verdad. |
