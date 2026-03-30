"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardCard from "./dashboard-card";

type FinanceEntry = {
  type: "INCOME" | "EXPENSE";
  status: "PENDING" | "PAID" | "OVERDUE";
  amount: string | number;
  transactionDate: string;
};

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: string };
type ApiResp<T> = ApiOk<T> | ApiErr;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function toNumber(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function isSameDay(dateValue: string, referenceDate: Date) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getDate() === referenceDate.getDate()
  );
}

function isSameMonth(dateValue: string, referenceDate: Date) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth()
  );
}

export default function FinanceSummaryCard() {
  const [items, setItems] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFinanceEntries() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/finance/entries", { cache: "no-store" });
        const json = (await response.json()) as ApiResp<{ items: FinanceEntry[] }>;

        if (!response.ok || !json.ok) {
          if (!active) return;

          setItems([]);
          setError(json.ok ? "Nao foi possivel carregar o resumo financeiro." : json.error);
          return;
        }

        if (!active) return;
        setItems(json.data.items);
      } catch {
        if (!active) return;

        setItems([]);
        setError("Nao foi possivel carregar o resumo financeiro.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadFinanceEntries();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const today = new Date();

    return items.reduce(
      (accumulator, item) => {
        const amount = toNumber(item.amount);

        if (isSameDay(item.transactionDate, today)) {
          accumulator.todayTotal += amount;
        }

        if (isSameMonth(item.transactionDate, today)) {
          accumulator.monthTotal += amount;
        }

        if (item.type === "EXPENSE" && item.status !== "PAID") {
          accumulator.pending += amount;
        }

        return accumulator;
      },
      {
        todayTotal: 0,
        monthTotal: 0,
        pending: 0,
      }
    );
  }, [items]);

  return (
    <DashboardCard title="Resumo financeiro" actionLabel="Ver financeiro" actionHref="/entradas-saidas">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Total do dia</span>
          <span className="font-semibold text-slate-900">{formatCurrency(summary.todayTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Total do mes</span>
          <span className="font-semibold text-slate-900">{formatCurrency(summary.monthTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Pagamentos pendentes</span>
          <span className="font-semibold text-rose-600">{formatCurrency(summary.pending)}</span>
        </div>

        {loading ? <p className="text-xs text-slate-500">Carregando resumo financeiro...</p> : null}
        {!loading && error ? <p className="text-xs text-rose-600">{error}</p> : null}

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
