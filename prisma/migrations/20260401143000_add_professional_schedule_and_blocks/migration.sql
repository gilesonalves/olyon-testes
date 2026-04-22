ALTER TABLE "BlockedSchedule"
ADD COLUMN "membershipId" TEXT;

CREATE TABLE "MembershipWeekScheduleDay" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipWeekScheduleDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MembershipWeekScheduleInterval" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipWeekScheduleInterval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MembershipWeekScheduleDay_membershipId_weekday_key"
ON "MembershipWeekScheduleDay"("membershipId", "weekday");

CREATE INDEX "MembershipWeekScheduleDay_membershipId_idx"
ON "MembershipWeekScheduleDay"("membershipId");

CREATE INDEX "MembershipWeekScheduleInterval_dayId_idx"
ON "MembershipWeekScheduleInterval"("dayId");

CREATE INDEX "BlockedSchedule_membershipId_date_idx"
ON "BlockedSchedule"("membershipId", "date");

ALTER TABLE "BlockedSchedule"
ADD CONSTRAINT "BlockedSchedule_membershipId_fkey"
FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipWeekScheduleDay"
ADD CONSTRAINT "MembershipWeekScheduleDay_membershipId_fkey"
FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipWeekScheduleInterval"
ADD CONSTRAINT "MembershipWeekScheduleInterval_dayId_fkey"
FOREIGN KEY ("dayId") REFERENCES "MembershipWeekScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
