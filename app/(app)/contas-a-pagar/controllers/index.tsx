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

type FinanceExpenseCreatePayload = {
  amount: number
  category: string
  description?: string | null
  transactionDate: string
  dueDate?: string | null
  status?: "PENDING" | "PAID" | "OVERDUE"
}

type ApiOk<T> = { ok: true; data: T }
type ApiErr = { ok: false; error: string }
type ApiResp<T> = ApiOk<T> | ApiErr

type ControllerOptions = {
  autoLoad?: boolean
}

export const Controller = ({ autoLoad = true }: ControllerOptions = {}) => {
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadEntries = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/finance/entries")
      const json = (await res.json()) as ApiResp<{ items: FinanceEntry[] }>

      if (!res.ok || !json.ok) {
        setEntries([])
        setError(json.ok ? "Falha ao carregar contas a pagar." : json.error)
        return
      }

      setEntries(json.data.items)
    } catch {
      setEntries([])
      setError("Falha ao carregar contas a pagar.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!autoLoad) return
    void loadEntries()
  }, [autoLoad])

  const createEntry = async (payload: FinanceExpenseCreatePayload) => {
    try {
      const res = await fetch("/api/finance/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          type: "EXPENSE",
        }),
      })

      const json = (await res.json()) as ApiResp<{ item: FinanceEntry }>

      if (!res.ok || !json.ok) {
        return {
          ok: false as const,
          error: json.ok ? "Falha ao criar despesa." : json.error,
        }
      }

      return { ok: true as const, item: json.data.item }
    } catch {
      return { ok: false as const, error: "Falha ao criar despesa." }
    }
  }

  const deleteEntry = async (id: string) => {
    setDeletingId(id)
    setError(null)

    try {
      const res = await fetch(`/api/finance/entries/${id}`, { method: "DELETE" })
      const json = (await res.json()) as ApiResp<{ success: true }>

      if (!res.ok || !json.ok) {
        const message = json.ok ? "Falha ao excluir despesa." : json.error
        setError(message)
        toast.error(message)
        return false
      }

      toast.success("Despesa excluída com sucesso!")
      await loadEntries()
      return true
    } catch {
      const message = "Falha ao excluir despesa."
      setError(message)
      toast.error(message)
      return false
    } finally {
      setDeletingId(null)
    }
  }

  const items = useMemo(
    () => entries.filter((entry) => entry.type === "EXPENSE"),
    [entries]
  )

  const state = {
    items,
    loading,
    error,
    deletingId,
    reload: loadEntries,
  }

  return { createEntry, deleteEntry, state }
}
