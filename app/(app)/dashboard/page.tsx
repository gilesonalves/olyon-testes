import HeaderPage from "@/components/headerPage";
import FinanceSummaryCard from "@/components/dashboard/finance-summary-card";
import QuickActionsCard from "@/components/dashboard/quick-actions-card";
import ScheduleStatusCard from "@/components/dashboard/schedule-status-card";
import UpcomingAppointmentsCard from "@/components/dashboard/upcoming-appointments-card";

export default function DashboardPage() {
  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">Dashboard</span>
        </div>
      </HeaderPage>

      <div className="space-y-6 p-7">
        <UpcomingAppointmentsCard />

        <div className="grid gap-6 lg:grid-cols-2">
          <FinanceSummaryCard />
          <ScheduleStatusCard />
        </div>

        <QuickActionsCard />
      </div>
    </>
  );
}
