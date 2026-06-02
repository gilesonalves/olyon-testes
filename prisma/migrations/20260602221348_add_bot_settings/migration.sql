-- CreateTable
CREATE TABLE "BotSettings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "welcomeMessage" TEXT,
    "showMenuAfterWelcome" BOOLEAN NOT NULL DEFAULT true,
    "humanHandoffMessage" TEXT,
    "customerRequestedHumanMessage" TEXT,
    "autoResumeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoResumeAfterMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotSettings_storeId_key" ON "BotSettings"("storeId");

-- CreateIndex
CREATE INDEX "BotSettings_storeId_idx" ON "BotSettings"("storeId");

-- AddForeignKey
ALTER TABLE "BotSettings" ADD CONSTRAINT "BotSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
