-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "cpf" TEXT,
    "phone" TEXT,
    "secondaryPhone" TEXT,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_storeId_idx" ON "Client"("storeId");

-- CreateIndex
CREATE INDEX "Client_storeId_name_idx" ON "Client"("storeId", "name");

-- CreateIndex
CREATE INDEX "Client_storeId_email_idx" ON "Client"("storeId", "email");

-- CreateIndex
CREATE INDEX "Client_storeId_cpf_idx" ON "Client"("storeId", "cpf");

-- CreateIndex
CREATE INDEX "Client_storeId_isActive_idx" ON "Client"("storeId", "isActive");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
