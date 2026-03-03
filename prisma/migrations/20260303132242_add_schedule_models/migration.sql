-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT');

-- CreateTable
CREATE TABLE "WeekScheduleDay" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekScheduleInterval" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekScheduleInterval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedSchedule" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeekScheduleDay_storeId_idx" ON "WeekScheduleDay"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "WeekScheduleDay_storeId_weekday_key" ON "WeekScheduleDay"("storeId", "weekday");

-- CreateIndex
CREATE INDEX "WeekScheduleInterval_dayId_idx" ON "WeekScheduleInterval"("dayId");

-- CreateIndex
CREATE INDEX "BlockedSchedule_storeId_date_idx" ON "BlockedSchedule"("storeId", "date");

-- AddForeignKey
ALTER TABLE "WeekScheduleDay" ADD CONSTRAINT "WeekScheduleDay_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekScheduleInterval" ADD CONSTRAINT "WeekScheduleInterval_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "WeekScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedSchedule" ADD CONSTRAINT "BlockedSchedule_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
