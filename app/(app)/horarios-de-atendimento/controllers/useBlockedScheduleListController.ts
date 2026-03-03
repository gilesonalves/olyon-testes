import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { BlockedScheduleItem } from "../types"
import { BlockedScheduleFormValues } from "../schemas"
import { getErrorMessage } from "@/lib/utils/errors"


type ApiItem = {
  id: string
  date: string // YYYY-MM-DD
  allDay: boolean
  startTime?: string
  endTime?: string
}

function sortBlockedItems(items: BlockedScheduleItem[]) {
  return [...items].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return (a.startTime ?? "").localeCompare(b.startTime ?? "")
  })
}

export function useBlockedScheduleListController() {
  const [items, setItems] = useState<BlockedScheduleItem[]>([])
  const [editingItem, setEditingItem] = useState<BlockedScheduleItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // ✅ Temporário: usa storeId do localStorage (alinha com seu app de switch de loja)
  // Se você já tem um helper de store atual, me manda depois que eu troco.
  const storeId = useMemo(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("currentStoreId") || localStorage.getItem("storeId")
  }, [])

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (storeId) h["x-store-id"] = storeId
    return h
  }, [storeId])

  const fetchItems = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    try {
      const res = await fetch("/api/schedule/blocked", { headers })
      const json = (await res.json()) as { ok: boolean; data?: ApiItem[]; message?: string }
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar bloqueios")

      const next: BlockedScheduleItem[] = (json.data ?? []).map((i) => ({
        id: i.id,
        date: i.date,
        allDay: i.allDay,
        startTime: i.startTime,
        endTime: i.endTime,
      }))

      setItems(sortBlockedItems(next))
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Erro ao carregar bloqueios"), { position: "bottom-right" })
    } finally {
      setLoading(false)
    }
  }, [headers, storeId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  function openForCreate() {
    setEditingItem(null)
    setDialogOpen(true)
  }

  function openForEdit(item: BlockedScheduleItem) {
    setEditingItem(item)
    setDialogOpen(true)
  }

  function closeDialog() {
    setEditingItem(null)
    setDialogOpen(false)
  }

  async function save(data: BlockedScheduleFormValues) {
    if (!storeId) {
      toast.error("Store não selecionada", { position: "bottom-right" })
      return
    }

    try {
      // edição: só 1 date
      if (editingItem) {
        const payload = {
          date: data.dates[0],
          allDay: data.allDay,
          startTime: data.allDay ? undefined : data.startTime,
          endTime: data.allDay ? undefined : data.endTime,
        }

        const res = await fetch(`/api/schedule/blocked/${editingItem.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        })

        const json = await res.json()
        if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao editar bloqueio")

        toast.success("Bloqueio atualizado com sucesso", { position: "bottom-right" })
        closeDialog()
        await fetchItems()
        return
      }

      // criação: pode ter várias dates
      const payload = {
        dates: Array.from(new Set(data.dates)).sort(),
        allDay: data.allDay,
        startTime: data.allDay ? undefined : data.startTime,
        endTime: data.allDay ? undefined : data.endTime,
      }

      const res = await fetch("/api/schedule/blocked", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao criar bloqueio")

      toast.success("Horário bloqueado com sucesso", { position: "bottom-right" })
      closeDialog()
      await fetchItems()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Erro ao salvar bloqueio"), { position: "bottom-right" })
    }
  }

  async function remove(id: string) {
    if (!storeId) {
      toast.error("Store não selecionada", { position: "bottom-right" })
      return
    }

    try {
      const res = await fetch(`/api/schedule/blocked/${id}`, {
        method: "DELETE",
        headers,
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao remover bloqueio")

      toast.success("Bloqueio removido", { position: "bottom-right" })
      if (editingItem?.id === id) closeDialog()
      await fetchItems()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Erro ao remover bloqueio"), { position: "bottom-right" })
    }
  }

  return {
    items,
    loading,
    dialogOpen,
    editingItem,
    openForCreate,
    openForEdit,
    closeDialog,
    save,
    remove,
    setDialogOpen,
  }
}