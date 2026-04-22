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

type ApiOk<T> = { ok: true; data: T }
type ApiErr = { ok: false; error: string }
type ApiResp<T> = ApiOk<T> | ApiErr

type ControllerOptions = {
  autoLoad?: boolean
}

const statusPriority: Record<FinanceEntry["status"], number> = {
  OVERDUE: 0,
  PENDING: 1,
  PAID: 2,
}

export const Controller = ({ autoLoad = true }: ControllerOptions = {}) => {
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  const loadEntries = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/finance/entries")
      const json = (await res.json()) as ApiResp<{ items: FinanceEntry[] }>

      if (!res.ok || !json.ok) {
        setEntries([])
        setError(json.ok ? "Falha ao carregar controle de pagamentos." : json.error)
        return
      }

      setEntries(json.data.items)
    } catch {
      setEntries([])
      setError("Falha ao carregar controle de pagamentos.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!autoLoad) return
    void loadEntries()
  }, [autoLoad])

  const markAsPaid = async (id: string) => {
    setPayingId(id)
    setError(null)

    try {
      const res = await fetch(`/api/finance/entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          paidAt: new Date().toISOString(),
        }),
      })

      const json = (await res.json()) as ApiResp<{ item: FinanceEntry }>

      if (!res.ok || !json.ok) {
        const message = json.ok ? "Falha ao marcar pagamento." : json.error
        setError(message)
        toast.error(message)
        return false
      }

      toast.success("Pagamento marcado como pago!")
      await loadEntries()
      return true
    } catch {
      const message = "Falha ao marcar pagamento."
      setError(message)
      toast.error(message)
      return false
    } finally {
      setPayingId(null)
    }
  }

  const items = useMemo(() => {
    return entries
      .filter((entry) => entry.type === "EXPENSE")
      .slice()
      .sort((left, right) => {
        const statusDiff = statusPriority[left.status] - statusPriority[right.status]
        if (statusDiff !== 0) return statusDiff

        const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER
        const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER

        return leftDue - rightDue
      })
  }, [entries])

  const state = {
    items,
    loading,
    error,
    payingId,
    reload: loadEntries,
  }

  return { markAsPaid, state }
}