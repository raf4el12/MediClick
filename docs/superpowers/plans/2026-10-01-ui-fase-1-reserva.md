# Fase 1 — Reserva unificada (UI-05 a UI-08): plan de implementación

> **Para agentes:** ejecutar un ítem por vez respetando dependencias. Cada ítem es una rama y un
> PR contra `staging`. Los pasos usan checkbox (`- [ ]`) para seguimiento.

**Objetivo:** reemplazar las dos implementaciones de reserva (`patient/book` del paciente y
`CreateAppointmentDialog` del personal) por un único flujo de reserva con dos modos —reserva en
línea y creación administrativa—, con un núcleo puro probado con Vitest, un calendario que solo
ofrece días con cupos y la estética de Materio v6.

**Arquitectura:** el backend extrae el cálculo de cupos a un módulo de dominio puro (que cuenta
todas las citas activas del médico y que UI-13 reutilizará) y agrega `GET /schedules/available-days`,
que lo aplica a un rango de fechas; `time-slots` pasa a usar el mismo módulo. En el cliente, `views/booking/model`
concentra estado, pasos, invalidación en cascada y armado del comando (§5.1 del SDD);
`useBooking(mode)` lo conecta a React Query y a los servicios REST; las pantallas de Materio
(custom inputs, wizard, datepicker) son adaptadores visuales sobre esa interfaz.

**Stack:** NestJS + Prisma + PostgreSQL (backend); Next.js 16, React 19, MUI 7, Materio v6.0.2,
Tailwind 4, TanStack Query 5, Zod 4, `react-datepicker@^7.6`, Vitest y Playwright + axe (cliente).

**Spec:** [`docs/SDD-migracion-ui-materio.md`](../../SDD-migracion-ui-materio.md) — §2, §5.1, §5.3,
§6 y filas UI-05 a UI-08 de §7. Decisiones D5–D10.

**Prerrequisitos:** UI-01, UI-02 y UI-03 integrados en `staging` antes de UI-06, UI-07 y UI-08.
UI-05 no depende de la base visual y puede avanzar en paralelo.

## Restricciones globales de la fase

- Cada ítem: `git fetch origin && git switch -c <tipo>/ui-NN-<tema> origin/staging`; PR contra
  `staging`. Nunca partir del `main` local.
- Vocabulario de [`CONTEXT.md`](../../../CONTEXT.md) en todo texto visible: **cupo** (no
  "horario", "slot" ni "turno"), **cita**, **reserva en línea**, **sede**, **especialidad**. Los
  identificadores de código pueden conservar `slot`/`schedule` por compatibilidad con la API.
- Fechas y horas en la **zona horaria de la sede** que devuelve el backend. Se elimina el
  fallback `'America/Lima'` del cliente y el símbolo `S/` fijo: el precio se muestra con la
  moneda de la sede (`Clinics.currency`).
- UI-05 corrige el cálculo de cupos para que respete la regla vigente de no solapamiento del
  médico entre especialidades y lo registra en `APPOINTMENT-CORE.md`; ninguna otra regla cambia.
  Si UI-06 propone una (p. ej. ofrecer sobrecupo o
  lista de espera dentro del flujo con reglas nuevas), se enumera en la spec del ítem y se
  actualiza `docs/domain/APPOINTMENT-CORE.md` en el mismo PR (D7).
- Reemplazo directo (D9): el PR de UI-08 borra las implementaciones anteriores.
- Verificación cliente: `pnpm exec tsc --noEmit`, `pnpm build`, eslint sobre archivos tocados,
  `pnpm test` (Vitest, UI-02) y `pnpm test:a11y`. Verificación servidor: `pnpm test -- <patrón>
  --runInBand` y `pnpm build`.

## Orden

```
UI-05 (backend) ───────────────────────────┐
UI-06 (prototipo) ──► UI-07 (núcleo, TDD) ──┴──► UI-08 (pantalla, reemplazo)
```

---

## UI-05 — Días con cupos por rango (backend)

**Rama:** `feat/ui-05-dias-con-cupos` · **PR:** contra `staging` · **Estado:** ✅

**Skills:** `mediclick-appointment-core` (leer `CONTEXT.md` y `APPOINTMENT-CORE.md` completos;
mismas reglas de feriado, bloqueo y anticipación en hora local de la sede), `mediclick-tenant-safety`
(paciente multi-sede; personal limitado a su sede), `tdd` y, al cierre, `mediclick-core-review`.

### Contrato

```
GET /schedules/available-days?doctorId=3&specialtyId=1&dateFrom=2026-10-01&dateTo=2026-11-30
@Auth() + @RequirePermissions('READ', 'SCHEDULES')   // PATIENT, DOCTOR, RECEPTIONIST y ADMIN ya lo tienen

200 {
  "doctorId": 3,
  "specialtyId": 1,
  "timezone": "America/Lima",
  "days": [ { "date": "2026-10-02", "availableCount": 7 }, ... ]   // solo días con ≥ 1 cupo, orden ascendente
}
400  dateFrom/dateTo mal formados, dateTo < dateFrom, rango > 62 días o especialidad sin duración
404  especialidad inexistente, o médico fuera de la sede del personal que consulta
```

- `dateFrom`/`dateTo` son días locales de la sede del médico, inclusive.
- Un día cuenta un cupo cuando `time-slots` lo devolvería con `available: true`: no pasado, no
  feriado global ni de la sede del médico, sin bloqueo `FULL_DAY`, sin solaparse con un bloqueo
  `TIME_RANGE` ni con **ninguna cita activa del médico, de cualquier especialidad**, y fuera de la
  ventana de 2 h si es hoy en la sede.
- **Corrección incluida:** hoy `time-slots` solo descuenta las citas de su propio bloque de agenda
  (`findByDoctorDateWithBookedSlots` incluye `schedule.appointments`), así que un cupo solapado con
  una cita de otra especialidad del mismo médico figura libre y la creación lo rechaza después
  (`APPOINTMENT-CORE.md`: "Un médico no tiene citas activas que se solapen en una misma fecha").
  **Decisión:** `time-slots` y `available-days` usan el mismo módulo de cálculo, que cuenta todas
  las citas activas del médico; UI-13 (`GET /agenda`) lo reutiliza.
- Un feriado de **otra** sede no excluye el día (F-06 del SDD de hardening).
- Alcance: `@CurrentClinic()` no nulo (personal de sede) exige que el médico pertenezca a esa
  sede; si no, 404 sin revelar existencia. `clinicId` nulo (paciente, admin global) no restringe.

### Task 1: Módulo de dominio de cupos y consultas por rango

**Files:**
- Create: `server/src/modules/schedules/domain/services/slot-availability.ts` (funciones puras, sin
  NestJS ni Prisma, para que UI-13 lo importe desde `GET /agenda`)
- Modify: `server/src/modules/schedules/domain/repositories/schedule.repository.ts`
- Modify: `server/src/modules/schedules/infrastructure/persistence/prisma-schedule.repository.ts`
- Modify: `server/src/modules/holidays/domain/repositories/holiday.repository.ts`
- Modify: `server/src/modules/holidays/infrastructure/persistence/prisma-holiday.repository.ts`
- Create: `server/src/modules/schedules/infrastructure/persistence/available-days-range.integration.spec.ts`

**Interfaces:**
- Produces: `computeSlots({ schedule: { id, timeFrom, timeTo }, durationMinutes, bufferMinutes,
  doctorBookings: { startTime, endTime }[], blocks: ScheduleBlockEntity[], minStartMsOfDay })
  : { scheduleId, startTime, endTime, available }[]`. `doctorBookings` son **todas** las citas
  activas del médico ese día, de cualquier especialidad.
- Produces: `IScheduleRepository.findByDoctorRange(doctorId, from: Date, to: Date, specialtyId)
  : Promise<ScheduleEntity[]>` (bloques de agenda del médico para la especialidad) y
  `IScheduleRepository.findDoctorBookingsInRange(doctorId, from: Date, to: Date)
  : Promise<{ scheduleDate: Date; startTime: Date; endTime: Date }[]>` (citas `deleted: false`
  y estado distinto de `CANCELLED`/`NO_SHOW` de cualquier bloque del médico). Reemplazan a
  `findByDoctorDateWithBookedSlots`, que se borra si no queda consumidor.
- Produces: `IHolidayRepository.findActiveInRangeForClinic(start: Date, end: Date, clinicId:
  number | null): Promise<HolidayEntity[]>` → feriados activos globales (`clinicId: null`) más los
  de esa sede. **No** reutilizar `findByDateRange`: hoy no filtra por sede.

- [ ] **Step 1:** `cd server && pnpm test -- get-available-time-slots --runInBand` → PASS (línea base).
- [ ] **Step 2 (rojo):** agregar a `get-available-time-slots.use-case.spec.ts` el caso "una cita de
  otra especialidad del mismo médico que se solapa deja el cupo no disponible" → FAIL.
- [ ] **Step 3 (verde):** mover `generateSlotsForSchedule` a `computeSlots`, alimentarlo con
  `findDoctorBookingsInRange` y hacer que `GetAvailableTimeSlotsUseCase` lo use → PASS, incluidas
  las pruebas existentes sin modificar.
- [ ] **Step 4:** escribir el integration spec (`RUN_DB_INTEGRATION=1`): límites inclusivos del
  rango, feriado de otra sede excluido, cita `CANCELLED` ausente y cita de otra especialidad
  presente en `findDoctorBookingsInRange`.
- [ ] **Step 5:** `cd server && RUN_DB_INTEGRATION=1 DATABASE_URL=... pnpm run test:integration -- available-days-range`
  → FAIL, implementar los métodos con días UTC (`utcDayRange`) → PASS. Sin base disponible, dejar
  constancia en el PR.

### Task 2: Caso de uso con TDD

**Files:**
- Create: `server/src/modules/schedules/application/dto/get-available-days-query.dto.ts`
- Create: `server/src/modules/schedules/application/dto/available-days-response.dto.ts`
- Create: `server/src/modules/schedules/application/use-cases/get-available-days.use-case.ts`
- Create: `server/src/modules/schedules/application/use-cases/get-available-days.use-case.spec.ts`
- Modify: `server/src/modules/schedules/application/schedules.module.ts`

**Interfaces:**
- Consumes: `TimezoneResolverService.resolveByDoctorId` / `resolveClinicIdByDoctorId`,
  `ISpecialtyRepository.findById`, los métodos de Task 1,
  `IScheduleBlockRepository.findActiveByDoctorAndDateRange`, `computeSlots`,
  `todayStartInTimezone`, `nowInTimezone`, `scheduleDateToLocalDay`, `MIN_BOOKING_ANTICIPATION_MS`.
- Produces: `GetAvailableDaysUseCase.execute(dto, actorClinicId: number | null)`.

Ciclo rojo → verde, una prueba por vez (dobles como en `get-available-time-slots.use-case.spec.ts`;
reloj fijo con `jest.useFakeTimers().setSystemTime(...)` para los casos de hoy):

- [ ] 1. Un bloque 08:00–10:00 con especialidad de 20 min y sin citas devuelve el día con `availableCount: 6`.
- [ ] 2. Un día con todos los cupos ocupados no aparece en `days`.
- [ ] 2b. Una cita activa de **otra especialidad** del mismo médico que se solapa descuenta ese cupo.
- [ ] 3. Feriado global excluye el día; feriado de la sede del médico lo excluye; feriado de otra sede no lo excluye.
- [ ] 4. Bloqueo `FULL_DAY` excluye el día; bloqueo `TIME_RANGE` solo descuenta los cupos solapados.
- [ ] 5. Hoy en la zona de la sede, los cupos que empiezan antes de ahora + 2 h no cuentan.
- [ ] 6. Días anteriores a hoy (zona de la sede) no aparecen aunque `dateFrom` sea pasado.
- [ ] 7. Paridad: para un mismo día y mismos dobles, `availableCount` es igual a la cantidad de cupos con `available: true` de `GetAvailableTimeSlotsUseCase`.
- [ ] 8. `dateTo < dateFrom` → `BadRequestException`; rango de 63 días → `BadRequestException`.
- [ ] 9. Especialidad inexistente → `NotFoundException`; sin duración → `BadRequestException`.
- [ ] 10. Personal de la sede 1 consultando un médico de la sede 2 → `NotFoundException`; `actorClinicId` nulo con el mismo médico → permitido (paciente multi-sede).

Comando del ciclo: `cd server && pnpm test -- get-available-days --runInBand` (FAIL → PASS por prueba).

### Task 3: Controlador

**Files:**
- Modify: `server/src/modules/schedules/interfaces/controllers/schedule.controller.ts`

- [ ] **Step 1:** agregar `@Get('available-days')` con `@Auth()`, `@RequirePermissions('READ', 'SCHEDULES')`,
  `@Query() GetAvailableDaysQueryDto` y `@CurrentClinic() clinicId`; documentar en Swagger.
- [ ] **Step 2:** `cd server && pnpm build` → OK.

### Task 4: Servicio del cliente

**Files:**
- Modify: `client/src/services/schedules.service.ts` (`getAvailableDays(params)`)
- Modify: `client/src/views/schedules/types/index.ts` (`AvailableDaysResponse`)

- [ ] **Step 1:** agregar el método y su tipo; `cd client && pnpm exec tsc --noEmit` → OK.

### Task 5: Verificación, documento del núcleo y revisión

**Files:**
- Modify: `docs/domain/APPOINTMENT-CORE.md`

- [ ] `cd server && pnpm test -- schedules --runInBand && pnpm test -- appointments --runInBand && pnpm build` → PASS.
- [ ] Registrar en `APPOINTMENT-CORE.md` (D7) que un cupo solo se ofrece libre si no se solapa con
  ninguna cita activa del médico en esa fecha, de cualquier especialidad, y que `time-slots`,
  `available-days` y la agenda comparten ese cálculo.
- [ ] Ejecutar `mediclick-core-review` sobre el diff (carriles: hora local de la sede, feriados y
  bloqueos, solapamiento del médico entre especialidades, alcance de sede, paciente multi-sede).
  Resolver hallazgos accionables.

---

## UI-06 — Prototipo del flujo de reserva

**Rama:** `prototype/ui-06-reserva` desde `origin/staging`. **No se mergea** (skill `prototype`,
regla 6): queda como fuente primaria. Las decisiones se integran por un PR de documentación.

**Skill:** `prototype`, rama **UI**, sub-forma **A**: variantes sobre rutas existentes —
`/patient/book?variant=A|B|C` (modo en línea) y el diálogo de `/appointments?variant=` (modo
administrativo)—, con barra flotante oculta en producción.

### Preguntas que debe responder

1. Estructura: wizard horizontal (checkout de Materio), página única con secciones progresivas,
   o wizard vertical en diálogo (`create-app` de Materio).
2. Orden en línea: ¿sede primero (como hoy) o especialidad primero con la sede como filtro?
   ¿Se ofrece "primer cupo disponible con cualquier médico"?
3. Selección de cupo: calendario mensual con días marcados + horas del día, o tira de próximos
   14 días + grilla de horas.
4. Modo administrativo: ¿diálogo o página? ¿Paciente al principio o al final?
5. Sin cupos: ¿se ofrece unirse a la lista de espera (`JoinWaitlistDialog`) y/o médicos alternativos?
6. ¿"Atrás" conserva las selecciones o las limpia (hoy las limpia)?
7. Móvil: acciones Atrás/Siguiente fijas sobre la barra inferior del portal del paciente.
8. Resumen: precio con moneda de la sede, plazo de pago y aviso de redirección a Mercado Pago.
9. ¿Se expone el sobrecupo en modo administrativo? (`POST /appointments/overbook` existe sin UI.)

### Datos falsos

Fixtures en memoria: 3 sedes con zona y moneda distintas (America/Lima PEN,
America/Bogota COP, America/Argentina/Buenos_Aires ARS), 6 especialidades con precio y duración,
5 médicos con rating, 30 días de cupos con un feriado, un bloqueo de medio día y un día lleno, y
10 pacientes para la búsqueda.

### Steps

- [ ] **Step 1:** crear la rama y anotar en el primer archivo: "Tres variantes del flujo de
  reserva, conmutables con `?variant=`, sobre `/patient/book` y el diálogo de `/appointments`".
- [ ] **Step 2:** crear `client/src/views/patient/book/prototype/{VariantA,VariantB,VariantC,PrototypeSwitcher}.tsx`
  y su equivalente para el diálogo; variantes estructuralmente distintas (no solo colores).
- [ ] **Step 3:** `cd client && pnpm dev` y compartir las URLs; recorrer con el usuario en
  escritorio y móvil, registrando la respuesta a cada pregunta.
- [ ] **Step 4:** commit y push de la rama del prototipo.
- [ ] **Step 5:** PR `docs/ui-06-decisiones` contra `staging` que complete la sección
  "Decisiones de UI-06" de este plan y la pregunta abierta 2 del SDD (§10).

**Criterio de cierre:** las 9 preguntas tienen respuesta, hay una variante elegida, y cada regla de
negocio nueva que surja está enumerada para UI-07/UI-08 (D7).

### Decisiones de UI-06

_Pendiente de completar al cerrar el prototipo._

---

## UI-07 — Núcleo del flujo de reserva (TDD)

**Rama:** `feat/ui-07-nucleo-reserva` · **PR:** contra `staging`

**Skills:** `tdd` (seams confirmados: las cuatro funciones de §5.1; ninguna prueba sobre
internos), `codebase-design` como referencia de vocabulario.

**Antes de empezar:** ajustar la lista de comportamientos con las decisiones de UI-06 (orden de
pasos, conducta de "Atrás", lista de espera).

**Files:**
- Create: `client/src/views/booking/model/types.ts`
- Create: `client/src/views/booking/model/bookingFlow.ts`
- Create: `client/src/views/booking/model/bookingFlow.test.ts` (convención de Vitest fijada en UI-02)

**Interfaces:**
- Produces (§5.1):

```ts
type BookingMode = 'online' | 'administrative';
type BookingStep = 'clinic' | 'specialty' | 'doctor' | 'slot' | 'patient' | 'review';
type BookingOption = { id: number; label: string; meta?: Record<string, unknown> };
type SlotOption = { scheduleId: number; startTime: string; endTime: string; available: boolean };
type BookingEvent =
  | { type: 'select'; field: 'clinic' | 'specialty' | 'doctor' | 'patient'; option: BookingOption }
  | { type: 'selectDay'; date: string }
  | { type: 'selectSlot'; slot: SlotOption }
  | { type: 'availableDaysLoaded'; timezone: string; days: string[] }
  | { type: 'presetResolved'; clinic?: BookingOption; specialty?: BookingOption; doctor?: BookingOption }
  | { type: 'setReason'; reason: string }
  | { type: 'next' } | { type: 'back' } | { type: 'slotTaken' } | { type: 'reset' };
type BookingPreset = { clinicId?: number; specialtyId?: number; doctorId?: number };
// Opción de médico: meta = { clinicId: number; specialtyIds: number[] } para validar el preset

initialBooking(mode, preset?: BookingPreset): BookingState   // guarda el preset pendiente de resolver
bookingReducer(state, event): BookingState
describeBooking(state): BookingView   // steps, activeStep, canAdvance, missing[], notice, summary
toBookingCommand(state): BookingCommand
// { mode: 'online', scheduleId, startTime, endTime, reason? }
// { mode: 'administrative', patientId, scheduleId, startTime, endTime, reason? }
```

Comportamientos, uno por ciclo rojo → verde (`cd client && pnpm test -- bookingFlow`):

- [ ] 1. `online` empieza en `clinic` con pasos `clinic, specialty, doctor, slot, review`.
- [ ] 2. `administrative` empieza en `specialty` con pasos `specialty, doctor, slot, patient, review` (la sede la fija el personal).
- [ ] 3. Elegir sede invalida especialidad, médico, día y cupo.
- [ ] 4. Elegir especialidad invalida médico, día y cupo, pero no el paciente.
- [ ] 5. Elegir médico invalida día, cupo y la zona horaria conocida.
- [ ] 6. Elegir día invalida el cupo.
- [ ] 7. Elegir un cupo con `available: false` no cambia el estado.
- [ ] 8. `select` no avanza; `next` avanza solo si el paso actual está completo (si no, `canAdvance` es `false` y `missing` nombra el dato).
- [ ] 9. `back` en el primer paso no hace nada; en los demás retrocede según la decisión de UI-06.
- [ ] 10. `availableDaysLoaded` fija la zona horaria de la sede y elige el primer día si no hay día elegido o el elegido ya no está disponible.
- [ ] 11. `slotTaken` limpia el cupo, vuelve al paso `slot` y expone `notice: 'slot-taken'`.
- [ ] 12. `setReason` rechaza más de 500 caracteres (límite de los DTO del servidor) y conserva el valor anterior.
- [ ] 13. `toBookingCommand` en línea arma `{ mode: 'online', scheduleId, startTime, endTime }` y omite `reason` si está en blanco.
- [ ] 14. `toBookingCommand` administrativo incluye `patientId`.
- [ ] 15. `toBookingCommand` con el estado incompleto lanza un error que nombra el dato faltante.
- [ ] 16. `describeBooking().summary` expone sede, especialidad, médico, fecha, cupo, precio y moneda tomados de las opciones elegidas (sin moneda fija).
- [ ] 17. `reset` vuelve a `initialBooking(mode)` sin preset.

Selecciones preestablecidas (las necesita UI-27, "Reservar con este médico"). El hook resuelve los
ids del preset contra los catálogos y despacha `presetResolved` con las opciones encontradas:

- [ ] 18. Preset completo y consistente (sede, especialidad y médico que atiende esa especialidad en esa sede) salta los pasos resueltos y deja activo `slot`.
- [ ] 19. Preset solo con `doctorId`: fija la sede del médico; si atiende una sola especialidad la fija y deja activo `slot`, si atiende varias deja activo `specialty`.
- [ ] 20. Preset inconsistente (médico de otra sede o que no atiende la especialidad) descarta el médico y todo lo que depende de él; el paso activo es el primero sin resolver.
- [ ] 21. Un id del preset que no aparece en los catálogos (opción ausente en `presetResolved`) se descarta sin error.
- [ ] 22. En modo `administrative` se ignora la sede del preset y se descarta un médico que no sea de la sede del personal.
- [ ] 23. Elegir manualmente otra opción después de resolver el preset aplica la invalidación en cascada normal.

- [ ] **Cierre:** `cd client && pnpm test && pnpm exec tsc --noEmit && pnpm exec eslint src/views/booking/model` → PASS.
  Este ítem no toca pantallas ni borra código.

---

## UI-08 — Pantalla de reserva en ambos modos

**Rama:** `feat/ui-08-pantalla-reserva` · **PR:** contra `staging`

**Skills:** `tdd` (seam: la pantalla vista por cada actor, con el arnés §5.3), `codebase-design`
para mantener `useBooking` como única interfaz de las pantallas.

### Componentes de Materio

Rutas de la v5 local (`/home/rafael/materio-mui-nextjs-admin-template-ts/full-version/src/`);
**confirmar cada una en `~/materio-v6/full-version/src/` antes de copiar**:

| Uso | Ruta en la plantilla |
|---|---|
| Tarjetas seleccionables de sede, especialidad, médico y cupo | `@core/components/custom-inputs/{Horizontal,Vertical,Image,types}.tsx` |
| Estructura del wizard y confirmación (modo en línea) | `views/pages/wizard-examples/checkout/index.tsx`, `StepConfirmation.tsx` |
| Wizard vertical en diálogo (modo administrativo, si UI-06 lo elige) | `components/dialogs/create-app/index.tsx` |
| Indicador de pasos | `components/stepper-dot/index.tsx`, `@core/styles/stepper.ts` |
| Calendario con días disponibles | `libs/styles/AppReactDatepicker.tsx` |
| Búsqueda de paciente | `@core/theme/overrides/autocomplete.tsx` (Autocomplete de MUI) |

### Files

- Modify: `client/package.json`, `client/pnpm-lock.yaml` → `pnpm add react-datepicker@^7.6`
  (verificar que la versión resuelta declare `react@^19` en `peerDependencies`).
- Create: `client/src/views/booking/useBooking.ts`
- Create: `client/src/views/booking/components/{BookingWizard,ClinicStep,SpecialtyStep,DoctorStep,SlotStep,PatientStep,ReviewStep}.tsx`
- Modify: `client/src/app/(patient)/patient/book/page.tsx` → `<BookingWizard mode="online" preset={...} />` con el preset leído de la query
- Modify: `client/src/middleware.ts` → `from` conserva `pathname + search`
- Modify: `client/src/views/appointments/index.tsx` → abre `BookingWizard` en modo `administrative`
- Modify: `client/src/views/payment/{Success,Pending,Failure}.tsx` → estética de `StepConfirmation`
  y vocabulario de `CONTEXT.md`; se conserva `usePaymentResult`.
- Delete: `client/src/views/patient/book/index.tsx`
- Delete: `client/src/views/appointments/components/CreateAppointmentDialog.tsx`
- Delete: `client/src/views/appointments/hooks/useAppointmentForm.ts`
- Delete: `client/src/views/appointments/functions/filterAvailableSlots.ts` (sus únicos consumidores son los dos anteriores)
- Delete: `createAppointmentThunk` de `client/src/redux-store/thunks/appointments.thunks.ts` si no
  queda consumidor; la tabla de citas se refresca invalidando sus queries.
- Create: `client/tests/e2e/booking-online.spec.ts`, `client/tests/e2e/booking-administrative.spec.ts`

### Interfaces

- Consumes: `bookingFlow` (UI-07); `GET /clinics`, `GET /specialties`, `GET /doctors?specialtyId&clinicId`,
  `GET /schedules/available-days` (UI-05), `GET /schedules/time-slots`, `GET /patients?searchValue`
  (≥ 2 caracteres, `pageSize: 10`), `POST /appointments/patient`, `POST /payments/preferences`,
  `POST /appointments`.
- Produces: `useBooking(mode) → { view, dispatch, options, submit }`; `submit()` devuelve
  `{ kind: 'redirect', url: initPoint }` (en línea) o `{ kind: 'created', appointment }`
  (administrativa). Ante 409 despacha `slotTaken` e invalida `['time-slots', doctorId, specialtyId, date]`.
- Especialidades del modo en línea: activas y globales o de la sede elegida (regla actual de `patient/book`).
- Preset por URL: `/patient/book?clinicId=&specialtyId=&doctorId=` se valida con Zod
  (`z.coerce.number().int().positive()` por campo; un valor inválido se ignora) y se pasa a
  `initialBooking('online', preset)`; tras cargar catálogos, el hook despacha `presetResolved`.
- `client/src/middleware.ts` hoy guarda en `from` solo el `pathname`: un paciente sin sesión que
  llega desde el perfil público con `?doctorId=` pierde el preset al iniciar sesión. Se conserva
  `pathname + search` en `from` (solo rutas relativas, para no abrir una redirección externa).

### Steps

- [ ] **Step 1 (rojo):** escribir `booking-online.spec.ts` con el arnés (`test.use({ actor: 'PATIENT' })`,
  proyectos de escritorio y móvil), escenarios:
  1. camino feliz: sede → especialidad → médico → día marcado → cupo → resumen con moneda de la
     sede → confirmar; se llaman `POST /appointments/patient` y `POST /payments/preferences` con el
     payload esperado y se navega al `initPoint` simulado;
  2. los días sin cupos no son seleccionables y un mes sin cupos muestra el estado vacío decidido en UI-06;
  3. un 409 al confirmar vuelve al paso de cupo con el aviso "El cupo elegido ya fue tomado" y
     vuelve a pedir `time-slots`;
  4. cambiar de médico después de elegir cupo limpia día y cupo;
  5. `/patient/book?doctorId=<médico con una especialidad>` abre directamente el paso de cupo con
     sede, especialidad y médico ya elegidos; con un `doctorId` inexistente o un `specialtyId` que
     el médico no atiende, el flujo empieza en el primer paso sin resolver;
  6. sin sesión (`test.use({ actor: null })`), `/patient/book?doctorId=5` redirige a
     `/login?from=%2Fpatient%2Fbook%3FdoctorId%3D5`;
  7. `expectAccessible(page)` en cada paso.
- [ ] **Step 2 (rojo):** escribir `booking-administrative.spec.ts` con `actor: 'RECEPTIONIST'`:
  camino feliz con búsqueda de paciente y `POST /appointments` con `patientId`; aviso de éxito y
  nueva petición `GET /appointments`; búsqueda sin resultados con mensaje accesible; diálogo sin
  violaciones de axe.
- [ ] **Step 3:** `cd client && pnpm exec playwright test tests/e2e/booking-*` → FAIL.
- [ ] **Step 4:** implementar `useBooking` y los pasos con los componentes de Materio; Tailwind
  solo para layout y espaciado, color y estado por el tema MUI.
- [ ] **Step 5:** conectar las dos entradas (página del paciente con preset por query y diálogo
  del personal), ajustar `from` en `middleware.ts` y reestilizar `payment/{Success,Pending,Failure}`.
- [ ] **Step 6:** repetir Step 3 → PASS.
- [ ] **Step 7:** borrar lo reemplazado y comprobar que no quedan referencias:
  `rg -n "CreateAppointmentDialog|useAppointmentForm|filterAvailableSlots|PatientBookView|createAppointmentThunk" client/src` → sin resultados.
- [ ] **Step 8:** revisar textos visibles: ninguno dice "horario", "slot", "turno" ni "S/".
- [ ] **Step 9:** `cd client && pnpm test && pnpm exec tsc --noEmit && pnpm build && pnpm exec eslint <archivos tocados> && pnpm test:a11y` → PASS.
