"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import HeaderPage from "@/components/headerPage"
import { Check, Plus, Search, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  getAppointmentSourceLabel,
  getAppointmentStatusLabel,
} from "@/lib/appointments/presentation"
import { ClientCreateApiSchema } from "@/lib/validators/client"
import { formatPhone, maskPhone, normalizePhone } from "@/lib/utils/maskPhone"
import AppointmentsPageSkeleton from "./components/appointments-page-skeleton"
import ProfessionalScheduleBoard from "./components/professional-schedule-board"
import {
  type EmptySlotSelection,
  type ProfessionalColumnItem,
} from "./components/professional-schedule-column"

type ServiceItem = {
  id: string
  name: string
  durationMin: number
  active: boolean
}

type TeamItem = {
  membershipId: string
  name: string
  serviceIds: string[]
}

type AppointmentItem = {
  id: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  date: string
  startTime: string
  endTime: string
  startAt: string
  endAt: string
  status: string
  source: string
  notes: string | null
  metadata?: unknown
  service: {
    id: string
    name: string
    durationMin: number
  } | null
  staff: {
    membershipId: string
    name: string
  } | null
}

type AvailabilitySlot = {
  startAt: string
  endAt: string
  date: string
  time: string
  endTime: string
  label: string
}

type ApiSuccess<T> = {
  ok: true
  data: T
}

type ApiError = {
  ok: false
  error: string
}

type AppointmentUpdatePayload = {
  serviceId?: string
  staffMembershipId?: string | null
  customerName?: string
  customerPhone?: string | null
  customerEmail?: string | null
  date?: string
  time?: string
  notes?: string | null
  status?: string
}

type AppointmentClientOption = {
  id: string
  name: string
  email: string | null
  phone: string | null
  isActive: boolean
}

type ClientItem = AppointmentClientOption & {
  cpf: string | null
  secondaryPhone: string | null
  birthDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

type BlockedScheduleItem = {
  id: string
  date: string
  allDay: boolean
  startTime?: string
  endTime?: string
}

type BlockedScheduleError = {
  ok: false
  message?: string
}

type WeekdayCode = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"

type WeekScheduleDayItem = {
  weekday: WeekdayCode
  enabled: boolean
  intervals: Array<{
    startTime: string
    endTime: string
  }>
}

type WeekScheduleResponse = {
  days: WeekScheduleDayItem[]
}

function parseDateKey(value: string) {
  return new Date(`${value}T12:00:00`)
}

function getTodayDateValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getWeekdayCodeFromDateKey(dateKey: string): WeekdayCode {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][parseDateKey(dateKey).getDay()] as WeekdayCode
}

function getMinutesFromTimeKey(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}

function formatTimeRange(startTime: string, endTime: string) {
  return `${startTime} - ${endTime}`
}

function formatDateLabel(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString("pt-BR")
}

function formatDateTimeLabel(dateKey: string, time: string) {
  return `${formatDateLabel(dateKey)} ${time}`
}

function formatBlockedScheduleLabel(item: BlockedScheduleItem) {
  if (item.allDay) {
    return "Dia inteiro"
  }

  return `${item.startTime ?? "--:--"} - ${item.endTime ?? "--:--"}`
}

function sortClientsByName(items: ClientItem[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
}

function AppointmentClientPicker({
  value,
  selectedClient,
  results,
  loading,
  error = null,
  onValueChange,
  onSelectClient,
  onCreateClient,
}: {
  value: string
  selectedClient: AppointmentClientOption | null
  results: AppointmentClientOption[]
  loading: boolean
  error?: string | null
  onValueChange: (value: string) => void
  onSelectClient: (client: AppointmentClientOption) => void
  onCreateClient: () => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [])

  const shouldShowPanel = open && (value.trim().length > 0 || loading || Boolean(error))
  const trimmedValue = value.trim()
  const hasExactMatch = results.some((client) => client.name.toLowerCase() === trimmedValue.toLowerCase())

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          placeholder="Buscar por nome ou telefone"
          required
        />
      </div>

      {selectedClient ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-800">
          <Check className="size-3.5" />
          <span className="min-w-0 truncate">Cliente existente selecionado: {selectedClient.name}</span>
        </div>
      ) : null}

      {shouldShowPanel ? (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Carregando clientes...</div>
          ) : error ? (
            <div className="px-4 py-3 text-sm text-red-700">{error}</div>
          ) : results.length > 0 ? (
            <div className="max-h-72 overflow-y-auto p-1.5">
              {results.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 ${selectedClient?.id === client.id ? "bg-slate-100" : "bg-white"}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelectClient(client)
                    setOpen(false)
                  }}
                >
                  <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <UserRound className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{client.name}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {client.phone || client.email || "Sem telefone ou e-mail"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-4">
              <p className="text-sm text-slate-600">
                Nenhum cliente encontrado. Deseja cadastrar um novo cliente?
              </p>
            </div>
          )}

          <div className="border-t border-slate-200 bg-slate-50/80 p-2">
            <Button type="button" variant="ghost" className="w-full justify-start" onClick={onCreateClient}>
              <Plus className="size-4" />
              {trimmedValue && !hasExactMatch ? `Cadastrar \"${trimmedValue}\"` : "Cadastrar novo cliente"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function AppointmentFormSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />

      <div className="flex justify-end">
        <Skeleton className="h-11 w-40 rounded-xl" />
      </div>
    </div>
  )
}

function AvailabilitySlotsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  )
}

function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  services,
  team,
  servicesLoading,
  onSave,
  onCancel,
}: {
  appointment: AppointmentItem | null
  open: boolean
  onOpenChange: (value: boolean) => void
  services: ServiceItem[]
  team: TeamItem[]
  servicesLoading: boolean
  onSave: (appointmentId: string, payload: AppointmentUpdatePayload) => Promise<void>
  onCancel: (appointmentId: string) => Promise<void>
}) {
  const [activeTab, setActiveTab] = useState<"details" | "edit">("details")
  const [isSaving, setIsSaving] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [staffMembershipId, setStaffMembershipId] = useState("")
  const [notes, setNotes] = useState("")
  const [slotSearchDate, setSlotSearchDate] = useState(getTodayDateValue)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<AvailabilitySlot | null>(null)

  const activeServices = useMemo(
    () => services.filter((service) => service.active),
    [services]
  )

  const eligibleTeam = useMemo(() => {
    if (!serviceId) {
      return []
    }

    return team.filter((member) => member.serviceIds.includes(serviceId))
  }, [serviceId, team])

  useEffect(() => {
    if (!appointment) {
      return
    }

    setActiveTab("details")
    setIsSaving(false)
    setIsCanceling(false)
    setConfirmCancel(false)
    setError(null)
    setCustomerName(appointment.customerName)
    setCustomerPhone(formatPhone(appointment.customerPhone) ?? "")
    setCustomerEmail(appointment.customerEmail ?? "")
    setServiceId(appointment.service?.id ?? "")
    setStaffMembershipId(appointment.staff?.membershipId ?? "")
    setNotes(appointment.notes ?? "")
    setSlotSearchDate(appointment.date)
    setAvailabilityLoading(false)
    setAvailabilityError(null)
    setAvailabilitySlots([])
    setSelectedRescheduleSlot(null)
  }, [appointment])

  useEffect(() => {
    if (!open) {
      setActiveTab("details")
      setConfirmCancel(false)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!staffMembershipId) {
      return
    }

    if (!eligibleTeam.some((member) => member.membershipId === staffMembershipId)) {
      setStaffMembershipId("")
    }
  }, [eligibleTeam, staffMembershipId])

  useEffect(() => {
    setSelectedRescheduleSlot(null)
    setAvailabilityError(null)
    setAvailabilitySlots([])
  }, [serviceId, staffMembershipId])

  if (!appointment) {
    return null
  }

  const appointmentId = appointment.id
  const formattedPhone = formatPhone(appointment.customerPhone)
  const isCanceled = appointment.status === "CANCELED"
  const scheduleLabel = selectedRescheduleSlot
    ? selectedRescheduleSlot.label
    : `${formatDateLabel(appointment.date)} • ${formatTimeRange(
        appointment.startTime,
        appointment.endTime
      )}`

  function resolveAvailabilityStaff() {
    if (!serviceId) {
      return {
        ok: false as const,
        error: "Selecione um servico antes de consultar horarios.",
      }
    }

    if (eligibleTeam.length === 0) {
      return {
        ok: false as const,
        error: "Nao ha profissional elegivel para este servico.",
      }
    }

    if (staffMembershipId) {
      return {
        ok: true as const,
        staffMembershipId,
      }
    }

    if (eligibleTeam.length === 1) {
      return {
        ok: true as const,
        staffMembershipId: eligibleTeam[0].membershipId,
      }
    }

    return {
      ok: false as const,
      error: "Selecione um profissional para buscar horarios.",
    }
  }

  async function handleAvailabilitySearch() {
    setAvailabilityError(null)

    const resolvedStaff = resolveAvailabilityStaff()
    if (!resolvedStaff.ok) {
      setAvailabilitySlots([])
      setAvailabilityError(resolvedStaff.error)
      return
    }

    setAvailabilityLoading(true)

    try {
      const query = new URLSearchParams({
        serviceId,
        staffMembershipId: resolvedStaff.staffMembershipId,
        searchDate: slotSearchDate,
      })

      const response = await fetch(`/api/appointments/availability?${query.toString()}`, {
        cache: "no-store",
      })

      const json = (await response.json()) as ApiSuccess<AvailabilitySlot[]> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Nao foi possivel carregar os horarios." : json.error)
      }

      setAvailabilitySlots(json.data)
    } catch (cause) {
      setAvailabilitySlots([])
      setAvailabilityError(
        cause instanceof Error ? cause.message : "Erro ao consultar disponibilidade."
      )
    } finally {
      setAvailabilityLoading(false)
    }
  }

  async function handleSave() {
    setError(null)
    setIsSaving(true)

    try {
      if (!serviceId) {
        throw new Error("Selecione um servico.")
      }

      if (!customerName.trim()) {
        throw new Error("Informe o nome do cliente.")
      }

      const phoneDigits = normalizePhone(customerPhone)
      if (customerPhone.trim() && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
        throw new Error("Telefone invalido. Informe DDD + numero.")
      }

      const payload: AppointmentUpdatePayload = {
        serviceId,
        staffMembershipId: staffMembershipId.trim() ? staffMembershipId.trim() : null,
        customerName: customerName.trim(),
        customerPhone: phoneDigits ? phoneDigits : null,
        customerEmail: customerEmail.trim() ? customerEmail.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      }

      if (selectedRescheduleSlot) {
        payload.date = selectedRescheduleSlot.date
        payload.time = selectedRescheduleSlot.time
      }

      await onSave(appointmentId, payload)

      setActiveTab("details")
      setConfirmCancel(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao salvar agendamento.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCancel() {
    setError(null)
    setIsCanceling(true)

    try {
      await onCancel(appointmentId)
      setConfirmCancel(false)
      setActiveTab("details")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao cancelar agendamento.")
    } finally {
      setIsCanceling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden p-0 md:max-w-3xl xl:max-w-4xl">
        <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-14 sm:px-6">
          <DialogTitle>{appointment.customerName}</DialogTitle>
          <DialogDescription>
            {formatTimeRange(appointment.startTime, appointment.endTime)} • {getAppointmentStatusLabel(appointment.status)}
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-slate-200 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activeTab === "details"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              Detalhes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activeTab === "edit"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              Editar e remarcar
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {activeTab === "details" ? (
              <>
                {isCanceled ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    Este agendamento ja esta cancelado e permanece visivel apenas para historico.
                  </div>
                ) : null}

                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
                    <p className="mt-1 text-base font-medium text-slate-900">{appointment.customerName}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {getAppointmentStatusLabel(appointment.status)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Servico</p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {appointment.service?.name ?? "Servico nao informado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profissional</p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {appointment.staff?.name ?? "Sem profissional"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inicio</p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {formatDateTimeLabel(appointment.date, appointment.startTime)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fim</p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {formatDateTimeLabel(appointment.date, appointment.endTime)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duracao</p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {appointment.service?.durationMin ?? "--"} min
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Origem</p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {getAppointmentSourceLabel(appointment.source, appointment.metadata)}
                    </p>
                  </div>

                  {formattedPhone ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telefone</p>
                      <p className="mt-1 text-base font-medium text-slate-900">{formattedPhone}</p>
                    </div>
                  ) : null}

                  {appointment.customerEmail ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail</p>
                      <p className="mt-1 text-base font-medium text-slate-900">{appointment.customerEmail}</p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacoes</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {appointment.notes?.trim() || "Nenhuma observacao registrada."}
                  </p>
                </div>

                {confirmCancel ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                    <p>Cancelar este agendamento? O registro continua na agenda com status de cancelado.</p>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setConfirmCancel(false)}>
                        Voltar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => void handleCancel()}
                        disabled={isCanceling}
                      >
                        {isCanceling ? "Cancelando..." : "Confirmar cancelamento"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="grid gap-2 xl:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</label>
                    <input
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status atual</p>
                    <p className="mt-2 text-base font-medium text-slate-900">
                      {getAppointmentStatusLabel(appointment.status)}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Servico</label>
                    <select
                      value={serviceId}
                      onChange={(event) => setServiceId(event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                      disabled={servicesLoading}
                    >
                      <option value="">Selecione</option>
                      {activeServices.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} ({service.durationMin} min)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profissional</label>
                    <select
                      value={staffMembershipId}
                      onChange={(event) => setStaffMembershipId(event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                      disabled={!serviceId}
                    >
                      <option value="">Sem preferencia</option>
                      {eligibleTeam.map((member) => (
                        <option key={member.membershipId} value={member.membershipId}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    {!serviceId ? (
                      <p className="text-xs text-slate-500">Selecione um servico para liberar a equipe.</p>
                    ) : eligibleTeam.length === 0 ? (
                      <p className="text-xs text-amber-700">Nenhum profissional elegivel foi encontrado para este servico.</p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telefone</label>
                    <input
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(maskPhone(event.target.value))}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                      inputMode="tel"
                      maxLength={15}
                    />
                  </div>

                  <div className="grid gap-2 xl:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Horario selecionado</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{scheduleLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        A remarcacao agora usa apenas horarios validados pela mesma engine do backend.
                      </p>
                    </div>

                    {selectedRescheduleSlot ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedRescheduleSlot(null)}
                      >
                        Voltar ao horario atual
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[220px_auto] lg:items-end">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data para busca</label>
                      <input
                        type="date"
                        value={slotSearchDate}
                        min={getTodayDateValue()}
                        onChange={(event) => setSlotSearchDate(event.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleAvailabilitySearch()}
                        disabled={availabilityLoading}
                      >
                        {availabilityLoading ? "Buscando..." : "Buscar horarios"}
                      </Button>
                    </div>
                  </div>

                  {availabilityError ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {availabilityError}
                    </div>
                  ) : null}

                  <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
                    {availabilityLoading ? (
                      <AvailabilitySlotsSkeleton />
                    ) : availabilitySlots.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
                        Busque os horarios disponiveis para selecionar uma nova data.
                      </div>
                    ) : (
                      availabilitySlots.map((slot) => {
                        const isSelected = selectedRescheduleSlot?.startAt === slot.startAt

                        return (
                          <button
                            key={slot.startAt}
                            type="button"
                            onClick={() => {
                              setSelectedRescheduleSlot(slot)
                              setSlotSearchDate(slot.date)
                            }}
                            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                              isSelected
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                            }`}
                          >
                            <span className="block text-sm font-medium">{slot.label}</span>
                            <span className={`block text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                              Inicio: {formatDateTimeLabel(slot.date, slot.time)}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacoes</label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
          {activeTab === "details" ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Fechar
                </Button>
                <Button type="button" variant="primary" onClick={() => setActiveTab("edit")} className="w-full sm:w-auto">
                  Editar e remarcar
                </Button>
                {!isCanceled && !confirmCancel ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setConfirmCancel(true)}
                    disabled={isSaving || isCanceling}
                    className="w-full sm:w-auto"
                  >
                    Cancelar agendamento
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button type="button" variant="outline" onClick={() => setActiveTab("details")} disabled={isSaving} className="w-full sm:w-auto">
                  Voltar aos detalhes
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void handleSave()}
                  disabled={isSaving || servicesLoading}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? "Salvando..." : "Salvar alteracoes"}
                </Button>
                {!isCanceled ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setActiveTab("details")
                      setConfirmCancel(true)
                    }}
                    disabled={isSaving || isCanceling}
                    className="w-full sm:w-auto"
                  >
                    Cancelar agendamento
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function AgendamentosPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [team, setTeam] = useState<TeamItem[]>([])
  const [clients, setClients] = useState<ClientItem[]>([])
  const [blockedSchedules, setBlockedSchedules] = useState<BlockedScheduleItem[]>([])
  const [weeklySchedule, setWeeklySchedule] = useState<WeekScheduleDayItem[]>([])

  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [teamLoading, setTeamLoading] = useState(true)
  const [servicesLoading, setServicesLoading] = useState(false)
  const [servicesLoaded, setServicesLoaded] = useState(false)
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientsLoaded, setClientsLoaded] = useState(false)

  const [appointmentsError, setAppointmentsError] = useState<string | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [servicesError, setServicesError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [clientsError, setClientsError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState(getTodayDateValue)
  const [selectedProfessionalFilter, setSelectedProfessionalFilter] = useState("all")

  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [serviceId, setServiceId] = useState("")
  const [staffMembershipId, setStaffMembershipId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [notes, setNotes] = useState("")

  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [slotSearchDate, setSlotSearchDate] = useState(getTodayDateValue)

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [hiddenProfessionalIds, setHiddenProfessionalIds] = useState<string[]>([])
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockingProfessional, setBlockingProfessional] = useState<ProfessionalColumnItem | null>(null)
  const [blockDate, setBlockDate] = useState(getTodayDateValue)
  const [blockAllDay, setBlockAllDay] = useState(false)
  const [blockStartTime, setBlockStartTime] = useState("08:00")
  const [blockEndTime, setBlockEndTime] = useState("09:00")
  const [blockSaveError, setBlockSaveError] = useState<string | null>(null)
  const [blockSaving, setBlockSaving] = useState(false)
  const [removingBlockId, setRemovingBlockId] = useState<string | null>(null)
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [newClientPhone, setNewClientPhone] = useState("")
  const [newClientEmail, setNewClientEmail] = useState("")
  const [newClientSubmitting, setNewClientSubmitting] = useState(false)
  const [newClientError, setNewClientError] = useState<string | null>(null)

  const sortedTeam = useMemo(
    () => [...team].sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    [team]
  )

  const eligibleTeam = useMemo(() => {
    if (!serviceId) return []
    return sortedTeam.filter((member) => member.serviceIds.includes(serviceId))
  }, [serviceId, sortedTeam])

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  )

  const selectedWeekScheduleDay = useMemo(
    () => weeklySchedule.find((day) => day.weekday === getWeekdayCodeFromDateKey(selectedDate)) ?? null,
    [selectedDate, weeklySchedule]
  )

  const selectedDayWorkingHoursRange = useMemo(() => {
    if (!selectedWeekScheduleDay?.enabled || selectedWeekScheduleDay.intervals.length === 0) {
      return null
    }

    const starts = selectedWeekScheduleDay.intervals.map((interval) => getMinutesFromTimeKey(interval.startTime))
    const ends = selectedWeekScheduleDay.intervals.map((interval) => getMinutesFromTimeKey(interval.endTime))

    return {
      startMinutes: Math.min(...starts),
      endMinutes: Math.max(...ends),
    }
  }, [selectedWeekScheduleDay])

  const fallbackWorkingHoursRange = useMemo(() => {
    const enabledIntervals = weeklySchedule
      .filter((day) => day.enabled && day.intervals.length > 0)
      .flatMap((day) => day.intervals)

    if (enabledIntervals.length === 0) {
      return null
    }

    const starts = enabledIntervals.map((interval) => getMinutesFromTimeKey(interval.startTime))
    const ends = enabledIntervals.map((interval) => getMinutesFromTimeKey(interval.endTime))

    return {
      startMinutes: Math.min(...starts),
      endMinutes: Math.max(...ends),
    }
  }, [weeklySchedule])

  const agendaWorkingHoursRange = selectedDayWorkingHoursRange ?? fallbackWorkingHoursRange

  const selectedDateHasConfiguredWorkingHours = Boolean(selectedDayWorkingHoursRange)

  const filteredClients = useMemo(() => {
    const query = customerName.trim().toLowerCase()
    const queryPhone = normalizePhone(customerName)

    if (!query && !queryPhone) {
      return []
    }

    return clients
      .filter((client) => {
        const matchesName = client.name.toLowerCase().includes(query)
        const matchesPhone = queryPhone ? normalizePhone(client.phone ?? "").includes(queryPhone) : false
        return matchesName || matchesPhone
      })
      .slice(0, 6)
  }, [clients, customerName])

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        if (selectedProfessionalFilter === "all") {
          return true
        }

        return appointment.staff?.membershipId === selectedProfessionalFilter
      })
      .sort((left, right) => left.startAt.localeCompare(right.startAt))
  }, [appointments, selectedProfessionalFilter])

  const selectedDayAppointments = useMemo(() => {
    return filteredAppointments
      .filter((appointment) => appointment.date === selectedDate)
      .sort((left, right) => left.startTime.localeCompare(right.startTime))
  }, [filteredAppointments, selectedDate])

  const showUnassignedColumn = useMemo(
    () =>
      selectedProfessionalFilter === "all" &&
      selectedDayAppointments.some((appointment) => !appointment.staff?.membershipId),
    [selectedDayAppointments, selectedProfessionalFilter]
  )

  const visibleStaffColumns = useMemo<ProfessionalColumnItem[]>(() => {
    const baseColumns: ProfessionalColumnItem[] =
      selectedProfessionalFilter === "all"
        ? sortedTeam.map((member) => ({
            membershipId: member.membershipId,
            name: member.name,
          }))
        : sortedTeam
            .filter((member) => member.membershipId === selectedProfessionalFilter)
            .map((member) => ({
              membershipId: member.membershipId,
              name: member.name,
            }))

    if (showUnassignedColumn) {
      baseColumns.push({
        membershipId: "__unassigned__",
        name: "Sem profissional",
        isUnassigned: true,
      })
    }

    return baseColumns
  }, [selectedProfessionalFilter, showUnassignedColumn, sortedTeam])

  useEffect(() => {
    setHiddenProfessionalIds((current) =>
      current.filter((membershipId) =>
        visibleStaffColumns.some((professional) => professional.membershipId === membershipId)
      )
    )
  }, [visibleStaffColumns])

  const hiddenStaffColumns = useMemo(
    () =>
      visibleStaffColumns.filter((professional) =>
        hiddenProfessionalIds.includes(professional.membershipId)
      ),
    [hiddenProfessionalIds, visibleStaffColumns]
  )

  const renderedStaffColumns = useMemo(
    () =>
      visibleStaffColumns.filter(
        (professional) => !hiddenProfessionalIds.includes(professional.membershipId)
      ),
    [hiddenProfessionalIds, visibleStaffColumns]
  )

  const showInitialPageSkeleton = appointmentsLoading && appointments.length === 0

  const blockDateBlockedSchedules = useMemo(
    () => blockedSchedules.filter((item) => item.date === blockDate),
    [blockDate, blockedSchedules]
  )

  const loadAppointments = useCallback(async (date: string) => {
    setAppointmentsLoading(true)
    setAppointmentsError(null)

    try {
      const response = await fetch(`/api/appointments?date=${encodeURIComponent(date)}`, {
        cache: "no-store",
      })
      const json = (await response.json()) as ApiSuccess<AppointmentItem[]> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Erro ao carregar agendamentos." : json.error)
      }

      setAppointments(json.data)
    } catch (e) {
      setAppointmentsError(e instanceof Error ? e.message : "Erro ao carregar agendamentos.")
    } finally {
      setAppointmentsLoading(false)
    }
  }, [])

  const loadTeam = useCallback(async () => {
    setTeamLoading(true)
    setTeamError(null)

    try {
      const response = await fetch("/api/team", { cache: "no-store" })
      const json = (await response.json()) as ApiSuccess<TeamItem[]> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Erro ao carregar equipe." : json.error)
      }

      setTeam(json.data)
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : "Erro ao carregar equipe.")
    } finally {
      setTeamLoading(false)
    }
  }, [])

  const loadServices = useCallback(async () => {
    setServicesLoading(true)
    setServicesError(null)

    try {
      const response = await fetch("/api/services", { cache: "no-store" })
      const json = (await response.json()) as ApiSuccess<ServiceItem[]> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Erro ao carregar servicos." : json.error)
      }

      setServices(json.data)
      setServicesLoaded(true)
    } catch (e) {
      setServicesError(e instanceof Error ? e.message : "Erro ao carregar servicos.")
      setServicesLoaded(false)
    } finally {
      setServicesLoading(false)
    }
  }, [])

  const loadClients = useCallback(async () => {
    setClientsLoading(true)
    setClientsError(null)

    try {
      const response = await fetch("/api/clients", { cache: "no-store" })
      const json = (await response.json()) as ApiSuccess<ClientItem[]> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Erro ao carregar clientes." : json.error)
      }

      setClients(sortClientsByName(json.data))
      setClientsLoaded(true)
    } catch (error) {
      setClientsError(error instanceof Error ? error.message : "Erro ao carregar clientes.")
      setClientsLoaded(false)
    } finally {
      setClientsLoading(false)
    }
  }, [])

  const loadBlockedSchedules = useCallback(async () => {
    try {
      const response = await fetch("/api/schedule/blocked", { cache: "no-store" })
      const json = (await response.json()) as ApiSuccess<BlockedScheduleItem[]> | BlockedScheduleError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Erro ao carregar bloqueios." : (json.message ?? "Erro ao carregar bloqueios."))
      }

      setBlockedSchedules(json.data)
    } catch (error) {
      console.error(
        "[agendamentos] Erro ao carregar bloqueios da agenda",
        error instanceof Error ? error.message : error
      )
    }
  }, [])

  const loadWeeklySchedule = useCallback(async () => {
    try {
      const response = await fetch("/api/schedule/weekly", { cache: "no-store" })
      const json = (await response.json()) as ApiSuccess<WeekScheduleResponse> | { ok: false; message?: string }

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Erro ao carregar horarios de atendimento." : (json.message ?? "Erro ao carregar horarios de atendimento."))
      }

      setWeeklySchedule(json.data.days)
    } catch {
      setWeeklySchedule([])
    }
  }, [])

  const ensureFormDependencies = useCallback(async () => {
    if (!servicesLoaded && !servicesLoading) {
      await loadServices()
    }

    if (team.length === 0 && !teamLoading) {
      await loadTeam()
    }

    if (!clientsLoaded && !clientsLoading) {
      await loadClients()
    }
  }, [
    clientsLoaded,
    clientsLoading,
    loadClients,
    loadServices,
    loadTeam,
    servicesLoaded,
    servicesLoading,
    team.length,
    teamLoading,
  ])

  useEffect(() => {
    void loadAppointments(selectedDate)
  }, [loadAppointments, selectedDate])

  useEffect(() => {
    void loadTeam()
    void loadBlockedSchedules()
    void loadWeeklySchedule()
  }, [loadBlockedSchedules, loadTeam, loadWeeklySchedule])

  useEffect(() => {
    if (!blockDialogOpen) {
      setBlockDate(selectedDate)
    }
  }, [blockDialogOpen, selectedDate])

  useEffect(() => {
    if (!serviceId) {
      if (staffMembershipId) {
        setStaffMembershipId("")
      }
      return
    }

    if (
      staffMembershipId &&
      !eligibleTeam.some((member) => member.membershipId === staffMembershipId)
    ) {
      setStaffMembershipId("")
    }
  }, [serviceId, staffMembershipId, eligibleTeam])

  useEffect(() => {
    setSelectedSlot(null)
  }, [serviceId, staffMembershipId])

  useEffect(() => {
    if (!selectedSlot) {
      return
    }

    if (selectedSlot.date !== selectedDate) {
      setSelectedSlot(null)
    }
  }, [selectedDate, selectedSlot])

  useEffect(() => {
    if (!selectedSlot) {
      setSlotSearchDate(selectedDate)
    }
  }, [selectedDate, selectedSlot])

  const handleAppointmentClick = useCallback(
    (appointmentId: string) => {
      const appointment = appointments.find((entry) => entry.id === appointmentId) ?? null

      if (!appointment) {
        return
      }

      void ensureFormDependencies()
      setSelectedAppointment(appointment)
      setDetailsOpen(true)
    },
    [appointments, ensureFormDependencies]
  )

  const handleAppointmentSaved = useCallback(
    async (appointmentId: string, payload: AppointmentUpdatePayload) => {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const json = (await response.json()) as ApiSuccess<AppointmentItem> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Nao foi possivel salvar o agendamento." : json.error)
      }

      setAppointments((current) => {
        if (json.data.date !== selectedDate) {
          return current.filter((appointment) => appointment.id !== appointmentId)
        }

        return current
          .map((appointment) => (appointment.id === appointmentId ? json.data : appointment))
          .sort((left, right) => left.startTime.localeCompare(right.startTime))
      })
      setSelectedAppointment(json.data)

      if (json.data.date !== selectedDate) {
        setSelectedDate(json.data.date)
      }
    },
    [selectedDate]
  )

  const handleAppointmentCanceled = useCallback(
    async (appointmentId: string) => {
      await handleAppointmentSaved(appointmentId, {
        status: "CANCELED",
      })
    },
    [handleAppointmentSaved]
  )

  function resetForm() {
    setServiceId("")
    setStaffMembershipId("")
    setCustomerName("")
    setCustomerPhone("")
    setCustomerEmail("")
    setSelectedClientId(null)
    setSelectedSlot(null)
    setNotes("")
    setAvailabilityOpen(false)
    setAvailabilityError(null)
    setAvailabilitySlots([])
    setSlotSearchDate(selectedDate)
    setFormError(null)
    setNewClientError(null)
  }

  function handleServiceChange(nextServiceId: string) {
    setServiceId(nextServiceId)
  }

  function handleStaffChange(nextStaffMembershipId: string) {
    setStaffMembershipId(nextStaffMembershipId)
  }

  function handleCustomerNameChange(nextValue: string) {
    setCustomerName(nextValue)

    if (selectedClientId && selectedClient && nextValue.trim() !== selectedClient.name) {
      setSelectedClientId(null)
      setCustomerPhone("")
      setCustomerEmail("")
    }
  }

  function handleSelectClient(client: AppointmentClientOption) {
    setSelectedClientId(client.id)
    setCustomerName(client.name)
    setCustomerPhone(formatPhone(client.phone) ?? "")
    setCustomerEmail(client.email ?? "")
    setNewClientError(null)
    setFormError(null)
  }

  function handleOpenNewClientDialog() {
    setNewClientName(customerName.trim())
    setNewClientPhone(customerPhone)
    setNewClientEmail(customerEmail)
    setNewClientError(null)
    setNewClientOpen(true)
  }

  function handleSelectedDateChange(nextDate: string) {
    setSelectedDate(nextDate)
  }

  const handleGridEmptySlotClick = useCallback(
    async (slot: EmptySlotSelection) => {
      setShowForm(true)
      setAvailabilityOpen(false)
      setFormError(null)
      setSelectedSlot(slot)
      setSlotSearchDate(slot.date)
      setSelectedDate(slot.date)
      setStaffMembershipId(slot.staffMembershipId ?? "")

      await ensureFormDependencies()
    },
    [ensureFormDependencies]
  )

  const resolveAvailabilityStaff = useCallback(() => {
    if (!serviceId) {
      return {
        ok: false as const,
        error: "Selecione um servico antes de escolher o horario.",
      }
    }

    if (eligibleTeam.length === 0) {
      return {
        ok: false as const,
        error: "Nao ha profissional elegivel para este servico.",
      }
    }

    if (staffMembershipId) {
      return {
        ok: true as const,
        staffMembershipId,
        autoSelected: false,
      }
    }

    if (eligibleTeam.length === 1) {
      return {
        ok: true as const,
        staffMembershipId: eligibleTeam[0].membershipId,
        autoSelected: true,
      }
    }

    return {
      ok: false as const,
      error: "Selecione um profissional para consultar horarios disponiveis.",
    }
  }, [serviceId, staffMembershipId, eligibleTeam])

  const fetchAvailability = useCallback(async (params: {
    serviceId: string
    staffMembershipId: string
    searchDate: string
  }) => {
    setAvailabilityLoading(true)
    setAvailabilityError(null)

    try {
      const query = new URLSearchParams({
        serviceId: params.serviceId,
        staffMembershipId: params.staffMembershipId,
        searchDate: params.searchDate,
      })

      const response = await fetch(`/api/appointments/availability?${query.toString()}`, {
        cache: "no-store",
      })

      const json = (await response.json()) as ApiSuccess<AvailabilitySlot[]> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Nao foi possivel carregar os horarios." : json.error)
      }

      setAvailabilitySlots(json.data)
    } catch (e) {
      setAvailabilitySlots([])
      setAvailabilityError(e instanceof Error ? e.message : "Erro ao consultar disponibilidade.")
    } finally {
      setAvailabilityLoading(false)
    }
  }, [])

  async function openAvailabilityModal() {
    setFormError(null)

    const resolvedStaff = resolveAvailabilityStaff()
    if (!resolvedStaff.ok) {
      setFormError(resolvedStaff.error)
      return
    }

    if (resolvedStaff.autoSelected) {
      setStaffMembershipId(resolvedStaff.staffMembershipId)
    }

    setAvailabilitySlots([])
    setAvailabilityError(null)
    setAvailabilityOpen(true)
  }

  async function handleAvailabilitySearch() {
    const resolvedStaff = resolveAvailabilityStaff()
    if (!resolvedStaff.ok) {
      setAvailabilityError(resolvedStaff.error)
      return
    }

    if (resolvedStaff.autoSelected) {
      setStaffMembershipId(resolvedStaff.staffMembershipId)
    }

    await fetchAvailability({
      serviceId,
      staffMembershipId: resolvedStaff.staffMembershipId,
      searchDate: slotSearchDate,
    })
  }

  useEffect(() => {
    if (!availabilityOpen) {
      return
    }

    const resolvedStaff = resolveAvailabilityStaff()
    if (!resolvedStaff.ok) {
      setAvailabilitySlots([])
      setAvailabilityError(resolvedStaff.error)
      return
    }

    void fetchAvailability({
      serviceId,
      staffMembershipId: resolvedStaff.staffMembershipId,
      searchDate: slotSearchDate,
    })
  }, [availabilityOpen, slotSearchDate, serviceId, fetchAvailability, resolveAvailabilityStaff])

  async function handleCreateAppointment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    try {
      if (!serviceId) {
        throw new Error("Selecione um servico.")
      }

      if (!customerName.trim()) {
        throw new Error("Informe o nome do cliente.")
      }

      if (!selectedSlot) {
        throw new Error("Selecione um horario disponivel.")
      }

      const phoneDigits = normalizePhone(customerPhone)
      if (customerPhone.trim() && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
        throw new Error("Telefone invalido. Informe DDD + numero.")
      }

      const payload = {
        serviceId,
        staffMembershipId: staffMembershipId.trim() ? staffMembershipId.trim() : undefined,
        customerName: customerName.trim(),
        customerPhone: phoneDigits ? phoneDigits : undefined,
        customerEmail: customerEmail.trim() ? customerEmail.trim() : undefined,
        date: selectedSlot.date,
        time: selectedSlot.time,
        notes: notes.trim() ? notes.trim() : undefined,
      }

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const json = (await response.json()) as ApiSuccess<AppointmentItem> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Nao foi possivel criar o agendamento." : json.error)
      }

      setAppointments((current) =>
        json.data.date === selectedDate
          ? [...current, json.data].sort((left, right) => left.startTime.localeCompare(right.startTime))
          : [json.data]
      )

      handleSelectedDateChange(json.data.date)
      resetForm()
      setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erro ao criar agendamento.")
    } finally {
      setSaving(false)
    }
  }

  function handleHideProfessionalColumn(professional: ProfessionalColumnItem) {
    setHiddenProfessionalIds((current) => {
      if (current.includes(professional.membershipId)) {
        return current
      }

      return [...current, professional.membershipId]
    })
  }

  function handleRestoreProfessionalColumn(membershipId: string) {
    setHiddenProfessionalIds((current) => current.filter((item) => item !== membershipId))
  }

  function handleOpenBlockDialog(professional: ProfessionalColumnItem) {
    setBlockingProfessional(professional)
    setBlockDate(selectedDate)
    setBlockAllDay(false)
    setBlockStartTime("08:00")
    setBlockEndTime("09:00")
    setBlockSaveError(null)
    setBlockDialogOpen(true)
  }

  async function handleCreateBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBlockSaving(true)
    setBlockSaveError(null)

    try {
      if (!blockAllDay && (!blockStartTime || !blockEndTime)) {
        throw new Error("Informe horario inicial e final para o bloqueio.")
      }

      if (!blockAllDay && blockEndTime <= blockStartTime) {
        throw new Error("O horario final precisa ser maior que o horario inicial.")
      }

      const response = await fetch("/api/schedule/blocked", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dates: [blockDate],
          allDay: blockAllDay,
          startTime: blockAllDay ? undefined : blockStartTime,
          endTime: blockAllDay ? undefined : blockEndTime,
        }),
      })

      const json = (await response.json()) as
        | ApiSuccess<{ created: number }>
        | { ok: false; message?: string }

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Nao foi possivel criar o bloqueio." : (json.message ?? "Nao foi possivel criar o bloqueio."))
      }

      setBlockDialogOpen(false)
      setBlockingProfessional(null)
      await loadBlockedSchedules()
    } catch (error) {
      setBlockSaveError(
        error instanceof Error ? error.message : "Erro ao salvar bloqueio de horario."
      )
    } finally {
      setBlockSaving(false)
    }
  }

  async function handleRemoveBlock(blockId: string) {
    setRemovingBlockId(blockId)
    setBlockSaveError(null)

    try {
      const response = await fetch(`/api/schedule/blocked/${blockId}`, {
        method: "DELETE",
      })

      const json = (await response.json()) as ApiSuccess<{ id: string }> | BlockedScheduleError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Nao foi possivel remover o bloqueio." : (json.message ?? "Nao foi possivel remover o bloqueio."))
      }

      setBlockedSchedules((current) => current.filter((item) => item.id !== blockId))
    } catch (error) {
      setBlockSaveError(
        error instanceof Error ? error.message : "Erro ao remover bloqueio da agenda."
      )
    } finally {
      setRemovingBlockId(null)
    }
  }

  async function handleCreateClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNewClientSubmitting(true)
    setNewClientError(null)

    try {
      const payload = {
        name: newClientName.trim(),
        phone: normalizePhone(newClientPhone) || undefined,
        email: newClientEmail.trim() || undefined,
        isActive: true,
      }

      const parsed = ClientCreateApiSchema.safeParse(payload)

      if (!parsed.success) {
        throw new Error(
          parsed.error.issues.map((issue) => issue.message).join(" • ") || "Dados inválidos para o cliente."
        )
      }

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      })

      const json = (await response.json()) as ApiSuccess<ClientItem> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Nao foi possivel cadastrar o cliente." : json.error)
      }

      setClients((current) => sortClientsByName([...current, json.data]))
      handleSelectClient(json.data)
      setNewClientOpen(false)
    } catch (error) {
      setNewClientError(error instanceof Error ? error.message : "Erro ao cadastrar cliente.")
    } finally {
      setNewClientSubmitting(false)
    }
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="font-normal text-foreground">Agendamentos</span>
        </div>
      </HeaderPage>

      {showInitialPageSkeleton ? (
        <AppointmentsPageSkeleton />
      ) : (
      <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden bg-white px-4 py-6 sm:px-6 sm:py-7">
          <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_38%,#eef6ff_100%)] p-5 shadow-sm">
            <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
              

              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-[auto_220px_240px_auto]">
                

                <div className="grid gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Data de referencia
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleSelectedDateChange(e.target.value)}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Profissional
                  </label>
                  <select
                    value={selectedProfessionalFilter}
                    onChange={(e) => setSelectedProfessionalFilter(e.target.value)}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                    disabled={teamLoading && sortedTeam.length === 0}
                  >
                    <option value="all">Todos</option>
                    {sortedTeam.map((member) => (
                      <option key={member.membershipId} value={member.membershipId}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                
              </div>

            </div>

            {teamError ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {teamError}
              </p>
            ) : null}
          </section>

        {showForm ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Novo agendamento</h3>
                <p className="text-sm text-slate-500">
                  A criacao manual continua usando a mesma validacao real do backend.
                </p>
              </div>
            </div>

            {servicesLoading && !servicesLoaded ? (
              <AppointmentFormSkeleton />
            ) : (
              <form onSubmit={handleCreateAppointment} className="grid gap-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Servico</label>
                    <select
                      value={serviceId}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      className="rounded-xl border border-slate-300 px-3 py-2.5"
                      required
                    >
                      <option value="">Selecione</option>
                      {services
                        .filter((service) => service.active)
                        .map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} ({service.durationMin} min)
                          </option>
                        ))}
                    </select>
                    {servicesError ? (
                      <p className="text-xs text-red-700">{servicesError}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Profissional</label>
                    <select
                      value={staffMembershipId}
                      onChange={(e) => handleStaffChange(e.target.value)}
                      className="rounded-xl border border-slate-300 px-3 py-2.5"
                      disabled={!serviceId || (teamLoading && sortedTeam.length === 0)}
                    >
                      <option value="">Sem preferencia</option>
                      {eligibleTeam.map((member) => (
                        <option key={member.membershipId} value={member.membershipId}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Cliente</label>
                    <AppointmentClientPicker
                      value={customerName}
                      selectedClient={selectedClient}
                      results={filteredClients}
                      loading={clientsLoading}
                      error={clientsError}
                      onValueChange={handleCustomerNameChange}
                      onSelectClient={handleSelectClient}
                      onCreateClient={handleOpenNewClientDialog}
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <label className="text-sm font-medium text-slate-700">Horario</label>
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-800">
                      {selectedSlot ? selectedSlot.label : "Nenhum horario selecionado."}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      A consulta usa a disponibilidade real do backend. O `POST` continua
                      revalidando antes de salvar.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={openAvailabilityModal}>
                        {selectedSlot ? "Trocar horario" : "Escolher horario"}
                      </Button>
                      {selectedSlot ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setSelectedSlot(null)}
                        >
                          Limpar horario
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Observacoes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-28 rounded-xl"
                    placeholder="Observacoes do agendamento"
                  />
                </div>

                {formError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar agendamento"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        ) : null}

        {hiddenStaffColumns.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>
                {hiddenStaffColumns.length} {hiddenStaffColumns.length === 1 ? "coluna oculta" : "colunas ocultas"} nesta visao.
              </p>
              <div className="flex flex-wrap gap-2">
                {hiddenStaffColumns.map((professional) => (
                  <Button
                    key={professional.membershipId}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestoreProfessionalColumn(professional.membershipId)}
                  >
                    Mostrar {professional.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {!selectedDateHasConfiguredWorkingHours && weeklySchedule.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            Nao ha horario de atendimento configurado para este dia. A grade usa apenas o range ja definido na configuracao semanal para manter a leitura da agenda sem estender ate um horario fixo.
          </div>
        ) : null}

        <ProfessionalScheduleBoard
          selectedDate={selectedDate}
          appointments={selectedDayAppointments}
          professionals={renderedStaffColumns}
          workingHoursRange={agendaWorkingHoursRange}
          loading={appointmentsLoading}
          error={appointmentsError}
          onAppointmentClick={handleAppointmentClick}
          onEmptySlotClick={(slot) => {
            void handleGridEmptySlotClick(slot)
          }}
          onBlockSchedule={handleOpenBlockDialog}
          onHideColumn={handleHideProfessionalColumn}
        />

        {!appointmentsLoading && !appointmentsError && selectedDayAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
            Nenhum agendamento neste dia. As agendas por profissional continuam abertas para destacar horários livres e facilitar novos encaixes.
          </div>
        ) : null}
      </div>
      )}

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        services={services}
        team={sortedTeam}
        servicesLoading={servicesLoading && !servicesLoaded}
        onSave={handleAppointmentSaved}
        onCancel={handleAppointmentCanceled}
      />

      <Dialog
        open={blockDialogOpen}
        onOpenChange={(open) => {
          setBlockDialogOpen(open)
          if (!open) {
            setBlockSaveError(null)
            setBlockingProfessional(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bloquear e desbloquear horarios</DialogTitle>
            <DialogDescription>
              Configure um bloqueio para {blockingProfessional?.name ?? "a agenda"} em {parseDateKey(blockDate).toLocaleDateString("pt-BR")}. O bloqueio usa a regra atual disponivel na agenda, sem alterar o backend de appointments.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleCreateBlock}>
            {blockDateBlockedSchedules.length > 0 ? (
              <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Bloqueios ativos na data</p>
                  <p className="text-xs text-slate-500">Remova um bloqueio existente para liberar novos agendamentos nesse periodo.</p>
                </div>

                {blockDateBlockedSchedules.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{formatBlockedScheduleLabel(item)}</p>
                      <p className="text-xs text-slate-500">
                        {item.allDay ? "Dia inteiro bloqueado" : "Faixa bloqueada"}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={removingBlockId === item.id}
                      onClick={() => void handleRemoveBlock(item.id)}
                    >
                      {removingBlockId === item.id ? "Removendo..." : "Desbloquear"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              Crie um novo bloqueio para impedir encaixes nesse periodo ou remova um bloqueio ativo para liberar a agenda novamente.
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Data</label>
              <input
                type="date"
                value={blockDate}
                onChange={(event) => setBlockDate(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={blockAllDay}
                onChange={(event) => setBlockAllDay(event.target.checked)}
                className="size-4 rounded border-slate-300"
              />
              Bloquear o dia inteiro
            </label>

            {!blockAllDay ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Inicio</label>
                  <input
                    type="time"
                    value={blockStartTime}
                    onChange={(event) => setBlockStartTime(event.target.value)}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Fim</label>
                  <input
                    type="time"
                    value={blockEndTime}
                    onChange={(event) => setBlockEndTime(event.target.value)}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ) : null}

            {blockSaveError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {blockSaveError}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBlockDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={blockSaving}>
                {blockSaving ? "Salvando..." : "Salvar bloqueio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Horarios disponiveis</DialogTitle>
            <DialogDescription>
              Esta consulta usa a mesma engine de disponibilidade do fluxo de WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grid flex-1 gap-2">
                <label className="text-sm font-medium text-slate-700">Data de busca</label>
                <input
                  type="date"
                  value={slotSearchDate}
                  min={getTodayDateValue()}
                  onChange={(e) => setSlotSearchDate(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2.5"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleAvailabilitySearch}
                disabled={availabilityLoading}
              >
                {availabilityLoading ? "Buscando..." : "Atualizar horarios"}
              </Button>
            </div>

            {availabilityError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {availabilityError}
              </div>
            ) : null}

            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {availabilityLoading ? (
                <AvailabilitySlotsSkeleton />
              ) : availabilitySlots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600">
                  Nenhum horario disponivel encontrado para a busca atual.
                </div>
              ) : (
                availabilitySlots.map((slot) => (
                  <button
                    key={slot.startAt}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot)
                      setSlotSearchDate(slot.date)
                      setSelectedDate(slot.date)
                      setAvailabilityOpen(false)
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <span className="block text-sm font-medium text-slate-800">{slot.label}</span>
                    <span className="block text-xs text-slate-500">
                      Inicio: {formatDateTimeLabel(slot.date, slot.time)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
            <DialogDescription>
              Cadastre um cliente rapidamente sem sair do agendamento. Ao salvar, ele volta ja selecionado no formulario.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleCreateClient}>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Nome</label>
              <Input
                value={newClientName}
                onChange={(event) => setNewClientName(event.target.value)}
                placeholder="Nome do cliente"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">Telefone</label>
                <Input
                  value={newClientPhone}
                  onChange={(event) => setNewClientPhone(maskPhone(event.target.value))}
                  placeholder="(27) 99999-9999"
                  inputMode="tel"
                  maxLength={15}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <Input
                  type="email"
                  value={newClientEmail}
                  onChange={(event) => setNewClientEmail(event.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
            </div>

            {newClientError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {newClientError}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewClientOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={newClientSubmitting}>
                {newClientSubmitting ? "Salvando..." : "Salvar cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
