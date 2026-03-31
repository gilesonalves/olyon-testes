"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getAppointmentSourceLabel,
  getAppointmentStatusLabel,
} from "@/lib/appointments/presentation"
import { formatPhone, maskPhone, normalizePhone } from "@/lib/utils/maskPhone"
import FullCalendarView, { type FullCalendarDesktopView } from "./components/full-calendar-view"

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
  startAt?: string
  notes?: string | null
  status?: string
}

type AppointmentTone = {
  accent: string
  badge: string
  card: string
  compactBadge: string
  metaDot: string
  mobileCard: string
  timeChip: string
}

const DEFAULT_DAY_START_MINUTES = 8 * 60
const DEFAULT_DAY_END_MINUTES = 18 * 60

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

function getLocalDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function getMinutesFromDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return date.getHours() * 60 + date.getMinutes()
}

function floorToHour(value: number) {
  return Math.floor(value / 60) * 60
}

function ceilToHour(value: number) {
  return Math.ceil(value / 60) * 60
}

function formatTimeLabel(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function formatTimeRange(startAt: string, endAt: string) {
  return `${new Date(startAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${new Date(endAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

function addDaysToDateKey(dateKey: string, days: number) {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return getLocalDateKey(date)
}

function getWeekDateKeys(dateKey: string) {
  const date = parseDateKey(dateKey)
  const currentDay = date.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay

  date.setDate(date.getDate() + mondayOffset)

  const startKey = getLocalDateKey(date)
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(startKey, index))
}

function getThreeDayDateKeys(dateKey: string) {
  return Array.from({ length: 3 }, (_, index) => addDaysToDateKey(dateKey, index))
}

function addMonthsToDateKey(dateKey: string, months: number) {
  const date = parseDateKey(dateKey)
  date.setMonth(date.getMonth() + months)
  return getLocalDateKey(date)
}

function getMonthKey(dateKey: string) {
  const date = parseDateKey(dateKey)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function getAppointmentTone(status: string): AppointmentTone {
  if (status === "CONFIRMED") {
    return {
      accent: "bg-sky-500",
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      compactBadge: "bg-sky-500/10 text-sky-700",
      metaDot: "bg-sky-500/70",
      card: "border-sky-200 bg-white text-slate-900 shadow-[0_12px_30px_rgba(14,165,233,0.09)]",
      mobileCard: "border-sky-200 bg-white",
      timeChip: "bg-sky-100 text-sky-800",
    }
  }

  if (status === "CANCELED") {
    return {
      accent: "bg-rose-500",
      badge: "border-rose-200 bg-rose-50 text-rose-700",
      compactBadge: "bg-rose-500/10 text-rose-700",
      metaDot: "bg-rose-500/70",
      card: "border-rose-200 bg-white text-slate-900 shadow-[0_12px_30px_rgba(244,63,94,0.09)]",
      mobileCard: "border-rose-200 bg-white",
      timeChip: "bg-rose-100 text-rose-800",
    }
  }

  if (status === "DONE") {
    return {
      accent: "bg-slate-500",
      badge: "border-slate-200 bg-slate-50 text-slate-700",
      compactBadge: "bg-slate-500/10 text-slate-700",
      metaDot: "bg-slate-500/70",
      card: "border-slate-200 bg-white text-slate-900 shadow-[0_12px_30px_rgba(100,116,139,0.09)]",
      mobileCard: "border-slate-200 bg-white",
      timeChip: "bg-slate-100 text-slate-800",
    }
  }

  if (status === "NO_SHOW") {
    return {
      accent: "bg-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      compactBadge: "bg-amber-500/10 text-amber-700",
      metaDot: "bg-amber-500/70",
      card: "border-amber-200 bg-white text-slate-900 shadow-[0_12px_30px_rgba(245,158,11,0.09)]",
      mobileCard: "border-amber-200 bg-white",
      timeChip: "bg-amber-100 text-amber-800",
    }
  }

  return {
    accent: "bg-violet-500",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    compactBadge: "bg-violet-500/10 text-violet-700",
    metaDot: "bg-violet-500/70",
    card: "border-violet-200 bg-white text-slate-900 shadow-[0_12px_30px_rgba(139,92,246,0.09)]",
    mobileCard: "border-violet-200 bg-white",
    timeChip: "bg-violet-100 text-violet-800",
  }
}

function FiltersSkeleton() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_38%,#eef6ff_100%)] p-5 shadow-sm">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-52" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-20 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[220px_220px_240px_auto]">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl xl:w-44" />
          <Skeleton className="h-11 w-full rounded-xl xl:w-44" />
        </div>
      </div>
    </section>
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

function MobileAgendaSkeleton() {
  return (
    <div className="space-y-3 p-4 lg:hidden">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function DailyAgendaSkeleton() {
  const rows = Array.from({ length: 11 }, (_, index) => index)
  const columns = Array.from({ length: 3 }, (_, index) => index)

  return (
    <>
      <MobileAgendaSkeleton />

      <div className="hidden p-4 sm:p-6 lg:block">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-[80px_repeat(3,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/80">
            <div className="border-r border-slate-200 p-3">
              <Skeleton className="h-4 w-10" />
            </div>

            {columns.map((column) => (
              <div key={column} className="border-r border-slate-200 p-3 last:border-r-0">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-4 w-24" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[80px_repeat(3,minmax(0,1fr))]">
            <div className="border-r border-slate-200 bg-slate-50/80 p-3">
              {rows.map((row) => (
                <Skeleton key={row} className="mb-8 h-4 w-10" />
              ))}
            </div>

            {columns.map((column) => (
              <div key={column} className="relative border-r border-slate-200 p-2.5 last:border-r-0">
                <div className="space-y-3">
                  <Skeleton className="h-20 w-[92%] rounded-xl" />
                  <Skeleton className="h-24 w-[88%] rounded-xl" />
                  <Skeleton className="h-16 w-[84%] rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
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
    setSlotSearchDate(getLocalDateKey(appointment.startAt))
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
  const appointmentStartAt = appointment.startAt
  const formattedPhone = formatPhone(appointment.customerPhone)
  const isCanceled = appointment.status === "CANCELED"
  const scheduleLabel = selectedRescheduleSlot
    ? selectedRescheduleSlot.label
    : `${new Date(appointment.startAt).toLocaleDateString("pt-BR")} • ${formatTimeRange(
        appointment.startAt,
        appointment.endAt
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

      await onSave(appointmentId, {
        serviceId,
        staffMembershipId: staffMembershipId.trim() ? staffMembershipId.trim() : null,
        customerName: customerName.trim(),
        customerPhone: phoneDigits ? phoneDigits : null,
        customerEmail: customerEmail.trim() ? customerEmail.trim() : null,
        startAt: selectedRescheduleSlot?.startAt ?? appointmentStartAt,
        notes: notes.trim() ? notes.trim() : null,
      })

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
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-14 sm:px-6">
          <DialogTitle>{appointment.customerName}</DialogTitle>
          <DialogDescription>
            {formatTimeRange(appointment.startAt, appointment.endAt)} • {getAppointmentStatusLabel(appointment.status)}
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
                      {new Date(appointment.startAt).toLocaleString("pt-BR")}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fim</p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {new Date(appointment.endAt).toLocaleString("pt-BR")}
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
                            onClick={() => setSelectedRescheduleSlot(slot)}
                            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                              isSelected
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                            }`}
                          >
                            <span className="block text-sm font-medium">{slot.label}</span>
                            <span className={`block text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                              Inicio: {new Date(slot.startAt).toLocaleString("pt-BR")}
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
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                {!isCanceled && !confirmCancel ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setConfirmCancel(true)}
                    disabled={isSaving || isCanceling}
                  >
                    Cancelar agendamento
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button type="button" variant="primary" onClick={() => setActiveTab("edit")}>
                  Editar e remarcar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                {!isCanceled ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setActiveTab("details")
                      setConfirmCancel(true)
                    }}
                    disabled={isSaving || isCanceling}
                  >
                    Cancelar agendamento
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setActiveTab("details")} disabled={isSaving}>
                  Voltar aos detalhes
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void handleSave()}
                  disabled={isSaving || servicesLoading}
                >
                  {isSaving ? "Salvando..." : "Salvar alteracoes"}
                </Button>
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

  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [teamLoading, setTeamLoading] = useState(true)
  const [servicesLoading, setServicesLoading] = useState(false)
  const [servicesLoaded, setServicesLoaded] = useState(false)

  const [appointmentsError, setAppointmentsError] = useState<string | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [servicesError, setServicesError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState(getTodayDateValue)
  const [calendarView, setCalendarView] = useState<FullCalendarDesktopView>("3days")
  const [selectedProfessionalFilter, setSelectedProfessionalFilter] = useState("all")

  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [serviceId, setServiceId] = useState("")
  const [staffMembershipId, setStaffMembershipId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [notes, setNotes] = useState("")

  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [slotSearchDate, setSlotSearchDate] = useState(getTodayDateValue)

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const sortedTeam = useMemo(
    () => [...team].sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    [team]
  )

  const eligibleTeam = useMemo(() => {
    if (!serviceId) return []
    return sortedTeam.filter((member) => member.serviceIds.includes(serviceId))
  }, [serviceId, sortedTeam])

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        if (selectedProfessionalFilter === "all") {
          return true
        }

        return appointment.staff?.membershipId === selectedProfessionalFilter
      })
      .filter((appointment) => getLocalDateKey(appointment.startAt) === selectedDate)
      .sort((left, right) => left.startAt.localeCompare(right.startAt))
  }, [appointments, selectedDate, selectedProfessionalFilter])

  const selectedWeekDateKeys = useMemo(() => getWeekDateKeys(selectedDate), [selectedDate])

  const weekAppointments = useMemo(() => {
    const weekDateKeys = new Set(selectedWeekDateKeys)

    return appointments
      .filter((appointment) => {
        if (selectedProfessionalFilter === "all") {
          return true
        }

        return appointment.staff?.membershipId === selectedProfessionalFilter
      })
      .filter((appointment) => weekDateKeys.has(getLocalDateKey(appointment.startAt)))
      .sort((left, right) => left.startAt.localeCompare(right.startAt))
  }, [appointments, selectedProfessionalFilter, selectedWeekDateKeys])

  const selectedThreeDayKeys = useMemo(() => getThreeDayDateKeys(selectedDate), [selectedDate])

  const threeDayAppointments = useMemo(() => {
    const visibleKeys = new Set(selectedThreeDayKeys)

    return appointments
      .filter((appointment) => {
        if (selectedProfessionalFilter === "all") {
          return true
        }

        return appointment.staff?.membershipId === selectedProfessionalFilter
      })
      .filter((appointment) => visibleKeys.has(getLocalDateKey(appointment.startAt)))
      .sort((left, right) => left.startAt.localeCompare(right.startAt))
  }, [appointments, selectedProfessionalFilter, selectedThreeDayKeys])

  const monthAppointments = useMemo(() => {
    const selectedMonthKey = getMonthKey(selectedDate)

    return appointments
      .filter((appointment) => {
        if (selectedProfessionalFilter === "all") {
          return true
        }

        return appointment.staff?.membershipId === selectedProfessionalFilter
      })
      .filter((appointment) => getMonthKey(getLocalDateKey(appointment.startAt)) === selectedMonthKey)
      .sort((left, right) => left.startAt.localeCompare(right.startAt))
  }, [appointments, selectedDate, selectedProfessionalFilter])

  const desktopAppointments =
    calendarView === "month"
      ? monthAppointments
      : calendarView === "3days"
        ? threeDayAppointments
      : calendarView === "week"
        ? weekAppointments
        : filteredAppointments

  const calendarBounds = useMemo(() => {
    if (desktopAppointments.length === 0) {
      return {
        start: DEFAULT_DAY_START_MINUTES,
        end: DEFAULT_DAY_END_MINUTES,
      }
    }

    let earliest = DEFAULT_DAY_START_MINUTES
    let latest = DEFAULT_DAY_END_MINUTES

    for (const appointment of desktopAppointments) {
      earliest = Math.min(earliest, getMinutesFromDate(appointment.startAt))
      latest = Math.max(latest, getMinutesFromDate(appointment.endAt))
    }

    return {
      start: floorToHour(earliest),
      end: Math.max(ceilToHour(latest), DEFAULT_DAY_END_MINUTES),
    }
  }, [desktopAppointments])

  const calendarDayBoundaries = useMemo(() => {
    return {
      start: formatTimeLabel(calendarBounds.start),
      end: formatTimeLabel(calendarBounds.end),
    }
  }, [calendarBounds])

  const showInitialPageSkeleton = appointmentsLoading && appointments.length === 0
  function handleGoToToday() {
    setSelectedDate(getTodayDateValue())
  }

  function handlePreviousPeriod() {
    setSelectedDate((current) => {
      if (calendarView === "month") {
        return addMonthsToDateKey(current, -1)
      }

      if (calendarView === "3days") {
        return addDaysToDateKey(current, -3)
      }

      return addDaysToDateKey(current, calendarView === "week" ? -7 : -1)
    })
  }

  function handleNextPeriod() {
    setSelectedDate((current) => {
      if (calendarView === "month") {
        return addMonthsToDateKey(current, 1)
      }

      if (calendarView === "3days") {
        return addDaysToDateKey(current, 3)
      }

      return addDaysToDateKey(current, calendarView === "week" ? 7 : 1)
    })
  }

  const loadAppointments = useCallback(async () => {
    setAppointmentsLoading(true)
    setAppointmentsError(null)

    try {
      const response = await fetch("/api/appointments", { cache: "no-store" })
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

  const ensureFormDependencies = useCallback(async () => {
    if (!servicesLoaded && !servicesLoading) {
      await loadServices()
    }

    if (team.length === 0 && !teamLoading) {
      await loadTeam()
    }
  }, [loadServices, loadTeam, servicesLoaded, servicesLoading, team.length, teamLoading])

  useEffect(() => {
    void loadAppointments()
    void loadTeam()
  }, [loadAppointments, loadTeam])

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

      setAppointments((current) =>
        current
          .map((appointment) => (appointment.id === appointmentId ? json.data : appointment))
          .sort((left, right) => left.startAt.localeCompare(right.startAt))
      )
      setSelectedAppointment(json.data)
    },
    []
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
    setSelectedSlot(null)
    setNotes("")
    setAvailabilityOpen(false)
    setAvailabilityError(null)
    setAvailabilitySlots([])
    setSlotSearchDate(selectedDate)
    setFormError(null)
  }

  async function handleToggleForm() {
    const nextOpen = !showForm

    setFormError(null)
    setShowForm(nextOpen)

    if (!nextOpen) {
      return
    }

    setSlotSearchDate(selectedDate)
    await ensureFormDependencies()
  }

  function handleServiceChange(nextServiceId: string) {
    setServiceId(nextServiceId)
  }

  function handleStaffChange(nextStaffMembershipId: string) {
    setStaffMembershipId(nextStaffMembershipId)
  }

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
        startAt: selectedSlot.startAt,
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
        [...current, json.data].sort((left, right) => left.startAt.localeCompare(right.startAt))
      )

      resetForm()
      setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erro ao criar agendamento.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="font-normal text-foreground">Agendamentos</span>
        </div>
      </HeaderPage>

      <div className="space-y-6 bg-white px-4 py-6 sm:px-6 sm:py-7">
        {showInitialPageSkeleton ? (
          <FiltersSkeleton />
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_38%,#eef6ff_100%)] p-5 shadow-sm">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={handlePreviousPeriod}>
                    {calendarView === "month"
                      ? "Mes anterior"
                      : calendarView === "3days"
                        ? "3 dias anteriores"
                      : calendarView === "week"
                        ? "Semana anterior"
                        : "Dia anterior"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleGoToToday}>
                    Hoje
                  </Button>
                  <Button type="button" variant="outline" onClick={handleNextPeriod}>
                    {calendarView === "month"
                      ? "Proximo mes"
                      : calendarView === "3days"
                        ? "Proximos 3 dias"
                      : calendarView === "week"
                        ? "Proxima semana"
                        : "Proximo dia"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[220px_220px_240px_auto]">
                <div className="grid gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Data de referencia
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Visualizacao
                  </label>
                  <>
                    <select
                      value={calendarView}
                      onChange={(e) => setCalendarView(e.target.value as FullCalendarDesktopView)}
                      className="hidden h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm lg:block"
                    >
                      <option value="3days">3 dias</option>
                      <option value="month">Mes</option>
                      <option value="day">Dia</option>
                      <option value="week">Semana</option>
                    </select>
                    <div className="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm lg:hidden">
                      {calendarView === "month"
                        ? "Mes"
                        : calendarView === "3days"
                          ? "3 dias"
                        : calendarView === "week"
                          ? "Semana"
                          : "Dia"}
                    </div>
                  </>
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

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="primary"
                    className="h-11 w-full cursor-pointer xl:w-auto"
                    onClick={() => {
                      void handleToggleForm()
                    }}
                  >
                    {showForm ? "Fechar formulario" : "Novo agendamento"}
                  </Button>
                </div>
              </div>
            </div>

            {teamError ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {teamError}
              </p>
            ) : null}
          </section>
        )}

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
                    {!serviceId ? (
                      <p className="text-xs text-slate-500">
                        Selecione um servico para liberar a equipe.
                      </p>
                    ) : eligibleTeam.length === 0 ? (
                      <p className="text-xs text-amber-700">
                        Nenhum profissional elegivel foi encontrado para este servico.
                      </p>
                    ) : !staffMembershipId ? (
                      <p className="text-xs text-slate-500">
                        Se houver mais de um profissional elegivel, selecione um antes de abrir o
                        modal de horarios.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Cliente</label>
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="rounded-xl border border-slate-300 px-3 py-2.5"
                      placeholder="Nome do cliente"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Telefone</label>
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(maskPhone(e.target.value))}
                      className="rounded-xl border border-slate-300 px-3 py-2.5"
                      placeholder="(27) 99999-9999"
                      inputMode="tel"
                      maxLength={15}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">E-mail</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="rounded-xl border border-slate-300 px-3 py-2.5"
                      placeholder="cliente@email.com"
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
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-28 rounded-xl border border-slate-300 px-3 py-2.5"
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

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm lg:bg-transparent lg:shadow-none">
          {appointmentsLoading ? (
            <DailyAgendaSkeleton />
          ) : appointmentsError ? (
            <div className="p-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                {appointmentsError}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-4 lg:hidden">
                {filteredAppointments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center shadow-sm">
                    <p className="text-base font-medium text-slate-900">
                      Nenhum agendamento para este dia.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Ajuste a data, troque o filtro de profissional ou crie um novo agendamento.
                    </p>
                  </div>
                ) : (
                  filteredAppointments.map((appointment) => {
                    const formattedPhone = formatPhone(appointment.customerPhone)
                    const tone = getAppointmentTone(appointment.status)

                    return (
                      <article
                        key={`mobile-${appointment.id}`}
                        className={`overflow-hidden rounded-2xl border p-4 shadow-sm ${tone.mobileCard}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone.timeChip}`}
                            >
                              {formatTimeRange(appointment.startAt, appointment.endAt)}
                            </span>
                            <h3 className="mt-3 truncate text-base font-semibold text-slate-950">
                              {appointment.customerName}
                            </h3>
                          </div>

                          <span
                            className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}
                          >
                            {getAppointmentStatusLabel(appointment.status)}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                          <p className="truncate text-slate-900">
                            <span className="font-medium text-slate-500">Servico:</span>{" "}
                            {appointment.service?.name ?? "Servico nao informado"}
                          </p>
                          <p className="truncate text-slate-900">
                            <span className="font-medium text-slate-500">Profissional:</span>{" "}
                            {appointment.staff?.name ?? "Sem profissional"}
                          </p>
                          {formattedPhone ? (
                            <p className="truncate text-slate-900">
                              <span className="font-medium text-slate-500">Telefone:</span>{" "}
                              {formattedPhone}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-3 text-xs text-slate-500">
                          <span className="truncate">
                            {getAppointmentSourceLabel(appointment.source, appointment.metadata)}
                          </span>
                          <span className="shrink-0">
                            {appointment.service?.durationMin ?? "--"} min
                          </span>
                        </div>
                      </article>
                    )
                  })
                )}
              </div>

              <div className="hidden lg:block">
                <FullCalendarView
                  appointments={desktopAppointments}
                  selectedDate={selectedDate}
                  view={calendarView}
                  dayBoundaries={calendarDayBoundaries}
                  onAppointmentClick={handleAppointmentClick}
                />
              </div>
            </>
          )}
        </section>
      </div>

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
                      setAvailabilityOpen(false)
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <span className="block text-sm font-medium text-slate-800">{slot.label}</span>
                    <span className="block text-xs text-slate-500">
                      Inicio: {new Date(slot.startAt).toLocaleString("pt-BR")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

