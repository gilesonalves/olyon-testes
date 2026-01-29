import { useState } from "react"
import { BlockedScheduleItem } from "../types"
import {
    BlockedScheduleFormValues
  
} from "../schemas"

function createId() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
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
  const [editingItem, setEditingItem] =
    useState<BlockedScheduleItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

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

  function save(data: BlockedScheduleFormValues) {
    const dates = Array.from(new Set(data.dates)).sort()

    const payload = {
      allDay: data.allDay,
      startTime: data.allDay ? undefined : data.startTime,
      endTime: data.allDay ? undefined : data.endTime,
    }

    setItems((prev) => {
      // edição
      if (editingItem) {
        const updated = prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                date: dates[0],
                ...payload,
              }
            : item
        )
        return sortBlockedItems(updated)
      }

      // criação
      const created: BlockedScheduleItem[] = dates.map((date) => ({
        id: createId(),
        date,
        ...payload,
      }))

      return sortBlockedItems([...prev, ...created])
    })

    closeDialog()
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))

    if (editingItem?.id === id) {
      closeDialog()
    }
  }

  return {
    items,
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
