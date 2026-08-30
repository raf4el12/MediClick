---
name: mediclick-tenant-safety
description: Preserve MediClick clinic isolation and intentional cross-clinic access when changing clinicId, authentication, guards, permissions, controllers, Prisma repositories, transactions, catalogs, appointments, doctors, or patient flows. Excludes code with no clinic-owned data or authorization effect.
---

# MediClick tenant safety

Use the code's access matrix rather than assuming every record belongs to exactly one clinic.

## Access matrix

| Actor/data | Intended scope |
|---|---|
| Patient | Cross-clinic; clinic is derived from the selected doctor or specialty |
| `SUPER_ADMIN` | Global |
| `ADMIN` without `clinicId` | Global |
| Admin, doctor or receptionist with `clinicId` | Their clinic only |
| Strict clinical data | Current clinic only for clinic-scoped staff |
| Global catalog data | Visible together with catalog data of the current clinic |

`PrismaService.tenant` currently treats appointments, doctors, availability, clinical notes, prescriptions and medical history as strict. Specialties, categories, schedules and holidays are catalogs. Confirm the current sets in `server/src/prisma/prisma.service.ts` before relying on this list.

## Workflow

1. Trace `@Auth()` through JWT, tenant and permission guards, then through `TenantInterceptor` and the repository client used by the request. Completion: the actor and effective clinic scope are explicit.
2. For reads, verify both same-clinic visibility and cross-clinic denial. For patient/global flows, verify the intended exception rather than adding a blanket clinic filter.
3. For writes, derive `clinicId` from a trusted relationship and validate referenced doctor, specialty, schedule and appointment ownership.
4. Inspect every `$transaction` callback separately. It receives a plain Prisma client, so add explicit clinic predicates and clinic values where the invariant requires them.
5. Add tests for clinic-scoped staff, a different clinic, and the patient or global-admin exception that applies. Completion: access is neither broader nor narrower than the matrix.

Do not solve a missing tenant predicate by making patient flows single-clinic. Do not trust a request body's `clinicId` when an authenticated or related domain record can supply it.
