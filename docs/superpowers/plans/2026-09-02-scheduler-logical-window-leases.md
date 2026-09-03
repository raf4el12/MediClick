# Logical-Window Scheduler Leases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee that one scheduler job runs at most once per logical cron window across replicas, and that Redis degradation does not make every replica execute it.

**Architecture:** The lease key includes the job name and a caller-supplied UTC window identifier. Successful execution leaves the key alive until its TTL, so a later replica in the same window cannot reacquire it. Acquisition errors return a non-executed result (fail-closed); job bodies remain idempotent for later windows.

**Tech Stack:** NestJS 11, TypeScript, ioredis, Jest 30

**Spec:** `docs/SDD-hardening-integridad-seguridad-operacion.md` section 6.5.2

## Global Constraints

- Preserve the existing application/domain/infrastructure/interfaces boundaries.
- Do not release a successful logical-window marker when the callback ends.
- A Redis acquisition error must never execute the callback.
- Use UTC epoch arithmetic to derive windows; do not depend on host timezone.
- Preserve unrelated worktree changes.

---

### Task 1: Change the lease contract from concurrent lock to logical-window claim

**Files:**
- Modify: `server/src/shared/redis/job-lease.service.ts`
- Modify: `server/src/shared/redis/job-lease.service.spec.ts`

**Interfaces:**
- Produces: `withLease<T>(jobName: string, windowId: string, ttlSeconds: number, fn: () => Promise<T>): Promise<JobLeaseResult<T>>`
- Produces: `JobLeaseResult.skippedReason?: 'ALREADY_CLAIMED' | 'LEASE_UNAVAILABLE'`

- [x] **Step 1: Replace tests that expect deletion and local fallback**

Add focused cases asserting the exact key and fail-closed result:

```ts
expect(redisClient.set).toHaveBeenCalledWith(
  'job:lease:test-job:2026-09-02T10:15Z',
  expect.any(String),
  'PX',
  900_000,
  'NX',
);
expect(redisClient.eval).not.toHaveBeenCalled();

redisClient.set.mockRejectedValue(new Error('Connection refused'));
await expect(
  service.withLease('test-job', '2026-09-02T10:15Z', 900, task),
).resolves.toEqual({
  executed: false,
  skippedReason: 'LEASE_UNAVAILABLE',
});
expect(task).not.toHaveBeenCalled();
```

Also test that a callback exception deletes only the caller-owned key, allowing a retry in the same window:

```ts
redisClient.set.mockResolvedValue('OK');
redisClient.eval.mockResolvedValue(1);
await expect(
  service.withLease('test-job', 'window-1', 60, async () => {
    throw new Error('job failed');
  }),
).rejects.toThrow('job failed');
expect(redisClient.eval).toHaveBeenCalledWith(
  expect.any(String), 1, 'job:lease:test-job:window-1', expect.any(String),
);
```

- [x] **Step 2: Run the lease spec and observe the contract failures**

```bash
cd server && pnpm test -- job-lease.service.spec.ts --runInBand
```

Expected: FAIL because `windowId` is not accepted, success deletes the key, and Redis errors execute the callback.

- [x] **Step 3: Implement the logical-window contract**

Use `const key = \`job:lease:${jobName}:${windowId}\``. Return `ALREADY_CLAIMED` when `SET NX` returns null and `LEASE_UNAVAILABLE` when `SET` throws. Execute `fn` only after `OK`. Do not run the owner-delete Lua script after success; run it in `catch` before rethrowing so a genuine failed attempt can retry within the same window. Keep logs free of callback data.

```ts
export interface JobLeaseResult<T> {
  executed: boolean;
  result?: T;
  skippedReason?: 'ALREADY_CLAIMED' | 'LEASE_UNAVAILABLE';
}
```

- [x] **Step 4: Run the focused spec**

```bash
cd server && pnpm test -- job-lease.service.spec.ts --runInBand
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add server/src/shared/redis/job-lease.service.ts server/src/shared/redis/job-lease.service.spec.ts
git commit -m "fix(scheduler): claim jobs by logical window"
```

### Task 2: Supply deterministic window identifiers from every scheduled caller

**Files:**
- Create: `server/src/shared/redis/job-window.ts`
- Create: `server/src/shared/redis/job-window.spec.ts`
- Modify: `server/src/modules/appointments/application/use-cases/expire-pending-appointments.use-case.ts`
- Modify: `server/src/modules/appointments/application/use-cases/expire-pending-appointments.use-case.spec.ts`
- Modify: `server/src/modules/scheduler/domain/services/appointment-reminder.service.ts`
- Modify: `server/src/modules/scheduler/domain/services/appointment-reminder.service.spec.ts`
- Modify: `server/src/modules/waitlist/application/jobs/expire-stale-entries.use-case.ts`
- Modify: `server/src/modules/waitlist/application/jobs/expire-stale-entries.use-case.spec.ts`
- Modify: `server/src/modules/waitlist/application/jobs/expire-stale-offers.use-case.ts`
- Modify: `server/src/modules/waitlist/application/jobs/expire-stale-offers.use-case.spec.ts`

**Interfaces:**
- Consumes: the four-argument `JobLeaseService.withLease` from Task 1
- Produces: `logicalWindowId(now: Date, windowMs: number): string`

- [ ] **Step 1: Add deterministic helper tests**

```ts
expect(logicalWindowId(new Date('2026-09-02T10:15:29.999Z'), 30_000))
  .toBe('1788344100000');
expect(logicalWindowId(new Date('2026-09-02T10:15:59.999Z'), 60_000))
  .toBe('1788344100000');
```

The value is `String(Math.floor(now.getTime() / windowMs) * windowMs)`; adjust the literal if Jest proves the fixture epoch was mistyped, but preserve the formula.

- [ ] **Step 2: Run helper tests and observe missing implementation**

```bash
cd server && pnpm test -- job-window.spec.ts --runInBand
```

Expected: FAIL because `job-window.ts` does not exist.

- [ ] **Step 3: Implement the helper and update callers**

```ts
export function logicalWindowId(now: Date, windowMs: number): string {
  return String(Math.floor(now.getTime() / windowMs) * windowMs);
}
```

Capture one `now` before lease acquisition and pass these windows/TTLs:

```ts
// every minute
withLease(name, logicalWindowId(now, 60_000), 65, fn)
// every 15 minutes
withLease(name, logicalWindowId(now, 15 * 60_000), 905, fn)
// every 30 seconds
withLease(name, logicalWindowId(now, 30_000), 35, fn)
```

Callbacks must reuse that captured `now`, so operation timestamps and window identity cannot drift across a boundary.

- [ ] **Step 4: Update all job mocks and assert job/window/TTL arguments**

For example:

```ts
expect(jobLeaseService.withLease).toHaveBeenCalledWith(
  'expire-pending-appointments',
  expect.any(String),
  65,
  expect.any(Function),
);
```

- [ ] **Step 5: Run all scheduled-job specs and build**

```bash
cd server && pnpm test -- job-window job-lease expire-pending appointment-reminder expire-stale --runInBand
cd server && pnpm build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/shared/redis/job-window.ts server/src/shared/redis/job-window.spec.ts server/src/modules/appointments/application/use-cases/expire-pending-appointments.use-case.ts server/src/modules/appointments/application/use-cases/expire-pending-appointments.use-case.spec.ts server/src/modules/scheduler/domain/services/appointment-reminder.service.ts server/src/modules/scheduler/domain/services/appointment-reminder.service.spec.ts server/src/modules/waitlist/application/jobs/expire-stale-entries.use-case.ts server/src/modules/waitlist/application/jobs/expire-stale-entries.use-case.spec.ts server/src/modules/waitlist/application/jobs/expire-stale-offers.use-case.ts server/src/modules/waitlist/application/jobs/expire-stale-offers.use-case.spec.ts
git commit -m "fix(scheduler): identify every cron execution window"
```
