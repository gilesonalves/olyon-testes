import FinanceSummaryCard from "@/components/dashboard/finance-summary-card";
import QuickActionsCard from "@/components/dashboard/quick-actions-card";
import ScheduleStatusCard from "@/components/dashboard/schedule-status-card";
import UpcomingAppointmentsCard from "@/components/dashboard/upcoming-appointments-card";

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-7">
      <UpcomingAppointmentsCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <FinanceSummaryCard />
        <ScheduleStatusCard />
      </div>

      <QuickActionsCard />
    </div>
  );
}
