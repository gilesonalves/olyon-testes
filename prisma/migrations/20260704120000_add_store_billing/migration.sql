-- CreateEnum
CREATE TYPE "StoreBillingStatus" AS ENUM ('PAID', 'PENDING', 'OVERDUE');

-- CreateEnum
CREATE TYPE "StoreOperationalStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "StoreBilling" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "monthlyAmount" DECIMAL(12,2),
    "dueDay" INTEGER,
    "status" "StoreBillingStatus" NOT NULL DEFAULT 'PENDING',
    "operationalStatus" "StoreOperationalStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriod" TEXT,
    "lastPaidAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreBillingPayment" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "period" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreBillingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreBilling_storeId_key" ON "StoreBilling"("storeId");

-- CreateIndex
CREATE INDEX "StoreBilling_status_idx" ON "StoreBilling"("status");

-- CreateIndex
CREATE INDEX "StoreBilling_operationalStatus_idx" ON "StoreBilling"("operationalStatus");

-- CreateIndex
CREATE INDEX "StoreBillingPayment_storeId_idx" ON "StoreBillingPayment"("storeId");

-- CreateIndex
CREATE INDEX "StoreBillingPayment_period_idx" ON "StoreBillingPayment"("period");

-- CreateIndex
CREATE INDEX "StoreBillingPayment_createdById_idx" ON "StoreBillingPayment"("createdById");

-- AddForeignKey
ALTER TABLE "StoreBilling" ADD CONSTRAINT "StoreBilling_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBillingPayment" ADD CONSTRAINT "StoreBillingPayment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBillingPayment" ADD CONSTRAINT "StoreBillingPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
