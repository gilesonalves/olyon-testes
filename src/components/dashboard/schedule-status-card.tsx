import DashboardCard from "./dashboard-card";

const scheduleData = {
  openSlots: 6,
  blockedSlots: 3,
  message: "Agenda quase cheia no periodo da tarde.",
};

export default function ScheduleStatusCard() {
  return (
    <DashboardCard title="Status da agenda" actionLabel="Ver horarios" actionHref="/horarios-de-atendimento">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Horarios livres hoje</span>
          <span className="font-semibold text-emerald-600">{scheduleData.openSlots}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Horarios bloqueados</span>
          <span className="font-semibold text-slate-900">{scheduleData.blockedSlots}</span>
        </div>
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          {scheduleData.message}
        </p>
      </div>
    </DashboardCard>
  );
}
