---
name: mediclick-core-review
description: Review a diff or branch that changes MediClick appointments, schedules, availability, waitlist, payments, clinic scoping, or their events. Finds business-rule, state-transition, concurrency, tenant, timezone, payment-reconciliation, and missing-test risks; excludes implementation unless separately requested.
---

# MediClick core review

Review the change against the implemented business model, not only local style.

## Review method

1. Read [`CONTEXT.md`](../../../CONTEXT.md) and [`docs/domain/APPOINTMENT-CORE.md`](../../../docs/domain/APPOINTMENT-CORE.md), then inspect the requested diff and repository instructions.
2. Map each changed entry point to its use case, repository boundary, emitted events and consumers.
3. Check every affected lane:
   - appointment and payment state transitions;
   - doctor and patient overlap under concurrency;
   - clinic scope and patient cross-clinic behavior;
   - clinic-local time, holidays, blocks and anticipation;
   - waitlist ranking, lock, offer expiry and single-winner acceptance;
   - refund or manual-review consequences;
   - notifications and downstream clinical/reporting projections;
   - tests for the allowed path and rejected boundary.
4. Report only actionable findings, ordered by severity. Cite files and symbols, explain the failing scenario and distinguish an established invariant from an unresolved domain question.

Completion requires accounting for every changed core path. If no findings remain, say which lanes were checked and identify any validation that could not be run.
