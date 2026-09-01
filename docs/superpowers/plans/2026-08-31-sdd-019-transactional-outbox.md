# SDD-019 Transactional Outbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la outbox PostgreSQL de MediClick y migrar la liberación de cupos y las proyecciones FHIR a entrega durable, reintentable e idempotente.

**Architecture:** Un módulo profundo `shared/outbox` encapsula el envelope versionado, el insert dentro de una transacción Prisma y el protocolo de claim/lease del worker. Los repositorios de negocio escriben la mutación y el evento en la misma transacción; el worker despacha únicamente contratos registrados y los consumidores FHIR registran su recibo junto con recursos e historial en una sola transacción.

**Tech Stack:** NestJS 11, TypeScript, Prisma 7, PostgreSQL, EventEmitter2 como dispatcher interno del worker, `@nestjs/schedule`, Jest 30.

**Spec:** `docs/SDD-hardening-integridad-seguridad-operacion.md` y `docs/adr/0002-transactional-outbox.md`

## Global Constraints

- La entrega es al menos una vez; no se promete orden global ni por agregado.
- La clave es `<type>:v<schemaVersion>:<aggregateType>:<aggregateId>:<operationId>` y mismo contenido es no-op, contenido distinto es conflicto.
- `operationId`, `eventId` y `occurredAt` se crean antes de cualquier reintento transaccional.
- Los payloads contienen solo IDs/datos mínimos y fechas ISO-8601, sin PII, secretos ni respuestas financieras crudas.
- Ninguna transacción PostgreSQL permanece abierta durante la ejecución de handlers o I/O.
- Solo el owner con lease vigente puede confirmar o reprogramar un evento.
- Un worker sin request aplica `clinicId` explícito; `clinicId = null` nunca concede acceso global.
- Paciente permanece multi-sede y sus eventos declaran `clinicId = null`.
- No se ejecuta un mismo consumidor por EventEmitter local y outbox a la vez.
- El dominio permanece libre de NestJS y Prisma.

---

### Task 1: Contrato y persistencia de la outbox

**Files:**
- Create: `server/src/shared/outbox/domain/durable-domain-event.ts`
- Create: `server/src/shared/outbox/infrastructure/prisma-outbox-writer.ts`
- Create: `server/src/shared/outbox/infrastructure/prisma-outbox.repository.ts`
- Create: `server/src/shared/outbox/infrastructure/prisma-outbox.repository.integration.spec.ts`
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260831090000_add_transactional_outbox/migration.sql`

**Interfaces:**
- Produces: `buildDurableEvent(input): DurableDomainEvent`, `durableEventName(type, schemaVersion): string`, `recordOutboxEvent(tx, event): Promise<void>`.
- Produces: `PrismaOutboxRepository.claimBatch(owner, now, limit, leaseMs)`, `ack(eventId, owner, now)`, `reschedule(eventId, owner, now, attempts, error, options)`, `replay(eventId, now)`.

- [ ] **Step 1: Write the failing PostgreSQL integration tests**

  Probar que dos claims concurrentes devuelven conjuntos disjuntos, un lease vencido vuelve a ser reclamable, un owner ajeno no puede hacer ack/reschedule, el backoff conserva la fila y el replay limpia el dead letter conservando `eventId`, `dedupeKey` y payload.

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd server && RUN_DB_INTEGRATION=1 pnpm test -- --config jest.integration.config.cjs prisma-outbox.repository.integration.spec.ts --runInBand`

  Expected: FAIL porque no existen modelos ni repositorio de outbox.

- [ ] **Step 3: Add schema, migration and minimal repository**

  Crear `OutboxEvents` con todos los campos del ADR, unicidad de `dedupeKey` e índices de claim/sede; crear `OutboxConsumptions` con `@@unique([consumerName, eventId])`. Implementar claim mediante CTE `SELECT ... FOR UPDATE SKIP LOCKED` + `UPDATE ... RETURNING`, y mutaciones owner-only que también exigen `lockedUntil >= now`.

- [ ] **Step 4: Implement contract-safe insert**

  `recordOutboxEvent` ejecuta `createMany({ skipDuplicates: true })`; si la clave ya existe compara todo el envelope persistido. Igual contenido retorna, cualquier diferencia lanza `OutboxContractConflictError` para revertir la transacción.

- [ ] **Step 5: Run tests and static checks**

  Run: `cd server && pnpm prisma generate && RUN_DB_INTEGRATION=1 pnpm test -- --config jest.integration.config.cjs prisma-outbox.repository.integration.spec.ts --runInBand`

  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add server/prisma server/src/shared/outbox
  git commit -m "feat(outbox): add durable event persistence and leases"
  ```

### Task 2: Worker durable con backoff y dead letters

**Files:**
- Create: `server/src/shared/outbox/application/outbox-worker.ts`
- Create: `server/src/shared/outbox/application/outbox-worker.integration.spec.ts`
- Create: `server/src/shared/outbox/outbox.module.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaOutboxRepository` y `durableEventName` de Task 1.
- Produces: `OutboxWorker.processBatch(now?: Date): Promise<number>` y eventos internos `outbox.<type>.v<schemaVersion>`.

- [ ] **Step 1: Write failing worker tests**

  Con PostgreSQL y un `EventEmitter2` real, probar: handler exitoso publica; handler que falla reprograma con error redactado; redelivery tras lease expirado repite; al máximo de intentos queda dead letter; tipo/versión sin listener no se publica.

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd server && RUN_DB_INTEGRATION=1 pnpm test -- --config jest.integration.config.cjs outbox-worker.integration.spec.ts --runInBand`

  Expected: FAIL porque el worker no existe.

- [ ] **Step 3: Implement worker and module**

  Usar un owner UUID estable por proceso, guard anti-solapamiento local, lotes limitados y `emitAsync` después del commit del claim. Aplicar backoff exponencial acotado, máximo configurable de intentos, error limitado sin payload y `@Interval` para polling.

- [ ] **Step 4: Run tests**

  Run: `cd server && RUN_DB_INTEGRATION=1 pnpm test -- --config jest.integration.config.cjs outbox-worker.integration.spec.ts --runInBand`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add server/src/shared/outbox server/src/app.module.ts
  git commit -m "feat(outbox): process durable events with leases and retries"
  ```

### Task 3: Liberación de cupos en transacciones de citas

**Files:**
- Modify: `server/src/modules/appointments/domain/repositories/appointment.repository.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts`
- Modify: `server/src/modules/appointments/application/services/appointment-cancellation.service.ts`
- Modify: `server/src/modules/appointments/application/use-cases/reschedule-appointment.use-case.ts`
- Modify: `server/src/modules/appointments/application/use-cases/expire-pending-appointments.use-case.ts`
- Modify: closest existing `.spec.ts` files for cancellation, reschedule and expiration
- Create or modify: focused PostgreSQL integration tests for each atomic boundary

**Interfaces:**
- Consumes: `recordOutboxEvent` and `buildDurableEvent` from Task 1.
- Produces: atomic repository methods accepting a prebuilt operation identity and returning committed appointment state.

- [ ] **Step 1: Write failing business-boundary tests**

  Probar cancelación = estado + revisión financiera + `appointment.cancelled` + `appointment.slot_released`; reagendamiento = nuevo cupo + evento del cupo anterior solo si cambió; expiración condicional = `EXPIRED` + slot event. Forzar rollback por conflicto de outbox y comprobar que ninguna mutación queda persistida.

- [ ] **Step 2: Run focused tests to see red**

  Run: `cd server && pnpm test -- appointment-cancellation reschedule-appointment expire-pending-appointments --runInBand`

  Expected: FAIL sobre los nuevos contratos atómicos.

- [ ] **Step 3: Move event creation inside Prisma transactions**

  Generar identidades antes de abrir/reintentar la transacción, derivar `clinicId` de cita/agenda persistida, serializar horas ISO y eliminar los `emit(SLOT_RELEASED_EVENT)` posteriores al commit. Mantener únicamente emails/notificaciones locales que aún no migran.

- [ ] **Step 4: Run focused and integration tests**

  Run: `cd server && pnpm test -- appointment-cancellation reschedule-appointment expire-pending-appointments --runInBand`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add server/src/modules/appointments
  git commit -m "feat(appointments): persist slot events atomically"
  ```

### Task 4: Confirmación durable en conciliación de pago

**Files:**
- Modify: `server/src/modules/payments/domain/repositories/payment-reconciliation.repository.ts`
- Modify: `server/src/modules/payments/infrastructure/persistence/prisma-payment-reconciliation.repository.ts`
- Modify: `server/src/modules/payments/application/use-cases/reconcile-payment.use-case.ts`
- Modify: `server/src/modules/appointments/application/use-cases/confirm-appointment.use-case.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts`
- Test: closest payment reconciliation and confirm appointment specs/integration specs

**Interfaces:**
- Consumes: prebuilt `appointment.confirmed` event with `operationId = gatewayId` for payment reconciliation.
- Produces: an outbox event only when the appointment actually transitions into `CONFIRMED`.

- [ ] **Step 1: Write failing transition tests**

  Probar que `PENDING -> CONFIRMED` writes transaction/appointment/event together, replay of the same gateway operation is a no-op, rejected payment emits nothing, and manual confirmation persists the event even when the patient lacks an email user.

- [ ] **Step 2: Run focused tests to see red**

  Run: `cd server && pnpm test -- payment-reconciliation confirm-appointment --runInBand`

  Expected: FAIL because confirmation is still emitted after commit or not emitted by reconciliation.

- [ ] **Step 3: Implement atomic confirmation producers**

  Reuse the same event object through serializable retries, insert it only alongside an effective appointment transition, and retain the local mail event separately after commit.

- [ ] **Step 4: Run focused tests and commit**

  Run: `cd server && pnpm test -- payment-reconciliation confirm-appointment --runInBand`

  ```bash
  git add server/src/modules/payments server/src/modules/appointments
  git commit -m "feat(payments): publish confirmations through the outbox"
  ```

### Task 5: Producir cambios de paciente atómicamente

**Files:**
- Modify: `server/src/modules/patients/domain/repositories/patient.repository.ts`
- Modify: `server/src/modules/patients/infrastructure/persistence/prisma-patient.repository.ts`
- Modify: create/update/delete patient use cases and specs
- Modify: `server/src/modules/auth/application/use-cases/register-patient.use-case.ts`
- Modify: `server/src/modules/auth/application/use-cases/register-patient.use-case.spec.ts`

**Interfaces:**
- Consumes: `patient.created|updated|deleted` v1 events with global/multi-site `clinicId = null` and payload `{ patientId }`.
- Produces: repository create/update/delete methods that atomically persist all affected rows and one durable event.

- [ ] **Step 1: Write failing patient tests**

  Probar que create/register, profile+patient update and soft delete each request one durable operation, emit no local projection event, and roll back both business rows and outbox on failure.

- [ ] **Step 2: Run tests to see red**

  Run: `cd server && pnpm test -- create-patient update-patient delete-patient register-patient --runInBand`

  Expected: FAIL because current use cases emit after commit and update profile separately.

- [ ] **Step 3: Implement atomic patient repository operations**

  Accept a prebuilt event/operation identity, wrap profile and patient update in one `$transaction`, and insert the outbox row before commit. Remove EventEmitter2 from these use cases.

- [ ] **Step 4: Run tests and commit**

  Run: `cd server && pnpm test -- create-patient update-patient delete-patient register-patient --runInBand`

  ```bash
  git add server/src/modules/patients server/src/modules/auth
  git commit -m "feat(patients): persist projection events atomically"
  ```

### Task 6: Consumidor idempotente FHIR

**Files:**
- Modify: `server/src/modules/interoperability/domain/repositories/fhir-resource.repository.ts`
- Modify: `server/src/modules/interoperability/application/services/fhir-resource.service.ts`
- Modify: `server/src/modules/interoperability/infrastructure/persistence/prisma-fhir-resource.repository.ts`
- Modify: patient and encounter projection listeners and specs
- Modify: `server/src/modules/interoperability/application/interoperability.module.ts`
- Create: FHIR projection PostgreSQL integration spec

**Interfaces:**
- Produces: `applyProjection({ consumerName, eventId, upserts, deletes }): Promise<'applied' | 'duplicate'>`.
- Consumes: durable envelopes through exact versioned worker event names.

- [ ] **Step 1: Write failing redelivery tests**

  Probar que el mismo `(consumerName,eventId)` solo crea una versión de recurso/Provenance/historial; un eventId posterior crea la versión siguiente; cualquier fallo revierte recibo y todos los recursos; Encounter rehidrata con `appointment.id + clinicId`; Patient permanece sin filtro de sede.

- [ ] **Step 2: Run tests to see red**

  Run: `cd server && pnpm test -- patient-projection encounter-projection fhir-projection --runInBand`

  Expected: FAIL because receipt and multi-resource projection are absent.

- [ ] **Step 3: Implement atomic receipt and projection**

  Dentro de una sola `$transaction`, insertar recepción con unicidad, calcular las siguientes versiones, upsert resources, append history and apply deletes. Return duplicate without changing history when receipt already exists. Durable listeners must rethrow errors and must not retain the old event names.

- [ ] **Step 4: Run tests and commit**

  Run: `cd server && pnpm test -- patient-projection encounter-projection fhir-projection --runInBand`

  ```bash
  git add server/src/modules/interoperability
  git commit -m "feat(fhir): make outbox projections idempotent"
  ```

### Task 7: Consumidor durable de lista de espera

**Files:**
- Modify: `server/src/modules/waitlist/application/listeners/slot-released.listener.ts`
- Modify: `server/src/modules/waitlist/application/listeners/slot-released.listener.spec.ts`
- Modify if required: `server/src/modules/waitlist/application/waitlist.module.ts`

**Interfaces:**
- Consumes: `outbox.appointment.slot_released.v1` with payload `{ appointmentId, scheduleId, startTime, endTime }` and envelope `clinicId`.
- Produces: a handler that awaits `FindNextMatchUseCase` and propagates every failure to the worker.

- [ ] **Step 1: Write failing listener tests**

  Probar exact version routing, date deserialization, explicit clinic forwarding and rejection propagation. Verify the original `appointment.slot_released` route has no active matcher listener.

- [ ] **Step 2: Run test to see red**

  Run: `cd server && pnpm test -- slot-released.listener --runInBand`

  Expected: FAIL because the listener still catches and swallows errors on the local event.

- [ ] **Step 3: Switch to durable route and run tests**

  Run: `cd server && pnpm test -- slot-released.listener find-next-match --runInBand`

  Expected: PASS.

- [ ] **Step 4: Commit**

  ```bash
  git add server/src/modules/waitlist
  git commit -m "feat(waitlist): consume released slots durably"
  ```

### Task 8: Verificación transversal, documentación y revisión core

**Files:**
- Modify: `docs/domain/APPOINTMENT-CORE.md`
- Modify: `docs/SDD-hardening-integridad-seguridad-operacion.md`
- Modify: all files needed for review findings

**Interfaces:**
- Consumes: all SDD-019 deliverables.
- Produces: documented invariants and a verified completion marker.

- [ ] **Step 1: Run focused suites**

  Run: `cd server && pnpm test -- appointments waitlist payments patients interoperability outbox --runInBand`

  Expected: PASS.

- [ ] **Step 2: Run full backend verification**

  Run: `cd server && pnpm test -- --runInBand && pnpm build`

  Expected: PASS.

- [ ] **Step 3: Run modified-file lint**

  Run: `cd server && pnpm exec eslint <lista-exacta-de-archivos-ts-modificados>`

  Expected: PASS without bulk rewrites.

- [ ] **Step 4: Review business, tenant and delivery invariants**

  Aplicar `$mediclick-core-review`: verify same-transaction writes, no duplicated consumer routes, explicit clinic scope, payment/appointment state separation, redelivery idempotence, lease ownership and missing boundary tests. Fix every P0/P1 finding and rerun its closest test.

- [ ] **Step 5: Update documentation**

  Documentar los contratos versionados, productores atómicos, consumidores migrados, al-menos-una-vez y operación de replay; marcar SDD-019 como implementado sin cerrar SDD-020 a SDD-024.

- [ ] **Step 6: Commit**

  ```bash
  git add docs server
  git commit -m "docs(core): record transactional outbox invariants"
  ```
