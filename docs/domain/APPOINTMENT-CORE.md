# Núcleo de citas de MediClick

Este documento describe el comportamiento implementado que sostiene el negocio de reservas. El vocabulario canónico vive en [`CONTEXT.md`](../../CONTEXT.md); si ambos difieren, primero se resuelve el lenguaje y después se cambia el comportamiento.

## Propuesta central

El núcleo asigna capacidad asistencial concreta de una sede a un paciente sin permitir solapamientos, respetando la agenda local del médico y coordinando pago, lista de espera y atención clínica.

```text
Regla de disponibilidad
        ↓ genera
       Cupo ← feriado / bloqueo lo pueden invalidar
        ↓ asigna
       Cita ← pago confirma o expira la retención
        ↓ libera
Oferta de cupo → nueva cita desde lista de espera
        ↓ completa
Atención clínica → notas, receta, reseña e interoperabilidad
```

## Límites y relaciones

| Área | Responsabilidad en el flujo | Módulos principales |
|---|---|---|
| Demanda | Identificar al paciente que solicita atención | `patients`, `auth`, `users` |
| Oferta | Definir especialidad, médico y capacidad concreta | `doctors`, `specialties`, `availability`, `schedules` |
| Restricciones | Retirar capacidad por fecha o intervalo | `holidays`, `schedule-blocks` |
| Núcleo | Crear, mover y cerrar citas | `appointments` |
| Conversión | Confirmar una reserva en línea mediante pago | `payments` |
| Recuperación de capacidad | Ofrecer cupos liberados por orden de espera | `waitlist` |
| Atención posterior | Registrar el resultado clínico y sus proyecciones | `clinical-notes`, `prescriptions`, `medical-history`, `reviews`, `interoperability` |

Una sede es el límite operativo del personal y de la agenda. El paciente es deliberadamente multi-sede; no pertenece a una sede única.

## Flujos implementados

### Reserva en línea

1. El usuario autenticado se resuelve a un paciente.
2. La especialidad debe tener precio positivo.
3. El cupo debe pertenecer al rango del médico, durar exactamente lo configurado y estar alineado con duración más descanso.
4. La fecha se evalúa con la zona horaria de la sede: no puede estar en el pasado, a menos de dos horas si es hoy, en feriado ni dentro de un bloqueo.
5. La cita, el monto y el plazo de pago se crean junto con las verificaciones de solapamiento.
6. Un pago aprobado confirma la cita y elimina el plazo. Si el plazo vence con pago pendiente o fallido, la cita se cancela y el cupo se libera.

Fuentes: `create-patient-appointment.use-case.ts`, `appointment-slot-validator.service.ts`, `prisma-appointment.repository.ts`, `handle-payment-webhook.use-case.ts`.

### Creación por personal

El personal puede crear una cita para un paciente dentro de su sede. Aplica las mismas reglas del cupo y de solapamiento, pero la creación no asigna precio ni plazo de pago automáticamente. La cita nace pendiente.

Fuente: `create-appointment.use-case.ts`.

### Lista de espera

1. El paciente declara especialidad, médico opcional, sede derivada de la especialidad, rango de fechas y preferencia horaria.
2. Al liberarse un cupo, el matcher elige una entrada activa compatible por mayor prioridad y luego por mayor antigüedad.
3. Un lock por cupo evita ofertas paralelas. La oferta dura 15 minutos.
4. La aceptación reclama la oferta de forma atómica y crea una cita protegiéndola de una reserva directa concurrente.
5. Rechazar o dejar vencer una oferta permite ofrecer el cupo al siguiente candidato, pero no vuelve a ofrecer ese mismo cupo a quien ya lo descartó.

Fuentes: `waitlist.constants.ts`, `find-next-match.use-case.ts`, `accept-offer.use-case.ts`, `prisma-waitlist-entry.repository.ts`.

### Sobrecupo

Un sobrecupo se agrega después del final de la capacidad regular o de la última cita activa, lo que sea posterior. Respeta feriados, bloqueos, anticipación mínima, solapamientos del médico y del paciente, y el límite diario configurado para el médico.

Fuente: `create-overbook-appointment.use-case.ts`.

## Estados independientes

El estado asistencial de la cita y el estado financiero deben razonarse por separado.

```text
PENDING ──confirmación/pago──> CONFIRMED ──check-in──> IN_PROGRESS ──fin──> COMPLETED
   └──────── check-in ────────────────────────┘
CONFIRMED ──después del inicio──> NO_SHOW
cualquier estado salvo COMPLETED/CANCELLED ──cancelación──> CANCELLED
```

El código actual permite reagendar cualquier estado salvo `COMPLETED` y `CANCELLED`. Una cita pagada conserva su estado al reagendarse; una no pagada vuelve a `PENDING` solo si ya tenía un plazo de pago.

Los estados financieros son `PENDING`, `PAID`, `PARTIAL`, `REFUNDED`, `FAILED` y `CANCELLED`. Un pago tardío aprobado para una cita ya cancelada conserva la cita cancelada, marca el pago como pagado y requiere revisión financiera.

## Invariantes que un cambio debe preservar

### Capacidad y tiempo

- Un médico no tiene citas activas que se solapen en una misma fecha.
- Un paciente no tiene citas activas que se solapen, incluso con médicos distintos.
- `CANCELLED` y `NO_SHOW` dejan de ocupar capacidad para las comprobaciones de solapamiento.
- La duración del cupo coincide con la especialidad; la separación entre inicios incluye el descanso entre citas.
- La identidad de un cupo generado incluye médico, especialidad, sede, fecha e intervalo; dos especialidades pueden ofrecer el mismo intervalo sin eliminarse entre sí.
- Reemplazar la disponibilidad de una especialidad desactiva y crea su conjunto completo dentro de una transacción serializada por médico y especialidad; un fallo conserva las reglas anteriores y las otras especialidades del médico.
- Feriados, bloqueos y la anticipación mínima se evalúan con la fecha local de la sede.
- Al generar cupos, solo un feriado global o de la sede del médico bloquea la fecha; un feriado de otra sede no afecta su agenda.
- Crear o reagendar combina la comprobación de solapamiento y la escritura en una transacción serializable.

### Sedes y acceso

- Pacientes y administradores globales pueden operar entre sedes según sus permisos.
- Personal con sede solo opera sobre médicos y datos de esa sede.
- Un paciente solo puede consultar pagos, cancelar o reagendar sus propias citas; las transiciones asistenciales quedan reservadas al personal autorizado.
- Un médico solo opera citas asignadas a su propio perfil. Otro personal de sede solo opera citas de esa sede.
- El expediente asistencial expone al paciente su propio historial, al personal únicamente datos de su sede y al médico únicamente pacientes con citas asignadas a él en esa sede.
- Datos de catálogo globales son visibles junto con los específicos de la sede; datos asistenciales estrictos se filtran a la sede.
- Dentro de callbacks de transacción no existe filtrado automático por sede: cada lectura y escritura sensible debe llevar el alcance explícito.

### Pago y cancelación

- El resultado publicado por el proveedor se vuelve a consultar antes de aceptarse.
- El webhook rechaza firmas inválidas y devuelve error reintentable si falla la conciliación; solo responde éxito después de persistirla.
- `gatewayId` identifica de forma idempotente un pago ya procesado.
- Pago y cita se concilian en una transacción serializable: un pago aprobado solo confirma una cita todavía pendiente y nunca revive una cita cancelada.
- Una reserva en línea ocupa capacidad solo hasta su plazo de pago.
- La expiración reclama con una única escritura condicional solo reservas aún pendientes y devuelve exactamente los cupos que consiguió liberar.
- Una cancelación manual de una cita pagada queda marcada para reembolso manual.
- Si el paciente cancela una cita pagada con menos de 24 horas, la penalización actual es 50 % del precio de la especialidad y también requiere conciliación manual.

### Liberación de cupos

- Cancelar, reagendar a otro cupo o expirar una reserva emite `appointment.slot_released`.
- La liberación del cupo no depende de que el paciente tenga usuario o email.
- La lista de espera vuelve a comprobar que el cupo siga libre antes de ofrecerlo y antes de crear la cita aceptada.

## Preguntas de dominio abiertas detectadas

Estas conductas existen en el código, pero su intención de negocio no está resuelta. Un cambio relacionado debe mostrarlas al responsable del producto en lugar de normalizarlas silenciosamente.

1. **Cancelación y reagendamiento tardíos**: ambos están permitidos desde `IN_PROGRESS` y `NO_SHOW` porque solo se bloquean `COMPLETED` y `CANCELLED`.
2. **Check-in sin confirmación**: `PENDING` puede pasar directamente a `IN_PROGRESS`; el estado no distingue una cita administrativa pendiente de una reserva en línea aún no pagada.
3. **Aceptación de oferta no completamente atómica**: la cita de lista de espera se crea primero y el precio/plazo se actualizan después; un fallo intermedio puede dejar una cita pendiente sin vencimiento.
4. **Cancelación por feriado o bloqueo**: el listener cancela y notifica, pero no marca la transacción pagada para reembolso como sí hace la cancelación manual.

## Matriz mínima de impacto

| Si cambia… | Revisar además… |
|---|---|
| creación o reagendamiento | validador de cupo, repositorio transaccional, cupos disponibles, eventos de liberación |
| estados de cita | pagos, recordatorios, lista de espera, notas/recetas, reseñas, reportes e interoperabilidad |
| disponibilidad, feriados o bloqueos | generación de cupos, citas existentes, notificaciones y reembolsos |
| pagos o plazos | expiración, webhook, idempotencia, cita confirmada y revisión financiera |
| lista de espera | locks, ranking, expiraciones, aceptación concurrente y creación de cita |
| `clinicId` o sede | guard, interceptor, cliente Prisma tenant-aware y callbacks transaccionales |

## Verificación

Ejecutar primero los tests de los casos de uso modificados. Para cambios transversales del núcleo, ejecutar desde `server/`:

```bash
pnpm test -- appointments --runInBand
pnpm test -- waitlist --runInBand
pnpm test -- payments --runInBand
pnpm build
```

Añadir pruebas explícitas para la transición de estado, el actor, la sede, la zona horaria y cualquier carrera concurrente afectada.
