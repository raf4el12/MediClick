# SDD-009 Atomic Availability Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar las reglas de una especialidad de un médico como una única operación atómica, sin borrar reglas de otras especialidades.

**Architecture:** El caso de uso autoriza y valida todo el comando antes de la escritura. Un único método del repositorio Prisma es la seam de persistencia: en una transacción desactiva las reglas activas de `(doctorId, specialtyId)` y crea el conjunto completo. La regeneración de agenda ocurre solamente después de que esa operación confirma.

**Tech Stack:** NestJS, TypeScript, Prisma/PostgreSQL, Jest.

**Spec:** `docs/SDD-hardening-integridad-seguridad-operacion.md` §6.3.2 y SDD-009.

## Global Constraints

- La sede se deriva del médico validado y no del DTO.
- Toda entrada se valida antes de iniciar la transacción.
- El conjunto reemplazado se limita a `doctorId` y `specialtyId`, de acuerdo con el endpoint y cliente actuales.
- Si falla una creación, PostgreSQL revierte la desactivación previa.
- La regeneración no se ejecuta si el reemplazo falla.

---

### Task 1: Añadir la seam atómica del repositorio

**Files:**
- Modify: `server/src/modules/availability/domain/repositories/availability.repository.ts`
- Modify: `server/src/modules/availability/infrastructure/persistence/prisma-availability.repository.ts`
- Test: `server/src/modules/availability/infrastructure/persistence/prisma-availability.repository.integration.spec.ts`

**Interfaces:**
- Produces: `replaceForDoctorSpecialty(doctorId, specialtyId, entries): Promise<AvailabilityWithRelations[]>`.

- [x] **Step 1: Write the failing integration test**

Crear reglas activas de dos especialidades. Ejecutar un reemplazo cuyo segundo insert falla por una constraint y verificar que las reglas anteriores de la especialidad objetivo siguen activas; verificar además que la otra especialidad no cambia.

- [x] **Step 2: Run test to verify it fails**

Run: `cd server && DATABASE_URL=<test-db> RUN_DB_INTEGRATION=1 pnpm test -- prisma-availability.repository.integration.spec.ts --runInBand`

Expected: FAIL porque hoy `softDeleteByDoctor` y los inserts no comparten transacción.

- [x] **Step 3: Implement the repository operation**

```ts
return this.prisma.$transaction(async (tx) => {
  await tx.availability.updateMany({ where: { doctorId, specialtyId, isAvailable: true }, data: { isAvailable: false } });
  return Promise.all(entries.map((entry) => tx.availability.create({ data: entry, include: availabilityInclude })));
});
```

- [x] **Step 4: Run integration test to verify it passes**

Run: same as Step 2. Expected: PASS.

### Task 2: Usar la seam desde el caso de uso

**Files:**
- Modify: `server/src/modules/availability/application/use-cases/bulk-save-availability.use-case.ts`
- Create: `server/src/modules/availability/application/use-cases/bulk-save-availability.use-case.spec.ts`

**Interfaces:**
- Consumes: `replaceForDoctorSpecialty`.
- Produces: respuesta DTO solo después de un reemplazo confirmado y regeneración posterior.

- [x] **Step 1: Write failing tests**

Probar que el caso de uso entrega todas las entradas ya normalizadas al método atómico, no llama a `softDeleteByDoctor` ni `create`, y no regenera cuando la seam rechaza.

- [x] **Step 2: Run test to verify it fails**

Run: `cd server && pnpm test -- bulk-save-availability.use-case.spec.ts --runInBand`

Expected: FAIL porque el caso de uso llama las escrituras separadas.

- [x] **Step 3: Implement the minimal integration**

Construir `CreateAvailabilityData[]` después de validar, llamar una sola vez a `replaceForDoctorSpecialty`, transformar su resultado y regenerar únicamente tras resolver con éxito.

- [x] **Step 4: Verify and document**

Run: `cd server && pnpm test -- availability schedules --runInBand && pnpm exec eslint <modified-files> && pnpm build`.

Actualizar `APPOINTMENT-CORE.md` con el reemplazo atómico por especialidad.
