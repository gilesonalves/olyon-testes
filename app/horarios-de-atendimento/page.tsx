"use client"

import Horarios from "./components/horarios"

import {
  useBlockedScheduleFormController,
  useBlockedScheduleListController,
} from "./controllers"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Controller as RHFController } from "react-hook-form"

import CalendarMultiSelect from "./components/calendar-multi-select"
import { formatDate } from "@/lib/utils/date"
import { getWeekdayBlockedInfo } from "./utils/blockedSchedule"

export default function HorariosDeAtendimento() {
  /** controller da LISTA (bloqueios) */
  const listController = useBlockedScheduleListController()

  /** controller do FORM (bloqueios) */
  const formController = useBlockedScheduleFormController({
    onSuccess: listController.save,
  })

  const { form, onSubmit, allDay, resetForm } = formController

  const {
    items,
    dialogOpen,
    editingItem,
    openForCreate,
    openForEdit,
    closeDialog,
    remove,
  } = listController

  const blockedInfoByWeekday = getWeekdayBlockedInfo(items)
  const weekDays = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ]

  return (
    <div className="bg-white px-6 py-7 w-[500px]">
      <div className="pb-6">
        <p>Horários de atendimento</p>
      </div>

      {/* ================== */}
      {/* HORÁRIOS SEMANAIS */}
      {/* ================== */}
      <FieldGroup className="gap-3">
        {weekDays.map((day, index) => {
          const dayInfo = blockedInfoByWeekday[index]
          const disabledByBlock = dayInfo?.allDay ?? false
          const blockedIntervals = dayInfo?.intervals ?? []

          return (
            <div key={day} className="p-3 border rounded-md mb-3 space-y-2">
              <Horarios
                title={day}
                disabledByBlock={disabledByBlock}
                blockedIntervals={blockedIntervals}
              />
              {disabledByBlock && (
                <p className="text-xs text-gray-500">
                  Este dia está bloqueado por uma exceção de data.
                </p>
              )}
            </div>
          )
        })}
      </FieldGroup>

      {/* ================== */}
      {/* HORÁRIOS BLOQUEADOS */}
      {/* ================== */}
      <div className="pt-10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Horários bloqueados</h3>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                closeDialog()
                resetForm()
              }
            }}
          >
            <DialogTrigger asChild>
              <button
                type="button"
                onClick={openForCreate}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs"
              >
                + Adicionar
              </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[760px]">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar bloqueio" : "Adicionar bloqueio"}
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid gap-6 sm:grid-cols-[1.2fr_1fr]">
                  {/* Datas */}
                  <RHFController
                    name="dates"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Seleção de datas</FieldLabel>
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
                    <FieldGroup className="grid gap-3 grid-cols-2">
                      <RHFController
                        name="startTime"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Horário inicial</FieldLabel>
                            <Input
                              {...field}
                              type="time"
                              disabled={allDay}
                            />
                            {fieldState.error && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />

                      <RHFController
                        name="endTime"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Horário final</FieldLabel>
                            <Input
                              {...field}
                              type="time"
                              disabled={allDay}
                            />
                            {fieldState.error && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />
                    </FieldGroup>

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
                    onClick={() => {
                      closeDialog()
                      resetForm()
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingItem ? "Salvar" : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de bloqueios */}
        {items.length === 0 ? (
          <div className="border border-dashed p-4 text-sm text-gray-500">
            Nenhum horário bloqueado.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center border rounded-lg px-3 py-2"
            >
              <div>
                <div>{formatDate(item.date)}</div>
                <div className="text-xs text-gray-500">
                  {item.allDay
                    ? "Dia inteiro"
                    : `${item.startTime} - ${item.endTime}`}
                </div>
              </div>

              <div className="flex gap-2 text-sm">
                <button onClick={() => openForEdit(item)}>Editar</button>
                <button onClick={() => remove(item.id)}>Remover</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
