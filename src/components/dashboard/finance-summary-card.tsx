import DashboardCard from "./dashboard-card";
import Link from "next/link";

const financeData = {
  todayTotal: "R$ 1.280,00",
  monthTotal: "R$ 18.640,00",
  pending: "R$ 920,00",
};

export default function FinanceSummaryCard() {
  return (
    <DashboardCard title="Resumo financeiro" actionLabel="Ver financeiro" actionHref="/entradas-saidas">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Total do dia</span>
          <span className="font-semibold text-slate-900">{financeData.todayTotal}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Total do mes</span>
          <span className="font-semibold text-slate-900">{financeData.monthTotal}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Pagamentos pendentes</span>
          <span className="font-semibold text-rose-600">{financeData.pending}</span>
        </div>
        <Link
          href="/controle-pagamentos"
          className="inline-flex items-center text-sm font-medium text-slate-700 transition hover:text-slate-900"
        >
          Ver controle de pagamentos
        </Link>
      </div>
    </DashboardCard>
  );
}
