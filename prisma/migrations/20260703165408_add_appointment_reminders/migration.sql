-- CreateEnum
CREATE TYPE "AppointmentReminderKind" AS ENUM ('ONE_HOUR', 'FIFTEEN_MINUTES');

-- CreateEnum
CREATE TYPE "AppointmentReminderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "AppointmentReminder" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "kind" "AppointmentReminderKind" NOT NULL,
    "appointmentStartAt" TIMESTAMP(3) NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentReminderStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "providerStatus" TEXT,
    "statusReason" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentReminder_status_scheduledFor_idx" ON "AppointmentReminder"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "AppointmentReminder_storeId_idx" ON "AppointmentReminder"("storeId");

-- CreateIndex
CREATE INDEX "AppointmentReminder_providerMessageId_idx" ON "AppointmentReminder"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentReminder_appointmentId_kind_appointmentStartAt_key" ON "AppointmentReminder"("appointmentId", "kind", "appointmentStartAt");

-- AddForeignKey
ALTER TABLE "AppointmentReminder" ADD CONSTRAINT "AppointmentReminder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentReminder" ADD CONSTRAINT "AppointmentReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
