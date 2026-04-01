CREATE TYPE "WhatsAppProvider" AS ENUM ('META_WHATSAPP');

CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('PENDING', 'VERIFIED', 'CONNECTED', 'DISCONNECTED', 'ERROR');

CREATE TABLE "WhatsAppConnection" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" "WhatsAppProvider" NOT NULL DEFAULT 'META_WHATSAPP',
    "phoneNumberId" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "displayPhoneNumber" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppConnection_storeId_key" ON "WhatsAppConnection"("storeId");
CREATE UNIQUE INDEX "WhatsAppConnection_phoneNumberId_key" ON "WhatsAppConnection"("phoneNumberId");
CREATE UNIQUE INDEX "WhatsAppConnection_verifyToken_key" ON "WhatsAppConnection"("verifyToken");
CREATE INDEX "WhatsAppConnection_businessAccountId_idx" ON "WhatsAppConnection"("businessAccountId");
CREATE INDEX "WhatsAppConnection_provider_isActive_idx" ON "WhatsAppConnection"("provider", "isActive");

ALTER TABLE "WhatsAppConnection"
ADD CONSTRAINT "WhatsAppConnection_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
