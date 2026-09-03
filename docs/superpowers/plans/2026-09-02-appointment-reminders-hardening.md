# Appointment Reminders Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send T-24h and T-2h reminders at the clinic-local appointment instant, retry failed deliveries, keep reschedules eligible, and make public links safe against GET prefetching.

**Architecture:** A shared timezone helper combines the persisted local date and time into a real UTC instant. The scheduler scans a bounded calendar range, filters into disjoint 15-minute target windows, and claims one delivery row per appointment/kind/channel/scheduled instant before I/O. Public GET only redirects to a confirmation screen; POST performs the state transition.

**Tech Stack:** NestJS 11, Prisma 7/PostgreSQL, TypeScript, Jest 30, Nodemailer

**Spec:** `docs/ROADMAP-citas.md` section “Recordatorios + confirmación”

## Global Constraints

- Use clinic IANA timezone and `server/src/shared/utils/date-time.utils.ts` for instant calculations.
- T-24 and T-2 windows must be disjoint.
- Treat email `false` as failure and leave it retryable.
- Preserve `IN_PROGRESS`/`NO_SHOW` cancellation semantics as the documented open question; this plan only adds the required `COMPLETED` rejection.
- Keep slot release, waitlist, refund review, and outbox effects inside `AppointmentCancellationService`/repository.
- Preserve unrelated worktree changes.

---

### Task 1: Add a host-timezone-independent local appointment instant helper

**Files:**
- Modify: `server/src/shared/utils/date-time.utils.ts`
- Modify: `server/src/shared/utils/date-time.utils.spec.ts`

**Interfaces:**
- Produces: `localDateAndTimeToInstant(scheduleDate: Date, timeOnly: Date, timezone: string): Date`

- [x] **Step 1: Add failing Lima, UTC, and DST tests**

```ts
expect(localDateAndTimeToInstant(
  new Date('2026-10-10T00:00:00Z'),
  new Date('1970-01-01T09:30:00Z'),
  'America/Lima',
).toISOString()).toBe('2026-10-10T14:30:00.000Z');

expect(localDateAndTimeToInstant(
  new Date('2026-07-10T00:00:00Z'),
  new Date('1970-01-01T09:30:00Z'),
  'Europe/Madrid',
).toISOString()).toBe('2026-07-10T07:30:00.000Z');
```

Run the same spec once with `TZ=UTC` and once with `TZ=America/Lima`; results must be identical.

- [x] **Step 2: Run tests and observe the missing export**

```bash
cd server && TZ=UTC pnpm test -- date-time.utils.spec.ts --runInBand
```

Expected: FAIL because the helper is absent.

- [x] **Step 3: Implement conversion using `Intl.DateTimeFormat(...).formatToParts`**

Build wall-clock components from `scheduleDate.getUTC*()` and `timeOnly.getUTC*()`. Start with `Date.UTC(...)`, calculate the timezone offset by formatting that guess in the target zone, subtract the offset, and repeat once to handle DST offset changes. Validate the final formatted parts equal the requested wall clock; throw for an invalid/nonexistent local time instead of silently shifting it.

```ts
export function localDateAndTimeToInstant(
  scheduleDate: Date,
  timeOnly: Date,
  timezone: string,
): Date
```

- [x] **Step 4: Run timezone-independent tests**

```bash
cd server && TZ=UTC pnpm test -- date-time.utils.spec.ts --runInBand
cd server && TZ=America/Lima pnpm test -- date-time.utils.spec.ts --runInBand
```

Expected: both PASS.

- [x] **Step 5: Commit**

```bash
git add server/src/shared/utils/date-time.utils.ts server/src/shared/utils/date-time.utils.spec.ts
git commit -m "fix(time): derive appointment instants from clinic timezone"
```

### Task 2: Make reminder deliveries claimable, retryable, and reschedule-aware

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/<timestamp>_harden_appointment_reminder_deliveries/migration.sql`
- Create: `server/src/modules/scheduler/domain/repositories/appointment-reminder-delivery.repository.ts`
- Create: `server/src/modules/scheduler/infrastructure/persistence/prisma-appointment-reminder-delivery.repository.ts`
- Create: `server/src/modules/scheduler/infrastructure/persistence/prisma-appointment-reminder-delivery.repository.integration.spec.ts`
- Modify: `server/src/modules/scheduler/application/scheduler.module.ts`

**Interfaces:**
- Produces: `claim({ appointmentId, kind, channel, scheduledFor, now }): Promise<ReminderDeliveryClaim | null>`
- Produces: `markSent(id: number, claimToken: string, sentAt: Date): Promise<boolean>`
- Produces: `markFailed(id: number, claimToken: string, nextAttemptAt: Date, errorCode: string): Promise<boolean>`

- [x] **Step 1: Add an integration spec for one winner and retry-after-failure**

```ts
const claims = await Promise.all([
  repository.claim(input),
  repository.claim(input),
]);
expect(claims.filter(Boolean)).toHaveLength(1);
await repository.markFailed(claims[0]!.id, claims[0]!.claimToken, later, 'SMTP_FALSE');
await expect(repository.claim({ ...input, now: later })).resolves.not.toBeNull();
```

Also assert that the same appointment/kind/channel with a different `scheduledFor` can be claimed after rescheduling.

- [x] **Step 2: Run the integration spec and observe missing schema/repository**

```bash
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration -- prisma-appointment-reminder-delivery.repository.integration.spec.ts
```

Expected: FAIL before implementation.

- [x] **Step 3: Replace the delivery schema and migrate existing rows**

Add `ReminderDeliveryStatus { PROCESSING SENT FAILED }` and fields `scheduledFor DateTime`, `status`, `attemptCount`, `claimToken`, `lockedUntil`, `nextAttemptAt`, `lastError`, with nullable `sentAt`. Change uniqueness to:

```prisma
@@unique([appointmentId, kind, channel, scheduledFor])
@@index([status, nextAttemptAt])
```

The SQL migration must backfill existing `scheduledFor` from appointment `scheduleDate` + `startTime` + clinic timezone, set existing rows to `SENT`, then make the column non-null. Do not use `sentAt` as the scheduled instant because it would make an unchanged appointment eligible again.

- [x] **Step 4: Implement atomic claim ownership**

Create a row as `PROCESSING` with a random claim token and five-minute `lockedUntil`. On unique conflict, use one conditional `updateMany` to reclaim only `FAILED` rows whose `nextAttemptAt <= now` or expired `PROCESSING` rows. `markSent` and `markFailed` must predicate on both `id` and `claimToken`; stale owners return `false`.

- [x] **Step 5: Register the repository provider and pass the integration spec**

```bash
cd server && pnpm exec prisma generate
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration -- prisma-appointment-reminder-delivery.repository.integration.spec.ts
```

- [x] **Step 6: Commit**

```bash
git add server/prisma server/src/modules/scheduler
git commit -m "fix(reminders): persist retryable delivery claims"
```

### Task 3: Select real appointment instants in disjoint cadence windows

**Files:**
- Modify: `server/src/modules/scheduler/domain/services/appointment-reminder.service.ts`
- Modify: `server/src/modules/scheduler/domain/services/appointment-reminder.service.spec.ts`
- Modify: `server/src/shared/mail/mail.service.ts`
- Create: `server/src/shared/mail/mail.service.spec.ts`

**Interfaces:**
- Consumes: `localDateAndTimeToInstant` from Task 1
- Consumes: reminder delivery repository from Task 2
- Produces: optional `SendMailOptions.messageId?: string` mapped to Nodemailer `messageId`

- [ ] **Step 1: Replace unrealistic start-time fixtures and add boundary tests**

All appointment fixtures must use `startTime: new Date('1970-01-01T...Z')`. Freeze `now` and assert:

```ts
// Eligible only for T24: delta in (23h45m, 24h]
// Eligible only for T2:  delta in (1h45m, 2h]
// Delta 2h must never be delivered as T24.
// Madrid and Lima appointments map to their own UTC instants.
// mailService.send() === false calls markFailed, never markSent.
```

- [ ] **Step 2: Run the scheduler spec and observe selection/delivery failures**

```bash
cd server && pnpm test -- appointment-reminder.service.spec.ts --runInBand
```

- [ ] **Step 3: Query by calendar date, then filter by the computed instant**

Query confirmed, non-deleted appointments whose `schedule.scheduleDate` is between UTC midnight yesterday and two days ahead. Do not compare `startTime` to `now`. Compute `deltaMs = scheduledFor.getTime() - now.getTime()` and use:

```ts
const CRON_INTERVAL_MS = 15 * 60_000;
const inTargetWindow = (deltaMs: number, targetMs: number) =>
  deltaMs > targetMs - CRON_INTERVAL_MS && deltaMs <= targetMs;
```

Process T24 and T2 from one candidate read so an appointment cannot enter inconsistent snapshots. T2 still requires `confirmedAt === null`; T24 and T2 have no overlap.

- [ ] **Step 4: Claim and mark each channel around real I/O**

Claim `EMAIL` only when an address exists and `IN_APP` only when a user exists. Use a deterministic email Message-ID such as `<appointment-{id}-{kind}-{scheduledForEpoch}@mediclick>` as the provider idempotency hint. A delivery succeeds only when `MailService.send()` returns `true` or the in-app use case resolves. On failure call `markFailed` with bounded error codes and exponential backoff; do not store message bodies or recipient PII in `lastError`.

Set `reminderSent=true` and, for T2, `isAtRisk=true` only if at least one channel was marked sent.

- [ ] **Step 5: Run focused tests and lint modified files**

```bash
cd server && pnpm test -- appointment-reminder.service.spec.ts mail.service.spec.ts --runInBand
cd server && pnpm exec eslint src/modules/scheduler/domain/services/appointment-reminder.service.ts src/shared/mail/mail.service.ts
```

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/scheduler server/src/shared/mail
git commit -m "fix(reminders): send by clinic-local cadence windows"
```

### Task 4: Make reminder responses safe and reset state on reschedule

**Files:**
- Modify: `server/src/modules/appointments/interfaces/controllers/appointment.controller.ts`
- Create: `server/src/modules/appointments/interfaces/controllers/appointment.controller.spec.ts`
- Modify: `server/src/modules/appointments/application/use-cases/respond-appointment-reminder.use-case.ts`
- Modify: `server/src/modules/appointments/application/use-cases/respond-appointment-reminder.use-case.spec.ts`
- Modify: `server/src/modules/appointments/application/use-cases/reschedule-appointment.use-case.ts`
- Modify: `server/src/modules/appointments/application/use-cases/reschedule-appointment.use-case.spec.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment-outbox.integration.spec.ts`
- Create: `client/src/app/appointment/respond/page.tsx`
- Modify: `client/src/services/appointments.service.ts`
- Modify: `docs/domain/APPOINTMENT-CORE.md`

**Interfaces:**
- Produces: `GET /appointments/actions/respond?token=...` preview redirect only
- Preserves: `POST /appointments/actions/respond { token }` as the only mutation route

- [ ] **Step 1: Add controller and use-case regression tests**

```ts
await controller.respondToReminder(token, response);
expect(respondUseCase.execute).not.toHaveBeenCalled();
expect(response.redirect).toHaveBeenCalledWith(
  expect.stringContaining('/appointment/respond?token='),
);

appointmentRepo.findById.mockResolvedValue(
  buildAppointment({ status: AppointmentStatus.COMPLETED }),
);
await expect(cancelUseCase.execute(cancelToken)).rejects.toThrow(ConflictException);
expect(cancellationService.cancel).not.toHaveBeenCalled();
```

Add a reschedule integration assertion that `confirmedAt` becomes null, `isAtRisk` becomes false, and a new scheduled instant can claim T24/T2 without deleting historical sent rows.

- [ ] **Step 2: Run tests and observe failures**

```bash
cd server && pnpm test -- appointment.controller.spec.ts respond-appointment-reminder reschedule-appointment --runInBand
```

- [ ] **Step 3: Remove all mutation from GET**

GET may validate only the token shape/signature and redirect to `${CLIENT_URL}/appointment/respond?token=${encodeURIComponent(token)}`. Remove the `redirect=false` mutation escape hatch. POST continues to call `execute(dto.token)`. Update email links to target GET previews. Create the client page so it displays the decoded action as a confirmation prompt and calls a new `appointmentsService.respondToReminder(token)` POST method only after the user presses the confirm/cancel button; mounting/rendering the page must perform no mutation.

- [ ] **Step 4: Reject completed cancellation and reset reminder state atomically on reschedule**

In the CANCEL branch, reject `COMPLETED` before invoking `AppointmentCancellationService`. In `rescheduleWithOverlapCheck`, set the following in the same transaction as the slot move:

```ts
confirmedAt: null,
isAtRisk: false,
reminderSent: false,
```

Do not delete delivery history; Task 2's `scheduledFor` uniqueness makes the new appointment instant independently eligible.

- [ ] **Step 5: Run focused and database tests**

```bash
cd server && pnpm test -- appointment.controller.spec.ts respond-appointment-reminder reschedule-appointment --runInBand
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration -- prisma-appointment-outbox.integration.spec.ts
cd server && pnpm build
cd client && pnpm lint
cd client && pnpm build
cd client && pnpm test:a11y
```

- [ ] **Step 6: Commit**

Before committing, document the implemented T-24/T-2 cadence, POST-only mutation, retryable delivery claims, and reschedule reset in `docs/domain/APPOINTMENT-CORE.md`.

```bash
git add server/src/modules/appointments server/src/modules/scheduler/domain/services/appointment-reminder.service.ts client/src/app/appointment/respond/page.tsx client/src/services/appointments.service.ts docs/domain/APPOINTMENT-CORE.md
git commit -m "fix(appointments): require POST for reminder actions"
```
