-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('PROFISSIONAL', 'FINANCEIRO', 'ATENDENTE');

-- CreateTable
CREATE TABLE "MembershipTypeLink" (
    "membershipId" TEXT NOT NULL,
    "type" "MembershipType" NOT NULL,

    CONSTRAINT "MembershipTypeLink_pkey" PRIMARY KEY ("membershipId","type")
);

-- CreateTable
CREATE TABLE "MembershipService" (
    "membershipId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "MembershipService_pkey" PRIMARY KEY ("membershipId","serviceId")
);

-- CreateIndex
CREATE INDEX "MembershipTypeLink_type_idx" ON "MembershipTypeLink"("type");

-- CreateIndex
CREATE INDEX "MembershipService_serviceId_idx" ON "MembershipService"("serviceId");

-- AddForeignKey
ALTER TABLE "MembershipTypeLink" ADD CONSTRAINT "MembershipTypeLink_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipService" ADD CONSTRAINT "MembershipService_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipService" ADD CONSTRAINT "MembershipService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
