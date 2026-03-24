"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller as ControllerForm, useForm } from "react-hook-form"
import { type Resolver } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Controller } from "./controllers"
import { formSchema, type FormValues } from "./schemas"

const typeFilters = [
  { value: "ALL", label: "Todos" },
  { value: "INCOME", label: "Entradas" },
  { value: "EXPENSE", label: "Saídas" },
] as const

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
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return dateFormatter.format(date)
}

function getTypeLabel(type: "INCOME" | "EXPENSE") {
  return type === "INCOME" ? "Entrada" : "Saída"
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

function isPastDueDate(dueDate: string | null) {
  if (!dueDate) return false

  const parsedDueDate = new Date(dueDate)
  if (Number.isNaN(parsedDueDate.getTime())) return false

  const dueDateOnly = new Date(parsedDueDate)
  dueDateOnly.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return dueDateOnly < today
}

function getDisplayStatus(
  type: "INCOME" | "EXPENSE",
  status: "PENDING" | "PAID" | "OVERDUE",
  dueDate: string | null
) {
  if (type === "INCOME") {
    return {
      label: "Receita",
      className: "bg-sky-100 text-sky-700",
    }
  }

  if (status === "PAID") {
    return {
      label: getStatusLabel("PAID"),
      className: getStatusClassName("PAID"),
    }
  }

  if (isPastDueDate(dueDate)) {
    return {
      label: getStatusLabel("OVERDUE"),
      className: getStatusClassName("OVERDUE"),
    }
  }

  return {
    label: getStatusLabel("PENDING"),
    className: getStatusClassName("PENDING"),
  }
}

export default function EntradasSaidas() {
  const { state, deleteEntry, updateEntry } = Controller()
  const [editOpen, setEditOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      type: "EXPENSE",
      amount: 0,
      category: "",
      description: "",
      transactionDate: "",
      dueDate: "",
    },
  })
  const selectedEditType = editForm.watch("type")

  useEffect(() => {
    if (selectedEditType === "INCOME") {
      editForm.setValue("dueDate", "", { shouldDirty: true, shouldValidate: true })
    }
  }, [editForm, selectedEditType])

  const openEdit = (item: (typeof state.items)[number]) => {
    setSelectedId(item.id)
    editForm.reset({
      type: item.type,
      amount: Number(item.amount),
      category: item.category,
      description: item.description ?? "",
      transactionDate: item.transactionDate.slice(0, 10),
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : "",
    })
    setEditOpen(true)
  }

  const handleEditSubmit = async (data: FormValues) => {
    if (!selectedId) return

    const ok = await updateEntry(selectedId, {
      type: data.type,
      amount: Number(data.amount),
      category: data.category,
      description: data.description?.trim() ? data.description.trim() : null,
      transactionDate: data.transactionDate,
      dueDate: data.type === "EXPENSE" && data.dueDate?.trim() ? data.dueDate : null,
    })

    if (ok) {
      setEditOpen(false)
      setSelectedId(null)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteEntry(id)
  }

  return (
    <div className="bg-white px-6 py-7">
      <div className="flex items-center justify-between pb-6">
        <p>Entradas e saídas</p>

        <Button asChild variant="primary">
          <Link href="/entradas-saidas/novo">Novo</Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Entradas</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(state.summary.incomeTotal)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Saídas</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(state.summary.expenseTotal)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Saldo</p>
          <p className={`mt-2 text-2xl font-semibold ${state.summary.balanceTotal < 0 ? "text-red-600" : "text-gray-900"}`}>
            {formatCurrency(state.summary.balanceTotal)}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Pendentes</p>
          <p className="mt-2 text-2xl font-semibold text-amber-800">
            {formatCurrency(state.summary.pendingExpenseTotal)}
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">Vencidas</p>
          <p className="mt-2 text-2xl font-semibold text-red-800">
            {formatCurrency(state.summary.overdueExpenseTotal)}
          </p>
        </div>
      </div>

      {state.error && !state.loading ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {typeFilters.map((filter) => {
          const isActive = state.typeFilter === filter.value

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => state.setTypeFilter(filter.value)}
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

      <div className="py-6">
        {state.loading ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
            Carregando lançamentos...
          </div>
        ) : state.items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
            {state.typeFilter === "ALL"
              ? "Nenhum lançamento cadastrado ainda."
              : "Nenhum lançamento encontrado para o filtro selecionado."}
          </div>
        ) : (
          <table className="min-w-full table-auto rounded-lg border border-gray-200">
            <thead className="hidden w-full border-b border-gray-300 bg-gray-50 text-left text-sm text-gray-600 lg:table-header-group">
              <tr>
                <th className="whitespace-nowrap px-6 py-3.5 text-left text-sm font-semibold">Valor</th>
                <th className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold">Data</th>
                <th className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold">Vencimento</th>
                <th className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold">Tipo</th>
                <th className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold">Categoria</th>
                <th className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold">Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody className="text-sm text-gray-700">
              {state.items.map((item) => (
                <tr key={item.id} className="border-b-2 border-gray-200 lg:border-b">
                  <td className="block whitespace-nowrap border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-6 lg:py-4">
                    <div className="flex items-center lg:justify-between lg:border-b-0">
                      <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Valor</div>
                      <div className="p-4 text-sm font-medium lg:p-0">{formatCurrency(item.amount)}</div>
                    </div>
                  </td>

                  <td className="block whitespace-nowrap border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-2 lg:py-4">
                    <div className="flex items-center lg:justify-between lg:border-b-0">
                      <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Data</div>
                      <div className="p-4 text-sm lg:p-0">{formatDate(item.transactionDate)}</div>
                    </div>
                  </td>

                  <td className="block whitespace-nowrap border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-2 lg:py-4">
                    <div className="flex items-center lg:justify-between lg:border-b-0">
                      <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Vencimento</div>
                      <div className="p-4 text-sm lg:p-0">{formatDate(item.dueDate)}</div>
                    </div>
                  </td>

                  <td className="block whitespace-nowrap border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-2 lg:py-4">
                    <div className="flex items-center lg:justify-between lg:border-b-0">
                      <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Tipo</div>
                      <div className="ml-4 rounded-full px-2 py-1 text-xs lg:ml-0">{getTypeLabel(item.type)}</div>
                    </div>
                  </td>

                  <td className="block border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-2 lg:py-4">
                    <div className="flex items-center lg:justify-between lg:border-b-0">
                      <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Categoria</div>
                      <div className="p-4 text-sm lg:p-0">{item.category}</div>
                    </div>
                  </td>

                  <td className="block border-b p-0 text-sm lg:table-cell lg:border-b-0 lg:px-2 lg:py-4">
                    <div className="flex items-center lg:justify-between lg:border-b-0">
                      <div className="w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold lg:hidden">Status</div>
                      <div className="p-4 lg:p-0">
                        {(() => {
                          const displayStatus = getDisplayStatus(item.type, item.status, item.dueDate)

                          return (
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${displayStatus.className}`}>
                              {displayStatus.label}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium lg:pr-6">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(item)}>
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={state.deletingId === item.id}
                      >
                        {state.deletingId === item.id ? "Excluindo..." : "Excluir"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader className="pb-4">
            <DialogTitle>Editar lançamento</DialogTitle>
            <DialogDescription>Atualize os dados principais do lançamento financeiro.</DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
            <FieldGroup>
              <ControllerForm
                name="type"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Escolha o tipo</FieldLabel>

                    <RadioGroup className="flex" onValueChange={field.onChange} value={field.value}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="INCOME" id="edit-finance-income" />
                        <Label htmlFor="edit-finance-income">Entrada</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="EXPENSE" id="edit-finance-expense" />
                        <Label htmlFor="edit-finance-expense">Saída</Label>
                      </div>
                    </RadioGroup>

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            <FieldGroup className="grid gap-5 md:grid-cols-2">
              <ControllerForm
                name="amount"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-amount">Valor</FieldLabel>
                    <Input
                      {...field}
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <ControllerForm
                name="category"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-category">Categoria</FieldLabel>
                    <Input {...field} id="edit-category" type="text" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <ControllerForm
                name="transactionDate"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-transactionDate">Data</FieldLabel>
                    <Input {...field} id="edit-transactionDate" type="date" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {selectedEditType === "EXPENSE" ? (
                <ControllerForm
                  name="dueDate"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="edit-dueDate">Vencimento</FieldLabel>
                      <Input {...field} id="edit-dueDate" type="date" aria-invalid={fieldState.invalid} value={field.value ?? ""} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              ) : null}
            </FieldGroup>

            <FieldGroup>
              <ControllerForm
                name="description"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-description">Observações</FieldLabel>
                    <Textarea {...field} id="edit-description" aria-invalid={fieldState.invalid} value={field.value ?? ""} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            {editForm.formState.errors.root?.message ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {editForm.formState.errors.root.message}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
