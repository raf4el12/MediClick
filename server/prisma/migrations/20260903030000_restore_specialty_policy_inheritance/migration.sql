-- Migration: restore_specialty_policy_inheritance
-- Because cancellationWindowHours was introduced with 24 as a blanket default,
-- migrate rows whose value is 24 to NULL (representing inheritance of clinic default),
-- preserving any non-24 explicit overrides. Drop the column default constraint.
-- Note: Any intentional explicit 24-hour override must be re-entered after rollout
-- if one existed independently of the old default.

UPDATE "Specialties"
SET "cancellationWindowHours" = NULL
WHERE "cancellationWindowHours" = 24;

ALTER TABLE "Specialties"
ALTER COLUMN "cancellationWindowHours" DROP DEFAULT;
