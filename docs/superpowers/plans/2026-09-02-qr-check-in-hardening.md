# QR Check-In Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make QR check-in issuable, clinic-authenticated, time-bound in the clinic timezone, and atomic against cancellation.

**Architecture:** An authenticated issuance use case loads the appointment, authorizes owner/clinic access, computes the arrival window from persisted date/time/timezone, and signs a token expiring when that window closes. Consumption requires authenticated clinic-scoped staff; the body contains only the QR token. A conditional repository transition is the concurrency boundary and emits the checked-in event only for the winning transition.

**Tech Stack:** NestJS 11, Prisma 7/PostgreSQL, HMAC SHA-256, PBAC/JWT, TypeScript, Jest

**Spec:** `docs/domain/APPOINTMENT-CORE.md` appointment state machine and open question 2

## Global Constraints

- Default arrival window is 30 minutes before through 15 minutes after appointment start.
- Compute both boundaries from `scheduleDate`, time-only `startTime`, and clinic IANA timezone.
- Revalidate the persisted appointment window during consumption; token expiry alone is insufficient.
- Remove client-controlled `kioskClinicId`; clinic scope comes from authenticated staff.
- Preserve currently implemented `PENDING` and `CONFIRMED` eligibility. Do not resolve the open unpaid-check-in question in this remediation.
- Update and event must occur only for the single conditional winner.
- Preserve unrelated worktree changes.

---

### Task 1: Model and test the clinic-local arrival window

**Files:**
- Create: `server/src/modules/appointments/domain/services/check-in-window.service.ts`
- Create: `server/src/modules/appointments/domain/services/check-in-window.service.spec.ts`

**Interfaces:**
- Consumes: `localDateAndTimeToInstant` from the reminder hardening plan
- Produces: `getWindow(input): { opensAt: Date; startsAt: Date; closesAt: Date }`
- Produces: `isOpen(input, now: Date): boolean`

- [x] **Step 1: Add boundary and timezone tests**

```ts
const window = service.getWindow({
  scheduleDate: new Date('2026-10-10T00:00:00Z'),
  startTime: new Date('1970-01-01T09:00:00Z'),
  timezone: 'America/Lima',
});
expect(window).toEqual({
  opensAt: new Date('2026-10-10T13:30:00Z'),
  startsAt: new Date('2026-10-10T14:00:00Z'),
  closesAt: new Date('2026-10-10T14:15:00Z'),
});
expect(service.isOpen(input, window.opensAt)).toBe(true);
expect(service.isOpen(input, window.closesAt)).toBe(true);
expect(service.isOpen(input, new Date(window.opensAt.getTime() - 1))).toBe(false);
```

Add a Madrid DST fixture and run under different host `TZ` values.

- [x] **Step 2: Run the spec and observe missing service**

```bash
cd server && TZ=UTC pnpm test -- check-in-window.service.spec.ts --runInBand
```

- [x] **Step 3: Implement a pure domain service**

```ts
export const CHECK_IN_EARLY_MINUTES = 30;
export const CHECK_IN_LATE_MINUTES = 15;
```

Call the shared instant helper, subtract/add the constants, and use inclusive open/close comparisons. Do not import NestJS or Prisma.

- [x] **Step 4: Pass timezone tests and commit**

```bash
cd server && TZ=UTC pnpm test -- check-in-window.service.spec.ts --runInBand
cd server && TZ=America/Lima pnpm test -- check-in-window.service.spec.ts --runInBand
git add server/src/modules/appointments/domain/services/check-in-window.service.ts server/src/modules/appointments/domain/services/check-in-window.service.spec.ts
git commit -m "feat(appointments): define clinic-local check-in window"
```

### Task 2: Expose an authorized QR issuance route with correct expiry

**Files:**
- Create: `server/src/modules/appointments/application/use-cases/issue-appointment-qr.use-case.ts`
- Create: `server/src/modules/appointments/application/use-cases/issue-appointment-qr.use-case.spec.ts`
- Create: `server/src/modules/appointments/application/dto/appointment-qr-response.dto.ts`
- Modify: `server/src/modules/appointments/application/services/appointment-qr.service.ts`
- Modify: `server/src/modules/appointments/application/services/appointment-qr.service.spec.ts`
- Modify: `server/src/shared/access/appointment-access.policy.ts`
- Modify: `server/src/shared/access/appointment-access.policy.spec.ts`
- Modify: `server/src/modules/appointments/interfaces/controllers/appointment.controller.ts`
- Modify: `server/src/modules/appointments/application/appointments.module.ts`

**Interfaces:**
- Produces: `GET /appointments/:id/check-in-qr`
- Produces: `{ appointmentId: number; qrToken: string; opensAt: Date; expiresAt: Date }`
- Produces: `generateCheckInQrToken(appointmentIdentity, expiresAt: Date): string`

- [x] **Step 1: Add issuance access tests**

Assert the patient owner can issue their QR, another patient gets 404, same-clinic receptionist can issue, another-clinic staff gets 404, a doctor can issue only for their appointment, and a global admin can issue. Reuse an `ISSUE_QR` operation in `AppointmentAccessPolicy` with the same resource shape used by other appointment operations.

- [x] **Step 2: Add expiry tests using persisted 1970 time-only data**

```ts
const result = await useCase.execute(42, actor);
expect(result.expiresAt.toISOString()).toBe('2026-10-10T14:15:00.000Z');
expect(qrService.generateCheckInQrToken).toHaveBeenCalledWith(
  { appointmentId: 42, patientId: 10, clinicId: 1 },
  result.expiresAt,
);
```

- [x] **Step 3: Run focused specs and observe absent route/use case**

```bash
cd server && pnpm test -- issue-appointment-qr appointment-qr.service appointment-access.policy --runInBand
```

- [x] **Step 4: Move expiry calculation out of the HMAC service**

The QR service accepts an already-computed `expiresAt` and writes `exp = Math.floor(expiresAt.getTime() / 1000)`. Remove `setHours` and the fixed four-hour offset. The issuance use case derives clinic from `appointment.schedule.doctor.clinic?.id ?? appointment.clinicId`, derives timezone from that persisted relation, computes the window, and signs the identity.

- [x] **Step 5: Register and expose the authenticated route**

Decorate it with `@Auth()` and `@RequirePermissions('READ', 'APPOINTMENTS')`, pass `@CurrentUser() actor`, document 200/404, and return the DTO. Do not expose HMAC secrets or allow caller-supplied expiry/clinic/patient fields.

- [x] **Step 6: Run specs, build, and commit**

```bash
cd server && pnpm test -- issue-appointment-qr appointment-qr.service appointment-access.policy --runInBand
cd server && pnpm build
git add server/src/modules/appointments server/src/shared/access
git commit -m "feat(appointments): expose authorized check-in QR"
```

### Task 3: Derive the consuming clinic from authenticated staff and enforce the window

**Files:**
- Modify: `server/src/modules/appointments/application/dto/process-qr-check-in.dto.ts`
- Modify: `server/src/modules/appointments/interfaces/controllers/appointment.controller.ts`
- Modify: `server/src/modules/appointments/application/use-cases/process-qr-check-in.use-case.ts`
- Modify: `server/src/modules/appointments/application/use-cases/process-qr-check-in.use-case.spec.ts`
- Create: `server/src/modules/appointments/interfaces/controllers/appointment-qr.controller.spec.ts`

**Interfaces:**
- Produces: `execute(dto: ProcessQrCheckInDto, actor: AuthenticatedUser)`
- Consumes: `CheckInWindowService` from Task 1
- Removes: `ProcessQrCheckInDto.kioskClinicId`

- [x] **Step 1: Add authentication and tenant tests**

```ts
await expect(useCase.execute(dto, patientActor)).rejects.toThrow(ForbiddenException);
await expect(useCase.execute(dto, globalAdminWithoutClinic)).rejects.toThrow(ForbiddenException);
await expect(useCase.execute(dto, otherClinicStaff)).rejects.toThrow(NotFoundException);
await expect(useCase.execute(dto, sameClinicReceptionist)).resolves.toBeDefined();
```

Assert the controller has auth/permission behavior and passes the full current actor. Assert DTO validation rejects/strips `kioskClinicId` instead of trusting it.

- [x] **Step 2: Add arrival-window rejection tests**

Freeze time at one millisecond before open and after close; both reject without repository update/event. Test exact open and close boundaries as allowed. Use an appointment `startTime` with the 1970 base.

- [x] **Step 3: Run focused tests and observe body-trusted clinic/no time check**

```bash
cd server && pnpm test -- process-qr-check-in appointment-qr.controller --runInBand
```

- [x] **Step 4: Authenticate the route and scope the use case**

Add `@Auth()` plus `@RequirePermissions('UPDATE', 'APPOINTMENTS')` to POST `actions/qr-check-in`. Reject patient actors and actors without a clinic. Compare `actor.clinicId` to the persisted appointment clinic; return 404 for a different clinic. Ignore the signed payload clinic for authorization—it is an integrity hint only.

- [x] **Step 5: Recompute and enforce the persisted window**

Use the persisted schedule date, appointment start time, and clinic timezone. Check `isOpen(..., now)` before mutation; the error should state that check-in is outside the arrival window without leaking another clinic’s appointment details.

- [x] **Step 6: Pass tests and commit**

```bash
cd server && pnpm test -- process-qr-check-in appointment-qr.controller --runInBand
git add server/src/modules/appointments
git commit -m "fix(appointments): authenticate and time-bound QR check-in"
```

### Task 4: Make the QR state transition single-winner against cancellation

**Files:**
- Modify: `server/src/modules/appointments/domain/repositories/appointment.repository.ts`
- Modify: `server/src/modules/appointments/domain/interfaces/appointment-data.interface.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts`
- Create: `server/src/modules/appointments/infrastructure/persistence/prisma-qr-check-in.integration.spec.ts`
- Modify: `server/src/modules/appointments/application/use-cases/process-qr-check-in.use-case.ts`
- Modify: `server/src/modules/appointments/application/use-cases/process-qr-check-in.use-case.spec.ts`

**Interfaces:**
- Produces: `checkInAtomically(input: { appointmentId: number; clinicId: number; checkedInAt: Date }): Promise<AppointmentWithRelations | null>`

- [ ] **Step 1: Add a real cancellation/check-in race test**

For multiple iterations, race `AppointmentCancellationService.cancel(...)` with `checkInAtomically(...)`. Assert the final state is only `CANCELLED` or `IN_PROGRESS`, never a cancelled-then-revived write. If cancellation wins, the check-in returns null and emits no checked-in event. If check-in wins, exactly one caller receives the updated row.

- [ ] **Step 2: Add a duplicate scan test**

Run two concurrent atomic check-ins for the same appointment and assert one non-null result, one null result, and one `checkedInAt` value.

- [ ] **Step 3: Run integration tests and observe non-atomic behavior**

```bash
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration -- prisma-qr-check-in.integration.spec.ts
```

- [ ] **Step 4: Implement the conditional transition**

Inside one transaction, execute `updateMany` with explicit predicates for `id`, `deleted=false`, clinic scope, and `status in ['PENDING','CONFIRMED']`. Set `IN_PROGRESS`, `checkedInAt`, and `updatedAt`. If count is not one, return null; otherwise read the updated relation before commit. Do not use a pre-read as the concurrency guard.

- [ ] **Step 5: Emit only after an atomic win**

The use case may pre-read for display/window validation, but it must call `checkInAtomically` and treat null as `ConflictException`. Build the ticket and emit `appointment.checked_in` from the returned row, not the stale pre-read. Redact patient name from operational logs.

- [ ] **Step 6: Run all QR checks and build**

```bash
cd server && pnpm test -- appointment-qr issue-appointment-qr process-qr-check-in check-in-window --runInBand
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration -- prisma-qr-check-in.integration.spec.ts
cd server && pnpm build
```

- [ ] **Step 7: Update core behavior and commit**

Document the 30/15-minute clinic-local arrival window, trusted clinic-scoped consumer, and conditional transition in `docs/domain/APPOINTMENT-CORE.md`. Keep the existing open question about PENDING check-in.

```bash
git add server/src/modules/appointments docs/domain/APPOINTMENT-CORE.md
git commit -m "fix(appointments): make QR check-in atomic"
```

