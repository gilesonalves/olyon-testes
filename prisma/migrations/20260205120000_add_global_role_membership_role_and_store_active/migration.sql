-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- AlterTable: User - globalRole e updatedAt
ALTER TABLE "User" ADD COLUMN "globalRole" "GlobalRole",
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Store - active e updatedAt
ALTER TABLE "Store" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Migrar Membership.role de Role para MembershipRole
ALTER TABLE "Membership" ALTER COLUMN "role" TYPE "MembershipRole" USING role::text::"MembershipRole";

-- DropEnum
DROP TYPE "Role";
