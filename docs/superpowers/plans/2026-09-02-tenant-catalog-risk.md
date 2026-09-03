# Tenant-Safe Catalog and Patient Risk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return global-plus-clinic specialties and prevent patient risk data from crossing ownership, doctor, or clinic boundaries.

**Architecture:** Catalog filtering explicitly expresses `(clinicId IS NULL OR clinicId = requestedClinic)` and remains compatible with the tenant-aware Prisma extension. Risk-profile access receives the authenticated actor, derives a role-specific appointment scope, verifies the actor-patient relationship, and uses that same scope for all historical aggregates.

**Tech Stack:** NestJS 11, Prisma 7/PostgreSQL, PBAC/JWT guards, TypeScript, Jest

**Spec:** `docs/domain/APPOINTMENT-CORE.md` section “Sedes y acceso”

## Global Constraints

- Patients remain multi-clinic but may read only their own risk profile.
- Clinic-scoped staff see only statistics from their clinic; doctors see only their assigned appointments in that clinic.
- `SUPER_ADMIN` and `ADMIN` with null clinic remain global.
- Hide unauthorized records with `NotFoundException`, matching appointment access behavior.
- Global catalog rows remain visible alongside current-clinic rows.
- Preserve unrelated worktree changes.

---

### Task 1: Return global specialties together with clinic specialties

**Files:**
- Modify: `server/src/modules/specialties/infrastructure/persistence/prisma-specialty.repository.ts`
- Create: `server/src/modules/specialties/infrastructure/persistence/prisma-specialty.repository.spec.ts`
- Create: `server/src/modules/specialties/infrastructure/persistence/prisma-specialty.repository.integration.spec.ts`

**Interfaces:**
- Preserves: `findAllPaginated(params, categoryId?, clinicId?)`
- Produces: when `clinicId=7`, rows whose clinic is null or 7, never another clinic

- [x] **Step 1: Add query-shape and real tenant-context tests**

```ts
expect(prisma.tenant.specialties.findMany).toHaveBeenCalledWith(
  expect.objectContaining({
    where: expect.objectContaining({
      OR: [{ clinicId: null }, { clinicId: 7 }],
    }),
  }),
);
```

The integration spec must seed global, clinic A, and clinic B specialties; under clinic A tenant context and `clinicId=A`, assert global+A are returned. Under no tenant context with `clinicId=A`, assert the same. Assert B is absent in both cases.

- [x] **Step 2: Run tests and observe exact-equality failure**

```bash
cd server && pnpm test -- prisma-specialty.repository.spec.ts --runInBand
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration -- prisma-specialty.repository.integration.spec.ts
```

- [x] **Step 3: Replace equality with catalog scope**

```ts
...(clinicId !== undefined && {
  OR: [{ clinicId: null }, { clinicId }],
}),
```

Use `!== undefined`, not truthiness. Preserve category/search filters as `AND` siblings so they apply to both global and clinic rows. Use the identical `where` object for rows and count.

- [x] **Step 4: Pass unit and integration tests**

```bash
cd server && pnpm test -- prisma-specialty.repository.spec.ts --runInBand
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration -- prisma-specialty.repository.integration.spec.ts
```

- [x] **Step 5: Commit**

```bash
git add server/src/modules/specialties/infrastructure/persistence
git commit -m "fix(specialties): include global catalog rows by clinic"
```

### Task 2: Authorize patient risk profiles by actor and trusted relationships

**Files:**
- Create: `server/src/shared/access/patient-risk-access.policy.ts`
- Create: `server/src/shared/access/patient-risk-access.policy.spec.ts`
- Modify: `server/src/modules/patients/interfaces/controllers/patient.controller.ts`
- Modify: `server/src/modules/patients/application/use-cases/get-patient-risk-profile.use-case.ts`
- Modify: `server/src/modules/patients/application/use-cases/get-patient-risk-profile.use-case.spec.ts`
- Modify: `server/src/modules/patients/application/patients.module.ts`

**Interfaces:**
- Produces: `execute(patientId: number, actor: AuthenticatedUser): Promise<PatientRiskProfileDto>`
- Produces: `PatientRiskScope { clinicId?: number; doctorUserId?: number }`

- [ ] **Step 1: Add policy tests for every access-matrix branch**

```ts
expect(() => policy.resolve(patient, ownPatientActor)).not.toThrow();
expect(() => policy.resolve(otherPatient, patientActor)).toThrow(NotFoundException);
expect(policy.resolve(patient, clinicReceptionist)).toEqual({ clinicId: 7 });
expect(policy.resolve(patient, clinicDoctor)).toEqual({ clinicId: 7, doctorUserId: 20 });
expect(policy.resolve(patient, globalAdmin)).toEqual({});
```

Reject clinic-scoped roles with null clinic. Patient ownership is `patient.profile.userId === actor.id` and never a request `clinicId`.

- [ ] **Step 2: Pass the actor from the controller**

```ts
async getRiskProfile(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() actor: AuthenticatedUser,
): Promise<PatientRiskProfileDto> {
  return this.getPatientRiskProfileUseCase.execute(id, actor);
}
```

- [ ] **Step 3: Verify the patient relation before returning aggregates**

For clinic staff, query for at least one non-deleted appointment matching `patientId`, clinic scope, and for doctors `schedule.doctor.profile.userId = actor.id`. If no relation exists, throw `NotFoundException`. For patients, rely on ownership. Global actors need no relationship filter.

Use explicit Prisma predicates; do not rely on ambient tenant context because patients/global jobs may have none and this use case must remain correct in direct calls.

- [ ] **Step 4: Run policy and use-case tests**

```bash
cd server && pnpm test -- patient-risk-access.policy get-patient-risk-profile --runInBand
```

- [ ] **Step 5: Commit**

```bash
git add server/src/shared/access/patient-risk-access.policy.ts server/src/shared/access/patient-risk-access.policy.spec.ts server/src/modules/patients
git commit -m "fix(patients): scope risk profiles to actor and clinic"
```

### Task 3: Use only comparable historical outcomes in risk rates

**Files:**
- Modify: `server/src/modules/patients/application/use-cases/get-patient-risk-profile.use-case.ts`
- Modify: `server/src/modules/patients/application/use-cases/get-patient-risk-profile.use-case.spec.ts`
- Create: `server/src/modules/patients/application/use-cases/get-patient-risk-profile.integration.spec.ts`

**Interfaces:**
- Consumes: `PatientRiskScope` from Task 2
- Preserves: `PatientRiskService.assessRisk({ totalAppointments, noShowCount, lateCancellationCount })`

- [ ] **Step 1: Add a future-appointments regression test**

Seed one `NO_SHOW`, one `COMPLETED`, one late `CANCELLED` (`cancellationFee > 0`), one early cancelled appointment, and nine future `PENDING`/`CONFIRMED` appointments. Assert `totalAppointments=3`, `noShowCount=1`, `lateCancellationCount=1`; future and early-cancelled rows do not dilute risk.

- [ ] **Step 2: Add clinic and doctor aggregate tests**

Give the same patient outcomes in clinics A and B. Assert clinic A staff counts only A; an A doctor counts only appointments assigned to that doctor; the patient owner and global admin count both clinics.

- [ ] **Step 3: Implement one shared scoped base predicate**

```ts
const scopedBase = {
  patientId,
  deleted: false,
  ...(scope.clinicId !== undefined && { clinicId: scope.clinicId }),
  ...(scope.doctorUserId !== undefined && {
    schedule: { doctor: { profile: { userId: scope.doctorUserId } } },
  }),
};
```

Use it in all counts. Historical denominator is the union of `COMPLETED`, `NO_SHOW`, and late `CANCELLED` with `cancellationFee > 0`; no-show and late-cancel counts use their matching subsets. This keeps every weighted adverse outcome inside its denominator.

- [ ] **Step 4: Run focused and integration tests**

```bash
cd server && pnpm test -- get-patient-risk-profile patient-risk --runInBand
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration -- get-patient-risk-profile.integration.spec.ts
cd server && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/patients server/src/shared/access
git commit -m "fix(patients): calculate risk from scoped outcomes"
```
