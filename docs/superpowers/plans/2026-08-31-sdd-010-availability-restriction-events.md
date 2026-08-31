# SDD-010 Availability Restriction Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar un único evento al crear o actualizar un feriado o bloqueo y cancelar solo las citas que continúan invalidadas por el estado final.

**Architecture:** `AvailabilityRestrictionChanged` es la interface pequeña entre los módulos productores y `appointments`: lleva identidad, alcance, actor y los rangos anterior/nuevo. El listener calcula la unión para encontrar candidatas y es el módulo profundo que vuelve a consultar `isHoliday` o `isBlocked` antes de cancelar; así no depende de horas, fechas ni estado obsoletos incluidos en un evento asíncrono.

**Tech Stack:** NestJS, TypeScript, EventEmitter2, Prisma/PostgreSQL, Jest.

**Spec:** `docs/SDD-hardening-integridad-seguridad-operacion.md` §6.3.3 y SDD-010.

## Global Constraints

- La cita y su pago mantienen máquinas de estado separadas; la revisión financiera es SDD-011 y no se decide aquí.
- El actor autenticado se pasa desde el controller y queda incluido en cada evento.
- Un cambio de fecha o de hora examina la unión inclusiva de sus rangos anterior y nuevo.
- La cancelación se decide contra `isHoliday`/`isBlocked` después de persistir el cambio, nunca solo contra el payload.
- El listener conserva la emisión de `appointment.slot_released` y `appointment.cancelled` existente.

---

### Task 1: Definir el evento unificado y publicar creaciones

**Files:**
- Modify: `server/src/shared/events/availability-events.interface.ts`
- Modify: `server/src/modules/holidays/application/use-cases/create-holiday.use-case.ts`
- Modify: `server/src/modules/schedule-blocks/application/use-cases/create-schedule-block.use-case.ts`
- Modify: `server/src/modules/holidays/interfaces/controllers/holiday.controller.ts`
- Modify: `server/src/modules/schedule-blocks/interfaces/controllers/schedule-block.controller.ts`
- Test: `server/src/modules/holidays/application/use-cases/create-holiday.use-case.spec.ts`

**Interfaces:**
- Produces: `AvailabilityRestrictionChangedEvent { restrictionType, restrictionId, clinicId, doctorId, previousRange, currentRange, occurredAt, actorId }` en `availability.restriction_changed`.
- Consumes: `@CurrentUser('id')` de rutas autenticadas.

- [x] **Step 1: Write the failing test**

Cambiar el test de creación de feriado para esperar `availability.restriction_changed`, `previousRange: null`, el rango de la fecha creada, `restrictionId: 1` y `actorId: 42`.

- [x] **Step 2: Run test to verify it fails**

Run: `cd server && pnpm test -- create-holiday.use-case.spec.ts --runInBand`

Expected: FAIL porque el productor todavía emite `holiday.created` sin identidad, rangos ni actor.

- [x] **Step 3: Write minimal implementation**

```ts
this.eventEmitter.emit(AVAILABILITY_RESTRICTION_CHANGED_EVENT, {
  restrictionType: 'HOLIDAY', restrictionId: holiday.id, clinicId: holiday.clinicId,
  doctorId: null, previousRange: null,
  currentRange: { startDate: holiday.date, endDate: holiday.date },
  occurredAt: new Date(), actorId,
});
```

Aplicar la misma forma para un bloqueo creado, usando su médico, sede derivada del médico y rango persistido. Pasar `actorId` desde ambos controllers.

- [x] **Step 4: Run test to verify it passes**

Run: `cd server && pnpm test -- create-holiday.use-case.spec.ts --runInBand`

Expected: PASS.

### Task 2: Publicar actualizaciones con rango anterior y nuevo

**Files:**
- Modify: `server/src/modules/holidays/application/use-cases/update-holiday.use-case.ts`
- Modify: `server/src/modules/schedule-blocks/application/use-cases/update-schedule-block.use-case.ts`
- Create: `server/src/modules/holidays/application/use-cases/update-holiday.use-case.spec.ts`
- Create: `server/src/modules/schedule-blocks/application/use-cases/update-schedule-block.use-case.spec.ts`

**Interfaces:**
- Consumes: evento de Task 1 y entidades persistidas antes/después de `update`.
- Produces: un evento cuyo `previousRange` describe la entidad anterior y cuyo `currentRange` describe la entidad actual, aunque la restricción quede inactiva.

- [x] **Step 1: Write failing tests**

Probar que mover un feriado de 2030-06-01 a 2030-06-03 y expandir un bloqueo de 2030-06-01 a 2030-06-03 publican ambos extremos y el actor. Probar que el evento se emite después de la regeneración del bloqueo.

- [x] **Step 2: Run tests to verify they fail**

Run: `cd server && pnpm test -- 'update-(holiday|schedule-block).use-case.spec.ts' --runInBand`

Expected: FAIL porque hoy ningún caso de uso de actualización emite el evento.

- [x] **Step 3: Write minimal implementation**

```ts
this.eventEmitter.emit(AVAILABILITY_RESTRICTION_CHANGED_EVENT, {
  restrictionType: 'SCHEDULE_BLOCK', restrictionId: updated.id,
  clinicId: updated.doctor.clinicId, doctorId: updated.doctorId,
  previousRange: { startDate: existing.startDate, endDate: existing.endDate },
  currentRange: { startDate: updated.startDate, endDate: updated.endDate },
  occurredAt: new Date(), actorId,
});
```

Para feriados, usar fechas anterior y actual y el `clinicId` del registro. El evento se publica después de la escritura y, para bloqueos, después de regenerar el intervalo unido.

- [x] **Step 4: Run tests to verify they pass**

Run: `cd server && pnpm test -- 'update-(holiday|schedule-block).use-case.spec.ts' --runInBand`

Expected: PASS.

### Task 3: Revalidar candidatas contra la restricción final

**Files:**
- Modify: `server/src/modules/appointments/application/listeners/availability-change.listener.ts`
- Modify: `server/src/modules/appointments/application/listeners/availability-change.listener.spec.ts`
- Modify: `server/src/modules/appointments/domain/repositories/appointment.repository.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts`
- Modify: `docs/domain/APPOINTMENT-CORE.md`

**Interfaces:**
- Consumes: `AvailabilityRestrictionChangedEvent`, `IHolidayRepository.isHoliday`, `IScheduleBlockRepository.isBlocked`.
- Produces: cancelación y eventos existentes solo para candidatas del rango unido que siguen bloqueadas en la base final.

- [x] **Step 1: Write failing listener tests**

Crear una cita el 1 y otra el 3 de junio. Para un bloqueo actualizado de 1 a 3, devolver `true` únicamente para la del 3 desde `isBlocked` y esperar una sola cancelación. Para un feriado movido, devolver `false` en la fecha anterior y `true` en la nueva desde `isHoliday` y esperar una sola cancelación.

- [x] **Step 2: Run test to verify it fails**

Run: `cd server && pnpm test -- availability-change.listener.spec.ts --runInBand`

Expected: FAIL porque el listener solo reconoce los eventos de creación y confía en sus fechas/horas.

- [x] **Step 3: Write minimal implementation**

Añadir `findActiveByDateRangeAndClinic(startDate, endDate, clinicId)` al repositorio. Calcular el mínimo y máximo de los rangos no nulos; consultar candidatas por médico o sede; y filtrar cada una mediante `isBlocked(doctorId, scheduleDate, startTime, endTime)` o `isHoliday(scheduleDate, clinicId)` antes de `cancelAll`.

- [x] **Step 4: Run focused and cross-module verification**

Run: `cd server && pnpm test -- 'availability-change.listener.spec.ts|holidays|schedule-blocks|appointments|waitlist|payments' --runInBand && pnpm exec eslint <modified-files> && pnpm build`

Expected: PASS. Actualizar el núcleo para documentar evento, unión y revalidación final.

- [x] **Step 5: Commit**

```bash
git add server/src/shared/events server/src/modules/{holidays,schedule-blocks,appointments} docs/domain/APPOINTMENT-CORE.md docs/superpowers/plans/2026-08-31-sdd-010-availability-restriction-events.md
git commit -m "fix(availability): revalidate restrictions after updates"
```
