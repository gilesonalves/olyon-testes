"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

export type BlockedScheduleItem = {
  id: string
  date: string // YYYY-MM-DD
  allDay: boolean
  startTime?: string
  endTime?: string
  membershipId: string | null
  membershipName: string | null
}

export function useBlockedScheduleListController() {
  const [items, setItems] = useState<BlockedScheduleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BlockedScheduleItem | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/schedule/blocked", { method: "GET" })
      const json = await res.json()

      if (!res.ok || !json?.ok) {
        // Ex.: sem loja selecionada (cookie ausente)
        throw new Error(json?.message ?? json?.error ?? "Falha ao carregar bloqueios")
      }

      setItems((json.data ?? []) as BlockedScheduleItem[])
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? "Erro ao carregar bloqueios"
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function openForCreate() {
    setEditingItem(null)
    setDialogOpen(true)
  }

  function openForEdit(item: BlockedScheduleItem) {
    setEditingItem(item)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingItem(null)
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/schedule/blocked/${id}`, {
        method: "DELETE",
      })
      const json = await res.json()

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message ?? json?.error ?? "Falha ao remover bloqueio")
      }

      toast.success("Bloqueio removido")
      await refresh()
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erro ao remover bloqueio")
    }
  }

  /**
   * Mantém compatibilidade com sua página:
   * você chama listController.save no onSuccess do form controller.
   */
  const save = refresh

  return {
    items,
    loading,
    error,

    dialogOpen,
    editingItem,
    openForCreate,
    openForEdit,
    closeDialog,

    remove,

    refresh,
    save,
  }
}
