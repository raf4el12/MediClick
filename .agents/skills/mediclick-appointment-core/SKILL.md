---
name: mediclick-appointment-core
description: Analyze or change MediClick booking behavior across appointments, generated slots, availability, holidays, schedule blocks, waitlist offers, payment confirmation, cancellation, rescheduling, overbooking, or appointment lifecycle. Excludes isolated visual styling and unrelated clinical-record CRUD.
---

# MediClick appointment core

Preserve the business invariants that cross module boundaries in the appointment flow.

## Workflow

1. Read [`CONTEXT.md`](../../../CONTEXT.md) and [`docs/domain/APPOINTMENT-CORE.md`](../../../docs/domain/APPOINTMENT-CORE.md) completely. Completion: the affected canonical terms, states and open domain questions are identified.
2. Trace the real entry path from controller or event through use case, repository and downstream listeners. Completion: every affected state transition, released-slot event and payment/waitlist consumer is accounted for.
3. State the invariant being changed or preserved. Include actor, clinic, local time, payment state and concurrency boundary when applicable. Completion: permitted and rejected examples are concrete.
4. Add focused tests at the use-case or pure-domain seam before or with the behavior change. For races, test the atomic repository/claim boundary rather than only a mocked pre-check. Completion: the old behavior fails for the intended reason and the boundary case is covered.
5. Implement the smallest coherent cross-module change. Update the core document only when implemented behavior or a recorded open question changes; update `CONTEXT.md` only when canonical language changes.
6. Run targeted tests, then the broader appointment/payment/waitlist set and backend build when the change crosses modules. Completion: all relevant checks pass and no downstream consumer is left inconsistent.

## Guardrails

- Keep appointment status separate from payment status.
- Derive clinic ownership from trusted domain relationships, not patient input.
- Use the clinic timezone for booking windows, no-show timing and cancellation policy.
- Keep overlap checks and writes serializable; keep waitlist claims and slot locks single-winner.
- Treat the “Preguntas de dominio abiertas” section as unresolved. Surface a related choice instead of silently choosing new semantics.
