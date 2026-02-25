-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_storeId_idx" ON "Event"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_storeId_name_key" ON "Event"("storeId", "name");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
