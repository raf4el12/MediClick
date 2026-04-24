-- Verify all profile emails match their user emails before dropping
-- (should be identical since they were synced at registration)
UPDATE "Profiles" p
SET "email" = u."email"
FROM "Users" u
WHERE p."userId" = u.id
  AND p."email" IS DISTINCT FROM u."email";

-- Drop the unique index, then the column
DROP INDEX IF EXISTS "Profiles_email_key";

-- AlterTable
ALTER TABLE "Profiles" DROP COLUMN "email";
