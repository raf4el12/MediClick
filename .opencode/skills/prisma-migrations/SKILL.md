---
name: prisma-migrations
description: Use when modifying server/prisma/schema.prisma or creating Prisma migrations. Covers naming conventions, multi-tenant patterns via clinicId, enum definitions, and index strategies.
---

# Prisma schema conventions

## Naming

- **Models:** PascalCase, pluralized: `Appointments`, `ScheduleBlocks`, `Availability`, `WaitlistEntries`
- **Fields:** camelCase: `startTime`, `patientId`, `isOverbook`, `reminderSent`
- **Enums:** PascalCase: `AppointmentStatus`, `PaymentStatus`, `DayOfWeek`, `AvailabilityType`
- **Relation fields:** same name as the related model: `patient`, `schedule`, `doctor`
- **Foreign keys:** `<related>Id`: `patientId`, `scheduleId`, `doctorId`
- **Boolean fields:** prefix with `is` or `has`: `isOverbook`, `isActive`, `isRecurring`, `hasPrescription`

## Multi-tenant

Every tenant-scoped model has an optional `clinicId` field:

```prisma
clinicId Int?
```

- `clinicId` is **nullable** because super-admins operate without clinic scope
- Queries in repositories filter by `clinicId` when present
- The `tenant` extension on PrismaService applies `clinicId` filtering automatically

## Enum vs. table

Use Prisma enums for bounded, stable status sets:

```prisma
enum AppointmentStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

Use related models/tables for expandable data (specialties, roles).

## Common field patterns

```prisma
model Example {
  id        Int       @id @default(autoincrement())
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deleted   Boolean   @default(false)

  clinicId  Int?
  clinic    Clinic?   @relation(fields: [clinicId], references: [id])
}
```

- `deleted` for soft deletes (no actual row deletion)
- `@default(now())` and `@updatedAt` for audit trail
- Always add `clinicId` for multi-tenant models

## Indexes

Add indexes for frequent query patterns:

```prisma
@@index([clinicId])
@@index([doctorId, scheduleDate])
@@index([scheduleId, status])
@@index([deleted])
```

## Migration workflow

```bash
cd server
pnpm prisma migrate dev --name description_of_change
pnpm prisma generate
```

- Name migrations descriptively: `add_reminder_fields`, `create_waitlist_offers`
- Always run `prisma generate` after schema changes to update the client
