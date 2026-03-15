-- CreateEnum
CREATE TYPE "ScheduleBlockType" AS ENUM ('FULL_DAY', 'TIME_RANGE');

-- CreateTable
CREATE TABLE "ScheduleBlocks" (
    "id" SERIAL NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "type" "ScheduleBlockType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timeFrom" TIMESTAMP(3),
    "timeTo" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduleBlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holidays" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleBlocks_doctorId_startDate_endDate_idx" ON "ScheduleBlocks"("doctorId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ScheduleBlocks_isActive_idx" ON "ScheduleBlocks"("isActive");

-- CreateIndex
CREATE INDEX "Holidays_year_idx" ON "Holidays"("year");

-- CreateIndex
CREATE INDEX "Holidays_date_idx" ON "Holidays"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Holidays_date_name_key" ON "Holidays"("date", "name");

-- AddForeignKey
ALTER TABLE "ScheduleBlocks" ADD CONSTRAINT "ScheduleBlocks_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
