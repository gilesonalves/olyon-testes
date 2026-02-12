import Link from "next/link";
import DashboardCard from "./dashboard-card";

const actions = [
  {
    label: "Novo agendamento",
    href: "/agendamentos",
  },
  {
    label: "Novo cliente",
    href: "/usuarios",
  },
  {
    label: "Novo servico",
    href: "/servicos",
  },
  {
    label: "Bloquear horario",
    href: "/horarios-de-atendimento",
  },
];

export default function QuickActionsCard() {
  return (
    <DashboardCard title="Acoes rapidas">
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            <span>{action.label}</span>
            <span className="text-slate-400">+</span>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
