"use client"

import { Button } from "@/components/ui/button"
import { Controller } from "./controllers"

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

export default function ControlePagamentos() {
  const { state, markAsPaid } = Controller()

  const handleMarkAsPaid = async (id: string) => {
    await markAsPaid(id)
  }

  return (
    <div className="bg-white px-6 py-7">
      <div className="flex items-center justify-between pb-6">
        <p>Controle de Pagamentos</p>
        <span className="text-sm text-gray-500">Visão operacional de baixa</span>
      </div>

      {state.error && !state.loading ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <div className="py-6">
        {state.loading ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
            Carregando pagamentos...
          </div>
        ) : state.items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
            Nenhuma despesa disponível para controle de pagamentos.
          </div>
        ) : (
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
              {state.items.map((item) => {
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
        )}
      </div>
    </div>
  )
}