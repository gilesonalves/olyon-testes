import DashboardCard from "./dashboard-card"
import type { DashboardUpcomingAppointmentItem } from "@/lib/dashboard/overview"

type UpcomingAppointmentsCardProps = {
  appointments: DashboardUpcomingAppointmentItem[]
}

export default function UpcomingAppointmentsCard({
  appointments,
}: UpcomingAppointmentsCardProps) {
  return (
    <DashboardCard
      title="Proximos agendamentos"
      actionLabel="Ver agenda"
      actionHref="/agendamentos"
    >
      {appointments.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Nenhum agendamento futuro encontrado para a loja atual.
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex flex-col gap-3 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-md bg-slate-100 px-2 text-center">
                  <span className="text-sm font-semibold leading-none text-slate-700">
                    {appointment.timeLabel}
                  </span>
                  <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {appointment.dayLabel}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {appointment.customerName}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {appointment.staffName}
                    {appointment.serviceName ? ` / ${appointment.serviceName}` : ""}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium ${appointment.statusClassName}`}
              >
                {appointment.statusLabel}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  )
}
