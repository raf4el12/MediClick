/*
  Warnings:

  - You are about to drop the column `role` on the `Users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Appointments" DROP CONSTRAINT "Appointments_patientId_fkey";

-- DropIndex
DROP INDEX "Users_role_deleted_idx";

-- AlterTable
ALTER TABLE "Users" DROP COLUMN "role",
ADD COLUMN     "roleId" INTEGER;

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "Roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "clinicId" INTEGER,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permissions" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermissions" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateIndex
CREATE INDEX "Roles_clinicId_idx" ON "Roles"("clinicId");

-- CreateIndex
CREATE INDEX "Roles_isSystem_idx" ON "Roles"("isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "Roles_name_clinicId_key" ON "Roles"("name", "clinicId");

-- CreateIndex
CREATE INDEX "Permissions_subject_idx" ON "Permissions"("subject");

-- CreateIndex
CREATE UNIQUE INDEX "Permissions_action_subject_key" ON "Permissions"("action", "subject");

-- CreateIndex
CREATE INDEX "RolePermissions_roleId_idx" ON "RolePermissions"("roleId");

-- CreateIndex
CREATE INDEX "RolePermissions_permissionId_idx" ON "RolePermissions"("permissionId");

-- CreateIndex
CREATE INDEX "PrescriptionItems_prescriptionId_idx" ON "PrescriptionItems"("prescriptionId");

-- CreateIndex
CREATE INDEX "Reviews_patientId_idx" ON "Reviews"("patientId");

-- CreateIndex
CREATE INDEX "Users_roleId_deleted_idx" ON "Users"("roleId", "deleted");

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roles" ADD CONSTRAINT "Roles_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissions" ADD CONSTRAINT "RolePermissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissions" ADD CONSTRAINT "RolePermissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
