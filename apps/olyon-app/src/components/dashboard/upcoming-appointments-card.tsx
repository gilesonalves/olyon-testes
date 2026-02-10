import Link from "next/link";
import DashboardCard from "./dashboard-card";

const appointments = [
  {
    id: "apt-001",
    time: "09:00",
    client: "Marina Souza",
    status: "Confirmado",
  },
  {
    id: "apt-002",
    time: "10:30",
    client: "Diego Santos",
    status: "Aguardando",
  },
  {
    id: "apt-003",
    time: "13:00",
    client: "Lucia Lima",
    status: "Remarcado",
  },
];

const statusClasses: Record<string, string> = {
  Confirmado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Aguardando: "bg-amber-50 text-amber-700 border-amber-200",
  Remarcado: "bg-sky-50 text-sky-700 border-sky-200",
};

export default function UpcomingAppointmentsCard() {
  return (
    <DashboardCard
      title="Proximos agendamentos"
      actionLabel="Ver agenda"
      actionHref="/agendamentos"
    >
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="flex flex-col gap-3 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-16 rounded-md bg-slate-100 text-center text-sm font-semibold text-slate-700 leading-10">
                {appointment.time}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {appointment.client}
                </p>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                    statusClasses[appointment.status] ??
                    "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {appointment.status}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/agendamentos"
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Ver detalhes
              </Link>
              <Link
                href="/agendamentos"
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Remarcar
              </Link>
              <Link
                href="/agendamentos"
                className="rounded-md border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
              >
                Cancelar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
