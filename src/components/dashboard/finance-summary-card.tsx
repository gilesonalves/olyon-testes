import Link from "next/link"
import DashboardCard from "./dashboard-card"
import type { DashboardFinanceSummary } from "@/lib/dashboard/overview"

type FinanceSummaryCardProps = {
  summary: DashboardFinanceSummary
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0)
}

function getTotalClassName(value: number) {
  if (value > 0) {
    return "text-emerald-600"
  }

  if (value < 0) {
    return "text-rose-600"
  }

  return "text-slate-900"
}

export default function FinanceSummaryCard({
  summary,
}: FinanceSummaryCardProps) {
  return (
    <DashboardCard
      title="Resumo financeiro"
      actionLabel="Ver entradas/saidas"
      actionHref="/entradas-saidas"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Saldo liquido do dia</span>
          <span className={`font-semibold ${getTotalClassName(summary.dayNetTotal)}`}>
            {formatCurrency(summary.dayNetTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Saldo liquido do mes</span>
          <span className={`font-semibold ${getTotalClassName(summary.monthNetTotal)}`}>
            {formatCurrency(summary.monthNetTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Despesas em aberto</span>
          <span className="font-semibold text-amber-700">
            {formatCurrency(summary.openExpensesTotal)}
          </span>
        </div>

        {!summary.hasEntries ? (
          <p className="text-xs text-slate-500">
            Nenhum lancamento financeiro encontrado para a loja atual.
          </p>
        ) : null}

        <Link
          href="/controle-pagamentos"
          className="inline-flex items-center text-sm font-medium text-slate-700 transition hover:text-slate-900"
        >
          Ver controle de pagamentos
        </Link>
      </div>
    </DashboardCard>
  )
}
