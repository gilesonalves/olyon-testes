"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import type { BlockedScheduleItem } from "./useBlockedScheduleListController"

const formSchema = z.object({
  dates: z.array(z.string().min(10)).min(1), // YYYY-MM-DD
  allDay: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
})

export type BlockedScheduleFormValues = z.infer<typeof formSchema>

type Options = {
  onSuccess?: () => void | Promise<void>
}

export function useBlockedScheduleFormController(options?: Options) {
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<BlockedScheduleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dates: [],
      allDay: false,
      startTime: undefined,
      endTime: undefined,
    },
  })

  const allDay = form.watch("allDay")

  // Se allDay, limpa horas (evita enviar lixo)
  useEffect(() => {
    if (allDay) {
      form.setValue("startTime", undefined)
      form.setValue("endTime", undefined)
    }
  }, [allDay, form])

  function resetForm() {
    form.reset({
      dates: [],
      allDay: false,
      startTime: undefined,
      endTime: undefined,
    })
  }

  /**
   * Você pode injetar o item em edição por fora se quiser,
   * mas pela sua página atual, o "editingItem" fica no listController.
   * Então passamos o editingItem via formController.setEditingItem(...) se precisar.
   */
  const [editingItem, setEditingItem] = useState<BlockedScheduleItem | null>(null)

  const isEditing = useMemo(() => Boolean(editingItem?.id), [editingItem])

  // Quando abre para editar, popula o form
  useEffect(() => {
    if (!editingItem) return

    form.reset({
      dates: [editingItem.date],
      allDay: editingItem.allDay,
      startTime: editingItem.startTime,
      endTime: editingItem.endTime,
    })
  }, [editingItem, form])

  async function onSubmit(values: BlockedScheduleFormValues) {
    setSubmitting(true)

    try {
      // validação extra no client (opcional, mas ajuda UX)
      if (!values.allDay) {
        if (!values.startTime || !values.endTime) {
          toast.error("Informe horário inicial e final ou marque dia todo.")
          return
        }
        if (values.startTime >= values.endTime) {
          toast.error("Horário final deve ser maior que o inicial.")
          return
        }
      }

      if (isEditing && editingItem?.id) {
        // update (1 data)
        const res = await fetch(`/api/schedule/blocked/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: values.dates[0],
            allDay: values.allDay,
            startTime: values.allDay ? undefined : values.startTime,
            endTime: values.allDay ? undefined : values.endTime,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Falha ao atualizar bloqueio")

        toast.success("Horário bloqueado atualizado com sucesso")
      } else {
        // create (pode ser várias datas)
        const res = await fetch("/api/schedule/blocked", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dates: values.dates,
            allDay: values.allDay,
            startTime: values.allDay ? undefined : values.startTime,
            endTime: values.allDay ? undefined : values.endTime,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Falha ao criar bloqueio")

        toast.success("Horário bloqueado com sucesso")
      }

      await options?.onSuccess?.()
      resetForm()
      setEditingItem(null)
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erro ao salvar bloqueio")
    } finally {
      setSubmitting(false)
    }
  }

  return {
    form,
    onSubmit,
    allDay,
    submitting,

    resetForm,

    // opcional p/ integrar com listController.editingItem se você quiser
    editingItem,
    setEditingItem,
  }
}