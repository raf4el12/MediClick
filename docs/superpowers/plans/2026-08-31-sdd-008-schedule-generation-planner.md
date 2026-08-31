# SDD-008 Schedule Generation Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar cupos de cada especialidad de un médico de forma independiente y respetar únicamente feriados globales o de la sede de ese médico.

**Architecture:** `ScheduleGenerationPlanner` será un módulo puro cuya interfaz `plan(input)` recibe reglas, restricciones, especialidades y cupos existentes ya cargados; devuelve candidatos y rechazos sin Prisma ni NestJS. `GenerateSchedulesUseCase` conserva autorización, carga dependencias y persiste el resultado. La identidad de un cupo incluirá médico, especialidad, sede, fecha e intervalo.

**Tech Stack:** NestJS, TypeScript, Prisma/PostgreSQL, Jest.

**Spec:** `docs/SDD-hardening-integridad-seguridad-operacion.md` §6.3.1 y SDD-008.

## Global Constraints

- La sede del médico, no el DTO, es la fuente de `clinicId` de cada cupo.
- Un feriado global o de la misma sede bloquea la generación; uno de otra sede no la bloquea.
- La identidad del cupo es `(doctorId, specialtyId, clinicId, localDate, timeFrom, timeTo)`.
- Bloqueos, excepciones y cupos existentes solo impiden candidatos que se superponen.
- No se cambian estados de cita ni de pago.

---

### Task 1: Crear el módulo puro de planificación

**Files:**
- Create: `server/src/modules/schedules/domain/services/schedule-generation-planner.service.ts`
- Test: `server/src/modules/schedules/domain/services/schedule-generation-planner.service.spec.ts`

**Interfaces:**
- Consumes: `AvailabilityEntity`, `HolidayEntity`, `ScheduleBlockEntity`, `TimeSlotCalculatorService` y `CreateScheduleData`.
- Produces: `ScheduleGenerationPlanner.plan(input): { desired: CreateScheduleData[]; skipped: GenerationRejection[] }`.

- [x] **Step 1: Write the failing test**

```ts
it('genera el mismo intervalo para dos especialidades distintas', () => {
  expect(planner.plan(inputWithRegularRules(2, 9)).desired.map((s) => s.specialtyId))
    .toEqual([2, 9]);
});
```

```ts
it('no descarta cupos por un feriado de otra sede', () => {
  expect(planner.plan({ ...inputWithRegularRules(2), holidays: [holidayForClinic(99)] }).desired)
    .toHaveLength(2);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd server && pnpm test -- schedule-generation-planner.service.spec.ts --runInBand`

Expected: FAIL because `ScheduleGenerationPlanner` does not exist.

- [x] **Step 3: Write minimal implementation**

```ts
export class ScheduleGenerationPlanner {
  plan(input: GenerationInput): GenerationPlan {
    // filtra por fecha y sede, genera intervalos y compone la identidad completa
  }
}
```

El módulo filtra feriados con `holiday.clinicId === null || holiday.clinicId === input.clinicId`, obtiene duración/buffer de un mapa de especialidades y no muta los cupos existentes de entrada.

- [x] **Step 4: Run test to verify it passes**

Run: `cd server && pnpm test -- schedule-generation-planner.service.spec.ts --runInBand`

Expected: PASS incluyendo reglas simultáneas, feriado de otra sede y feriados global/de la sede rechazados.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/schedules/domain/services/schedule-generation-planner.service.ts server/src/modules/schedules/domain/services/schedule-generation-planner.service.spec.ts && git commit -m "feat(schedules): plan slots with specialty and clinic identity"
```

### Task 2: Conectar el planner y corregir la identidad persistida

**Files:**
- Modify: `server/src/modules/schedules/application/use-cases/generate-schedules.use-case.ts`
- Modify: `server/src/modules/schedules/application/use-cases/generate-schedules.use-case.spec.ts`
- Modify: `server/src/modules/schedules/domain/repositories/schedule.repository.ts`
- Modify: `server/src/modules/schedules/infrastructure/persistence/prisma-schedule.repository.ts`

**Interfaces:**
- Consumes: `ScheduleGenerationPlanner.plan` de la tarea 1.
- Produces: `GenerateSchedulesUseCase.execute(dto, jwtClinicId)` con conteos de planificación y persistencia idempotente por especialidad.

- [x] **Step 1: Write the failing test**

```ts
it('genera ambas especialidades de reglas simultáneas', async () => {
  availabilityRepository.findActiveByDoctorIds.mockResolvedValue([buildRule(2), buildRule(9)]);
  await useCase.execute({ ...dto, specialtyId: undefined, overwrite: false });
  expect(scheduleRepository.createMany.mock.calls[0][0]).toEqual(expect.arrayContaining([
    expect.objectContaining({ specialtyId: 2 }),
    expect.objectContaining({ specialtyId: 9 }),
  ]));
});
```

Agregar también un feriado de otra sede que permite creación y uno global que impide creación.

- [x] **Step 2: Run test to verify it fails**

Run: `cd server && pnpm test -- generate-schedules.use-case.spec.ts --runInBand`

Expected: FAIL porque el set interno omite `specialtyId` y cualquier feriado se trata como global.

- [x] **Step 3: Write minimal implementation**

```ts
const plan = this.scheduleGenerationPlanner.plan({
  doctorId, clinicId: doctorClinicId, dates, availabilities, holidays,
  scheduleBlocks, specialties, existingSchedules,
});
const generated = plan.desired.length ? await this.scheduleRepository.createMany(plan.desired) : 0;
```

Actualizar `findExistingDates` para devolver `specialtyId` y construir la identidad con ese campo. La autorización, `overwrite` y la escritura permanecen en el caso de uso.

- [x] **Step 4: Run test to verify it passes**

Run: `cd server && pnpm test -- generate-schedules.use-case.spec.ts schedule-generation-planner.service.spec.ts --runInBand`

Expected: PASS; ambas especialidades se generan y solo feriados globales/de la sede inhiben cupos.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/schedules && git commit -m "fix(schedules): scope holidays and preserve specialty slots"
```

### Task 3: Verificación transversal y documento del núcleo

**Files:**
- Modify: `docs/domain/APPOINTMENT-CORE.md`

**Interfaces:**
- Consumes: generación conectada al planner.
- Produces: invariantes implementadas de identidad de cupo y feriados por sede.

- [x] **Step 1: Document the implemented invariant**

Añadir que la generación mantiene cupos simultáneos de especialidades distintas y que solo feriados globales o de la sede del médico bloquean la fecha.

- [x] **Step 2: Run focused verification**

Run: `cd server && pnpm test -- schedules --runInBand && pnpm build`

Expected: PASS.

- [x] **Step 3: Run lint without rewriting unrelated files**

Run: `cd server && pnpm exec eslint src/modules/schedules/domain/services/schedule-generation-planner.service.ts src/modules/schedules/application/use-cases/generate-schedules.use-case.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/domain/APPOINTMENT-CORE.md && git commit -m "docs(core): record schedule generation scope"
```

## Self-review

- SDD-008 está cubierto por la planificación pura y su integración al caso de uso.
- El plan no cambia el reemplazo masivo, eventos de restricciones, pagos ni waitlist: corresponden a SDD-009 a SDD-014.
- Cada tarea nombra archivos, interfaces, comportamiento rojo y comandos de verificación.
