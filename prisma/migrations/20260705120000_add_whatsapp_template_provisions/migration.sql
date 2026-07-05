-- CreateEnum
CREATE TYPE "WhatsAppTemplateProvisionStatus" AS ENUM ('NOT_CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED', 'UNKNOWN', 'ERROR');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateProvisionKind" AS ENUM ('APPOINTMENT_REMINDER_ONE_HOUR', 'APPOINTMENT_REMINDER_FIFTEEN_MINUTES');

-- CreateTable
CREATE TABLE "WhatsAppTemplateProvision" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT,
    "businessAccountId" TEXT NOT NULL,
    "kind" "WhatsAppTemplateProvisionKind" NOT NULL,
    "templateName" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt_BR',
    "category" TEXT NOT NULL DEFAULT 'UTILITY',
    "status" "WhatsAppTemplateProvisionStatus" NOT NULL DEFAULT 'NOT_CREATED',
    "metaTemplateId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplateProvision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppTemplateProvision_businessAccountId_idx" ON "WhatsAppTemplateProvision"("businessAccountId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplateProvision_status_idx" ON "WhatsAppTemplateProvision"("status");

-- CreateIndex
CREATE INDEX "WhatsAppTemplateProvision_connectionId_idx" ON "WhatsAppTemplateProvision"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplateProvision_storeId_kind_language_key" ON "WhatsAppTemplateProvision"("storeId", "kind", "language");

-- AddForeignKey
ALTER TABLE "WhatsAppTemplateProvision" ADD CONSTRAINT "WhatsAppTemplateProvision_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplateProvision" ADD CONSTRAINT "WhatsAppTemplateProvision_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "WhatsAppConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
