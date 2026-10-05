# UI Fase 3 — Jornada del médico (UI-13 a UI-16)

> **Para agentes:** cada ítem se implementa en su propia rama y PR. Los pasos usan checkboxes (`- [ ]`) para seguimiento. Skills de mattpocock en el orden indicado por ítem; las skills del repo (`.agents/skills/mediclick-*`) son obligatorias en los ítems de backend.

**Goal:** Que el médico recorra su jornada y su agenda en una sola superficie Materio — indicadores, citas del día, agenda semanal/mensual sobre FullCalendar, espacio de atención y reagendamiento por arrastre — alimentada por un único endpoint de agenda con alcance de sede.

**Arquitectura:** `GET /agenda` (módulo nuevo `server/src/modules/agenda`) es un módulo profundo de solo lectura: resuelve el alcance del actor, carga en una pasada cupos, citas, bloqueos de agenda y feriados que afectan a la agenda, calcula la disponibilidad de cada cupo y los indicadores, y devuelve todo en hora local de la sede. En el cliente, la capa de agenda (`client/src/views/agenda`) expone `useAgenda`, `toAgendaEvents` y `resolveDropTarget`; FullCalendar es solo un adaptador visual sobre ella.

**Stack:** NestJS 11 + Prisma/PostgreSQL + Jest (servidor); Next.js 16 + React 19 + MUI 7 + Tailwind 4 + `@fullcalendar/*@6.1.21` + React Query + Vitest + Playwright (cliente).

**Spec:** [`docs/SDD-migracion-ui-materio.md`](../../SDD-migracion-ui-materio.md) §5.2 (capa de agenda), §6 (restricciones globales), §7 (UI-13 a UI-16). Base visual: [ADR-0003](../../adr/0003-materio-v6-sistema-de-diseno.md).

## Restricciones globales

- Rama por ítem: `git fetch origin && git switch -c <tipo>/ui-NN-<tema> origin/staging`; PR contra `staging`.
- Vocabulario de [`CONTEXT.md`](../../../CONTEXT.md): agenda, jornada, cupo, cita, bloqueo de agenda, feriado. Ningún texto visible dice "slot", "turno" ni "evento".
- Horas siempre en la zona horaria de la sede, nunca en la del navegador ni del servidor. En servidor, `shared/utils/date-time.utils.ts`; en cliente, la agenda viaja como fecha local (`YYYY-MM-DD`) + hora (`HH:mm`) más `timezone`.
- Estado asistencial y estado de pago se razonan por separado; la agenda los muestra, no los cambia.
- `GET /agenda` es solo lectura: no cambia ninguna regla del núcleo. Si un prototipo pide cambiar una regla (D7), se enumera en la spec del ítem y se actualiza [`APPOINTMENT-CORE.md`](../../domain/APPOINTMENT-CORE.md) en el mismo PR.
- Verificación por PR: servidor `pnpm test -- <patrón> --runInBand`, `pnpm build`, `pnpm exec eslint <archivos>` (nunca `pnpm lint`, que aplica `--fix` a todo); cliente `pnpm test` (Vitest), `pnpm exec tsc --noEmit`, `pnpm exec eslint <archivos>`, `pnpm build`, `pnpm test:a11y`.
- Prerrequisitos de fase: UI-02 (Vitest + arnés Playwright `client/tests/support`) y UI-03 (grupos de rutas `(staff)`/`(patient)` y `navigationFor`). Las rutas del cliente se citan ya movidas a `app/(staff)/…`; hoy viven en `app/(menu)/…`.
- Rutas de Materio citadas desde la v5 local (`/home/rafael/materio-mui-nextjs-admin-template-ts/full-version/src/…`): **confirmar en `~/materio-v6/` antes de copiar**.

---

## UI-13 — `GET /agenda` por rango con alcance de sede e indicadores del médico

**Rama:** `feat/ui-13-agenda-endpoint` · **Skills:** `mediclick-appointment-core` → `mediclick-tenant-safety` → `codebase-design` → `tdd` → `mediclick-core-review`

### Contrato

```
GET /agenda?doctorId=12&from=2026-10-05&to=2026-10-11
GET /agenda?clinicId=3&from=2026-10-05&to=2026-10-05
```

| Regla | Detalle |
|---|---|
| Alcance | Exactamente uno de `doctorId` o `clinicId`; ambos o ninguno → 400 |
| Fechas | `from`/`to` en `YYYY-MM-DD`, interpretadas como fechas locales de la sede; `from ≤ to` |
| Límite de rango | Alcance médico ≤ 42 días (vista mensual de 6 semanas); alcance sede ≤ 7 días → 400 si se excede |
| Permiso | Subject nuevo `AGENDA`: `@RequirePermissions('READ', 'AGENDA')` |

Respuesta (`AgendaResponseDto`):

```ts
{
  timezone: string;                       // IANA de la sede
  range: { from: string; to: string };
  doctors: { id: number; fullName: string; specialties: { id: number; name: string }[] }[];
  cupos: { scheduleId: number; doctorId: number; specialtyId: number;
           date: string; startTime: string; endTime: string; available: boolean }[];
  appointments: { id: number; scheduleId: number; doctorId: number; specialtyId: number;
                  date: string; startTime: string; endTime: string;
                  status: AppointmentStatus; paymentStatus: string;
                  isOverbook: boolean; isAtRisk: boolean;
                  patient: { id: number; fullName: string } }[];   // sin email ni teléfono
  blocks: { id: number; doctorId: number; type: 'FULL_DAY' | 'TIME_RANGE';
            startDate: string; endDate: string; timeFrom: string | null; timeTo: string | null;
            reason: string }[];
  holidays: { id: number; date: string; name: string; scope: 'GLOBAL' | 'CLINIC' }[];
  indicators: { totalCupos: number; bookedCupos: number; occupancyRate: number;
                byStatus: Record<AppointmentStatus, number>; atRisk: number;
                pendingPayment: number };
}
```

### Alcance por actor

| Actor | Permitido | Rechazado |
|---|---|---|
| `DOCTOR` | `doctorId` omitido o igual a su perfil (se resuelve con `findDoctorIdByUserId`) | `doctorId` de otro médico → 404 "Médico no encontrado"; `clinicId` → 403; usuario sin perfil de médico → 403 |
| `RECEPTIONIST`/`ADMIN` con sede | `clinicId` omitido o igual al suyo; `doctorId` de un médico de su sede | médico u otra sede → 404; sin sede asignada → 403 |
| `SUPER_ADMIN` / `ADMIN` sin sede | cualquier `doctorId` o `clinicId` existente | sin parámetro de alcance → 400 |
| `PATIENT` | — | 403 en el guard (no tiene `READ:AGENDA`) |

Decisión: un subject `AGENDA` en lugar de reutilizar `READ:SCHEDULE_BLOCKS` o conceder `READ:HOLIDAYS` al médico. La agenda agrega nombres de pacientes y restricciones; reutilizar un permiso de bloqueos abriría esos datos a cualquier rol custom con lectura de bloqueos, y `READ:HOLIDAYS` daría al médico el listado completo de feriados de su sede para administrar, que no necesita. Los feriados que afectan su agenda llegan dentro de la respuesta.

### Reglas del cálculo

- **Feriados:** solo globales (`clinicId: null`) o de la sede del alcance. El repositorio aplica el predicado explícito, porque `Holidays` es catálogo y con `clinicId` nulo (SUPER_ADMIN) el cliente tenant-aware no filtra; `IHolidayRepository.findByDateRange` actual no filtra por sede y no se usa.
- **Cupos:** se generan por cada `Schedules` del rango con `TimeSlotCalculatorService` (duración + descanso de la especialidad). Un cupo está disponible si no se solapa con ninguna cita activa **del médico en esa fecha, de cualquier especialidad** (invariante "un médico no tiene citas activas que se solapen"), no cae en un bloqueo ni en un feriado y respeta la anticipación mínima de 2 h para hoy. `CANCELLED` y `NO_SHOW` no ocupan.
- **Citas:** todas las no borradas del rango, con cualquier estado (el cliente filtra); `NO_SHOW` y `CANCELLED` se devuelven para la vista histórica pero no cuentan como ocupación.
- **Indicadores:** se calculan sobre la respuesta, no con otra consulta: `occupancyRate = bookedCupos / totalCupos` (0 si no hay cupos), `byStatus` por estado asistencial, `atRisk` por `isAtRisk`, `pendingPayment` por `paymentStatus = PENDING` con plazo de pago.

### Task 1: Cálculo de cupos compartido

**Files:**
- Create: `server/src/modules/schedules/domain/services/cupo-availability.service.ts`
- Create: `server/src/modules/schedules/domain/services/cupo-availability.service.spec.ts`
- Modify: `server/src/modules/schedules/application/use-cases/get-available-time-slots.use-case.ts`

**Interfaces:**
- Consumes: `TimeSlotCalculatorService.generate`, `timeRangesOverlap`, `toMinutesUTC` de `shared/utils/date-time.utils.ts`.
- Produces: `CupoAvailabilityService.forSchedule(schedule, { durationMinutes, bufferMinutes, bookedIntervals, blocks, minStartMsOfDay }): CupoAvailability[]` — función pura, sin I/O.

- [ ] **Step 1: Coordinar con UI-05.** Si UI-05 ya extrajo este cálculo a un servicio de dominio, reutilizarlo y saltar a Task 2. Si no, este ítem hace la extracción y UI-05 la reutiliza.
- [ ] **Step 2: Escribir los tests rojos** del servicio puro: cupo libre; cupo solapado con cita de la misma especialidad; cupo solapado con cita de **otra** especialidad del mismo médico (se marca no disponible); bloqueo `FULL_DAY`; bloqueo `TIME_RANGE` parcial; anticipación de 2 h en el día actual; cita `CANCELLED` no ocupa.
- [ ] **Step 3: Run** `cd server && pnpm test -- cupo-availability --runInBand` — Expected: FAIL (módulo inexistente).
- [ ] **Step 4: Mover `generateSlotsForSchedule`** de `GetAvailableTimeSlotsUseCase` al servicio y hacer que el caso de uso lo llame sin cambiar su respuesta. El caso de uso sigue pasando solo las citas del propio schedule; ampliar `time-slots` a las demás especialidades es una decisión de UI-05, no de este ítem.
- [ ] **Step 5: Run** `cd server && pnpm test -- cupo-availability schedules --runInBand` — Expected: PASS, sin cambios en los tests existentes de `time-slots`.

### Task 2: Subject `AGENDA` en la matriz RBAC

**Files:**
- Modify: `server/src/shared/domain/enums/permission.enum.ts`
- Modify: `server/prisma/rbac-policy.ts`
- Modify: `server/src/shared/domain/enums/rbac-policy.spec.ts`
- Modify: `client/src/views/roles/permissionsMeta.ts`

**Interfaces:**
- Produces: `PermissionSubject.AGENDA`; `READ:AGENDA` para `DOCTOR` y `RECEPTIONIST` (admins por `MANAGE:ALL`); `PATIENT` sin acceso.

- [ ] **Step 1: Test rojo** en `rbac-policy.spec.ts`: `DOCTOR` y `RECEPTIONIST` incluyen `READ:AGENDA`; `PATIENT` no.
- [ ] **Step 2: Run** `cd server && pnpm test -- rbac-policy --runInBand` — Expected: FAIL.
- [ ] **Step 3: Agregar el subject** al enum y a la matriz; agregar etiqueta "Agenda" e ícono `ri-calendar-schedule-line` en `permissionsMeta.ts`.
- [ ] **Step 4: Run** `cd server && pnpm test -- rbac-policy permissions.guard --runInBand` — Expected: PASS.
- [ ] **Step 5: Sincronizar permisos en una base local** con `cd server && npx ts-node prisma/seed-rbac.ts` (upsert; no usar `seed.ts`, que limpia la base). Expected: el log lista `READ:AGENDA`.

### Task 3: Política de alcance (pura)

**Files:**
- Create: `server/src/modules/agenda/domain/services/agenda-scope.policy.ts`
- Create: `server/src/modules/agenda/domain/services/agenda-scope.policy.spec.ts`

**Interfaces:**
- Consumes: `AuthenticatedUser` (`roleName`, `clinicId`, `id`), query validada, `resolveDoctor(doctorId) → { id, clinicId } | null`, `resolveOwnDoctorId(userId) → number | null`.
- Produces: `AgendaScope = { kind: 'doctor'; doctorId; clinicId } | { kind: 'clinic'; clinicId }` o excepción Nest (400/403/404).

- [ ] **Step 1: Tests rojos tabla-driven** con cada fila de la tabla "Alcance por actor" (permitido y rechazado), incluido SUPER_ADMIN con `clinicId: null` pidiendo un médico de la sede 2 → alcance `{ doctor, clinicId: 2 }`.
- [ ] **Step 2: Run** `cd server && pnpm test -- agenda-scope --runInBand` — Expected: FAIL.
- [ ] **Step 3: Implementar** siguiendo la forma de `shared/access/appointment-access.policy.ts` (global = SUPER_ADMIN o ADMIN sin sede; fuera de alcance → 404 para no revelar existencia).
- [ ] **Step 4: Run** el mismo comando — Expected: PASS.

### Task 4: Repositorio de lectura y caso de uso

**Files:**
- Create: `server/src/modules/agenda/domain/repositories/agenda-read.repository.ts`
- Create: `server/src/modules/agenda/infrastructure/persistence/prisma-agenda-read.repository.ts`
- Create: `server/src/modules/agenda/domain/services/agenda-indicators.ts` (+ `.spec.ts`)
- Create: `server/src/modules/agenda/application/dto/agenda-query.dto.ts`
- Create: `server/src/modules/agenda/application/dto/agenda-response.dto.ts`
- Create: `server/src/modules/agenda/application/use-cases/get-agenda.use-case.ts` (+ `.spec.ts`)
- Create: `server/src/modules/agenda/application/agenda.module.ts`
- Create: `server/src/modules/agenda/interfaces/controllers/agenda.controller.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `AgendaScope` (Task 3), `CupoAvailabilityService` (Task 1), `nowInTimezone`, `todayStartInTimezone`, `scheduleDateToLocalDay`, `MIN_BOOKING_ANTICIPATION_MS`, `dateToTimeString`.
- Produces: `IAgendaReadRepository.load(scope, fromUtcDay, toUtcDay): AgendaRows` (schedules con especialidad, citas activas e históricas, bloqueos activos, feriados globales + de la sede, timezone); `GetAgendaUseCase.execute(actor, query): AgendaResponseDto`; `GET /agenda`.

- [ ] **Step 1: Tests rojos del caso de uso** con repositorio en memoria:
  - feriado de otra sede no aparece y no anula cupos;
  - feriado global y de la propia sede aparecen y anulan los cupos de ese día;
  - cupo solapado con cita de otra especialidad del mismo médico → `available: false`;
  - cita `NO_SHOW` se devuelve pero no ocupa;
  - rango de 43 días en alcance médico y de 8 días en alcance sede → 400;
  - SUPER_ADMIN con `clinicId: null` recibe solo feriados globales y de la sede del médico pedido;
  - `indicators` coincide con cupos y citas devueltos.
- [ ] **Step 2: Run** `cd server && pnpm test -- agenda --runInBand` — Expected: FAIL.
- [ ] **Step 3: Implementar el repositorio** con `this.prisma` (no `prisma.tenant`) y predicados explícitos: `doctor.clinicId = scope.clinicId` en alcance sede, `Holidays.OR [{ clinicId: null }, { clinicId }]`, `ScheduleBlocks.isActive` con solapamiento de rango, `Appointments.deleted = false`. Seleccionar del paciente solo `id`, `name`, `lastName`.
- [ ] **Step 4: Implementar indicadores y caso de uso.** El caso de uso convierte el rango local a días UTC con `scheduleDateToLocalDay`, aplica la anticipación solo al día de hoy de la sede y arma la respuesta con fechas `YYYY-MM-DD` y horas `HH:mm`.
- [ ] **Step 5: Controller** con `@Auth()` + `@RequirePermissions('READ', 'AGENDA')` + `@CurrentUser() actor`; Swagger con 400/403/404.
- [ ] **Step 6: Run** `cd server && pnpm test -- agenda rbac-policy schedules --runInBand && pnpm build` — Expected: PASS y build limpio.

### Task 5: Integración con PostgreSQL real

**Files:**
- Create: `server/src/modules/agenda/infrastructure/persistence/prisma-agenda-read.repository.integration.spec.ts`

**Interfaces:**
- Consumes: el arnés de `jest.integration.config.cjs` (un solo worker).

- [ ] **Step 1: Escribir el caso**: dos sedes, médico A en sede 1, médico B en sede 2, feriado global, feriado de sede 1 y de sede 2, bloqueo de B. Alcance sede 1 devuelve solo A, feriado global y de sede 1, y ningún bloqueo de B; alcance médico A con un actor SUPER_ADMIN devuelve lo mismo.
- [ ] **Step 2: Run** `cd server && RUN_DB_INTEGRATION=1 DATABASE_URL=<db de prueba> pnpm run test:integration -- agenda` — Expected: PASS.

### Task 6: Cierre

- [ ] **Step 1:** `mediclick-core-review` sobre el diff (lanes: sede, zona horaria, feriados/bloqueos, solapamiento del médico, datos del paciente expuestos).
- [ ] **Step 2:** Actualizar `APPOINTMENT-CORE.md` §"Sedes y acceso" con una línea: la agenda de un médico es visible para él y para el personal de su sede; el paciente no la ve.
- [ ] **Step 3:** `pnpm exec eslint` sobre los archivos tocados; confirmar que el diff no incluye cambios no relacionados.

**Pregunta de dominio abierta (no se resuelve aquí):** `RescheduleAppointmentUseCase` acepta un `newScheduleId` de otro médico o especialidad. La UI de UI-16 restringe el arrastre al mismo médico y especialidad; si producto decide que el servidor también lo exija, es un cambio de regla (D7) en un ítem propio.

---

## UI-14 — Prototipo de jornada y agenda

**Rama:** `prototype/ui-14-jornada` (descartable; no se mergea) + `docs/ui-14-decisiones-jornada` (PR a `staging` con las decisiones) · **Skills:** `prototype` (rama UI, sub-forma A)

**Pregunta que responde:** ¿cómo recorre el médico su jornada — lista del día, agenda y espacio de atención — sin perder el contexto de la cita en curso?

### Task 1: Variantes sobre la ruta real

**Files:**
- Create: `client/src/app/(staff)/doctor/page.tsx` (switcher `?variant=` temporal)
- Create: `client/src/views/doctor/prototype-jornada/VariantA.tsx`, `VariantB.tsx`, `VariantC.tsx`, `PrototypeSwitcher.tsx`, `fixtures.ts`

**Interfaces:**
- Consumes: `fixtures.ts` con un `AgendaResponseDto` falso (un médico, dos especialidades, 3 días, citas en todos los estados, un bloqueo `TIME_RANGE`, un feriado de sede, una cita en riesgo y una con pago pendiente).
- Produces: tres variantes estructuralmente distintas sobre el layout `(staff)` real.

- [ ] **Step 1:** Escribir en la cabecera del switcher: "Tres variantes de la jornada del médico, conmutables con `?variant=`, sobre `/doctor`. PROTOTIPO — se descarta."
- [ ] **Step 2:** Variante A — panel del día a la izquierda (lista + indicadores `card-statistics`) y espacio de atención como panel lateral persistente; agenda en otra ruta.
- [ ] **Step 3:** Variante B — agenda `timeGridDay` como protagonista; al hacer clic en una cita se abre un drawer (patrón `AddEventSidebar` de Materio) con notas, receta y acciones.
- [ ] **Step 4:** Variante C — pestañas Hoy | Semana | Mes con el patrón `user/view` de Materio (resumen del paciente a la izquierda, pestañas de atención a la derecha).
- [ ] **Step 5:** `cd client && pnpm dev` y recorrer las tres con el usuario. Mostrar el estado (cita seleccionada, pestaña, rango) en la barra del switcher.

### Task 2: Preguntas que el usuario debe cerrar

- [ ] ¿La jornada y la agenda son una sola ruta o dos (`/doctor` y `/doctor/agenda`)? ¿Se elimina `/doctor/appointments`, que hoy duplica la jornada?
- [ ] ¿El espacio de atención es panel lateral, drawer o pantalla completa?
- [ ] ¿El médico ve los cupos libres en su agenda o solo citas, bloqueos y feriados?
- [ ] ¿El médico marca llegada (`PATCH /appointments/:id/check-in`) e inasistencia desde su jornada, o eso sigue siendo de recepción?
- [ ] ¿Qué estados puede arrastrar? Propuesta: solo `PENDING` y `CONFIRMED`, no sobrecupos.
- [ ] ¿Qué indicadores se muestran? Propuesta: ocupación, por estado, en riesgo, con pago pendiente.

### Task 3: Captura

- [ ] **Step 1:** Commit del prototipo en `prototype/ui-14-jornada` y push (rama de referencia, sin PR).
- [ ] **Step 2:** PR `docs/ui-14-decisiones-jornada` → `staging` que agrega al final de este plan una sección "Decisiones UI-14" con la pregunta, la variante elegida, las respuestas de Task 2 y el enlace a la rama del prototipo.
- [ ] **Step 3:** Si una respuesta cambia una regla de negocio, abrir el cambio como tarea explícita de UI-16 con actualización de `APPOINTMENT-CORE.md` (D7).

**Criterio de cierre:** las seis preguntas de Task 2 tienen respuesta escrita y UI-16 puede ajustarse sin abrir decisiones nuevas.

---

## UI-15 — Capa de agenda y adaptador FullCalendar

**Rama:** `feat/ui-15-capa-agenda` · **Skills:** `codebase-design` → `tdd`

### Task 1: Tipos, servicio y dependencias

**Files:**
- Modify: `client/package.json`, `client/pnpm-lock.yaml`
- Create: `client/src/services/agenda.service.ts`
- Create: `client/src/views/agenda/types.ts`

**Interfaces:**
- Consumes: `GET /agenda` (UI-13) vía `client/src/libs/axios.ts`.
- Produces: `agendaService.get({ doctorId | clinicId, from, to }): Promise<AgendaSnapshot>`; tipos `AgendaSnapshot` (espejo de `AgendaResponseDto`), `AgendaEvent`, `SlotTarget = { scheduleId; startTime; endTime }`, `DateRange = { from: string; to: string }`.

- [ ] **Step 1:** `cd client && pnpm add @fullcalendar/core@6.1.21 @fullcalendar/react@6.1.21 @fullcalendar/daygrid@6.1.21 @fullcalendar/timegrid@6.1.21 @fullcalendar/list@6.1.21 @fullcalendar/interaction@6.1.21` — Expected: versiones exactas en `package.json`. No usar 7.x (exige `temporal-polyfill` y cambia temas) ni `@fullcalendar/common` (paquete v5).
- [ ] **Step 2:** Servicio y tipos; `pnpm exec tsc --noEmit` — Expected: PASS.

### Task 2: `toAgendaEvents` con TDD

**Files:**
- Create: `client/src/views/agenda/model/toAgendaEvents.ts`
- Create: `client/src/views/agenda/model/toAgendaEvents.test.ts`

**Interfaces:**
- Consumes: `AgendaSnapshot`, `{ statuses?: AppointmentStatus[]; showFreeCupos?: boolean }`.
- Produces: `AgendaEvent[]` (compatible con `EventInput` de FullCalendar) con fechas **sin offset** (`2026-10-05T09:00:00`), pensadas para `timeZone: 'UTC'`, de modo que FullCalendar pinte la hora local de la sede tal cual.

Comportamientos (un test por fila, rojo → verde de a uno):

- [ ] Cita `CONFIRMED` → evento con `start`/`end` locales sin offset, `extendedProps { kind: 'appointment', appointmentId, status, paymentStatus, patientName }` y clase por estado.
- [ ] Cita `PENDING`/`CONFIRMED` no sobrecupo → `editable: true`; `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW` y sobrecupos → `editable: false`.
- [ ] `statuses` filtra citas (los filtros de estado del panel lateral).
- [ ] Cupo libre con `showFreeCupos` → evento `display: 'background'`, clase `cupo-libre`, no editable; cupo ocupado no se pinta.
- [ ] Bloqueo `FULL_DAY` de 3 días → un evento de fondo `allDay` con `end` exclusivo = `endDate + 1 día`.
- [ ] Bloqueo `TIME_RANGE` de 2 días → un evento de fondo por día con `timeFrom`–`timeTo`.
- [ ] Feriado global y de sede → evento de fondo `allDay` con el nombre del feriado.
- [ ] El resultado no depende de la zona del proceso: el mismo snapshot da la misma salida con `TZ=Asia/Tokyo`.

- [ ] **Run:** `cd client && pnpm test -- toAgendaEvents && TZ=Asia/Tokyo pnpm test -- toAgendaEvents` — Expected: PASS en ambas.

### Task 3: `resolveDropTarget` con TDD

**Files:**
- Create: `client/src/views/agenda/model/resolveDropTarget.ts`
- Create: `client/src/views/agenda/model/resolveDropTarget.test.ts`

**Interfaces:**
- Consumes: `AgendaSnapshot`, `appointmentId`, `start: Date` tal como lo entrega FullCalendar en modo `timeZone: 'UTC'` (se lee con `getUTC*` como hora local de la sede).
- Produces: `SlotTarget | null`. Firma: `resolveDropTarget(agenda, appointmentId, start)`; el `appointmentId` es necesario para conocer médico y especialidad de la cita arrastrada.

Comportamientos:

- [ ] Soltar dentro de un cupo libre del mismo médico y especialidad → su `{ scheduleId, startTime, endTime }`.
- [ ] Soltar dentro de un cupo libre de otra especialidad o de otro médico → `null`.
- [ ] Soltar sobre un cupo ocupado, bloqueado o de feriado (`available: false`) → `null`.
- [ ] Soltar sobre el cupo de origen → `null` (sin cambio).
- [ ] Soltar en un instante sin cupo → `null`.
- [ ] La lectura de la hora no depende de la zona del navegador (`TZ=Asia/Tokyo`).

- [ ] **Run:** `cd client && pnpm test -- resolveDropTarget && TZ=Asia/Tokyo pnpm test -- resolveDropTarget` — Expected: PASS.

### Task 4: `useAgenda` y adaptador visual

**Files:**
- Create: `client/src/views/agenda/hooks/useAgenda.ts`
- Create: `client/src/libs/styles/AppFullCalendar.ts` (desde Materio `libs/styles/AppFullCalendar.ts`; confirmar en `~/materio-v6/`)
- Create: `client/src/views/agenda/components/AgendaCalendar.tsx`
- Create: `client/src/views/agenda/components/AgendaFilters.tsx` (patrón `views/apps/calendar/SidebarLeft.tsx` de Materio)

**Interfaces:**
- Consumes: `agendaService`, `appointmentsService.reschedule(id, { newScheduleId, startTime, endTime, reason? })`, React Query.
- Produces: `useAgenda(scope, range) → { snapshot, events, isLoading, reschedule(appointmentId, target) }` con clave `['agenda', scope, range]`; `reschedule` invalida `['agenda']` y `['doctor', 'daily-appointments']`. `<AgendaCalendar scope view onSelectAppointment />`.

- [ ] **Step 1:** `AppFullCalendar` adaptado al tema: colores desde `var(--mui-palette-…)` (primario `#7E4EE6`), sin colores fijos; Tailwind solo para layout.
- [ ] **Step 2:** `AgendaCalendar` con plugins `dayGrid`, `timeGrid`, `list`, `interaction`; `timeZone: 'UTC'`; `locale: 'es'`; textos de botones en español; `datesSet` actualiza el rango; `eventAllow` usa `resolveDropTarget`; `eventDrop` llama `reschedule` y, ante error (409 cupo ocupado, 400 anticipación), hace `info.revert()` y muestra el mensaje del servidor con toastify.
- [ ] **Step 3:** No se usa el slice Redux `calendar.ts` de Materio: el estado de servidor vive en React Query, como en el resto del cliente.
- [ ] **Step 4:** `cd client && pnpm exec tsc --noEmit && pnpm test -- agenda` — Expected: PASS.

### Task 5: Verificación del ítem

- [ ] `cd client && pnpm exec eslint src/views/agenda src/services/agenda.service.ts src/libs/styles/AppFullCalendar.ts && pnpm build` — Expected: sin errores nuevos.

---

## UI-16 — Jornada del médico

**Rama:** `feat/ui-16-jornada-medico` · **Skills:** `tdd` (pruebas de navegador primero) → `mediclick-core-review` si UI-14 cambió alguna regla

Ajustar este ítem a la sección "Decisiones UI-14" antes de empezar. Lo siguiente es la forma por defecto.

### Comportamiento que no se puede perder

Hoy la jornada vive duplicada en `views/doctor/components/DoctorDashboard.tsx` (con `AppointmentWorkspaceDialog`) y `views/doctor/appointments/index.tsx` (con `AppointmentDetailPanel`), ambas sobre `useDoctorDashboard`:

- citas de hoy ordenadas por hora, refrescadas cada 2 minutos;
- indicadores: total, pendientes (`PENDING` + `CONFIRMED`), en curso, completadas, canceladas + inasistencias;
- espacio de atención: notas clínicas (lista y alta), receta (ver y crear; 404 = sin receta), completar cita, error de acción visible;
- accesos rápidos a notas clínicas, recetas, historial médico y "Mi disponibilidad".

### Task 1: Pruebas de navegador rojas

**Files:**
- Create: `client/tests/e2e/doctor-jornada.spec.ts`

**Interfaces:**
- Consumes: arnés de UI-02 — `test.use({ actor: 'DOCTOR' })`, `api.on('GET /agenda', …)`, `api.on('GET /appointments/doctor/today', …)`, `api.on('GET /clinical-notes/appointment/:id', …)`, `api.on('GET /prescriptions/appointment/:id', …)`, `api.on('PATCH /appointments/:id/reschedule', …)`, `api.on('PATCH /appointments/:id/complete', …)`, `expectAccessible(page)`.

- [ ] **Step 1:** Escenarios:
  - la jornada muestra las citas de hoy en orden y los indicadores de `indicators`;
  - abrir una cita muestra notas y receta; crear una nota llama al endpoint y la lista se actualiza;
  - completar una cita `IN_PROGRESS` cambia su estado en la lista;
  - en la agenda, arrastrar una cita `CONFIRMED` a un cupo libre envía `newScheduleId`, `startTime` y `endTime` del cupo;
  - si el servidor responde 409, la cita vuelve a su lugar y se ve el mensaje;
  - una cita `COMPLETED` no se puede arrastrar;
  - el feriado de la sede se ve como fondo con su nombre;
  - `expectAccessible` en jornada y agenda.
- [ ] **Step 2:** `cd client && pnpm exec playwright test tests/e2e/doctor-jornada.spec.ts` — Expected: FAIL (pantallas inexistentes).

### Task 2: Pantallas

**Files:**
- Create: `client/src/views/doctor/jornada/index.tsx`
- Create: `client/src/views/doctor/jornada/components/JornadaIndicators.tsx` (`components/card-statistics` de Materio)
- Create: `client/src/views/doctor/jornada/components/JornadaList.tsx`
- Create: `client/src/views/doctor/jornada/components/AtencionDrawer.tsx` (patrón según UI-14; pestañas Notas | Receta)
- Create: `client/src/views/doctor/agenda/index.tsx` (usa `AgendaCalendar` con alcance médico)
- Create: `client/src/views/doctor/hooks/useAtencion.ts` (notas, receta y completar: lo que hoy no es lista ni indicadores en `useDoctorDashboard`)
- Modify: `client/src/app/(staff)/doctor/page.tsx`
- Create: `client/src/app/(staff)/doctor/agenda/page.tsx`
- Modify: `navigationFor` (UI-03) para el médico: Jornada, Agenda, Notas clínicas, Recetas, Historial médico, Mi disponibilidad.

**Interfaces:**
- Consumes: `useAgenda({ doctorId }, rangoDelDía)` para indicadores y lista; `clinicalNotesService`, `prescriptionsService`, `appointmentsService.complete`.
- Produces: rutas `/doctor` (jornada) y `/doctor/agenda`.

- [ ] **Step 1:** Jornada sobre `useAgenda` con el rango de hoy en la zona de la sede (reemplaza `GET /appointments/doctor/today` como fuente de la lista; mantener refresco de 2 minutos con `refetchInterval`).
- [ ] **Step 2:** Espacio de atención con los componentes de Materio y los textos de `CONTEXT.md`.
- [ ] **Step 3:** Agenda con `AgendaCalendar` (vistas semana, día, mes y lista) y filtros por estado.
- [ ] **Step 4:** `cd client && pnpm exec playwright test tests/e2e/doctor-jornada.spec.ts` — Expected: PASS.

### Task 3: Borrar lo reemplazado y verificar

**Files:**
- Delete: `client/src/views/doctor/components/DoctorDashboard.tsx`, `TodayAppointmentsList.tsx`, `DoctorStatCards.tsx`, `AppointmentWorkspaceDialog.tsx`
- Delete: `client/src/views/doctor/appointments/` y `client/src/app/(staff)/doctor/appointments/` (si UI-14 confirma que se elimina la ruta)
- Delete o reducir: `client/src/views/doctor/hooks/useDoctorDashboard.ts`

- [ ] **Step 1:** `grep -rn "useDoctorDashboard\|AppointmentWorkspaceDialog\|AppointmentDetailPanel\|doctor/appointments" client/src` — Expected: sin referencias.
- [ ] **Step 2:** Si `GET /appointments/doctor/today` queda sin consumidores en el cliente, dejarlo en el servidor (lo usan los tests del controller) y anotarlo en el PR.
- [ ] **Step 3:** `cd client && pnpm test && pnpm exec tsc --noEmit && pnpm exec eslint src/views/doctor src/views/agenda && pnpm build && pnpm test:a11y` — Expected: todo en verde.
- [ ] **Step 4:** Revisión visual en modo claro y oscuro, y con las opciones del customizer de accesibilidad (tamaño de letra, contraste alto, movimiento reducido).
