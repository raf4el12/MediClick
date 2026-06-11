# Auditoría — Huecos lógicos en horarios, citas y pacientes

> Resultado de la revisión de los módulos `appointments`, `schedules`, `availability`,
> `schedule-blocks`, `holidays`, `scheduler` y `payments`.  
> Fecha: junio 2026.

---

## Tablero de prioridades

| # | Hueco | Impacto | Esfuerzo | Prioridad |
|---|-------|---------|----------|-----------|
| 1 | TOCTOU en reserva de paciente (sin transacción) | Double-booking real | Bajo | ✅ Hecho |
| 2 | Overlap check por `scheduleId`, no por doctor+hora | Double-booking cruzado | Medio | ✅ Hecho |
| 3 | Cita PENDING+FAILED nunca expira (slot zombi) | Slot bloqueado para siempre | Bajo | ✅ Hecho |
| 4 | Reagendar no valida feriados, bloqueos, fecha, sede | Citas en días inválidos | Medio | ✅ Hecho |
| 5 | Bloqueo/feriado no cancela citas ya reservadas | Citas activas en días vetados | Medio | ✅ Hecho |
| 6 | Slots mostrados no filtran feriados/bloqueos/anticipación | Falsa disponibilidad al paciente | Bajo | ✅ Hecho |
| 7 | Duración del slot no se valida al reservar | Grilla desalineada, slots gigantes | Medio | 🟡 Medio |
| 8 | Reagendar no resetea `pendingUntil` ni `reminderSent` | Cita re-cancelada o sin recordatorio | Bajo | 🟡 Medio |
| 9 | Sobrecupo pisa slots libres y omite validaciones | Turno libre robado | Medio | 🟡 Medio |
| 10 | `overwrite` borra especialidades que no regenera | Pérdida de schedules | Bajo | 🟡 Medio |
| 11 | Liberación de slot ciega a waitlist en 3 de 4 flujos | Cupos no reoferecidos | Medio | 🟡 Medio |
| 12 | `NO_SHOW` inalcanzable desde la API | Reportes incorrectos | Bajo | 🟢 Bajo |
| 13 | `AvailabilityType` EXCEPTION/EXTRA no aplica | Excepciones de horario no funcionan | Medio | 🟢 Bajo |
| 14 | Paciente puede tener dos citas simultáneas | Conflicto de agenda del paciente | Bajo | 🟢 Bajo |
| 15 | `cancellationFee` se guarda pero nunca se cobra | Penalización inoperante | Medio | 🟢 Bajo |

---

## Fase 1 — Urgente: integridad de datos

### #1 · TOCTOU en la reserva del paciente ✅ Resuelto

> **Implementado (junio 2026):** `CreateAppointmentData` ahora acepta `amount`/`pendingUntil`
> opcionales; `createWithOverlapCheck` los escribe dentro de su transacción `Serializable`.
> El use-case del paciente dejó de hacer `hasOverlappingAppointment` + `create()` + `update()`
> por separado y ahora hace la reserva atómica en una sola transacción. Se eliminó la
> inyección de `PrismaService` del use-case. Tests del módulo en verde (31/31).

**Problema:** `create-patient-appointment.use-case.ts:139-177` ejecuta `hasOverlappingAppointment` y luego `create()` como dos llamadas separadas. Entre ambas, otro request puede tomar el mismo slot. El flujo de staff usa `createWithOverlapCheck` con transacción `Serializable`, pero no el flujo más concurrente.

**Fix:** reemplazar el bloque `[isHoliday, isBlocked, hasOverlap]` + `create()` por `createWithOverlapCheck` (ya existe en el repositorio). Mover la escritura de `amount`/`pendingUntil` al cuerpo de esa transacción o hacer un segundo `update` aceptable —lo crítico es que el create sea atómico con el overlap check.

**Archivos:**
- `server/src/modules/appointments/application/use-cases/create-patient-appointment.use-case.ts`
- `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts` — `createWithOverlapCheck`

---

### #2 · Overlap check por `scheduleId` permite double-booking cruzado ✅ Resuelto

> **Implementado (junio 2026):** nuevo helper privado `buildDoctorOverlapWhere(doctorId,
> scheduleDate, startTime, endTime, excludeId?)` en el repo, que filtra por relación
> `schedule.doctorId` + `scheduleDate` (rango de día UTC) en vez de por `scheduleId`.
> Lo usan `hasOverlappingAppointment`, `createWithOverlapCheck` y `rescheduleWithOverlapCheck`
> (cada uno lee `doctorId`/`scheduleDate` del schedule antes del count). Como `startTime`/
> `endTime` son hora-only (base 1970-01-01), acotar a doctor+día es lo que hace válido el
> overlap entre schedules distintos. La waitlist (`find-next-match`) se beneficia sin cambios.
> Tests en verde (62/62 en appointments+waitlist).

**Problema:** todos los overlap checks filtran `where: { scheduleId }`. Si un doctor queda con dos schedules solapados (caso real cuando se regeneran parcialmente por specialtyId), las citas de uno no ven las del otro. El doctor puede quedar con dos citas a la misma hora.

**Fix:** en `hasOverlappingAppointment` y en `createWithOverlapCheck`, agregar join a través de `schedule` para filtrar por `doctorId + startTime + endTime` además del `scheduleId`. El índice `@@index([scheduleId, startTime, endTime])` en `Appointments` se mantiene; agregar `@@index([doctorId, startTime, endTime])` mediante la relación o una vista.

**Archivos:**
- `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts` — `hasOverlappingAppointment`, `createWithOverlapCheck`
- `server/prisma/schema.prisma` — índice compuesto vía schedule

---

### #3 · Cita PENDING con pago FAILED nunca expira (slot zombi) ✅ Resuelto

> **Implementado (junio 2026):** el `where` del cron `expire-pending-appointments` pasó de
> `paymentStatus: 'PENDING'` a `paymentStatus: { in: ['PENDING', 'FAILED'] }`. Una cita con
> pago rechazado (PENDING/FAILED) cuya ventana `pendingUntil` venció ahora expira igual que
> una nunca pagada, respetando la ventana de reintento mientras `pendingUntil` no haya pasado.
> No toca PAID (ya pasó a CONFIRMED). Spec ampliado con caso de FAILED. Tests en verde (3/3).
>
> Pendiente relacionado: el cron sigue usando `updateMany` sin emitir `appointment.cancelled`
> → ver hueco #11 (la waitlist no se entera de estos slots liberados).

**Problema:** el webhook ante pago rechazado setea `paymentStatus: FAILED` dejando `status: PENDING`. El cron `expire-pending-appointments` exige `paymentStatus: PENDING`, así que esa cita nunca matchea y ocupa el slot indefinidamente (los overlap checks solo excluyen CANCELLED/NO_SHOW).

**Fix:** ampliar el `where` del cron para incluir `paymentStatus: { in: ['PENDING', 'FAILED'] }`, o cancelar directamente en el webhook cuando `status = FAILED` y la cita sigue `PENDING`.

**Archivos:**
- `server/src/modules/payments/application/use-cases/expire-pending-appointments.use-case.ts`
- `server/src/modules/payments/application/use-cases/handle-payment-webhook.use-case.ts`

---

## Fase 2 — Alto: validaciones faltantes en flujos existentes

### #4 · Reagendar no re-valida feriados, bloqueos, fecha pasada ni sede ✅ Resuelto

> **Implementado (junio 2026):** nuevo `AppointmentSlotValidatorService`
> (`application/services/`) que centraliza rango del turno, fecha pasada, anticipación
> de 2h, sede (`jwtClinicId`), feriado y bloqueo, y retorna el `clinicId` del doctor.
> Lo usan `reschedule` (el fix) y `create-appointment` (refactor, fuente canónica, sin
> duplicar reglas). El controller pasa `@CurrentClinic()` a reschedule. Specs: validador
> con su propio `.spec` (9 casos) + `reschedule.spec` mockea el validador y verifica la
> delegación. Suite completa en verde (200/200).
>
> ~~Deuda menor anotada: `create-patient-appointment` aún tiene su validación inline.~~
> **Saldada (junio 2026):** `create-patient-appointment` migrado al validador (sin
> `jwtClinicId`: el paciente reserva en cualquier sede; usa el `clinicId` retornado).
> Su spec pasó a verificar la delegación, igual que el de reschedule.

**Problema:** `reschedule-appointment.use-case.ts` solo valida que el slot quepa dentro del rango del schedule. No verifica fecha pasada, anticipación de 2 horas, feriados, bloqueos del doctor, ni que el nuevo schedule pertenezca al mismo doctor/especialidad/sede. Permite reagendar a ayer o a las vacaciones del doctor.

**Fix:** extraer las validaciones de `create-appointment.use-case.ts` a un helper compartido (`validateSlotPreConditions`) e invocarlo en reschedule con el nuevo schedule. El método ya recibe `jwtClinicId` —solo falta propagarlo.

**Archivos:**
- `server/src/modules/appointments/application/use-cases/reschedule-appointment.use-case.ts`
- `server/src/modules/appointments/application/use-cases/create-appointment.use-case.ts`

---

### #5 · Crear un bloqueo o feriado no cancela citas ya reservadas ✅ Resuelto

> **Implementado (junio 2026):** patrón por eventos para evitar ciclo de módulos
> (`appointments` ya importa `schedule-blocks`/`holidays`). `create-schedule-block`
> emite `schedule.blocked` y `create-holiday` emite `holiday.created` (interfaces en
> `shared/events/availability-events.interface.ts`). Un listener nuevo en
> `AppointmentsModule` (`AvailabilityChangeListener`) busca las citas activas afectadas
> (nuevos métodos repo `findActiveByDoctorAndDateRange` y `findActiveByDateAndClinic`),
> las cancela y emite `appointment.cancelled` por cada una → mail + reoferta a la
> waitlist. FULL_DAY cancela todo el día; TIME_RANGE filtra por solape horario; feriado
> por sede o global. Se expuso `clinicId` en `AppointmentWithRelations`. Tests: listener
> con `.spec` (5 casos). Suite 205/205.
>
> Alcance: cubre **create** de bloqueo y feriado. Un feriado **recurrente** emite un
> evento por cada año sembrado (no solo el del DTO), así también se cancelan citas ya
> reservadas en años futuros (spec de `create-holiday` lo cubre). Pendiente (extensión):
> `update-holiday` y `update-schedule-block` (si amplían rango), y el flag de refund para
> citas pagadas canceladas por causa de la clínica. El evento se emite solo si el paciente
> tiene `userId` (igual que la cancelación manual) → se generaliza con el hueco #11.
> Limitación conocida: una cita con `clinicId` null (doctor sin sede) no es alcanzada por
> un feriado de sede (el global sí la alcanza).

**Problema:** `create-schedule-block.use-case.ts` regenera solo schedules *sin citas*. Las citas ya confirmadas dentro del rango del bloqueo quedan vivas. Con feriados (`create-holiday`) ni siquiera se regeneran schedules. El personal tiene que cancelarlas manualmente una a una.

**Fix:** en la creación de bloqueos y feriados, buscar citas activas en el rango afectado, cancelarlas (con razón automática, p. ej. "Bloqueo de agenda") y emitir `appointment.cancelled` por cada una para activar la waitlist.

**Archivos:**
- `server/src/modules/schedule-blocks/application/use-cases/create-schedule-block.use-case.ts`
- `server/src/modules/holidays/application/use-cases/create-holiday.use-case.ts`
- `server/src/modules/holidays/application/use-cases/update-holiday.use-case.ts`

---

### #6 · Slots mostrados al paciente no filtran feriados, bloqueos ni anticipación — ✅ Hecho (junio 2026)

**Problema:** `get-available-time-slots.use-case.ts` solo cruza con citas existentes. El paciente ve slots "disponibles" en feriados, durante bloqueos del doctor y en la ventana de 2 horas (hoy). Al intentar reservar recibe el error, pero ya eligió un slot que nunca debió mostrarse.

**Fix aplicado:** `GetAvailableTimeSlotsUseCase.execute` ahora aplica las mismas reglas que el `AppointmentSlotValidatorService`:
1. Fecha pasada o feriado (`isHoliday` global o de la sede del doctor) → retorna `[]` (día sin atención).
2. Bloqueos vía `findActiveByDoctorAndDateRange`: FULL_DAY cubre todo el día; TIME_RANGE se cruza con `timeRangesOverlap`. Slots afectados quedan `available: false`, igual que los ocupados.
3. Para fecha = hoy (en la timezone de la sede), slots cuyo `startTime` cae dentro de la ventana de anticipación quedan `available: false`. La constante de 2 horas se extrajo a `MIN_BOOKING_ANTICIPATION_MS` en `date-time.utils.ts`, compartida con el validador para que el listado y la reserva nunca deriven.

Spec nuevo con 10 tests (feriado, bloqueo por rango, día completo, anticipación con fake timers, fecha pasada).

**Archivos:**
- `server/src/modules/schedules/application/use-cases/get-available-time-slots.use-case.ts` (+spec)
- `server/src/shared/utils/date-time.utils.ts` — `MIN_BOOKING_ANTICIPATION_MS`
- `server/src/modules/appointments/application/services/appointment-slot-validator.service.ts` — usa la constante compartida

---

## Fase 3 — Medio: robustez y consistencia

### #7 · La duración del slot no se valida al crear ni reagendar

**Problema:** `startTime`/`endTime` se aceptan si caben dentro del schedule, sin validar que sean múltiplos de `specialty.duration` ni que estén alineados con la grilla. Un cliente puede mandar `08:07-08:11` (desalinea la grilla) o `08:00-14:00` (bloquea el bloque completo).

**Fix:** en create y reschedule, recuperar `specialty.duration` y verificar que `endTime - startTime === duration` (o al menos que sea múltiplo). Opcional: validar alineación del slot contra la grilla calculada.

**Archivos:**
- `server/src/modules/appointments/application/use-cases/create-appointment.use-case.ts`
- `server/src/modules/appointments/application/use-cases/reschedule-appointment.use-case.ts`

---

### #8 · Reagendar deja `pendingUntil` y `reminderSent` en estado viejo

**Problema:** `reschedule` fuerza `status: PENDING` pero no actualiza `pendingUntil`. Si la cita tenía un deadline de pago viejo, el cron la cancela al minuto siguiente. Una cita pagada (CONFIRMED) reagendada vuelve a PENDING sin que nadie la re-confirme. `reminderSent = true` no se resetea, por lo que la cita en la nueva fecha no recibirá recordatorio.

**Fix:** en `rescheduleWithOverlapCheck`, agregar:
- `pendingUntil: new Date(Date.now() + paymentTimeoutMs)` si el nuevo estado es PENDING y hay pago pendiente; `null` si estaba pagada (conservar CONFIRMED).
- `reminderSent: false` siempre.
- Conservar `status: CONFIRMED` si la cita ya fue pagada.

**Archivos:**
- `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts` — `rescheduleWithOverlapCheck`
- `server/src/modules/appointments/application/use-cases/reschedule-appointment.use-case.ts`

---

### #9 · El sobrecupo puede pisar slots libres y no valida feriados/bloqueos

**Problema:** `create-overbook-appointment.use-case.ts:127-139` calcula `overbookStartTime` como el `endTime` de la última cita activa. Si hay slots regulares libres al final del turno, el sobrecupo los pisa. Además no valida feriados, bloqueos ni anticipación de 2 horas para citas de hoy. `createOverbookAtomic` solo verifica el contador diario, sin overlap check.

**Fix:**
1. Calcular `overbookStartTime` como `max(timeTo del schedule, maxEndTime de citas activas)` para que el sobrecupo siempre quede *después* del bloque normal.
2. Agregar validaciones de feriado, bloqueo y anticipación (igual que en create).
3. Dentro de `createOverbookAtomic`, agregar un overlap check igual al de `createWithOverlapCheck`.

**Archivos:**
- `server/src/modules/appointments/application/use-cases/create-overbook-appointment.use-case.ts`
- `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts` — `createOverbookAtomic`

---

### #10 · `overwrite` con filtro de especialidad borra schedules de otras especialidades

**Problema:** `generate-schedules.use-case.ts:175-181` llama `deleteUnbookedByDoctorAndDateRange` sin filtro de especialidad, pero si se pasó `dto.specialtyId`, solo se regeneran las availabilities de esa especialidad. Los schedules de las otras desaparecen.

**Fix:** pasar `specialtyId` a `deleteUnbookedByDoctorAndDateRange` (o directamente al query `deleteMany`) cuando se especifique en el DTO.

**Archivos:**
- `server/src/modules/schedules/application/use-cases/generate-schedules.use-case.ts`
- `server/src/modules/schedules/infrastructure/persistence/prisma-schedule.repository.ts` — `deleteUnbookedByDoctorAndDateRange`

---

### #11 · La waitlist queda ciega cuando un slot se libera por reschedule o expiración

**Problema:** `appointment.cancelled` solo se emite si `updated.patient.profile.userId` existe (`cancel-appointment.use-case.ts:112`). Reschedule no emite ningún evento (el slot viejo liberado nunca se reofrece). El cron de expiración usa `updateMany` y no puede emitir eventos.

**Fix:**
1. Quitar la condición `if (updated.patient.profile.userId)` del emit de `appointment.cancelled` — el evento debe emitirse siempre.
2. En reschedule: emitir `appointment.slot_released` (o `appointment.cancelled` con metadata) al cambiar de schedule.
3. En el cron de expiración: tras `updateMany`, consultar las citas expiradas y emitir `appointment.cancelled` por cada una, o cambiar a un loop de `update` individual.

**Archivos:**
- `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.ts`
- `server/src/modules/appointments/application/use-cases/reschedule-appointment.use-case.ts`
- `server/src/modules/payments/application/use-cases/expire-pending-appointments.use-case.ts`

---

## Fase 4 — Bajo: completitud y modelo de dominio

### #12 · `NO_SHOW` no tiene un use case que lo establezca

**Problema:** el enum tiene `NO_SHOW` y los queries lo excluyen correctamente, pero ningún use case de citas lo setea. Las citas a las que el paciente no asistió quedan CONFIRMED para siempre y distorsionan reportes de no-show y tasas de asistencia.

**Fix:** agregar `mark-no-show-appointment.use-case.ts` que solo permita el estado `CONFIRMED → NO_SHOW`. Invocarlo manualmente desde el dashboard del doctor al final de su turno, o automáticamente en un job tras X minutos del `startTime` sin check-in.

---

### #13 · `AvailabilityType` EXCEPTION y EXTRA no afectan la generación de schedules

**Problema:** `generate-schedules.use-case.ts:258-264` filtra availabilities solo por `dayOfWeek + isAvailable`. Una EXCEPTION con `isAvailable: false` no resta la regla REGULAR del mismo día — el tipo es cosmético. Tampoco es posible una disponibilidad de un solo día (`startDate >= endDate` rechazado en create).

**Fix:**
1. En la generación, resolver la regla final por día priorizando EXCEPTION sobre REGULAR (la EXCEPTION con `isAvailable: false` para ese día cancela la REGULAR).
2. Cambiar la validación en `create-availability.use-case.ts` de `>=` a `>` para permitir mismo día de inicio y fin.

**Archivos:**
- `server/src/modules/schedules/application/use-cases/generate-schedules.use-case.ts`
- `server/src/modules/availability/application/use-cases/create-availability.use-case.ts`

---

### #14 · Un paciente puede tener dos citas simultáneas con doctores distintos

**Problema:** no existe ningún check de solapamiento por `patientId`. Si el paciente reserva dos slots a la misma hora con doctores distintos (schedules distintos), ambos creates pasan.

**Fix:** en `createWithOverlapCheck` y `hasOverlappingAppointment`, agregar una verificación adicional: `where: { patientId, startTime: { lt: endTime }, endTime: { gt: startTime }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } }`.

**Archivos:**
- `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts`

---

### #15 · `cancellationFee` se calcula y guarda, pero no tiene flujo de cobro

**Problema:** `cancel-appointment.use-case.ts:94-98` calcula la penalización y la persiste en `cancellationFee`, pero no existe ninguna lógica que la cobre. Se aplica incluso si la cita nunca fue pagada (paciente sin tarjeta).

**Fix:** en la cancelación tardía de un paciente, si existe una transacción PAID, crear una transacción adicional de tipo "FEE" o aplicar una retención parcial vía MercadoPago. Si no hay pago previo, definir la política (¿deuda pendiente? ¿bloqueo del paciente?). Documentar antes de implementar.

---

## Convención de cierre por hueco

1. Use-case corregido con validación o lógica añadida.
2. Tests unitarios del use-case cubren el nuevo path (caso base + caso de error).
3. `pnpm tsc --noEmit` en client limpio si hay cambio de DTO/response.
4. Suite del módulo en verde (`pnpm jest <módulo>`).
5. Entrada en `mem_save` si la decisión de implementación es no obvia.
