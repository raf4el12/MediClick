# SDD — Endurecimiento de integridad, seguridad y operación de MediClick

- **Estado:** P0, P1 y SDD-018 implementados; P2 restante (SDD-019 a SDD-023) y P3 pendiente (SDD-024)
- **Fecha:** 2026-08-30
- **Alcance:** backend, persistencia, workers, despliegue y gates de CI del flujo de citas
- **Prioridad:** corrección de P0 antes de ampliar funcionalidad
- **Fuentes de verdad:** [`CONTEXT.md`](../CONTEXT.md),
  [`APPOINTMENT-CORE.md`](./domain/APPOINTMENT-CORE.md), código, tests y
  [`schema.prisma`](../server/prisma/schema.prisma)

## 1. Resumen ejecutivo

La auditoría encontró fallos reproducibles de aislamiento entre sedes, autorización,
concurrencia entre pagos y cancelaciones, generación de agenda y arranque del contenedor de
producción. También encontró huecos estructurales: eventos críticos en memoria, jobs sin
coordinación entre réplicas, operaciones compuestas no atómicas y restricciones de base de
datos insuficientes.

Este diseño no propone doce parches independientes. Profundiza seis módulos para concentrar
las reglas y reducir las superficies donde pueden divergir:

1. **Acceso autorizado a datos asistenciales y financieros.**
2. **Conciliación atómica de estados asistencial y financiero.**
3. **Planificación y escritura transaccional de agenda.**
4. **Aceptación atómica de ofertas de lista de espera.**
5. **Entrega durable de eventos y ejecución idempotente de jobs.**
6. **Artefactos de despliegue reproducibles y gates de integración.**

Las correcciones de seguridad P0 no dependen de aprobar decisiones de producto. Las
preguntas abiertas registradas en el núcleo sí se mantienen explícitas y no se
normalizan silenciosamente.

## 2. Problemas confirmados

### 2.1 Fallos reproducidos

| ID | Prioridad | Caso | Resultado observado | Propiedad violada |
|---|---:|---|---|---|
| F-01 | P0 | Un médico solicita el expediente de un paciente ajeno a su sede | El agregado GraphQL devuelve historia, citas y notas sin alcance de sede | Aislamiento de sede y confidencialidad clínica |
| F-02 | P0 | Personal solicita el pago de una cita de otra sede | `role` llega indefinido porque el JWT expone `roleName`; se omite el control de paciente y el repositorio usa Prisma sin scope | Autorización por actor y sede |
| F-03 | P0 | Una cancelación ocurre entre la lectura y escritura de un webhook aprobado | El webhook usa el estado leído antes de la cancelación y revive la cita como `CONFIRMED` | Monotonicidad de cancelación y máquina de estados |
| F-04 | P0 | El job de expiración selecciona una reserva y el pago se aprueba antes del `updateMany` | La cita termina `CANCELLED` con pago `PAID` | Atomicidad entre elegibilidad y transición |
| F-05 | P0 | Se ejecuta la imagen backend construida para producción | Nest genera `dist/src/main.js`, pero Docker y `start:prod` ejecutan `dist/main.js` | Desplegabilidad |
| F-06 | P1 | Existe un feriado de sede B al generar agenda de un médico de sede A | El generador carga feriados de todas las sedes y elimina el día por fecha solamente | Aislamiento operativo de sede |
| F-07 | P1 | Un médico tiene dos reglas simultáneas para especialidades distintas | La identidad temporal omite `specialtyId`; solo se genera una especialidad | Identidad de agenda |
| F-08 | P1 | Falla la segunda escritura de un reemplazo masivo de disponibilidad | Las reglas anteriores quedan inactivas y queda una regla nueva parcial | Atomicidad de reemplazo |
| F-09 | P1 | Se amplía un bloqueo o feriado existente | Los flujos `update` no invalidan citas afectadas y la cancelación automática no marca revisión financiera | Consistencia posterior y reembolso |
| F-10 | P1 | Mercado Pago envía una firma mal formada | `timingSafeEqual` lanza `RangeError`; además el controlador puede seguir procesando una firma inválida y absorber fallos transitorios con HTTP 200 | Autenticidad y reintento de webhook |
| F-11 | P1 | Se inicializan permisos con los dos seeds disponibles | El permiso de paciente para actualizar citas difiere entre `seed.ts` y `seed-rbac.ts` | Política de acceso reproducible |
| F-12 | P1 | Se construye el cliente o se ejecuta `test:a11y` | `playwright.config.ts` importa `@playwright/test`, ausente en `package.json` | Build reproducible |
| F-13 | P1 | Dos reemplazos concurrentes de disponibilidad para el mismo médico y especialidad | `replaceForDoctorSpecialty` usa `pg_advisory_xact_lock` para ordenar, pero ambas transacciones siguen siendo `Serializable` completas; PostgreSQL puede abortar una con `P2034` y el código no reintenta — confirmado empíricamente en ~97% de 30 corridas aisladas | Disponibilidad de escritura bajo concurrencia real (el lock advisory ordena, no sustituye el reintento) |

### 2.2 Huecos de diseño con riesgo operativo alto

| ID | Prioridad | Hueco | Riesgo |
|---|---:|---|---|
| G-01 | P1 | La aceptación de una oferta reclama, crea la cita y luego actualiza precio/plazo/entrada/oferta en pasos separados | Cita pendiente sin plazo, oferta aceptada sin vínculo o entrada no cumplida |
| G-02 | P1 | El lock Redis de lista de espera usa valor constante y libera con `DEL` | Una ejecución puede liberar el lock renovado por otra |
| G-03 | P1 | Los tests de concurrencia usan dobles y no PostgreSQL real | Las garantías de `Serializable`, CAS y constraints no se comprueban en CI |
| G-04 | P2 | Eventos de liberación, cancelación y proyección FHIR viven en `EventEmitter` en memoria | Un crash pierde lista de espera, notificaciones o proyecciones |
| G-05 | P2 | Cada réplica ejecuta los cron jobs y recordatorios hacen seleccionar/enviar/marcar | Envíos duplicados y transiciones repetidas |
| G-06 | P2 | `gatewayId`, la identidad de agenda y las ofertas pendientes no tienen unicidad suficiente | La aplicación es la única barrera ante duplicados concurrentes |
| G-07 | P2 | Producción expone PostgreSQL/Redis, Redis no autentica, corre como root y usa `pnpm@latest` | Superficie de ataque y artefactos no reproducibles |
| G-08 | P2 | La configuración no falla al arrancar si faltan secretos de pagos o seguridad | El servicio acepta tráfico en un estado operacional inválido |

## 3. Objetivos y no objetivos

### 3.1 Objetivos

- Impedir lectura o mutación de datos clínicos y financieros fuera del alcance autorizado.
- Hacer linealizables las transiciones que compiten por una cita o un cupo.
- Mantener independientes, pero reconciliados, el estado asistencial y el estado financiero.
- Usar la base de datos como autoridad final; Redis coordina, pero no garantiza integridad.
- Entregar eventos críticos al menos una vez y hacer idempotentes sus consumidores.
- Probar las fronteras de sede, las carreras y las restricciones contra PostgreSQL real.
- Producir una imagen que arranque, migre y pueda verificarse antes de recibir tráfico.

### 3.2 No objetivos

- Automatizar reembolsos o cobros de penalización en Mercado Pago.
- Resolver las preguntas de producto abiertas del núcleo.
- Convertir FHIR en fuente de verdad; la decisión de ADR-0001 se conserva.
- Reescribir MediClick como microservicios.
- Cambiar el diseño visual del cliente.
- Corregir toda la deuda de lint como parte de un fix P0.

## 4. Invariantes obligatorias

### 4.1 Actor y sede

- La identidad y la sede se derivan del JWT y de relaciones persistidas, nunca de un DTO.
- Un paciente puede leer y operar sus propios datos entre sedes.
- El personal de sede solo ve y muta datos estrictos de su sede.
- Un rol global necesita además el permiso de la acción; ser global no reemplaza RBAC.
- En callbacks de `$transaction`, cada consulta sensible incluye `clinicId` explícito.
- Un recurso no visible responde como no encontrado para no permitir enumeración.

### 4.2 Cita y pago

- `AppointmentStatus` y `PaymentStatus` continúan como máquinas separadas.
- Un pago aprobado nunca cambia una cita `CANCELLED` a activa.
- Una expiración solo cancela si, en el instante de escribir, la cita sigue elegible.
- Un pago tardío de una cita cancelada conserva la cancelación y crea revisión financiera.
- `gatewayId` es idempotente por proveedor.

### 4.3 Capacidad y tiempo

- La identidad de una agenda incluye médico, especialidad, sede, fecha local e intervalo.
- Feriados y bloqueos se evalúan en la zona horaria de la sede afectada.
- Un feriado de sede no afecta otras sedes; uno global sí.
- Comprobar disponibilidad y ocupar/liberar capacidad pertenece a una sola frontera atómica.
- Reemplazar disponibilidad es todo o nada.

### 4.4 Efectos posteriores

- Toda operación que libera un cupo registra durablemente el evento en la misma transacción.
- Cada consumidor tolera redelivery sin duplicar el efecto.
- Cancelación automática y manual aplican la misma política financiera.
- Un fallo de notificación no revierte la transición de negocio, pero queda reintentable y visible.

## 5. Arquitectura objetivo

```text
REST / GraphQL / Cron / Webhook
              │
              ▼
     Casos de uso de aplicación
              │
     ┌────────┼───────────────────────────────┐
     ▼        ▼               ▼               ▼
Acceso     Conciliación    Agenda          Lista de espera
autorizado de pagos        transaccional   atómica
     │        │               │               │
     └────────┴───────────────┴───────────────┘
                          │
                 Prisma + PostgreSQL
                          │
                   Outbox transaccional
                          │
              Workers idempotentes con lease
                 │        │          │
              waitlist  mensajes   proyección FHIR
```

Se conserva la separación `application` / `domain` / `infrastructure` / `interfaces`. Los
servicios externos, como Mercado Pago, se inyectan mediante un port con adapter de producción y
adapter de prueba. No se añaden ports para dependencias que solo tendrían una implementación.

## 6. Diseño detallado

### 6.1 Acceso autorizado

#### 6.1.1 Contexto confiable de actor

Crear un tipo de aplicación común, construido exclusivamente desde la autenticación:

```ts
type ActorContext = {
  userId: number;
  roleName: RoleName;
  permissionNames: ReadonlySet<string>;
  clinicId: number | null;
  patientId: number | null;
  doctorId: number | null;
  isGlobal: boolean;
};
```

Los decorators dejan de entregar campos sueltos como `role`. El controller/resolver entrega un
`ActorContext` completo al caso de uso. `clinicId` recibido en DTO solo puede ser un criterio de
destino validado contra este contexto, no una fuente de autoridad.

#### 6.1.2 `PatientRecordQuery`

Interfaz externa del módulo:

```ts
execute(input: { actor: ActorContext; patientId: number }): Promise<PatientRecordView>
```

La implementación resuelve primero un `AuthorizedPatientRecordScope` y después ejecuta una
consulta ya limitada. No se carga un expediente global para filtrarlo en memoria.

| Actor | Scope permitido |
|---|---|
| Paciente | Su propio expediente, entre sedes |
| Médico de sede | Solo datos producidos en su sede y con relación asistencial válida |
| Otro personal | Solo con permiso explícito y únicamente la proyección necesaria de su sede |
| Administrador global | Todas las sedes, con permiso explícito y auditoría |

La relación asistencial del médico se demuestra mediante una cita con ese paciente y ese médico;
la relación no se infiere porque el paciente exista. Las notas, recetas, historia y citas incluidas
repiten el scope dentro de cada relación Prisma.

#### 6.1.3 `AppointmentAccessService`

Interfaz:

```ts
authorize(input: {
  actor: ActorContext;
  appointmentId: number;
  operation: AppointmentOperation;
}): Promise<AuthorizedAppointmentContext>
```

Devuelve la cita junto con `patientId`, `doctorId` y `clinicId` ya verificados. Pagos,
cancelación, reagendamiento, check-in y mutaciones posteriores consumen este contexto en vez de
reimplementar ownership.

Operaciones mínimas:

- Paciente: leer, pagar, cancelar o reagendar únicamente citas propias.
- Médico: operar únicamente citas propias dentro de su sede y según permiso.
- Personal de sede: operar citas de su sede y según permiso.
- Global: operar entre sedes y según permiso.

Los seeds RBAC se unifican en una sola fuente declarativa. `seed.ts` invoca esa fuente; no existe
una segunda matriz que pueda divergir. Permisos genéricos no sustituyen las comprobaciones de
ownership del caso de uso.

### 6.2 Conciliación de pagos y expiración

#### 6.2.1 Entrada segura del webhook

El adapter HTTP ejecuta, en orden:

1. Validar que el secreto requerido exista; producción no arranca sin él.
2. Parsear el header sin lanzar excepciones por entrada mal formada.
3. Comparar firmas solo si ambos buffers tienen la misma longitud.
4. Rechazar firma inválida sin ejecutar el caso de uso.
5. Consultar el pago al proveedor; el payload publicado no es autoridad.
6. Entregar un `VerifiedPaymentSnapshot` normalizado al reconciliador.

Respuestas:

- Firma o payload inválido: `400`/`401`, sin mutación.
- Evento válido ya procesado: `200`.
- Evento válido procesado: `200`.
- Dependencia temporal o fallo de persistencia: `5xx` para permitir reintento.

Un job de reconciliación consulta transacciones no terminales para cubrir notificaciones perdidas.
La metadata cruda se redacta y limita; no se persisten secretos ni PII innecesaria.

#### 6.2.2 `PaymentReconciliationService`

Interfaz:

```ts
reconcile(snapshot: VerifiedPaymentSnapshot): Promise<ReconciliationResult>
```

La implementación abre una transacción PostgreSQL y realiza:

1. Reclamo idempotente por `(provider, gatewayId)`.
2. Lectura de transacción y cita dentro de la misma transacción.
3. Transición financiera según el resultado verificado.
4. Transición asistencial condicional, sin usar un estado leído fuera de la transacción.
5. Creación de revisión financiera cuando ambas máquinas no pueden converger solas.
6. Escritura del evento de dominio en outbox.

Matriz mínima para un pago aprobado:

| Estado asistencial actual | Estado financiero actual | Resultado |
|---|---|---|
| `PENDING` | `PENDING`/`FAILED` | `CONFIRMED` + `PAID`; elimina `pendingUntil` |
| `CONFIRMED`/`IN_PROGRESS`/`COMPLETED`/`NO_SHOW` | no `PAID` | Conserva estado asistencial + `PAID` |
| `CANCELLED` | cualquiera no reembolsado | Conserva `CANCELLED` + `PAID` + revisión financiera |
| cualquiera | `PAID` con mismo `gatewayId` | No-op idempotente |
| cualquiera | gateway contradictorio | Conserva datos, registra conflicto y revisión financiera |

#### 6.2.3 Expiración condicional

`expireEligibleReservations(now)` usa una sola sentencia condicional equivalente a:

```sql
UPDATE appointments
SET status = 'CANCELLED'
WHERE status = 'PENDING'
  AND payment_status IN ('PENDING', 'FAILED')
  AND pending_until < :now
RETURNING ...;
```

Los eventos `appointment.expired` y `appointment.slot_released` se insertan en outbox dentro de
la misma transacción. Si un pago ganó la carrera y cambió el estado, el `UPDATE` afecta cero filas.
Si la expiración ganó y después llega el pago, el reconciliador conserva `CANCELLED` y abre
revisión financiera.

### 6.3 Agenda y restricciones

#### 6.3.1 `ScheduleGenerationPlanner`

Módulo puro, sin Prisma:

```ts
plan(input: GenerationInput): {
  desired: ScheduleCandidate[];
  skipped: GenerationRejection[];
}
```

`ScheduleCandidate` usa esta identidad:

```ts
type ScheduleKey = {
  doctorId: number;
  specialtyId: number;
  clinicId: number;
  localDate: string;
  timeFrom: string;
  timeTo: string;
};
```

Las dependencias se cargan antes de llamar al planner:

- disponibilidades del médico y especialidad solicitada;
- feriados globales o de la sede del médico, nunca de otras sedes;
- bloqueos del médico;
- citas existentes que impiden reemplazo.

El writer compara `desired` con lo persistido y aplica el reemplazo dentro de una transacción.
Un conflicto de unicidad se considera idempotencia o una carrera reintentable, no crea un
duplicado.

#### 6.3.2 Reemplazo masivo de disponibilidad

`replaceDoctorAvailability(command)` encierra en una única transacción:

1. Validar actor, médico, sede y especialidades.
2. Validar que todas las reglas sean coherentes entre sí.
3. Desactivar el conjunto anterior.
4. Crear el conjunto nuevo.
5. Registrar `availability.rules_replaced` en outbox.

No se inicia ninguna escritura si una regla del DTO es inválida. Un error de persistencia revierte
todo el conjunto.

#### 6.3.3 Crear y actualizar feriados o bloqueos

Ambos flujos producen `AvailabilityRestrictionChanged` con:

- tipo y `restrictionId`;
- sede o alcance global;
- médico si aplica;
- rango anterior y rango nuevo;
- `occurredAt` y `actorId`.

Para una actualización se evalúa la unión del rango anterior y nuevo. El consumidor vuelve a
comprobar las citas contra el estado final de la restricción, por lo que expandir, reducir o mover
un bloqueo no deja citas activas inválidas ni cancela por información obsoleta.

La cancelación resultante reutiliza un solo `AppointmentCancellationService`. Si la cita está
pagada, aplica los mismos flags de revisión financiera que una cancelación manual. Cada cupo
liberado produce evento durable para lista de espera.

### 6.4 Lista de espera

#### 6.4.1 Aceptación atómica

`AcceptWaitlistOfferUseCase` se reduce a una única operación de repositorio transaccional:

```ts
acceptOfferAtomically(input: {
  offerId: number;
  patientId: number;
  now: Date;
  paymentDeadline: Date;
}): Promise<AcceptedOffer>
```

Dentro de una transacción serializable:

1. Reclamar una oferta `PENDING`, no vencida y perteneciente al paciente.
2. Revalidar sede, cupo y solapamiento del médico y paciente.
3. Crear la cita con `amount` y `pendingUntil` completos.
4. Marcar la entrada `FULFILLED`.
5. Marcar la oferta `ACCEPTED` y vincular `createdAppointmentId`.
6. Insertar eventos de outbox.

No existe un estado visible donde la cita haya sido creada sin precio o plazo.

#### 6.4.2 Lock de coordinación

El lock Redis usa `SET key token NX PX ttl`, donde `token` es aleatorio por propietario. La
liberación ejecuta compare-and-delete mediante Lua. La corrección no depende del lock: constraints
y transición condicional de PostgreSQL siguen siendo la última barrera.

### 6.5 Outbox, consumidores y jobs

#### 6.5.1 Outbox transaccional

Modelo propuesto:

```prisma
model OutboxEvents {
  id            String   @id @default(uuid()) // eventId
  type          String
  schemaVersion Int
  aggregateType String
  aggregateId   String
  operationId   String
  clinicId      Int?
  payload       Json
  dedupeKey     String   @unique
  occurredAt    DateTime @default(now())
  availableAt   DateTime @default(now())
  publishedAt   DateTime?
  deadLetteredAt DateTime?
  attempts      Int      @default(0)
  lastError     String?
  lockedBy      String?
  lockedUntil   DateTime?

  @@index([publishedAt, availableAt])
  @@index([deadLetteredAt, lockedUntil])
  @@index([clinicId, occurredAt])
}
```

El worker reclama lotes con `FOR UPDATE SKIP LOCKED` dentro de una transacción corta, asigna
`lockedBy`/`lockedUntil`, incrementa intentos y hace commit antes de ejecutar I/O. Reintenta con
backoff y solo el owner vigente puede confirmar o reprogramar. Después de un umbral, marca
`deadLetteredAt`, mantiene el evento visible como dead letter y no lo elimina.

Los consumidores guardan una clave idempotente o se apoyan en una restricción de su efecto. La
entrega es **al menos una vez**. `EventEmitter` puede conservarse como mecanismo local no crítico,
pero no como única entrega para lista de espera, cancelaciones, mensajes ni proyección FHIR.

La outbox afecta una decisión transversal y cara de revertir.
[ADR-0002](./adr/0002-transactional-outbox.md) fue ratificado el 2026-08-31 preservando que Prisma
es fuente de verdad y FHIR una proyección, según ADR-0001. Define el envelope versionado,
deduplicación por operación, scope explícito de sede, leases cortos y el contrato idempotente de
consumidores que debe aplicar SDD-019.

#### 6.5.2 Jobs con lease e idempotencia

Cada ejecución obtiene un lease con `jobName`, ventana lógica, propietario y `leaseUntil`. Solo
una réplica procesa la ventana; un lease vencido puede recuperarse después de un crash.

Para recordatorios se crea una entrega con unicidad sobre cita, tipo, canal y ventana. El flujo es:

1. Reclamar la entrega.
2. Enviar con una clave idempotente.
3. Marcar éxito o fallo reintentable.

`reminderSent` deja de ser la única protección contra duplicados; puede mantenerse temporalmente
como campo de compatibilidad durante la migración.

### 6.6 Restricciones de persistencia

| Cambio | Propósito | Consideración de migración |
|---|---|---|
| `Transactions`: proveedor + `gatewayId` únicos cuando no es null | Idempotencia financiera | Detectar y reconciliar duplicados antes de crear índice parcial/compuesto |
| `Schedules`: unicidad por médico, especialidad, sede, fecha e intervalo | Evitar pérdida o duplicación entre especialidades | Normalizar fechas/horas y deduplicar filas sin citas primero |
| `WaitlistOffers.createdAppointmentId @unique` | Una cita no puede completar varias ofertas | Auditar vínculos existentes |
| Índice parcial de oferta `PENDING` por cupo | Una oferta exclusiva activa por cupo | SQL crudo porque Prisma no expresa el predicado |
| `OutboxEvents.dedupeKey @unique` | Un efecto de dominio por transición | Definir versión de esquema del payload |
| Entregas de notificación con clave única | Evitar recordatorios duplicados | Backfill solo para citas futuras |

No se hace `clinicId` obligatorio en todas las tablas dentro de este SDD. Primero se auditan los
nulls y se decide si médicos, agendas y citas sin sede son datos válidos o deuda histórica.

### 6.7 Despliegue y configuración

- Alinear `Dockerfile` y `start:prod` con la ruta real generada por Nest, y añadir un smoke test
  que arranque la imagen y consulte readiness.
- Fijar la versión de pnpm mediante `packageManager`; no usar `pnpm@latest`.
- Ejecutar como usuario sin privilegios y usar una imagen de runtime con solo dependencias de
  producción necesarias.
- Ejecutar `prisma migrate deploy` como paso único anterior al rollout, no en cada réplica web.
- No publicar puertos de PostgreSQL ni Redis en el compose de producción.
- Proteger Redis y restringirlo a la red interna; usar TLS si abandona esa red.
- Inyectar secretos de Mercado Pago y todos los secretos de autenticación desde un secret store.
- Validar configuración al arranque con esquema tipado: DB, JWT, Redis, mail, URL del cliente,
  proveedor de pagos y timezone por defecto.
- Añadir `@playwright/test` a devDependencies del cliente y verificar `build`, lint y a11y en CI.

## 7. Estrategia de migración y rollout

### Fase 0 — Contención inmediata

1. Corregir F-01 y F-02 con denegación segura y pruebas de matriz de acceso.
2. Corregir la firma del webhook para que una entrada inválida nunca se procese.
3. Alinear el entrypoint del backend y restaurar el build del cliente.
4. Añadir pruebas de regresión que fallen sobre el código anterior.

No requiere feature flag: mantener un bypass de seguridad durante rollout sería incorrecto.

### Fase 1 — Integridad financiera

1. Auditar duplicados de `gatewayId` y agregar constraint.
2. Introducir conciliador y expiración condicional.
3. Ejecutar pruebas de carrera contra PostgreSQL real.
4. Desplegar job de reconciliación y alertas de revisión financiera.

El schema nuevo se despliega primero de forma compatible; después el código empieza a usarlo.

### Fase 2 — Integridad de agenda

1. Introducir planner puro y corregir scope de feriados.
2. Hacer transaccional el reemplazo masivo.
3. Corregir actualizaciones de restricciones y paridad financiera.
4. Limpiar duplicados y activar unicidad de agenda.

### Fase 3 — Lista de espera y durabilidad

1. Ratificar ADR-0002 de outbox.
2. Hacer atómica la aceptación de ofertas.
3. Cambiar locks a tokens con compare-and-delete.
4. Migrar eventos críticos y consumidores a outbox.
5. Añadir leases e idempotencia a jobs.

### Fase 4 — Operación y calidad

1. Endurecer contenedores, redes y secretos.
2. Añadir gates de integración, imagen y migración a CI.
3. Reducir lint por módulos sin reescrituras masivas.
4. Añadir SLOs, dashboards y runbooks.

## 8. Estrategia de pruebas

### 8.1 Matriz tenant mínima

Cada acceso o mutación sensible incluye:

- paciente propietario entre sedes: permitido;
- paciente distinto: rechazado;
- personal de la misma sede y con permiso: permitido;
- personal de otra sede: rechazado;
- actor global con permiso: permitido;
- actor global sin permiso: rechazado;
- recurso con `clinicId = null`: política explícita, nunca fallback a acceso global.

### 8.2 Concurrencia con PostgreSQL real

Pruebas de integración con dos conexiones independientes y barreras controladas:

- pago aprobado contra cancelación;
- pago aprobado contra expiración;
- dos aceptaciones de la misma oferta;
- reserva directa contra aceptación de waitlist;
- dos generaciones de la misma agenda;
- dos réplicas reclamando el mismo lote de outbox o job.

Las aserciones verifican estado final, filas duplicadas, eventos emitidos y revisión financiera.
Los mocks permanecen para errores rápidos, pero no certifican concurrencia.

### 8.3 Tiempo y sede

- feriado global y feriado de otra sede;
- sede `America/Lima` y una sede con DST;
- límites de medianoche local;
- actualización que amplía, reduce o mueve un bloqueo;
- fecha local distinta de UTC.

### 8.4 Contratos externos

- firma válida, inválida, mal formada y secreta ausente;
- reintento del mismo webhook;
- proveedor temporalmente no disponible;
- pago tardío después de cancelación;
- respuesta contradictoria del proveedor.

### 8.5 Despliegue

CI debe construir la imagen, ejecutar migraciones sobre una base vacía, arrancar el contenedor,
esperar readiness y realizar una petición autenticada mínima. También debe comprobar una migración
sobre una copia de schema anterior con datos de prueba y ejecutar `client build` y `test:a11y`.

## 9. Observabilidad y operación

### 9.1 Logs estructurados

Campos comunes: `correlationId`, `eventId`, `actorId`, `clinicId`, `appointmentId`, `gatewayId`,
`jobName` y `attempt`. No registrar historias clínicas, tokens, firmas ni payloads financieros
crudos.

### 9.2 Métricas

- denegaciones por operación y sede;
- conciliaciones exitosas, idempotentes, contradictorias y fallidas;
- revisiones financieras abiertas y antigüedad;
- expiraciones y pagos tardíos;
- edad del evento outbox más antiguo, reintentos y dead letters;
- ofertas creadas, aceptadas, expiradas y conflictos de reclamo;
- duración y solapamiento de jobs;
- recordatorios duplicados evitados;
- fallos de migración, readiness y smoke test.

### 9.3 Alertas mínimas

- evento crítico en outbox sin publicar por más de cinco minutos;
- revisión financiera sin resolver por encima del SLA definido;
- crecimiento de firmas inválidas o errores 5xx del webhook;
- job crítico sin ejecución exitosa en dos ventanas;
- contenedor no ready después de migración;
- cualquier detección de acceso cruzado de sede.

## 10. Alternativas descartadas

| Alternativa | Motivo de descarte |
|---|---|
| Corregir solo `role` por `roleName` | Arregla un bypass puntual, pero deja ownership y sede dispersos en cada endpoint |
| Filtrar expedientes después de cargarlos | Los datos de otra sede ya cruzaron la frontera y es fácil omitir una relación anidada |
| Mantener lectura previa seguida de escritura | No protege contra cambios concurrentes entre ambas operaciones |
| Envolver la llamada a Mercado Pago en una transacción DB larga | Retiene locks durante I/O externo y aumenta bloqueos; primero se verifica fuera y luego se reconcilia el snapshot en una transacción corta |
| Usar Redis como única garantía de exclusión | Un timeout, failover o liberación ajena puede romperla; PostgreSQL sigue siendo la autoridad |
| Mantener solo `EventEmitter` con más `try/catch` | Un crash de proceso sigue perdiendo el evento |
| Añadir `clinicId` automáticamente a todo Prisma | Rompe los casos legítimos de paciente y global, y no se hereda en callbacks transaccionales |
| Corregir todo el lint antes de P0 | Mezcla cambios masivos con fixes de seguridad y dificulta revisión y rollback |

## 11. Decisiones de producto pendientes

Estas decisiones bloquean solo la parte indicada, no las correcciones P0:

1. ¿Se permite cancelar o reagendar desde `IN_PROGRESS` y `NO_SHOW`?
2. ¿Una cita `PENDING` administrativa puede hacer check-in, o debe distinguirse de una reserva
   en línea pendiente de pago?
3. ¿Toda cita creada desde waitlist requiere pago y el mismo plazo, o existen excepciones por
   sede/especialidad?
4. ¿Una cancelación causada por la clínica siempre inicia reembolso completo, incluso si existe
   una penalización previa?
5. ¿Qué roles no clínicos pueden ver cada proyección del expediente dentro de su sede?
6. ¿Los médicos, agendas y citas sin `clinicId` son válidos o deben migrarse para hacerlo
   obligatorio?

Una respuesta estable debe actualizar `APPOINTMENT-CORE.md`. Solo las decisiones caras de
revertir y con trade-offs no obvios justifican un ADR.

## 12. Backlog ejecutable con skills

Todas las tareas de comportamiento se desarrollan con caso permitido y frontera rechazada. Todo
diff que toque el núcleo termina con `$mediclick-core-review` antes de integrarse.

| ID | Prioridad | Tarea y criterio de aceptación | Skills principales |
|---|---:|---|---|
| SDD-001 | P0 | Encapsular `PatientRecordQuery`; ninguna relación anidada devuelve datos de otra sede y el paciente conserva acceso propio multi-sede | `$mediclick-tenant-safety` + `$tdd` + `$diagnosing-bugs` |
| SDD-002 | P0 | Introducir `ActorContext` y `AppointmentAccessService`; eliminar dependencia de campos JWT sueltos en pagos y mutaciones | `$mediclick-tenant-safety` + `$codebase-design` + `$tdd` |
| SDD-003 | P0 | Añadir tests PostgreSQL de acceso same-clinic/other-clinic/patient/global | `$mediclick-tenant-safety` + `$tdd` |
| SDD-004 | P0 | Implementar `PaymentReconciliationService`; una cancelación concurrente nunca se revive | `$mediclick-appointment-core` + `$codebase-design` + `$tdd` + `$diagnosing-bugs` |
| SDD-005 | P0 | Reemplazar expiración read-then-write por transición condicional; un pago concurrente produce uno de los dos resultados válidos | `$mediclick-appointment-core` + `$tdd` + `$diagnosing-bugs` |
| SDD-006 | P0 | Endurecer validación y respuestas del webhook; firma inválida tiene cero efectos y fallos transitorios retornan 5xx | `$mediclick-appointment-core` + `$tdd` |
| SDD-007 | P0 | Corregir entrypoint Docker/start, fijar pnpm y añadir smoke test de imagen y readiness | `$diagnosing-bugs` + `$tdd` |
| SDD-008 | P1 | Crear `ScheduleGenerationPlanner` con `specialtyId` y scope de feriados; dos especialidades simultáneas generan ambas | `$mediclick-appointment-core` + `$codebase-design` + `$tdd` |
| SDD-009 | P1 | Hacer atómico el reemplazo masivo de disponibilidad; cualquier fallo deja intacto el conjunto anterior | `$mediclick-appointment-core` + `$tdd` |
| SDD-010 ✅ | P1 | Unificar create/update de feriado y bloqueo mediante `AvailabilityRestrictionChanged`; evaluar rango anterior+nuevo | `$mediclick-appointment-core` + `$codebase-design` + `$tdd` |
| SDD-011 ✅ | P1 | Reutilizar cancelación para restricciones y aplicar revisión financiera a citas pagadas | `$mediclick-appointment-core` + `$tdd` |
| SDD-012 ✅ | P1 | Unificar seeds RBAC y añadir test que compara la matriz sembrada con la política declarada | `$mediclick-tenant-safety` + `$tdd` |
| SDD-013 ✅ | P1 | Hacer atómica la aceptación waitlist y agregar carreras contra reserva directa y doble aceptación | `$mediclick-appointment-core` + `$codebase-design` + `$tdd` + `$diagnosing-bugs` |
| SDD-014 ✅ | P1 | Cambiar locks waitlist a token + compare-and-delete; demostrar que un owner no libera lock ajeno | `$mediclick-appointment-core` + `$tdd` |
| SDD-015 ✅ | P1 | Auditar duplicados y agregar constraints de gateway, agenda y ofertas mediante migración segura | `$mediclick-appointment-core` + `$mediclick-tenant-safety` + `$tdd` |
| SDD-016 ✅ | P1 | Añadir harness PostgreSQL real a CI para aislamiento entre suites; corregir F-13 con reintento ante `P2034` en `replaceForDoctorSpecialty`, con test que reproduzca 30 reemplazos concurrentes sin fallos | `$tdd` + `$diagnosing-bugs` + `$mediclick-appointment-core` |
| SDD-017 ✅ | P1 | Restaurar build/a11y del cliente incorporando Playwright y su gate de CI | `$diagnosing-bugs` + `$tdd` |
| SDD-018 ✅ | P2 | Redactar ADR-0002 de outbox y contrato de entrega al menos una vez | `$domain-modeling` + `$codebase-design` |
| SDD-019 | P2 | Implementar outbox, worker con `SKIP LOCKED`, backoff y dead letters; migrar primero slot release y FHIR | `$mediclick-appointment-core` + `$codebase-design` + `$tdd` |
| SDD-020 | P2 | Añadir leases de jobs y entregas idempotentes para recordatorios | `$codebase-design` + `$tdd` + `$diagnosing-bugs` |
| SDD-021 | P2 | Validar configuración al arranque y endurecer usuario, red, Redis, secretos y migraciones de producción | `$diagnosing-bugs` + `$tdd` |
| SDD-022 | P2 | Añadir métricas, alertas y runbooks de conciliación, outbox, jobs y acceso tenant | `$mediclick-appointment-core` + `$mediclick-tenant-safety` |
| SDD-023 | P2 | Establecer presupuesto de lint por módulo y bloquear regresiones sin aplicar un fix masivo | `$code-review` |
| SDD-024 | P3 | Resolver las preguntas de producto y actualizar el núcleo/glosario solo donde cambie lenguaje canónico | `$domain-modeling` + `$mediclick-appointment-core` |

### Orden recomendado de ejecución

```text
SDD-001 ─┬─> SDD-003
SDD-002 ─┘

SDD-004 ─┬─> SDD-005 ─> SDD-015 ─> SDD-016
SDD-006 ─┘

SDD-008 ─> SDD-009 ─> SDD-010 ─> SDD-011

SDD-013 ─> SDD-014 ────────────────┐
SDD-018 ─> SDD-019 ─> SDD-020 ─────┼─> SDD-022
SDD-021 ────────────────────────────┘
```

## 13. Trazabilidad al código actual

| Hallazgo | Hotspots de partida |
|---|---|
| F-01 | `server/src/modules/patient-records-graphql/application/use-cases/get-patient-record.use-case.ts`, `infrastructure/persistence/prisma-patient-record.query.ts` |
| F-02 | `server/src/modules/payments/interfaces/controllers/payment.controller.ts`, `application/use-cases/get-payment-by-appointment.use-case.ts`, `infrastructure/persistence/prisma-transaction.repository.ts`, `server/src/modules/auth/infrastructure/strategies/jwt.strategy.ts` |
| F-03 | `server/src/modules/payments/application/use-cases/handle-payment-webhook.use-case.ts` |
| F-04 | `server/src/modules/appointments/application/use-cases/expire-pending-appointments.use-case.ts`, `infrastructure/persistence/prisma-appointment.repository.ts` |
| F-05 | `server/Dockerfile`, `server/package.json` |
| F-06/F-07 | `server/src/modules/schedules/application/use-cases/generate-schedules.use-case.ts`, `server/src/modules/holidays/infrastructure/persistence/prisma-holiday.repository.ts` |
| F-08 | `server/src/modules/availability/application/use-cases/bulk-save-availability.use-case.ts` |
| F-09 | `server/src/modules/holidays/application/use-cases/update-holiday.use-case.ts`, `server/src/modules/schedule-blocks/application/use-cases/update-schedule-block.use-case.ts`, `server/src/modules/appointments/application/listeners/availability-change.listener.ts` |
| F-10 | `server/src/modules/payments/interfaces/controllers/payment-webhook.controller.ts`, `infrastructure/gateways/mercadopago-gateway.service.ts` |
| F-11 | `server/prisma/seed.ts`, `server/prisma/seed-rbac.ts` |
| F-12 | `client/playwright.config.ts`, `client/package.json` |
| F-13 | `server/src/modules/availability/infrastructure/persistence/prisma-availability.repository.ts` (`replaceForDoctorSpecialty`), `server/src/modules/availability/infrastructure/persistence/prisma-availability.repository.integration.spec.ts` |
| G-01/G-02 | `server/src/modules/waitlist/application/use-cases/accept-offer.use-case.ts`, `application/services/waitlist-lock.service.ts` |
| G-04 | `server/src/shared/events/availability-events.interface.ts` y listeners de `appointments`, `waitlist` e `interoperability` |
| G-05 | `server/src/modules/scheduler/domain/services/appointment-reminder.service.ts`, `application/scheduler.module.ts` |
| G-06 | `server/prisma/schema.prisma` y migraciones Prisma |
| G-07/G-08 | `docker-compose.prod.yml`, `server/Dockerfile` y configuración de arranque del backend |

## 14. Definición de terminado

Una fase se considera terminada cuando:

- sus casos permitidos y fronteras rechazadas están cubiertos por tests;
- las carreras relevantes pasan repetidamente contra PostgreSQL real;
- no existe acceso cruzado de sede en callbacks transaccionales;
- los cambios de schema tienen auditoría previa, migración forward y estrategia de rollback;
- build backend, build cliente y smoke test de imagen pasan en CI;
- los eventos críticos son observables y reintentables;
- el diff del núcleo fue revisado con `$mediclick-core-review`;
- `CONTEXT.md`, `APPOINTMENT-CORE.md` y ADRs se actualizaron solo si cambió una decisión estable.
