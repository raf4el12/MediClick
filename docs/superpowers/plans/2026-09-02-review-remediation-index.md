# Review Remediation Workstreams

This index converts the 22 review findings from 2026-09-02 into six independently reviewable implementation plans. Execute them in the order below; each plan owns its migrations and tests.

| Order | Plan | Findings covered | Priority gate |
|---|---|---|---|
| 1 | [Logical-window scheduler leases](./2026-09-02-scheduler-logical-window-leases.md) | lease survives the logical window; Redis outage is fail-closed | P1, deploy first |
| 2 | [Appointment reminder hardening](./2026-09-02-appointment-reminders-hardening.md) | real appointment instant, disjoint T-24/T-2 windows, retryable delivery, safe GET, terminal-state cancellation, reschedule reset | P1/P2 |
| 3 | [Cancellation policy and partial payments](./2026-09-02-cancellation-and-partial-payments.md) | clinic policy selection, specialty inheritance, deposit reconciliation | P1/P2 |
| 4 | [Tenant-safe catalogs and patient risk](./2026-09-02-tenant-catalog-risk.md) | global specialties, actor/clinic risk scope, historical denominator | P1/P2 |
| 5 | [Notification delivery hardening](./2026-09-02-notification-delivery-hardening.md) | one notification row, no production simulation/PII logs, proactive WhatsApp templates | P1/P2 |
| 6 | [QR check-in hardening](./2026-09-02-qr-check-in-hardening.md) | issuance route, clinic-local expiry/arrival window, atomic transition, trusted kiosk clinic | P1 |

## Shared decisions

- `scheduleDate` is a local calendar date encoded as UTC midnight; `startTime` and `endTime` are wall-clock values encoded with a 1970 UTC base. They must be combined with the clinic IANA timezone before comparing to an instant.
- Appointment status and payment status remain separate. An approved deposit confirms a pending appointment while its aggregate financial status becomes `PARTIAL`; `Appointments.amount` remains the total consultation price.
- Public reminder GET links only preview/redirect. Only POST mutates state.
- QR check-in uses an authenticated, clinic-scoped staff identity. `kioskClinicId` is removed from the request body.
- The currently documented `PENDING -> IN_PROGRESS` transition is preserved. Product must resolve that open domain question separately; this remediation only makes the existing transition time-bound, tenant-safe, and atomic.
- External messaging is at-least-once unless a provider supports an idempotency key. Database claims prevent concurrent sends and allow retries after failures, but no plan claims impossible exactly-once delivery across an SMTP crash boundary.

## Finding coverage

| # | Review finding | Owning plan/task |
|---|---|---|
| 1 | Real appointment instant for reminders | Reminders Task 1/3 |
| 2 | Disjoint T-24/T-2 windows | Reminders Task 3 |
| 3 | Record only successful delivery and retry failure | Reminders Task 2/3 |
| 4 | GET reminder link must not mutate | Reminders Task 4 |
| 5 | Reminder cannot cancel COMPLETED | Reminders Task 4 |
| 6 | Reschedule resets reminder/confirmation/risk state | Reminders Task 2/4 |
| 7 | Lease survives its logical window | Leases Task 1/2 |
| 8 | Redis outage must not run on every replica | Leases Task 1 |
| 9 | Load clinic cancellation/no-show policy | Cancellation/payments Task 1 |
| 10 | Nullable specialty window inherits clinic policy | Cancellation/payments Task 1 |
| 11 | Deposit reconciles as partial funding | Cancellation/payments Tasks 2–4 |
| 12 | Clinic specialty filter includes global rows | Tenant/catalog/risk Task 1 |
| 13 | Risk profile applies actor and clinic scope | Tenant/catalog/risk Task 2/3 |
| 14 | Risk denominator uses historical outcomes | Tenant/catalog/risk Task 3 |
| 15 | One notification row per external dispatch | Notifications Task 1 |
| 16 | No simulated production success or PII logs | Notifications Task 2 |
| 17 | Proactive WhatsApp uses approved template | Notifications Task 3 |
| 18 | Real QR issuance route | QR Task 2 |
| 19 | QR restricted to arrival window | QR Task 1/3 |
| 20 | QR expiry uses clinic timezone | QR Task 1/2 |
| 21 | QR transition atomic against cancellation | QR Task 4 |
| 22 | QR consumer clinic comes from trusted identity | QR Task 3 |

## Release gates

After every plan, run its focused commands. After all six are merged, run from `server/`:

```bash
pnpm exec prisma generate
pnpm test -- appointments --runInBand
pnpm test -- scheduler --runInBand
pnpm test -- waitlist --runInBand
pnpm test -- payments --runInBand
pnpm test -- patients --runInBand
pnpm test -- specialties --runInBand
pnpm test -- notifications --runInBand
pnpm build
```

With an isolated PostgreSQL database:

```bash
RUN_DB_INTEGRATION=1 DATABASE_URL="$DATABASE_URL" pnpm run test:integration
```

Do not run integration specs under the normal parallel Jest configuration.
