"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

export type FinanceEntry = {
  id: string
  storeId: string
  createdById: string | null
  type: "INCOME" | "EXPENSE"
  status: "PENDING" | "PAID" | "OVERDUE"
  amount: string | number
  category: string
  description: string | null
  transactionDate: string
  dueDate: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

type FinanceEntryCreatePayload = {
  type: "INCOME" | "EXPENSE"
  amount: number
  category: string
  description?: string | null
  transactionDate: string
  dueDate?: string | null
  status?: "PENDING" | "PAID" | "OVERDUE"
}

type FinanceEntryUpdatePayload = {
  type?: "INCOME" | "EXPENSE"
  amount?: number
  category?: string
  description?: string | null
  transactionDate?: string
  dueDate?: string | null
}

type ApiOk<T> = { ok: true; data: T }
type ApiErr = { ok: false; error: string }
type ApiResp<T> = ApiOk<T> | ApiErr

type ControllerOptions = {
  autoLoad?: boolean
}

export type FinanceEntryTypeFilter = "ALL" | "INCOME" | "EXPENSE"

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

function buildSummary(items: FinanceEntry[]) {
  return items.reduce(
    (accumulator, item) => {
      const amount = typeof item.amount === "number" ? item.amount : Number(item.amount)
      const normalizedAmount = Number.isFinite(amount) ? amount : 0

      if (item.type === "INCOME") {
        accumulator.incomeTotal += normalizedAmount
      }

      if (item.type === "EXPENSE") {
        accumulator.expenseTotal += normalizedAmount

        if (item.status !== "PAID") {
          if (isPastDueDate(item.dueDate)) {
            accumulator.overdueExpenseTotal += normalizedAmount
          } else {
            accumulator.pendingExpenseTotal += normalizedAmount
          }
        }
      }

      accumulator.balanceTotal = accumulator.incomeTotal - accumulator.expenseTotal

      return accumulator
    },
    {
      incomeTotal: 0,
      expenseTotal: 0,
      balanceTotal: 0,
      pendingExpenseTotal: 0,
      overdueExpenseTotal: 0,
    }
  )
}

export const Controller = ({ autoLoad = true }: ControllerOptions = {}) => {
  const [items, setItems] = useState<FinanceEntry[]>([])
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<FinanceEntryTypeFilter>("ALL")

  const loadEntries = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/finance/entries")
      const json = (await res.json()) as ApiResp<{ items: FinanceEntry[] }>

      if (!res.ok || !json.ok) {
        setItems([])
        setError(json.ok ? "Falha ao carregar lançamentos." : json.error)
        return
      }

      setItems(json.data.items)
    } catch {
      setItems([])
      setError("Falha ao carregar lançamentos.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!autoLoad) return
    void loadEntries()
  }, [autoLoad])

  const createEntry = async (payload: FinanceEntryCreatePayload) => {
    try {
      const res = await fetch("/api/finance/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = (await res.json()) as ApiResp<{ item: FinanceEntry }>

      if (!res.ok || !json.ok) {
        return { ok: false as const, error: json.ok ? "Falha ao criar lançamento." : json.error }
      }

      return { ok: true as const, item: json.data.item }
    } catch {
      return { ok: false as const, error: "Falha ao criar lançamento." }
    }
  }

  const updateEntry = async (id: string, payload: FinanceEntryUpdatePayload) => {
    try {
      const res = await fetch(`/api/finance/entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = (await res.json()) as ApiResp<{ item: FinanceEntry }>

      if (!res.ok || !json.ok) {
        const message = json.ok ? "Falha ao atualizar lançamento." : json.error
        toast.error(message)
        return false
      }

      toast.success("Lançamento atualizado com sucesso!")
      await loadEntries()
      return true
    } catch {
      toast.error("Falha ao atualizar lançamento.")
      return false
    }
  }

  const deleteEntry = async (id: string) => {
    setDeletingId(id)
    setError(null)

    try {
      const res = await fetch(`/api/finance/entries/${id}`, { method: "DELETE" })
      const json = (await res.json()) as ApiResp<{ success: true }>

      if (!res.ok || !json.ok) {
        const message = json.ok ? "Falha ao excluir lançamento." : json.error
        setError(message)
        toast.error(message)
        return false
      }

      toast.success("Lançamento excluído com sucesso!")
      await loadEntries()
      return true
    } catch {
      const message = "Falha ao excluir lançamento."
      setError(message)
      toast.error(message)
      return false
    } finally {
      setDeletingId(null)
    }
  }

  const filteredItems = useMemo(() => {
    if (typeFilter === "ALL") return items
    return items.filter((item) => item.type === typeFilter)
  }, [items, typeFilter])

  const summary = useMemo(() => buildSummary(filteredItems), [filteredItems])

  const state = {
    items: filteredItems,
    loading,
    error,
    deletingId,
    typeFilter,
    setTypeFilter,
    summary,
    reload: loadEntries,
  }

  return { createEntry, updateEntry, deleteEntry, state }
}