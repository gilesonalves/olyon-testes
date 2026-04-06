"use client"

import HeaderPage from "@/components/headerPage"
import { useEffect, useMemo, useState } from "react"
import Horarios from "./components/horarios"

import {
  useBlockedScheduleFormController,
  useBlockedScheduleListController,
  useWeekScheduleFormController,
} from "./controllers"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Controller as RHFController } from "react-hook-form"

import CalendarMultiSelect from "./components/calendar-multi-select"
import { formatDate } from "@/lib/utils/date"
import { getWeekdayBlockedInfo } from "./utils/blockedSchedule"
import {
  BlockedScheduleListSkeleton,
  SchedulePageSkeleton,
} from "./components/schedule-page-skeleton"

const PAGE_SIZE = 10

type ScheduleProfessionalOption = {
  membershipId: string
  name: string
}

function formatBlockedScopeLabel(item: {
  membershipId: string | null
  membershipName: string | null
}) {
  if (!item.membershipId) {
    return "Loja inteira"
  }

  return item.membershipName ?? "Profissional selecionado"
}

export default function HorariosDeAtendimento() {
  const [scheduleScopeMembershipId, setScheduleScopeMembershipId] = useState<string | null>(null)
  const [scheduleProfessionals, setScheduleProfessionals] = useState<ScheduleProfessionalOption[]>([])

  /** controller WEEKLY (cookie-based) */
  const weekController = useWeekScheduleFormController(scheduleScopeMembershipId)

  /** controller da LISTA (bloqueios) */
  const listController = useBlockedScheduleListController()

  /** controller do FORM (bloqueios) */
  const formController = useBlockedScheduleFormController({
    onSuccess: listController.refresh,
  })

  const {
    form,
    onSubmit,
    allDay,
    resetForm,
    setEditingItem,
    submitting,
    conflictPrompt,
    dismissConflictPrompt,
    confirmConflictAction,
  } = formController

  const {
    items,
    dialogOpen,
    editingItem,
    openForCreate,
    openForEdit,
    closeDialog,
    remove,
  } = listController
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const blockedItemsForSelectedScope = useMemo(
    () =>
      items.filter((item) => {
        if (!scheduleScopeMembershipId) {
          return item.membershipId === null
        }

        return item.membershipId === null || item.membershipId === scheduleScopeMembershipId
      }),
    [items, scheduleScopeMembershipId]
  )
  const blockedInfoByWeekday = getWeekdayBlockedInfo(blockedItemsForSelectedScope)
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])
  const hasMoreItems = visibleItems.length < items.length
  const showPageSkeleton =
    weekController.initialLoading || (listController.loading && items.length === 0)
  const weekDays = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ]

  useEffect(() => {
    let alive = true

    async function loadProfessionals() {
      try {
        const response = await fetch("/api/team", { cache: "no-store" })
        const json = await response.json()

        if (!response.ok || !json?.ok) {
          throw new Error(json?.error ?? "Falha ao carregar profissionais")
        }

        if (!alive) {
          return
        }

        setScheduleProfessionals(
          (json.data ?? [])
            .map((item: { membershipId: string; name: string }) => ({
              membershipId: item.membershipId,
              name: item.name,
            }))
            .sort((left: ScheduleProfessionalOption, right: ScheduleProfessionalOption) =>
              left.name.localeCompare(right.name, "pt-BR")
            )
        )
      } catch {
        if (!alive) {
          return
        }

        setScheduleProfessionals([])
      }
    }

    void loadProfessionals()

    return () => {
      alive = false
    }
  }, [])

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">Horários de atendimento</span>
        </div>
      </HeaderPage>

      {showPageSkeleton ? (
        <SchedulePageSkeleton />
      ) : (
      <div className="w-full max-w-5xl bg-white px-4 py-6 sm:px-6 sm:py-7">

      {/* ================== */}
      {/* HORÁRIOS SEMANAIS */}
      {/* ================== */}

      {weekController.error && (
        <div className="mb-3 text-sm text-red-600">{weekController.error}</div>
      )}

      {!weekController.storeReady && (
        <div className="mb-3 text-xs text-amber-700">
          Nenhuma loja selecionada. Troque/seleciona uma loja para carregar e salvar os horários.
        </div>
      )}

      <div className="mb-6 grid max-w-sm gap-2">
        <label className="text-sm font-medium text-slate-700">Escopo do expediente</label>
        <select
          value={scheduleScopeMembershipId ?? ""}
          onChange={(event) => setScheduleScopeMembershipId(event.target.value || null)}
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
        >
          <option value="">Loja inteira</option>
          {scheduleProfessionals.map((professional) => (
            <option key={professional.membershipId} value={professional.membershipId}>
              {professional.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Use a loja como padrão geral ou personalize o expediente de um profissional específico.
        </p>
      </div>

      <div className="gap-3">
        {weekDays.map((dayLabel, index) => {
          const dayInfo = blockedInfoByWeekday[index]
          const disabledByBlock = dayInfo?.allDay ?? false
          const blockedIntervals = dayInfo?.intervals ?? []

          const dayValue = weekController.form.watch(`days.${index}`)
          if (!dayValue) return null

          return (
            <div key={dayLabel} className="p-3 border rounded-md mb-3 space-y-2">
              <Horarios
                title={dayLabel}
                disabledByBlock={disabledByBlock}
                blockedIntervals={blockedIntervals}
                value={{
                  enabled: dayValue.enabled,
                  horarios: dayValue.horarios,
                }}
                onChange={(next) => {
                  weekController.form.setValue(
                    `days.${index}.enabled`,
                    next.enabled,
                    { shouldDirty: true }
                  )
                  weekController.form.setValue(
                    `days.${index}.horarios`,
                    next.horarios,
                    { shouldDirty: true }
                  )
                }}
              />

              {disabledByBlock && (
                <p className="text-xs text-gray-500">
                  Este dia está bloqueado por uma exceção de data.
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => weekController.form.reset()}
          disabled={weekController.initialLoading || weekController.loading}
        >
          Desfazer
        </Button>

        <Button
          type="button"
          onClick={weekController.form.handleSubmit(weekController.onSubmit)}
          disabled={
            weekController.initialLoading ||
            weekController.loading ||
            !weekController.storeReady
          }
        >
          Salvar horários semanais
        </Button>
      </div>

      {/* ================== */}
      {/* HORÁRIOS BLOQUEADOS */}
      {/* ================== */}
      <div className="pt-10 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">Horários bloqueados</h3>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                dismissConflictPrompt()
                closeDialog()
                resetForm()
                setEditingItem(null)
              }
            }}
          >
            <DialogTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  openForCreate()
                  setEditingItem(null)
                  resetForm()
                  form.setValue("membershipId", scheduleScopeMembershipId, {
                    shouldDirty: false,
                  })
                }}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs"
              >
                + Adicionar
              </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-190">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar bloqueio" : "Adicionar bloqueio"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Defina datas e horários para bloquear o atendimento nesta loja.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-[1.2fr_1fr]">
                  {/* Datas */}
                  <RHFController
                    name="dates"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Label>Seleção de datas</Label>
                        <CalendarMultiSelect
                          selectedDates={field.value ?? []}
                          onChange={field.onChange}
                          multiple={!editingItem}
                        />
                        {fieldState.error && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  {/* Horários */}
                  <div className="space-y-4 border-l pl-6">
                    <RHFController
                      name="membershipId"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <Label>Aplicar bloqueio em</Label>
                          <select
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(event.target.value || null)}
                            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                          >
                            <option value="">Loja inteira</option>
                            {scheduleProfessionals.map((professional) => (
                              <option
                                key={professional.membershipId}
                                value={professional.membershipId}
                              >
                                {professional.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}
                    />

                    <div className="grid gap-3 grid-cols-2">
                      <RHFController
                        name="startTime"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <Label>Horário inicial</Label>
                            <Input
                              type="time"
                              value={field.value ?? ""}            // ✅ nunca undefined
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              disabled={allDay}
                            />
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <RHFController
                        name="endTime"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <Label>Horário final</Label>
                            <Input
                              type="time"
                              value={field.value ?? ""}            // ✅ nunca undefined
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              disabled={allDay}
                            />
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>

                    <RHFController
                      name="allDay"
                      control={form.control}
                      render={({ field }) => (
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <Label>Indisponível o dia todo</Label>
                        </div>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => {
                      dismissConflictPrompt()
                      closeDialog()
                      resetForm()
                      setEditingItem(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Salvando..." : editingItem ? "Salvar" : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <AlertDialog
          open={Boolean(conflictPrompt)}
          onOpenChange={(open) => {
            if (!open && !submitting) {
              dismissConflictPrompt()
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Existem agendamentos neste periodo</AlertDialogTitle>
              <AlertDialogDescription>
                {conflictPrompt
                  ? `Existem ${conflictPrompt.conflictingAppointmentsCount} agendamentos ativos neste periodo. Deseja manter esses atendimentos e bloquear apenas novos horarios, ou cancelar os atendimentos conflitantes?`
                  : "Confirme como o bloqueio deve tratar os atendimentos existentes."}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {conflictPrompt?.conflictingAppointments.length ? (
              <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                {conflictPrompt.conflictingAppointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="text-sm text-slate-700">
                    <p className="font-medium text-slate-900">{appointment.customerName}</p>
                    <p>
                      {formatDate(appointment.date)} {appointment.startTime} - {appointment.endTime}
                      {appointment.staffName ? ` / ${appointment.staffName}` : ""}
                    </p>
                  </div>
                ))}
                {conflictPrompt.conflictingAppointmentsCount > 5 ? (
                  <p className="text-xs text-slate-500">
                    E mais {conflictPrompt.conflictingAppointmentsCount - 5} agendamentos.
                  </p>
                ) : null}
              </div>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Voltar</AlertDialogCancel>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => void confirmConflictAction("KEEP_EXISTING_APPOINTMENTS")}
              >
                Manter atendimentos
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void confirmConflictAction("CANCEL_CONFLICTING_APPOINTMENTS")}
              >
                {submitting ? "Salvando..." : "Cancelar atendimentos"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Lista de bloqueios */}
        {listController.loading && items.length === 0 ? (
          <BlockedScheduleListSkeleton />
        ) : items.length === 0 ? (
          <div className="border border-dashed p-4 text-sm text-gray-500">
            Nenhum horário bloqueado.
          </div>
        ) : (
          <>
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div>{formatDate(item.date)}</div>
                  <div className="text-xs text-gray-500">
                    {item.allDay ? "Dia inteiro" : `${item.startTime} - ${item.endTime}`}
                  </div>
                  <div className="text-xs text-gray-500">{formatBlockedScopeLabel(item)}</div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      openForEdit(item)
                      setEditingItem(item) // ✅ sincroniza com o form controller
                    }}
                  >
                    Editar
                  </button>
                  <button type="button" onClick={() => remove(item.id)}>
                    Remover
                  </button>
                </div>
              </div>
            ))}

            {hasMoreItems ? (
              <div className="mt-4 flex justify-center">
                <Button type="button" variant="outline" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                  Carregar mais
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
      </div>
      )}
    </>
  )
}
