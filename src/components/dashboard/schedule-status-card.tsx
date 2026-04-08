import DashboardCard from "./dashboard-card"
import type { DashboardScheduleStatus } from "@/lib/dashboard/overview"

type ScheduleStatusCardProps = {
  status: DashboardScheduleStatus
}

export default function ScheduleStatusCard({
  status,
}: ScheduleStatusCardProps) {
  return (
    <DashboardCard
      title="Status da agenda"
      actionLabel="Ver horarios"
      actionHref="/horarios-de-atendimento"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Horarios livres hoje</span>
          <span className="font-semibold text-emerald-600">
            {status.openSlotsToday}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Horarios bloqueados</span>
          <span className="font-semibold text-slate-900">
            {status.blockedSlotsToday}
          </span>
        </div>
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          {status.note}
        </p>
      </div>
    </DashboardCard>
  )
}
