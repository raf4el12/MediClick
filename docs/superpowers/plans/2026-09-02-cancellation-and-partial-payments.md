# Cancellation Policy and Partial Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply clinic cancellation/no-show policy correctly and reconcile deposits without losing the total price or outstanding balance.

**Architecture:** Appointment relation snapshots carry the clinic policy required by application logic, while nullable specialty policy means “inherit clinic.” Each approved transaction remains `PAID`; the appointment aggregate becomes `PARTIAL` until cumulative approved value reaches `Appointments.amount`. Cancellation and rescheduling treat both partial and full funding as financially relevant.

**Tech Stack:** NestJS 11, Prisma 7/PostgreSQL, TypeScript, Jest integration tests, Mercado Pago adapter

**Spec:** `docs/domain/APPOINTMENT-CORE.md` sections “Estados independientes” and “Pago y cancelación”

## Global Constraints

- `Appointments.amount` is always the total consultation price; never overwrite it with a transaction amount.
- A successful deposit transaction is `PAID`; `Appointments.paymentStatus` is `PARTIAL` until the cumulative paid total covers the price.
- A deposit may confirm the held appointment while financial status remains `PARTIAL`.
- Specialty cancellation window precedence is explicit specialty value, then clinic default, then 24 hours.
- Transactional reconciliation stays serializable and idempotent by `gatewayId`.
- Preserve unrelated worktree changes.

---

### Task 1: Load clinic policy and restore nullable specialty inheritance

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/<timestamp>_restore_specialty_policy_inheritance/migration.sql`
- Modify: `server/src/modules/specialties/infrastructure/persistence/prisma-specialty.repository.ts`
- Create: `server/src/modules/specialties/infrastructure/persistence/prisma-specialty.repository.spec.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts`
- Modify: `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.spec.ts`
- Modify: `server/src/modules/appointments/application/use-cases/mark-no-show-appointment.use-case.spec.ts`

**Interfaces:**
- Produces: `AppointmentWithRelations.schedule.doctor.clinic.defaultCancellationWindowHours: number`
- Produces: `AppointmentWithRelations.schedule.doctor.clinic.noShowPenaltyPercentage: number`
- Preserves: `SpecialtyEntity.cancellationWindowHours: number | null`

- [x] **Step 1: Add failing policy selection tests**

```ts
expect(repositoryMapped.cancellationWindowHours).toBeNull();

// specialty null + clinic 48 => resolve 48
expect(cancellationPolicy.resolveWindowHours({
  specialtyWindowHours: null,
  clinicDefaultWindowHours: 48,
})).toBe(48);

// clinic no-show 25% over PEN 200 => PEN 50
expect(updatedFee).toBe(50);
```

Also assert a specialty explicit value of 12 still overrides clinic 48.

- [x] **Step 2: Run focused tests and observe defaults/missing selects**

```bash
cd server && pnpm test -- prisma-specialty.repository cancel-appointment mark-no-show --runInBand
```

- [x] **Step 3: Migrate specialty policy semantics**

Change `cancellationWindowHours Int? @default(24)` to `Int?`. Because the field was introduced with 24 as a blanket default, migrate rows whose value is 24 to null, preserve non-24 explicit overrides, then remove the database default:

```sql
UPDATE "Specialties" SET "cancellationWindowHours" = NULL
WHERE "cancellationWindowHours" = 24;
ALTER TABLE "Specialties" ALTER COLUMN "cancellationWindowHours" DROP DEFAULT;
```

Document in the migration comment that an explicit 24-hour override must be re-entered after rollout if one existed independently of the old default.

- [x] **Step 4: Preserve nulls and select clinic policy fields**

Replace every repository mapping `result.cancellationWindowHours ?? 24` with `result.cancellationWindowHours`. Extend `appointmentInclude.schedule.doctor.clinic.select` with `defaultCancellationWindowHours` and `noShowPenaltyPercentage`, map Decimal percentage to number in the domain relation, and remove unsafe casts from both use cases.

- [x] **Step 5: Run tests, Prisma generation, and lint**

```bash
cd server && pnpm exec prisma generate
cd server && pnpm test -- prisma-specialty.repository cancellation-policy cancel-appointment mark-no-show --runInBand
cd server && pnpm exec eslint src/modules/specialties/infrastructure/persistence/prisma-specialty.repository.ts src/modules/appointments/application/use-cases/cancel-appointment.use-case.ts src/modules/appointments/application/use-cases/mark-no-show-appointment.use-case.ts
```

- [x] **Step 6: Commit**

```bash
git add server/prisma server/src/modules/specialties server/src/modules/appointments
git commit -m "fix(cancellation): inherit and load clinic policy"
```

### Task 2: Create deposit and balance preferences without changing total price

**Files:**
- Modify: `server/src/modules/payments/application/use-cases/create-payment-preference.use-case.ts`
- Modify: `server/src/modules/payments/application/use-cases/create-payment-preference.use-case.spec.ts`

**Interfaces:**
- Produces: preference amount equal to deposit for `PENDING`, remaining balance for `PARTIAL`
- Preserves: `Appointments.amount` as total and `Appointments.depositAmount` as required initial deposit

- [x] **Step 1: Add failing deposit and balance tests**

```ts
// Initial deposit
expect(gateway.createPreference).toHaveBeenCalledWith(
  expect.objectContaining({ items: [expect.objectContaining({ unitPrice: 50 })] }),
);

// Existing PARTIAL appointment, total 200, paid transactions 50 => charge 150
expect(gateway.createPreference).toHaveBeenCalledWith(
  expect.objectContaining({ items: [expect.objectContaining({ unitPrice: 150 })] }),
);
expect(prisma.appointments.update).not.toHaveBeenCalledWith(
  expect.objectContaining({ data: expect.objectContaining({ amount: 50 }) }),
);
```

Reject a balance preference when cumulative paid value already covers the total, and reject a second unresolved `PENDING` transaction/preference for the same appointment.

- [x] **Step 2: Run the preference spec and observe `PARTIAL` rejection**

```bash
cd server && pnpm test -- create-payment-preference.use-case.spec.ts --runInBand
```

- [x] **Step 3: Implement phase-aware amount calculation**

Allow `(paymentStatus=PENDING,status=PENDING)` for the initial payment and `(paymentStatus=PARTIAL,status=CONFIRMED)` for the balance. Sum appointment transactions with `status='PAID'`; calculate:

```ts
const remaining = roundMoney(totalPrice - paidTotal);
const amount = appointment.paymentStatus === 'PARTIAL'
  ? remaining
  : clampDeposit(requiredDeposit, totalPrice);
```

Set `depositAmount` only for the initial preference. Label balance checkout as `Saldo: {specialty}`. Never update `amount` here.

- [x] **Step 4: Run focused tests**

```bash
cd server && pnpm test -- create-payment-preference.use-case.spec.ts --runInBand
```

- [x] **Step 5: Commit**

```bash
git add server/src/modules/payments/application/use-cases/create-payment-preference.use-case.ts server/src/modules/payments/application/use-cases/create-payment-preference.use-case.spec.ts
git commit -m "fix(payments): charge deposits and remaining balances"
```

### Task 3: Reconcile cumulative paid value into the appointment aggregate

**Files:**
- Modify: `server/src/modules/payments/infrastructure/persistence/prisma-payment-reconciliation.repository.ts`
- Modify: `server/src/modules/payments/domain/repositories/payment-reconciliation.repository.ts`
- Modify: `server/src/modules/payments/infrastructure/persistence/prisma-payment-reconciliation.repository.integration.spec.ts`
- Modify: `server/src/modules/payments/application/use-cases/handle-payment-webhook.use-case.spec.ts`

**Interfaces:**
- Produces: `PaymentReconciliationResult.paymentStatus` as aggregate `PARTIAL | PAID | ...`
- Preserves: the individual provider transaction status from `VerifiedPaymentSnapshot.status`

- [x] **Step 1: Add real PostgreSQL deposit tests**

Create a PEN 200 pending appointment. Reconcile a unique approved PEN 50 snapshot and assert:

```ts
expect(persisted).toMatchObject({
  status: 'CONFIRMED',
  paymentStatus: 'PARTIAL',
});
expect(Number(persisted.amount)).toBe(200);
expect(transaction.status).toBe('PAID');
expect(Number(transaction.amount)).toBe(50);
```

Then reconcile an approved PEN 150 balance and assert aggregate `PAID`, total still 200, two paid transactions, and no duplicate confirmation event. Redeliver each gateway snapshot and assert totals do not double count.

- [x] **Step 2: Run integration tests and observe amount overwrite**

```bash
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration -- prisma-payment-reconciliation.repository.integration.spec.ts
```

- [x] **Step 3: Compute aggregate status inside the serializable transaction**

After upserting the transaction, aggregate `SUM(amount)` over `Transactions` for this appointment with `status='PAID'`. With total `Number(appointment.amount)`:

```ts
const aggregatePaymentStatus = paidTotal <= 0
  ? snapshot.status
  : paidTotal + 0.005 < totalAmount
    ? 'PARTIAL'
    : 'PAID';
```

Never write `amount: snapshot.amount` to `Appointments`. An approved initial or balance payment confirms only a still-`PENDING` appointment; a cancelled appointment remains cancelled and gets financial review. Emit `appointment.confirmed` only for the actual PENDING-to-CONFIRMED transition.

- [x] **Step 4: Pass integration and webhook tests**

```bash
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration -- prisma-payment-reconciliation.repository.integration.spec.ts
cd server && pnpm test -- handle-payment-webhook.use-case.spec.ts --runInBand
```

- [x] **Step 5: Commit**

```git
git add server/src/modules/payments
git commit -m "fix(payments): reconcile deposits as partial funding"
```

### Task 4: Carry partial funding through cancellation, no-show, and rescheduling

**Files:**
- Modify: `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.ts`
- Modify: `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.spec.ts`
- Modify: `server/src/modules/appointments/application/use-cases/mark-no-show-appointment.use-case.ts`
- Modify: `server/src/modules/appointments/application/use-cases/mark-no-show-appointment.use-case.spec.ts`
- Modify: `server/src/modules/appointments/application/use-cases/reschedule-appointment.use-case.ts`
- Modify: `server/src/modules/appointments/application/use-cases/reschedule-appointment.use-case.spec.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment-outbox.integration.spec.ts`

**Interfaces:**
- Consumes: aggregate `Appointments.paymentStatus` semantics from Task 3
- Produces: every paid transaction on a cancelled appointment is marked for manual refund review

- [x] **Step 1: Add PARTIAL regression tests**

Assert that PARTIAL reschedule remains confirmed and gets no new payment deadline, PARTIAL no-show retains at most the paid deposit, and cancellation marks all successful transactions for refund review rather than only the latest one.

```ts
expect(rescheduled).toMatchObject({ status: 'CONFIRMED', paymentStatus: 'PARTIAL' });
expect(refundFlaggedTransactionIds).toEqual(expect.arrayContaining([depositTxId]));
```

- [x] **Step 2: Run appointment tests and observe PAID-only branches**

```bash
cd server && pnpm test -- cancel-appointment mark-no-show reschedule-appointment --runInBand
```

- [x] **Step 3: Treat partial funding as paid value, not full payment**

Use `paymentStatus === 'PAID' || paymentStatus === 'PARTIAL'` only where the question is “has money been collected?” Do not use it where the question is “is the full balance paid?”. In `cancelAtomically`, load all `PAID` transactions and mark each with `needsRefund`; preserve cancellation fee metadata without claiming an automatic refund.

- [x] **Step 4: Run focused, integration, and build checks**

```bash
cd server && pnpm test -- cancel-appointment mark-no-show reschedule-appointment --runInBand
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration -- prisma-appointment-outbox.integration.spec.ts prisma-payment-reconciliation.repository.integration.spec.ts
cd server && pnpm build
```

- [x] **Step 5: Update implemented behavior documentation and commit**

Update `docs/domain/APPOINTMENT-CORE.md` so payment confirmation says an approved required deposit confirms the appointment with aggregate `PARTIAL`, while full cumulative funding sets `PAID`.

```bash
git add server/src/modules/appointments docs/domain/APPOINTMENT-CORE.md
git commit -m "fix(appointments): preserve partial funding downstream"
```
