"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import type { BlockedScheduleItem } from "./useBlockedScheduleListController"

const BLOCK_CONFLICT_REQUIRES_CONFIRMATION_CODE =
  "APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION"

type BlockConflictAction =
  | "KEEP_EXISTING_APPOINTMENTS"
  | "CANCEL_CONFLICTING_APPOINTMENTS"

type BlockCreatePayload = {
  dates: string[]
  membershipId: string | null
  allDay: boolean
  startTime?: string
  endTime?: string
  conflictAction?: BlockConflictAction
}

type ConflictingAppointmentSummary = {
  id: string
  customerName: string
  date: string
  startTime: string
  endTime: string
  staffMembershipId: string | null
  staffName: string | null
}

type BlockConflictDetails = {
  requiresConfirmation: boolean
  conflictActionOptions: BlockConflictAction[]
  conflictingAppointmentsCount: number
  conflictingAppointments: ConflictingAppointmentSummary[]
}

type BlockedScheduleCreateError = {
  ok: false
  error?: string
  message?: string
  code?: string
  details?: BlockConflictDetails
}

const formSchema = z.object({
  dates: z
    .array(z.string().min(10))
    .min(1, "Selecione pelo menos uma data para o bloqueio."), // YYYY-MM-DD
  membershipId: z.string().nullable().optional(),
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
  const [conflictPrompt, setConflictPrompt] = useState<BlockConflictDetails | null>(null)
  const [pendingCreatePayload, setPendingCreatePayload] = useState<BlockCreatePayload | null>(null)

  const form = useForm<BlockedScheduleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dates: [],
      membershipId: null,
      allDay: false,
      startTime: undefined,
      endTime: undefined,
    },
  })

  const allDay = form.watch("allDay")

  useEffect(() => {
    if (allDay) {
      form.setValue("startTime", undefined)
      form.setValue("endTime", undefined)
    }
  }, [allDay, form])

  function resetForm() {
    form.reset({
      dates: [],
      membershipId: null,
      allDay: false,
      startTime: undefined,
      endTime: undefined,
    })
  }

  function dismissConflictPrompt() {
    setConflictPrompt(null)
    setPendingCreatePayload(null)
  }

  const [editingItem, setEditingItem] = useState<BlockedScheduleItem | null>(null)

  const isEditing = useMemo(() => Boolean(editingItem?.id), [editingItem])

  useEffect(() => {
    if (!editingItem) return

    form.reset({
      dates: [editingItem.date],
      membershipId: editingItem.membershipId,
      allDay: editingItem.allDay,
      startTime: editingItem.startTime,
      endTime: editingItem.endTime,
    })
  }, [editingItem, form])

  async function submitCreatePayload(payload: BlockCreatePayload) {
    const res = await fetch("/api/schedule/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = (await res.json()) as
      | { ok: true; data: { created: number } }
      | BlockedScheduleCreateError

    if (
      res.status === 409 &&
      !json.ok &&
      json.code === BLOCK_CONFLICT_REQUIRES_CONFIRMATION_CODE &&
      json.details?.requiresConfirmation
    ) {
      setPendingCreatePayload(payload)
      setConflictPrompt(json.details)
      return { requiresConfirmation: true as const }
    }

    if (!res.ok || !json.ok) {
      throw new Error(
        json.ok
          ? "Falha ao criar bloqueio"
          : (json.message ?? json.error ?? "Falha ao criar bloqueio")
      )
    }

    dismissConflictPrompt()
    return { requiresConfirmation: false as const }
  }

  async function onSubmit(values: BlockedScheduleFormValues) {
    setSubmitting(true)

    try {
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
        const res = await fetch(`/api/schedule/blocked/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: values.dates[0],
            membershipId: values.membershipId ?? null,
            allDay: values.allDay,
            startTime: values.allDay ? undefined : values.startTime,
            endTime: values.allDay ? undefined : values.endTime,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message ?? json?.error ?? "Falha ao atualizar bloqueio")
        }

        toast.success("Horário bloqueado atualizado com sucesso")
      } else {
        const result = await submitCreatePayload({
          dates: values.dates,
          membershipId: values.membershipId ?? null,
          allDay: values.allDay,
          startTime: values.allDay ? undefined : values.startTime,
          endTime: values.allDay ? undefined : values.endTime,
        })

        if (result.requiresConfirmation) {
          return
        }

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

  async function confirmConflictAction(action: BlockConflictAction) {
    if (!pendingCreatePayload) {
      return
    }

    setSubmitting(true)

    try {
      const result = await submitCreatePayload({
        ...pendingCreatePayload,
        conflictAction: action,
      })

      if (result.requiresConfirmation) {
        return
      }

      toast.success("Horário bloqueado com sucesso")
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
    conflictPrompt,
    dismissConflictPrompt,
    confirmConflictAction,
    editingItem,
    setEditingItem,
  }
}
