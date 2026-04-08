import HeaderPage from "@/components/headerPage"
import FinanceSummaryCard from "@/components/dashboard/finance-summary-card"
import QuickActionsCard from "@/components/dashboard/quick-actions-card"
import ScheduleStatusCard from "@/components/dashboard/schedule-status-card"
import UpcomingAppointmentsCard from "@/components/dashboard/upcoming-appointments-card"
import { requireStoreId } from "@/lib/current-store"
import { getDashboardOverview } from "@/lib/dashboard/overview"

export default async function DashboardPage() {
  const storeId = await requireStoreId()
  const dashboardOverview = await getDashboardOverview(storeId)

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">Dashboard</span>
        </div>
      </HeaderPage>

      <div className="space-y-6 p-7">
        <UpcomingAppointmentsCard appointments={dashboardOverview.upcomingAppointments} />

        <div className="grid gap-6 lg:grid-cols-2">
          <FinanceSummaryCard summary={dashboardOverview.financeSummary} />
          <ScheduleStatusCard status={dashboardOverview.scheduleStatus} />
        </div>

        <QuickActionsCard />
      </div>
    </>
  )
}
