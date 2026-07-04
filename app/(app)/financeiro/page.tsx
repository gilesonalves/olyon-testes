"use client"

import { useEffect, useState } from "react"
import HeaderPage from "@/components/headerPage"
import type { StoreBillingSnapshot } from "@/lib/billing/store-billing"

type BillingResponse =
  | { ok: true; data: StoreBillingSnapshot }
  | { ok: false; error: string }

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const statusLabels = {
  PAID: "Pago",
  PENDING: "Pendente",
  OVERDUE: "Atrasado",
} as const

const statusClasses = {
  PAID: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-red-100 text-red-800",
} as const

function formatDate(value: string | null, timeZone: string) {
  if (!value) return "Não informado"
  return new Intl.DateTimeFormat("pt-BR", { timeZone }).format(new Date(value))
}

export default function StoreBillingPage() {
  const [billing, setBilling] = useState<StoreBillingSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadBilling() {
      try {
        const response = await fetch("/api/store/current/billing", {
          cache: "no-store",
        })
        const json = (await response.json().catch(() => null)) as
          | BillingResponse
          | null

        if (!response.ok || !json?.ok) {
          setError(
            json && !json.ok
              ? json.error
              : "Não foi possível carregar sua assinatura."
          )
          return
        }

        setBilling(json.data)
      } catch {
        setError("Não foi possível carregar sua assinatura.")
      }
    }

    void loadBilling()
  }, [])

  return (
    <>
      <HeaderPage>
        <span className="font-normal text-foreground">Minha assinatura</span>
      </HeaderPage>

      <main className="space-y-6 bg-white p-6 md:p-7">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Status financeiro
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Consulte a situação mensal e os vencimentos da sua loja.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : !billing ? (
          <div className="rounded-lg border border-gray-200 p-5 text-sm text-gray-600">
            Carregando assinatura...
          </div>
        ) : (
          <>
            {!billing.configured ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                A assinatura ainda não foi configurada pelo administrador. O
                status inicial é pendente.
              </div>
            ) : null}

            {billing.operationalStatus === "SUSPENDED" ? (
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                <p className="font-semibold">Loja suspensa</p>
                <p className="mt-1">
                  Sua loja está suspensa. Entre em contato com o suporte para
                  reativar.
                </p>
              </div>
            ) : billing.status === "PENDING" ||
              billing.status === "OVERDUE" ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                Sua assinatura está pendente. Regularize para evitar suspensão.
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <section className="rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Status financeiro</p>
                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                    statusClasses[billing.status]
                  }`}
                >
                  {statusLabels[billing.status]}
                </span>
              </section>

              <section className="rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Status operacional</p>
                <p className="mt-3 font-semibold text-gray-900">
                  {billing.operationalStatus === "ACTIVE" ? "Ativa" : "Suspensa"}
                </p>
              </section>

              <section className="rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Valor mensal</p>
                <p className="mt-3 font-semibold text-gray-900">
                  {billing.monthlyAmount === null
                    ? "Não informado"
                    : currencyFormatter.format(billing.monthlyAmount)}
                </p>
              </section>

              <section className="rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Período atual</p>
                <p className="mt-3 font-semibold text-gray-900">
                  {billing.currentPeriod ?? "Não informado"}
                </p>
              </section>

              <section className="rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Último pagamento</p>
                <p className="mt-3 font-semibold text-gray-900">
                  {formatDate(billing.lastPaidAt, billing.timeZone)}
                </p>
              </section>

              <section className="rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Próximo vencimento</p>
                <p className="mt-3 font-semibold text-gray-900">
                  {formatDate(billing.nextDueAt, billing.timeZone)}
                </p>
              </section>
            </div>
          </>
        )}
      </main>
    </>
  )
}
