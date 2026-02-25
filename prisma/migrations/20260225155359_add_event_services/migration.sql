-- CreateTable
CREATE TABLE "EventService" (
    "eventId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "EventService_pkey" PRIMARY KEY ("eventId","serviceId")
);

-- CreateIndex
CREATE INDEX "EventService_serviceId_idx" ON "EventService"("serviceId");

-- AddForeignKey
ALTER TABLE "EventService" ADD CONSTRAINT "EventService_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventService" ADD CONSTRAINT "EventService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
