"use client"

import Link from "next/link"
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

export default function ContasPagar() {
  const { state, deleteEntry } = Controller()

  const handleDelete = async (id: string, category: string) => {
    const confirmed = window.confirm(
      `Deseja excluir a despesa \"${category}\"? Essa ação não pode ser desfeita.`
    )

    if (!confirmed) return

    await deleteEntry(id)
  }

  return (
    <div className="bg-white px-6 py-7">
      <div className="flex items-center justify-between pb-6">
        <p>Contas a pagar</p>

        <Button asChild variant="primary">
          <Link href="/contas-a-pagar/novo">Novo</Link>
        </Button>
      </div>

      {state.error && !state.loading ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <div className="py-6">
        {state.loading ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
            Carregando despesas...
          </div>
        ) : state.items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
            Nenhuma conta a pagar cadastrada ainda.
          </div>
        ) : (
          <table className="min-w-full table-auto rounded-lg border border-gray-200">
            <thead className="hidden w-full border-b border-gray-300 bg-gray-50 text-left text-sm text-gray-600 lg:table-header-group">
              <tr>
                <th className="whitespace-nowrap px-6 py-3 text-left text-sm font-semibold">Valor</th>
                <th className="whitespace-nowrap px-3 py-3 text-left text-sm font-semibold">Data</th>
                <th className="whitespace-nowrap px-3 py-3 text-left text-sm font-semibold">Vencimento</th>
                <th className="whitespace-nowrap px-3 py-3 text-left text-sm font-semibold">Categoria</th>
                <th className="whitespace-nowrap px-3 py-3 text-left text-sm font-semibold">Status</th>
                <th className="whitespace-nowrap px-3 py-3 text-left text-sm font-semibold">Descrição</th>
                <th></th>
              </tr>
            </thead>

            <tbody className="text-sm text-gray-700">
              {state.items.map((item) => (
                <tr key={item.id} className="border-b-2 border-gray-200 lg:border-b">
                  <td className="block whitespace-nowrap border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-6 lg:py-4">
                    <div className="flex items-center lg:justify-between">
                      <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Valor</div>
                      <div className="p-4 text-sm font-medium lg:p-0">{formatCurrency(item.amount)}</div>
                    </div>
                  </td>

                  <td className="block whitespace-nowrap border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-3 lg:py-4">
                    <div className="flex items-center lg:justify-between">
                      <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Data</div>
                      <div className="p-4 text-sm lg:p-0">{formatDate(item.transactionDate)}</div>
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
                      <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Categoria</div>
                      <div className="p-4 text-sm lg:p-0">{item.category}</div>
                    </div>
                  </td>

                  <td className="block border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-3 lg:py-4">
                    <div className="flex items-center lg:justify-between">
                      <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Status</div>
                      <div className="p-4 lg:p-0">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusClassName(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="block border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-3 lg:py-4">
                    <div className="flex items-center lg:justify-between">
                      <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Descrição</div>
                      <div className="p-4 text-sm lg:p-0">{item.description || "—"}</div>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium lg:pr-6">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(item.id, item.category)}
                      disabled={state.deletingId === item.id}
                    >
                      {state.deletingId === item.id ? "Excluindo..." : "Excluir"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
