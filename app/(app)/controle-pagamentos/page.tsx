"use client"

import { useEffect, useMemo, useState } from "react"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Controller } from "./controllers"

const PAGE_SIZE = 10

const paymentStatusFilters = [
  { value: "ALL", label: "Todos" },
  { value: "PAID", label: "Pago" },
  { value: "UNPAID", label: "Nao pago" },
] as const

type PaymentStatusFilter = (typeof paymentStatusFilters)[number]["value"]

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const dateFormatter = new Intl.DateTimeFormat("pt-BR")

function formatCurrency(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value)
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0)
}

function formatDate(value: string | null) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return dateFormatter.format(date)
}

function isPastDue(dueDate: string | null) {
  if (!dueDate) return false

  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return false

  const today = new Date()
  const dueOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  return dueOnly < todayOnly
}

function getDisplayStatus(item: {
  status: "PENDING" | "PAID" | "OVERDUE"
  dueDate: string | null
}) {
  if (item.status === "PAID") return "PAID"
  if (isPastDue(item.dueDate)) return "OVERDUE"
  return "PENDING"
}

function getStatusLabel(status: "PENDING" | "PAID" | "OVERDUE") {
  if (status === "PAID") return "Pago"
  if (status === "OVERDUE") return "Vencido"
  return "Pendente"
}

function getStatusClassName(status: "PENDING" | "PAID" | "OVERDUE") {
  if (status === "PAID") return "bg-emerald-100 text-emerald-700"
  if (status === "OVERDUE") return "bg-red-100 text-red-700"
  return "bg-amber-100 text-amber-700"
}

function normalizeDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) return null

  return new Date(year, month - 1, day)
}

function getDueDateOnly(value: string | null) {
  if (!value) return null

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return null

  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate())
}

export default function ControlePagamentos() {
  const { state, markAsPaid } = Controller()
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>("ALL")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const handleMarkAsPaid = async (id: string) => {
    await markAsPaid(id)
  }

  const filteredItems = useMemo(() => {
    const normalizedStartDate = startDate ? normalizeDateOnly(startDate) : null
    const normalizedEndDate = endDate ? normalizeDateOnly(endDate) : null

    return state.items.filter((item) => {
      const displayStatus = getDisplayStatus(item)
      const dueDate = getDueDateOnly(item.dueDate)

      if (paymentStatusFilter === "PAID" && displayStatus !== "PAID") {
        return false
      }

      if (paymentStatusFilter === "UNPAID" && displayStatus === "PAID") {
        return false
      }

      if ((normalizedStartDate || normalizedEndDate) && !dueDate) {
        return false
      }

      if (normalizedStartDate && dueDate && dueDate < normalizedStartDate) {
        return false
      }

      if (normalizedEndDate && dueDate && dueDate > normalizedEndDate) {
        return false
      }

      return true
    })
  }, [endDate, paymentStatusFilter, startDate, state.items])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [paymentStatusFilter, startDate, endDate])

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount])
  const hasMoreItems = visibleItems.length < filteredItems.length

  const clearDateFilters = () => {
    setStartDate("")
    setEndDate("")
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">Controle de pagamentos</span>
          
        </div>
      </HeaderPage>

      <div className="bg-white px-6 py-7">
        {state.error && !state.loading ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {paymentStatusFilters.map((filter) => {
          const isActive = paymentStatusFilter === filter.value

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setPaymentStatusFilter(filter.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[#0F766E] bg-[#0F766E] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:text-gray-900"
              }`}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      <div className="mb-6 grid gap-4 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="payment-start-date">Data inicial</Label>
          <Input
            id="payment-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-end-date">Data final</Label>
          <Input
            id="payment-end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={clearDateFilters}
            disabled={!startDate && !endDate}
            className="w-full md:w-auto"
          >
            Limpar periodo
          </Button>
        </div>
      </div>

        <div className="py-6">
        {state.loading ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
            Carregando pagamentos...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
            {state.items.length === 0 && paymentStatusFilter === "ALL" && !startDate && !endDate
              ? "Nenhuma despesa disponivel para controle de pagamentos."
              : "Nenhum pagamento encontrado para os filtros selecionados."}
          </div>
        ) : (
          <>
            <table className="min-w-full table-auto rounded-lg border border-gray-200">
              <thead className="hidden w-full border-b border-gray-300 bg-gray-50 text-left text-sm text-gray-600 lg:table-header-group">
                <tr>
                  <th className="px-6 py-3.5 text-left text-sm font-semibold">Descrição</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold">Valor</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold">Vencimento</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold">Status</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold">Pago em</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold">Ação</th>
                </tr>
              </thead>

              <tbody className="text-sm text-gray-700">
                {visibleItems.map((item) => {
                  const label = item.description || item.category
                  const displayStatus = getDisplayStatus(item)

                  return (
                    <tr key={item.id} className="border-b-2 border-gray-200 lg:border-b">
                      <td className="block border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-6 lg:py-4">
                        <div className="flex items-center lg:justify-between">
                          <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Descrição</div>
                          <div className="p-4 text-sm lg:p-0">
                            <div className="font-medium">{label}</div>
                            {item.description ? <div className="text-xs text-gray-500">{item.category}</div> : null}
                          </div>
                        </div>
                      </td>

                      <td className="block whitespace-nowrap border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-3 lg:py-4">
                        <div className="flex items-center lg:justify-between">
                          <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Valor</div>
                          <div className="p-4 text-sm font-medium lg:p-0">{formatCurrency(item.amount)}</div>
                        </div>
                      </td>

                      <td className="block whitespace-nowrap border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-3 lg:py-4">
                        <div className="flex items-center lg:justify-between">
                          <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Vencimento</div>
                          <div className="p-4 text-sm lg:p-0">{formatDate(item.dueDate)}</div>
                        </div>
                      </td>

                      <td className="block border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-3 lg:py-4">
                        <div className="flex items-center lg:justify-between">
                          <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Status</div>
                          <div className="p-4 lg:p-0">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusClassName(displayStatus)}`}>
                              {getStatusLabel(displayStatus)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="block whitespace-nowrap border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-3 lg:py-4">
                        <div className="flex items-center lg:justify-between">
                          <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Pago em</div>
                          <div className="p-4 text-sm lg:p-0">{formatDate(item.paidAt)}</div>
                        </div>
                      </td>

                      <td className="block border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-3 lg:py-4">
                        <div className="flex items-center lg:justify-between">
                          <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Ação</div>
                          <div className="p-4 lg:p-0">
                            {displayStatus === "PAID" ? (
                              <span className="inline-flex min-h-9 items-center text-sm text-gray-500">
                                Pago
                              </span>
                            ) : (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => handleMarkAsPaid(item.id)}
                                disabled={state.payingId === item.id}
                              >
                                {state.payingId === item.id ? "Salvando..." : "Marcar como pago"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {hasMoreItems ? (
              <div className="mt-4 flex justify-center">
                <Button type="button" variant="outline" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                  Carregar mais
                </Button>
              </div>
            ) : null}
          </>
        )}
        </div>
      </div>
    </>
  )
}