"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import HeaderPage from "@/components/headerPage"
import { Check, Plus, Search, UserRound } from "lucide-react"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  APPOINTMENT_STATUS_FILTER_OPTIONS,
  getAppointmentDisplayStatus,
  getAppointmentStatusTone,
  getAppointmentSourceLabel,
  getAppointmentStatusLabel,
  type AppointmentStatusFilterValue,
  type AppointmentStatusValue,
} from "@/lib/appointments/presentation"
import { ClientCreateApiSchema } from "@/lib/validators/client"
import { formatPhone, maskPhone, normalizePhone } from "@/lib/utils/maskPhone"
import { cn } from "@/lib/utils"
import AppointmentsPageSkeleton from "./components/appointments-page-skeleton"
import AppointmentStatusMenu from "./components/appointment-status-menu"
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
  scheduleDays?: WeekScheduleDayItem[]
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
  message?: string
}

type AppointmentUpdatePayload = {
  serviceId?: string
  staffMembershipId?: string | null
  customerName?: string
  customerPhone?: string | null
  customerEmail?: string | null
  date?: string
  time?: string
  allowPastScheduling?: boolean
  notes?: string | null
  status?: AppointmentStatusValue
}

type AppointmentCreatePayload = {
  serviceId: string
  staffMembershipId?: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  date: string
  time: string
  allowPastScheduling: boolean
  allowConflict?: boolean
  notes?: string
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
  membershipId: string | null
  membershipName: string | null
}

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

type AppointmentConflictDetails = {
  requiresConfirmation: boolean
  canOverride: boolean
  reason: "APPOINTMENT_CONFLICT"
  requestedSlot: AvailabilitySlot
  conflictingAppointmentsCount: number
  conflictingAppointments: ConflictingAppointmentSummary[]
  suggestions: AvailabilitySlot[]
}

type AppointmentCreateConflictError = {
  ok: false
  error?: string
  message?: string
  code?: string
  details?: AppointmentConflictDetails
}

type AppointmentSlotValidationResult = {
  available: boolean
  canOverride: boolean
  reason: "NO_WORKING_HOURS_CONFIGURED" | "OUTSIDE_WORKING_HOURS" | "BLOCKED" | "APPOINTMENT_CONFLICT" | null
  message: string | null
  slot: AvailabilitySlot
  suggestions: AvailabilitySlot[]
  conflictingAppointmentsCount: number
  conflictingAppointments: ConflictingAppointmentSummary[]
}

type BlockConflictDetails = {
  requiresConfirmation: boolean
  conflictActionOptions: BlockConflictAction[]
  conflictingAppointmentsCount: number
  conflictingAppointments: ConflictingAppointmentSummary[]
}

type BlockedScheduleError = {
  ok: false
  error?: string
  message?: string
  code?: string
  details?: BlockConflictDetails
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

type WorkingHoursRange = {
  startMinutes: number
  endMinutes: number
}

type BlockScope = "STORE" | "PROFESSIONAL"
const BLOCK_CONFLICT_REQUIRES_CONFIRMATION_CODE =
  "APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION"
const MANUAL_APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION_CODE =
  "MANUAL_APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION"
const EMPTY_SERVICE_SELECT_VALUE = "__empty_service__"
const EMPTY_STAFF_SELECT_VALUE = "__empty_staff__"

type AgendaSelectOption = {
  value: string
  label: string
  disabled?: boolean
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

function getCurrentTimeValue() {
  const now = new Date()
  const totalMinutes = now.getHours() * 60 + now.getMinutes()
  const roundedMinutes = Math.floor(totalMinutes / 15) * 15
  const hours = String(Math.floor(roundedMinutes / 60)).padStart(2, "0")
  const minutes = String(roundedMinutes % 60).padStart(2, "0")

  return `${hours}:${minutes}`
}

function getWeekdayCodeFromDateKey(dateKey: string): WeekdayCode {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][parseDateKey(dateKey).getDay()] as WeekdayCode
}

function getMinutesFromTimeKey(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}

function getWorkingHoursRangeFromDay(
  day: WeekScheduleDayItem | null | undefined
): WorkingHoursRange | null {
  return getWorkingHoursRangeFromIntervals(
    day?.enabled ? day.intervals : []
  )
}

function getWorkingHoursRangeFromIntervals(
  intervals: Array<{
    startTime: string
    endTime: string
  }>
): WorkingHoursRange | null {
  if (intervals.length === 0) {
    return null
  }

  const starts = intervals.map((interval) => getMinutesFromTimeKey(interval.startTime))
  const ends = intervals.map((interval) => getMinutesFromTimeKey(interval.endTime))

  return {
    startMinutes: Math.min(...starts),
    endMinutes: Math.max(...ends),
  }
}

function getEffectiveProfessionalIntervals(
  professionalScheduleDays: WeekScheduleDayItem[] | undefined,
  storeScheduleDays: WeekScheduleDayItem[] | undefined,
  dateKey: string
): Array<{ startTime: string; endTime: string }> {
  const weekday = getWeekdayCodeFromDateKey(dateKey)
  const professionalDay = professionalScheduleDays?.find((item) => item.weekday === weekday)
  const storeDay = storeScheduleDays?.find((item) => item.weekday === weekday)

  if (!professionalDay?.enabled || professionalDay.intervals.length === 0) {
    return []
  }

  if (!storeDay?.enabled || storeDay.intervals.length === 0) {
    return []
  }

  const intersections: Array<{ startTime: string; endTime: string }> = []

  for (const professionalInterval of professionalDay.intervals) {
    const professionalStart = getMinutesFromTimeKey(professionalInterval.startTime)
    const professionalEnd = getMinutesFromTimeKey(professionalInterval.endTime)

    for (const storeInterval of storeDay.intervals) {
      const storeStart = getMinutesFromTimeKey(storeInterval.startTime)
      const storeEnd = getMinutesFromTimeKey(storeInterval.endTime)
      const startMinutes = Math.max(professionalStart, storeStart)
      const endMinutes = Math.min(professionalEnd, storeEnd)

      if (startMinutes < endMinutes) {
        intersections.push({
          startTime: `${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}`,
          endTime: `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`,
        })
      }
    }
  }

  return intersections
}

function getProfessionalOwnWorkingHoursRange(
  scheduleDays: WeekScheduleDayItem[] | undefined,
  storeScheduleDays: WeekScheduleDayItem[] | undefined,
  dateKey: string
) {
  return getWorkingHoursRangeFromIntervals(
    getEffectiveProfessionalIntervals(scheduleDays, storeScheduleDays, dateKey)
  )
}

function hasProfessionalOwnWorkingHoursRange(
  scheduleDays: WeekScheduleDayItem[] | undefined,
  storeScheduleDays: WeekScheduleDayItem[] | undefined,
  dateKey: string
) {
  return Boolean(getProfessionalOwnWorkingHoursRange(scheduleDays, storeScheduleDays, dateKey))
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

function formatConflictingAppointmentLabel(item: ConflictingAppointmentSummary) {
  return `${formatDateLabel(item.date)} ${item.startTime} - ${item.endTime}`
}

function sortClientsByName(items: ClientItem[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
}

function AgendaSelectField({
  value,
  onValueChange,
  options,
  placeholder,
  disabled = false,
  triggerClassName,
  contentClassName,
}: {
  value?: string
  onValueChange: (value: string) => void
  options: AgendaSelectOption[]
  placeholder?: string
  disabled?: boolean
  triggerClassName?: string
  contentClassName?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-left text-sm text-slate-700 shadow-sm",
          triggerClassName
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        align="start"
        sideOffset={6}
        className={cn(
          "max-h-72 rounded-2xl border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]",
          contentClassName
        )}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="rounded-xl px-3 py-2.5 text-sm text-slate-700 data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-900"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function getAppointmentCustomerDisplayName(value: string | null | undefined) {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : "Cliente sem nome"
}

function areAvailabilitySlotsEqual(
  left: AvailabilitySlot | null,
  right: AvailabilitySlot | null
) {
  if (!left || !right) {
    return left === right
  }

  return (
    left.startAt === right.startAt &&
    left.endAt === right.endAt &&
    left.date === right.date &&
    left.time === right.time &&
    left.endTime === right.endTime &&
    left.label === right.label
  )
}

async function readJsonSafely<T>(response: Response) {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
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
  storeScheduleDays,
  servicesLoading,
  onSave,
  onCancel,
  onStatusChange,
}: {
  appointment: AppointmentItem | null
  open: boolean
  onOpenChange: (value: boolean) => void
  services: ServiceItem[]
  team: TeamItem[]
  storeScheduleDays: WeekScheduleDayItem[]
  servicesLoading: boolean
  onSave: (appointmentId: string, payload: AppointmentUpdatePayload) => Promise<void>
  onCancel: (appointmentId: string) => Promise<void>
  onStatusChange: (
    appointmentId: string,
    status: AppointmentStatusValue
  ) => Promise<void>
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

    return team.filter(
      (member) =>
        member.serviceIds.includes(serviceId) &&
        hasProfessionalOwnWorkingHoursRange(
          member.scheduleDays,
          storeScheduleDays,
          slotSearchDate
        )
    )
  }, [serviceId, slotSearchDate, storeScheduleDays, team])

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
  const customerDisplayName = getAppointmentCustomerDisplayName(appointment.customerName)
  const displayStatus = getAppointmentDisplayStatus(appointment.status, {
    endAt: appointment.endAt,
  })
  const formattedPhone = formatPhone(appointment.customerPhone)
  const isCanceled = appointment.status === "CANCELED"
  const displayStatusTone = getAppointmentStatusTone(appointment.status, {
    endAt: appointment.endAt,
  })
  const persistedStatusTone = getAppointmentStatusTone(appointment.status)
  const isFinalStatus = persistedStatusTone.final
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
        error: "Nao ha profissional elegivel com expediente proprio valido para este servico nesta data.",
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
          <DialogTitle>{customerDisplayName}</DialogTitle>
          <DialogDescription>
            {formatTimeRange(appointment.startTime, appointment.endTime)} •{" "}
            {getAppointmentStatusLabel(appointment.status, {
              endAt: appointment.endAt,
            })}
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
                    <p className="mt-1 text-base font-medium text-slate-900">{customerDisplayName}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <p className={`mt-1 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${displayStatusTone.badge}`}>
                      {getAppointmentStatusLabel(appointment.status, {
                        endAt: appointment.endAt,
                      })}
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

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Acoes rapidas</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Atualize o status real sem editar o restante do agendamento.
                      </p>
                    </div>

                    <AppointmentStatusMenu
                      currentStatus={displayStatus}
                      buttonLabel="Atualizar status"
                      onStatusChange={(status) => onStatusChange(appointmentId, status)}
                      disabled={isSaving || isCanceling}
                    />
                  </div>
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
                      {getAppointmentStatusLabel(appointment.status, {
                        endAt: appointment.endAt,
                      })}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Servico</label>
                    <AgendaSelectField
                      value={serviceId || EMPTY_SERVICE_SELECT_VALUE}
                      onValueChange={(value) =>
                        setServiceId(
                          value === EMPTY_SERVICE_SELECT_VALUE ? "" : value
                        )
                      }
                      disabled={servicesLoading}
                      options={[
                        { value: EMPTY_SERVICE_SELECT_VALUE, label: "Selecione" },
                        ...activeServices.map((service) => ({
                          value: service.id,
                          label: `${service.name} (${service.durationMin} min)`,
                        })),
                      ]}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profissional</label>
                    <AgendaSelectField
                      value={staffMembershipId || EMPTY_STAFF_SELECT_VALUE}
                      onValueChange={(value) =>
                        setStaffMembershipId(
                          value === EMPTY_STAFF_SELECT_VALUE ? "" : value
                        )
                      }
                      disabled={!serviceId}
                      options={[
                        {
                          value: EMPTY_STAFF_SELECT_VALUE,
                          label: "Sem preferencia",
                        },
                        ...eligibleTeam.map((member) => ({
                          value: member.membershipId,
                          label: member.name,
                        })),
                      ]}
                    />
                    {!serviceId ? (
                      <p className="text-xs text-slate-500">Selecione um servico para liberar a equipe.</p>
                    ) : eligibleTeam.length === 0 ? (
                      <p className="text-xs text-amber-700">Nenhum profissional com expediente proprio valido foi encontrado para este servico nesta data.</p>
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
                {!isFinalStatus && !confirmCancel ? (
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
                {!isFinalStatus ? (
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
  const [weeklyScheduleLoading, setWeeklyScheduleLoading] = useState(true)
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
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<AppointmentStatusFilterValue>("all")

  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [staffLockedFromGrid, setStaffLockedFromGrid] = useState(false)
  const [allowPastScheduling, setAllowPastScheduling] = useState(false)

  const [serviceId, setServiceId] = useState("")
  const [staffMembershipId, setStaffMembershipId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [manualAppointmentDate, setManualAppointmentDate] = useState(getTodayDateValue)
  const [manualAppointmentTime, setManualAppointmentTime] = useState(getCurrentTimeValue)
  const [notes, setNotes] = useState("")

  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [slotSearchDate, setSlotSearchDate] = useState(getTodayDateValue)
  const [slotValidation, setSlotValidation] = useState<AppointmentSlotValidationResult | null>(null)
  const [slotValidationLoading, setSlotValidationLoading] = useState(false)
  const [conflictOverrideConfirmed, setConflictOverrideConfirmed] = useState(false)
  const [appointmentConflictPrompt, setAppointmentConflictPrompt] =
    useState<AppointmentConflictDetails | null>(null)
  const [pendingCreatePayload, setPendingCreatePayload] =
    useState<AppointmentCreatePayload | null>(null)

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [hiddenProfessionalIds, setHiddenProfessionalIds] = useState<string[]>([])
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockingProfessional, setBlockingProfessional] = useState<ProfessionalColumnItem | null>(null)
  const [blockScope, setBlockScope] = useState<BlockScope>("STORE")
  const [blockDate, setBlockDate] = useState(getTodayDateValue)
  const [blockAllDay, setBlockAllDay] = useState(false)
  const [blockStartTime, setBlockStartTime] = useState("08:00")
  const [blockEndTime, setBlockEndTime] = useState("09:00")
  const [blockSaveError, setBlockSaveError] = useState<string | null>(null)
  const [blockConflict, setBlockConflict] = useState<BlockConflictDetails | null>(null)
  const [pendingBlockPayload, setPendingBlockPayload] = useState<BlockCreatePayload | null>(null)
  const [blockSaving, setBlockSaving] = useState(false)
  const [removingBlockId, setRemovingBlockId] = useState<string | null>(null)
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [newClientPhone, setNewClientPhone] = useState("")
  const [newClientEmail, setNewClientEmail] = useState("")
  const [newClientSubmitting, setNewClientSubmitting] = useState(false)
  const [newClientError, setNewClientError] = useState<string | null>(null)
  const slotValidationRequestRef = useRef(0)

  const sortedTeam = useMemo(
    () => [...team].sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    [team]
  )

  const formReferenceDate = useMemo(
    () => (allowPastScheduling ? manualAppointmentDate : selectedSlot?.date ?? selectedDate),
    [allowPastScheduling, manualAppointmentDate, selectedDate, selectedSlot]
  )

  const professionalsWithOwnScheduleOnSelectedDate = useMemo(
    () =>
      sortedTeam.filter((member) =>
        hasProfessionalOwnWorkingHoursRange(
          member.scheduleDays,
          weeklySchedule,
          selectedDate
        )
      ),
    [selectedDate, sortedTeam, weeklySchedule]
  )

  const eligibleTeam = useMemo(() => {
    if (!serviceId) return []
    return sortedTeam.filter(
      (member) =>
        member.serviceIds.includes(serviceId) &&
        hasProfessionalOwnWorkingHoursRange(
          member.scheduleDays,
          weeklySchedule,
          formReferenceDate
        )
    )
  }, [formReferenceDate, serviceId, sortedTeam, weeklySchedule])

  const selectedStaffMember = useMemo(
    () => sortedTeam.find((member) => member.membershipId === staffMembershipId) ?? null,
    [sortedTeam, staffMembershipId]
  )

  const selectedFilteredProfessional = useMemo(
    () =>
      selectedProfessionalFilter === "all"
        ? null
        : sortedTeam.find((member) => member.membershipId === selectedProfessionalFilter) ?? null,
    [selectedProfessionalFilter, sortedTeam]
  )

  const selectedFilteredProfessionalHasOwnSchedule = useMemo(
    () =>
      selectedFilteredProfessional
        ? hasProfessionalOwnWorkingHoursRange(
            selectedFilteredProfessional.scheduleDays,
            weeklySchedule,
            selectedDate
          )
        : false,
    [selectedDate, selectedFilteredProfessional, weeklySchedule]
  )

  const availableServicesForForm = useMemo(() => {
    const activeServices = services.filter((service) => service.active)

    if (!staffLockedFromGrid || !selectedStaffMember) {
      return activeServices
    }

    return activeServices.filter((service) =>
      selectedStaffMember.serviceIds.includes(service.id)
    )
  }, [services, staffLockedFromGrid, selectedStaffMember])

  const professionalOptionsForForm = useMemo(() => {
    if (staffLockedFromGrid && selectedStaffMember) {
      return [selectedStaffMember]
    }

    return eligibleTeam
  }, [eligibleTeam, selectedStaffMember, staffLockedFromGrid])

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  )

  const selectedWeekScheduleDay = useMemo(
    () => weeklySchedule.find((day) => day.weekday === getWeekdayCodeFromDateKey(selectedDate)) ?? null,
    [selectedDate, weeklySchedule]
  )

  const selectedDayWorkingHoursRange = useMemo(() => {
    return getWorkingHoursRangeFromDay(selectedWeekScheduleDay)
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
      .slice(0, 5)
  }, [clients, customerName])

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        const displayStatus = getAppointmentDisplayStatus(appointment.status, {
          endAt: appointment.endAt,
        })

        if (selectedProfessionalFilter === "all") {
          return selectedStatusFilter === "all" || displayStatus === selectedStatusFilter
        }

        const matchesProfessional =
          appointment.staff?.membershipId === selectedProfessionalFilter
        const matchesStatus =
          selectedStatusFilter === "all" || displayStatus === selectedStatusFilter

        return matchesProfessional && matchesStatus
      })
      .sort((left, right) => left.startAt.localeCompare(right.startAt))
  }, [appointments, selectedProfessionalFilter, selectedStatusFilter])

  const selectedDayAppointments = useMemo(() => {
    return filteredAppointments
      .filter((appointment) => appointment.date === selectedDate)
      .sort((left, right) => left.startTime.localeCompare(right.startTime))
  }, [filteredAppointments, selectedDate])

  const selectedDateStoreBlockedSchedules = useMemo(
    () =>
      blockedSchedules.filter(
        (item) => item.date === selectedDate && item.membershipId === null
      ),
    [blockedSchedules, selectedDate]
  )

  const showUnassignedColumn = useMemo(
    () =>
      selectedProfessionalFilter === "all" &&
      selectedDayAppointments.some((appointment) => !appointment.staff?.membershipId),
    [selectedDayAppointments, selectedProfessionalFilter]
  )

  const visibleStaffColumns = useMemo<ProfessionalColumnItem[]>(() => {
    const eligibleProfessionals =
      selectedProfessionalFilter === "all"
        ? professionalsWithOwnScheduleOnSelectedDate
        : professionalsWithOwnScheduleOnSelectedDate.filter(
            (member) => member.membershipId === selectedProfessionalFilter
          )

    const baseColumns: ProfessionalColumnItem[] =
      eligibleProfessionals.map((member) => {
        const professionalWorkingHoursRange = getProfessionalOwnWorkingHoursRange(
          member.scheduleDays,
          weeklySchedule,
          selectedDate
        )

        return {
          membershipId: member.membershipId,
          name: member.name,
          workingHoursRange: professionalWorkingHoursRange,
          canCreateAppointments: Boolean(professionalWorkingHoursRange),
          blockedSchedules: blockedSchedules.filter(
            (item) =>
              item.date === selectedDate &&
              (item.membershipId === null || item.membershipId === member.membershipId)
          ),
        }
      })

    if (showUnassignedColumn) {
      baseColumns.push({
        membershipId: "__unassigned__",
        name: "Sem profissional",
        isUnassigned: true,
        workingHoursRange: selectedDayWorkingHoursRange ?? fallbackWorkingHoursRange,
        canCreateAppointments: Boolean(selectedDayWorkingHoursRange),
        blockedSchedules: selectedDateStoreBlockedSchedules,
      })
    }

    return baseColumns
  }, [
    blockedSchedules,
    fallbackWorkingHoursRange,
    professionalsWithOwnScheduleOnSelectedDate,
    selectedDate,
    selectedDateStoreBlockedSchedules,
    selectedDayWorkingHoursRange,
    selectedProfessionalFilter,
    showUnassignedColumn,
    weeklySchedule,
  ])

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

  const scheduleBoardEmptyMessage = useMemo(() => {
    if (
      selectedProfessionalFilter !== "all" &&
      selectedFilteredProfessional &&
      !selectedFilteredProfessionalHasOwnSchedule
    ) {
      return `${selectedFilteredProfessional.name} nao possui expediente proprio configurado dentro do horario da loja para esta data. Configure o expediente do profissional para exibi-lo na agenda.`
    }

    if (
      selectedProfessionalFilter === "all" &&
      visibleStaffColumns.length === 0 &&
      !showUnassignedColumn
    ) {
      return "Nenhum profissional possui expediente proprio configurado dentro do horario da loja para esta data."
    }

    return undefined
  }, [
    selectedFilteredProfessional,
    selectedFilteredProfessionalHasOwnSchedule,
    selectedProfessionalFilter,
    showUnassignedColumn,
    visibleStaffColumns.length,
  ])

  const scheduleBoardLoading = appointmentsLoading || teamLoading || weeklyScheduleLoading
  const showInitialPageSkeleton = appointmentsLoading && appointments.length === 0

  const blockTargetMembershipId = useMemo(() => {
    if (
      blockScope === "PROFESSIONAL" &&
      blockingProfessional &&
      !blockingProfessional.isUnassigned
    ) {
      return blockingProfessional.membershipId
    }

    return null
  }, [blockScope, blockingProfessional])

  const blockDateBlockedSchedules = useMemo(
    () =>
      blockedSchedules.filter(
        (item) => item.date === blockDate && item.membershipId === blockTargetMembershipId
      ),
    [blockDate, blockedSchedules, blockTargetMembershipId]
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
        throw new Error(
          json.ok
            ? "Erro ao carregar bloqueios."
            : (json.message ?? json.error ?? "Erro ao carregar bloqueios.")
        )
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
    setWeeklyScheduleLoading(true)

    try {
      const response = await fetch("/api/schedule/weekly", { cache: "no-store" })
      const json = (await response.json()) as ApiSuccess<WeekScheduleResponse> | { ok: false; message?: string }

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Erro ao carregar horarios de atendimento." : (json.message ?? "Erro ao carregar horarios de atendimento."))
      }

      setWeeklySchedule(json.data.days)
    } catch {
      setWeeklySchedule([])
    } finally {
      setWeeklyScheduleLoading(false)
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
      if (!staffLockedFromGrid && staffMembershipId) {
        setStaffMembershipId("")
      }
      return
    }

    if (
      staffMembershipId &&
      !eligibleTeam.some((member) => member.membershipId === staffMembershipId)
    ) {
      if (staffLockedFromGrid) {
        setServiceId("")
        return
      }

      setStaffMembershipId("")
    }
  }, [serviceId, staffMembershipId, eligibleTeam, staffLockedFromGrid])

  useEffect(() => {
    if (!serviceId) {
      return
    }

    if (!availableServicesForForm.some((service) => service.id === serviceId)) {
      setServiceId("")
    }
  }, [availableServicesForForm, serviceId])

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

  useEffect(() => {
    if (!selectedSlot || allowPastScheduling) {
      return
    }

    setManualAppointmentDate(selectedSlot.date)
    setManualAppointmentTime(selectedSlot.time)
  }, [allowPastScheduling, selectedSlot])

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

  const handleAppointmentStatusChange = useCallback(
    async (appointmentId: string, status: AppointmentStatusValue) => {
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      const json = (await response.json()) as ApiSuccess<AppointmentItem> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Nao foi possivel atualizar o status." : json.error)
      }

      setAppointments((current) =>
        current
          .map((appointment) => (appointment.id === appointmentId ? json.data : appointment))
          .sort((left, right) => left.startTime.localeCompare(right.startTime))
      )
      setSelectedAppointment((current) =>
        current?.id === appointmentId ? json.data : current
      )
    },
    []
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
        const remainingAppointments = current.filter((appointment) => appointment.id !== appointmentId)

        if (json.data.date !== selectedDate) {
          return remainingAppointments
        }

        return [...remainingAppointments, json.data]
          .sort((left, right) => left.startTime.localeCompare(right.startTime))
      })
      setSelectedAppointment(json.data)

      if (json.data.date !== selectedDate) {
        setSelectedDate(json.data.date)
      } else {
        void loadAppointments(selectedDate)
      }
    },
    [loadAppointments, selectedDate]
  )

  const handleAppointmentCanceled = useCallback(
    async (appointmentId: string) => {
      await handleAppointmentStatusChange(appointmentId, "CANCELED")
    },
    [handleAppointmentStatusChange]
  )

  function resetForm() {
    setServiceId("")
    setStaffMembershipId("")
    setStaffLockedFromGrid(false)
    setAllowPastScheduling(false)
    setCustomerName("")
    setCustomerPhone("")
    setCustomerEmail("")
    setSelectedClientId(null)
    setSelectedSlot(null)
    setManualAppointmentDate(selectedDate)
    setManualAppointmentTime(getCurrentTimeValue())
    setNotes("")
    setAvailabilityOpen(false)
    setAvailabilityError(null)
    setAvailabilitySlots([])
    setSlotSearchDate(selectedDate)
    setSlotValidation(null)
    setSlotValidationLoading(false)
    setConflictOverrideConfirmed(false)
    setAppointmentConflictPrompt(null)
    setPendingCreatePayload(null)
    setFormError(null)
    setNewClientError(null)
    setNewClientOpen(false)
  }

  function handleFormDialogOpenChange(open: boolean) {
    setShowForm(open)

    if (!open) {
      resetForm()
    }
  }

  function handleServiceChange(nextServiceId: string) {
    setFormError(null)
    setServiceId(nextServiceId)
  }

  function handleStaffChange(nextStaffMembershipId: string) {
    setFormError(null)
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
      setServiceId("")
      setCustomerName("")
      setCustomerPhone("")
      setCustomerEmail("")
      setSelectedClientId(null)
      setNotes("")
      setAvailabilitySlots([])
      setAvailabilityError(null)
      setSlotValidation(null)
      setSlotValidationLoading(false)
      setConflictOverrideConfirmed(false)
      setAppointmentConflictPrompt(null)
      setPendingCreatePayload(null)
      setNewClientError(null)
      setNewClientOpen(false)
      setSelectedSlot(slot)
      setManualAppointmentDate(slot.date)
      setManualAppointmentTime(slot.time)
      setSlotSearchDate(slot.date)
      setSelectedDate(slot.date)
      setStaffLockedFromGrid(Boolean(slot.staffMembershipId))
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
        error: "Nao ha profissional elegivel com expediente proprio para este servico nesta data.",
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

  const fetchSelectedSlotValidation = useCallback(async (params: {
    serviceId: string
    staffMembershipId: string
    startAt: string
  }) => {
    const query = new URLSearchParams({
      serviceId: params.serviceId,
      staffMembershipId: params.staffMembershipId,
      searchStartAt: params.startAt,
      validateSelection: "true",
    })

    const response = await fetch(`/api/appointments/availability?${query.toString()}`, {
      cache: "no-store",
    })

    const json = await readJsonSafely<
      | ApiSuccess<AppointmentSlotValidationResult>
      | ApiError
    >(response)

    if (!json) {
      throw new Error(
        response.status === 500
          ? "Erro interno do servidor."
          : "Nao foi possivel validar o horario."
      )
    }

    if (!response.ok || !json.ok) {
      throw new Error(json.ok ? "Nao foi possivel validar o horario." : json.error)
    }

    return json.data
  }, [])

  useEffect(() => {
    if (!selectedSlot || allowPastScheduling || !serviceId) {
      setSlotValidation(null)
      setSlotValidationLoading(false)
      setConflictOverrideConfirmed(false)
      setAppointmentConflictPrompt(null)
      setPendingCreatePayload(null)
      return
    }

    const resolvedStaff = resolveAvailabilityStaff()
    if (!resolvedStaff.ok) {
      setSlotValidation(null)
      setSlotValidationLoading(false)
      setConflictOverrideConfirmed(false)
      setAppointmentConflictPrompt(null)
      setPendingCreatePayload(null)
      return
    }

    if (resolvedStaff.autoSelected && staffMembershipId !== resolvedStaff.staffMembershipId) {
      setStaffMembershipId(resolvedStaff.staffMembershipId)
      return
    }

    const requestId = slotValidationRequestRef.current + 1
    slotValidationRequestRef.current = requestId
    setSlotValidationLoading(true)
    setConflictOverrideConfirmed(false)
    setAppointmentConflictPrompt(null)
    setPendingCreatePayload(null)

    void fetchSelectedSlotValidation({
      serviceId,
      staffMembershipId: resolvedStaff.staffMembershipId,
      startAt: selectedSlot.startAt,
    })
      .then((result) => {
        if (slotValidationRequestRef.current !== requestId) {
          return
        }

        setSelectedSlot((current) =>
          areAvailabilitySlotsEqual(current, result.slot) ? current : result.slot
        )
        setSlotValidation(result.available ? null : result)
      })
      .catch((cause) => {
        if (slotValidationRequestRef.current !== requestId) {
          return
        }

        setSlotValidation({
          available: false,
          canOverride: false,
          reason: null,
          message:
            cause instanceof Error ? cause.message : "Nao foi possivel validar o horario.",
          slot: selectedSlot,
          suggestions: [],
          conflictingAppointmentsCount: 0,
          conflictingAppointments: [],
        })
      })
      .finally(() => {
        if (slotValidationRequestRef.current === requestId) {
          setSlotValidationLoading(false)
        }
      })
  }, [
    allowPastScheduling,
    fetchSelectedSlotValidation,
    resolveAvailabilityStaff,
    selectedSlot,
    serviceId,
    staffMembershipId,
  ])

  async function submitCreateAppointmentPayload(payload: AppointmentCreatePayload) {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const json = await readJsonSafely<
      | ApiSuccess<AppointmentItem>
      | AppointmentCreateConflictError
      | ApiError
    >(response)

    if (!json) {
      throw new Error(
        response.status === 500
          ? "Erro interno do servidor."
          : "Nao foi possivel criar o agendamento."
      )
    }

    if (
      response.status === 409 &&
      !json.ok &&
      "code" in json &&
      json.code === MANUAL_APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION_CODE &&
      json.details?.requiresConfirmation
    ) {
      setPendingCreatePayload(payload)
      setAppointmentConflictPrompt(json.details)
      return { requiresConfirmation: true as const }
    }

    if (!response.ok || !json.ok) {
      throw new Error(
        json.ok
          ? "Nao foi possivel criar o agendamento."
          : (json.message ?? json.error ?? "Nao foi possivel criar o agendamento.")
      )
    }

    setAppointments((current) =>
      json.data.date === selectedDate
        ? [...current, json.data].sort((left, right) => left.startTime.localeCompare(right.startTime))
        : [json.data]
    )

    handleSelectedDateChange(json.data.date)
    resetForm()
    setShowForm(false)

    return {
      requiresConfirmation: false as const,
      appointment: json.data,
    }
  }

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

  function buildCreateAppointmentPayload(): AppointmentCreatePayload {
    if (!serviceId) {
      throw new Error("Selecione um servico.")
    }

    if (!customerName.trim()) {
      throw new Error("Informe o nome do cliente.")
    }

    if (!allowPastScheduling && !selectedSlot) {
      throw new Error("Selecione um horario disponivel.")
    }

    if (allowPastScheduling && !manualAppointmentDate) {
      throw new Error("Informe a data do atendimento realizado.")
    }

    if (allowPastScheduling && !manualAppointmentTime) {
      throw new Error("Informe a hora do atendimento realizado.")
    }

    if (!allowPastScheduling && slotValidationLoading) {
      throw new Error("Aguarde a revalidacao do horario antes de salvar.")
    }

    const phoneDigits = normalizePhone(customerPhone)
    if (customerPhone.trim() && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
      throw new Error("Telefone invalido. Informe DDD + numero.")
    }

    const appointmentDate = allowPastScheduling
      ? manualAppointmentDate
      : selectedSlot?.date
    const appointmentTime = allowPastScheduling
      ? manualAppointmentTime
      : selectedSlot?.time

    if (!appointmentDate || !appointmentTime) {
      throw new Error("Data/hora invalida para o agendamento.")
    }

    if (!allowPastScheduling && slotValidation && !slotValidation.available && !slotValidation.canOverride) {
      throw new Error(slotValidation.message ?? "Escolha outro horario para continuar.")
    }

    return {
      serviceId,
      staffMembershipId: staffMembershipId.trim() ? staffMembershipId.trim() : undefined,
      customerName: customerName.trim(),
      customerPhone: phoneDigits ? phoneDigits : undefined,
      customerEmail: customerEmail.trim() ? customerEmail.trim() : undefined,
      date: appointmentDate,
      time: appointmentTime,
      allowPastScheduling,
      allowConflict:
        !allowPastScheduling &&
        Boolean(slotValidation?.canOverride && !slotValidation.available && conflictOverrideConfirmed),
      notes: notes.trim() ? notes.trim() : undefined,
    }
  }

  async function handleChooseAnotherSlotAfterConflict() {
    setAppointmentConflictPrompt(null)
    setPendingCreatePayload(null)
    setConflictOverrideConfirmed(false)
    await openAvailabilityModal()
  }

  async function handleConfirmAppointmentConflict() {
    setConflictOverrideConfirmed(true)
    setAppointmentConflictPrompt(null)

    if (!pendingCreatePayload) {
      return
    }

    setSaving(true)

    try {
      const payload = {
        ...pendingCreatePayload,
        allowConflict: true,
      } satisfies AppointmentCreatePayload

      setPendingCreatePayload(null)
      await submitCreateAppointmentPayload(payload)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erro ao criar agendamento.")
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateAppointment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    try {
      const payload = buildCreateAppointmentPayload()

      if (!allowPastScheduling && slotValidation?.canOverride && !slotValidation.available && !conflictOverrideConfirmed) {
        setPendingCreatePayload(payload)
        setAppointmentConflictPrompt({
          requiresConfirmation: true,
          canOverride: true,
          reason: "APPOINTMENT_CONFLICT",
          requestedSlot: slotValidation.slot,
          conflictingAppointmentsCount: slotValidation.conflictingAppointmentsCount,
          conflictingAppointments: slotValidation.conflictingAppointments,
          suggestions: slotValidation.suggestions,
        })
        return
      }

      const result = await submitCreateAppointmentPayload(payload)
      if (result.requiresConfirmation) {
        return
      }
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
    setBlockScope(professional.isUnassigned ? "STORE" : "PROFESSIONAL")
    setBlockDate(selectedDate)
    setBlockAllDay(false)
    setBlockStartTime("08:00")
    setBlockEndTime("09:00")
    setBlockSaveError(null)
    setBlockConflict(null)
    setPendingBlockPayload(null)
    setBlockDialogOpen(true)
  }

  async function submitBlockPayload(payload: BlockCreatePayload) {
    const response = await fetch("/api/schedule/blocked", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const json = (await response.json()) as
      | ApiSuccess<{
          created: number
          conflictAction: BlockConflictAction | null
          conflictingAppointmentsCount: number
          canceledAppointmentsCount: number
        }>
      | BlockedScheduleError

    if (
      response.status === 409 &&
      !json.ok &&
      json.code === BLOCK_CONFLICT_REQUIRES_CONFIRMATION_CODE &&
      json.details?.requiresConfirmation
    ) {
      setPendingBlockPayload(payload)
      setBlockConflict(json.details)
      return { requiresConfirmation: true as const }
    }

    if (!response.ok || !json.ok) {
      throw new Error(
        json.ok
          ? "Nao foi possivel criar o bloqueio."
          : (json.message ?? json.error ?? "Nao foi possivel criar o bloqueio.")
      )
    }

    setBlockConflict(null)
    setPendingBlockPayload(null)
    await Promise.all([
      loadBlockedSchedules(),
      blockDate === selectedDate ? loadAppointments(selectedDate) : Promise.resolve(),
    ])

    return { requiresConfirmation: false as const }
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

      const result = await submitBlockPayload({
        dates: [blockDate],
        membershipId: blockTargetMembershipId,
        allDay: blockAllDay,
        startTime: blockAllDay ? undefined : blockStartTime,
        endTime: blockAllDay ? undefined : blockEndTime,
      })

      if (result.requiresConfirmation) {
        return
      }

      setBlockDialogOpen(false)
      setBlockingProfessional(null)
    } catch (error) {
      setBlockSaveError(
        error instanceof Error ? error.message : "Erro ao salvar bloqueio de horario."
      )
    } finally {
      setBlockSaving(false)
    }
  }

  async function handleConfirmBlockConflict(action: BlockConflictAction) {
    if (!pendingBlockPayload) {
      return
    }

    setBlockSaving(true)
    setBlockSaveError(null)

    try {
      const result = await submitBlockPayload({
        ...pendingBlockPayload,
        conflictAction: action,
      })

      if (result.requiresConfirmation) {
        return
      }

      setBlockDialogOpen(false)
      setBlockingProfessional(null)
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
        throw new Error(
          json.ok
            ? "Nao foi possivel remover o bloqueio."
            : (json.message ?? json.error ?? "Nao foi possivel remover o bloqueio.")
        )
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
              

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[220px_220px_220px_auto]">
                

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
                  <AgendaSelectField
                    value={selectedProfessionalFilter}
                    onValueChange={setSelectedProfessionalFilter}
                    disabled={teamLoading && sortedTeam.length === 0}
                    options={[
                      { value: "all", label: "Todos" },
                      ...sortedTeam.map((member) => ({
                        value: member.membershipId,
                        label: member.name,
                      })),
                    ]}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </label>
                  <AgendaSelectField
                    value={selectedStatusFilter}
                    onValueChange={(value) =>
                      setSelectedStatusFilter(value as AppointmentStatusFilterValue)
                    }
                    options={APPOINTMENT_STATUS_FILTER_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                  />
                </div>

                
              </div>

            </div>

            {teamError ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {teamError}
              </p>
            ) : null}
          </section>

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

        <ProfessionalScheduleBoard
          selectedDate={selectedDate}
          appointments={selectedDayAppointments}
          professionals={renderedStaffColumns}
          loading={scheduleBoardLoading}
          error={appointmentsError}
          emptyMessage={scheduleBoardEmptyMessage}
          onAppointmentClick={handleAppointmentClick}
          onEmptySlotClick={(slot) => {
            void handleGridEmptySlotClick(slot)
          }}
          onBlockSchedule={handleOpenBlockDialog}
          onHideColumn={handleHideProfessionalColumn}
        />

        {!scheduleBoardLoading && !appointmentsError && renderedStaffColumns.length > 0 && selectedDayAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
            {selectedStatusFilter === "all"
              ? "Nenhum agendamento neste dia. As agendas com expediente proprio continuam abertas para destacar horarios livres e facilitar novos encaixes."
              : `Nenhum agendamento com status ${APPOINTMENT_STATUS_FILTER_OPTIONS.find((option) => option.value === selectedStatusFilter)?.label ?? selectedStatusFilter} nesta data.`}
          </div>
        ) : null}

        {false && !scheduleBoardLoading && !appointmentsError && selectedDayAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
            Nenhum agendamento neste dia. As agendas por profissional continuam abertas para destacar horários livres e facilitar novos encaixes.
          </div>
        ) : null}
      </div>
      )}

      <Dialog open={showForm} onOpenChange={handleFormDialogOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>Novo agendamento</DialogTitle>
            <DialogDescription>
              {allowPastScheduling
                ? `Preencha os dados para registrar o atendimento realizado em ${formatDateTimeLabel(manualAppointmentDate, manualAppointmentTime)}${staffMembershipId ? ` com ${sortedTeam.find((member) => member.membershipId === staffMembershipId)?.name ?? "o profissional selecionado"}` : ""}.`
                : selectedSlot
                ? `Preencha os dados para ${formatDateTimeLabel(selectedSlot.date, selectedSlot.time)}${staffMembershipId ? ` com ${sortedTeam.find((member) => member.membershipId === staffMembershipId)?.name ?? "o profissional selecionado"}` : ""}.`
                : "A criacao manual continua usando a mesma validacao real do backend."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            {servicesLoading && !servicesLoaded ? (
              <AppointmentFormSkeleton />
            ) : (
              <form
                id="create-appointment-form"
                onSubmit={handleCreateAppointment}
                className="grid gap-4 pb-1"
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Servico</label>
                    <AgendaSelectField
                      value={serviceId || EMPTY_SERVICE_SELECT_VALUE}
                      onValueChange={(value) =>
                        handleServiceChange(
                          value === EMPTY_SERVICE_SELECT_VALUE ? "" : value
                        )
                      }
                      options={[
                        { value: EMPTY_SERVICE_SELECT_VALUE, label: "Selecione" },
                        ...availableServicesForForm.map((service) => ({
                          value: service.id,
                          label: `${service.name} (${service.durationMin} min)`,
                        })),
                      ]}
                    />
                    {servicesError ? (
                      <p className="text-xs text-red-700">{servicesError}</p>
                    ) : staffLockedFromGrid && availableServicesForForm.length === 0 ? (
                      <p className="text-xs text-amber-700">
                        Este profissional nao possui servicos ativos configurados.
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Profissional</label>
                    <AgendaSelectField
                      value={
                        staffLockedFromGrid
                          ? staffMembershipId
                          : staffMembershipId || EMPTY_STAFF_SELECT_VALUE
                      }
                      onValueChange={(value) =>
                        handleStaffChange(
                          value === EMPTY_STAFF_SELECT_VALUE ? "" : value
                        )
                      }
                      disabled={staffLockedFromGrid || !serviceId || (teamLoading && sortedTeam.length === 0)}
                      options={[
                        ...(!staffLockedFromGrid
                          ? [
                              {
                                value: EMPTY_STAFF_SELECT_VALUE,
                                label: "Sem preferencia",
                              },
                            ]
                          : []),
                        ...professionalOptionsForForm.map((member) => ({
                          value: member.membershipId,
                          label: member.name,
                        })),
                      ]}
                    />
                    {serviceId && !staffLockedFromGrid && professionalOptionsForForm.length === 0 ? (
                      <p className="text-xs text-amber-700">
                        Nenhum profissional com expediente proprio valido foi encontrado para este servico na data selecionada.
                      </p>
                    ) : null}
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
                    {slotValidationLoading && selectedSlot ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Revalidando o encaixe com a duracao atual do servico...
                      </p>
                    ) : null}
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

                  {slotValidation && !slotValidation.available ? (
                    <div
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        slotValidation.canOverride
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      <p className="font-medium">
                        {slotValidation.message ?? "Este horario precisa ser revisado."}
                      </p>
                      {slotValidation.canOverride ? (
                        <>
                          <p className="mt-1 text-xs text-amber-800">
                            Você pode escolher outro horario ou confirmar este encaixe manual mesmo com risco de atraso.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={() => void handleChooseAnotherSlotAfterConflict()}>
                              Escolher outro horario
                            </Button>
                            <Button
                              type="button"
                              onClick={() =>
                                setAppointmentConflictPrompt({
                                  requiresConfirmation: true,
                                  canOverride: true,
                                  reason: "APPOINTMENT_CONFLICT",
                                  requestedSlot: slotValidation.slot,
                                  conflictingAppointmentsCount: slotValidation.conflictingAppointmentsCount,
                                  conflictingAppointments: slotValidation.conflictingAppointments,
                                  suggestions: slotValidation.suggestions,
                                })
                              }
                            >
                              Manter mesmo assim
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="mt-3">
                          <Button type="button" variant="outline" onClick={openAvailabilityModal}>
                            Escolher outro horario
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {conflictOverrideConfirmed && slotValidation?.canOverride ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <p className="font-medium">Encaixe manual confirmado.</p>
                      <p className="mt-1 text-xs">
                        O backend so vai salvar com conflito porque essa confirmacao foi feita explicitamente.
                      </p>
                    </div>
                  ) : null}
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

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowPastScheduling}
                    onChange={(event) => setAllowPastScheduling(event.target.checked)}
                    className="mt-0.5 size-4 rounded border-slate-300"
                  />
                  <span>
                    <span className="block font-medium text-slate-900">
                      Registrar atendimento ja realizado
                    </span>
                    
                  </span>
                </label>

                {allowPastScheduling ? (
                  <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Data e hora do atendimento realizado
                      </p>
                     
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-slate-700">Data</label>
                        <input
                          type="date"
                          value={manualAppointmentDate}
                          onChange={(event) => setManualAppointmentDate(event.target.value)}
                          className="rounded-xl border border-slate-300 px-3 py-2.5"
                          required={allowPastScheduling}
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-slate-700">Hora</label>
                        <input
                          type="time"
                          value={manualAppointmentTime}
                          onChange={(event) => setManualAppointmentTime(event.target.value)}
                          className="rounded-xl border border-slate-300 px-3 py-2.5"
                          step={900}
                          required={allowPastScheduling}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {formError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                ) : null}
              </form>
            )}
          </div>

          {servicesLoading && !servicesLoaded ? null : (
            <DialogFooter className="shrink-0 border-t border-slate-200 pt-4 sm:justify-end">
              <Button
                form="create-appointment-form"
                type="submit"
                variant="primary"
                disabled={saving || slotValidationLoading}
              >
                {saving ? "Salvando..." : slotValidationLoading ? "Validando horario..." : "Salvar agendamento"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(appointmentConflictPrompt)}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setAppointmentConflictPrompt(null)
            setPendingCreatePayload(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conflito de horario detectado</AlertDialogTitle>
            <AlertDialogDescription>
              {appointmentConflictPrompt
                ? `O intervalo ${appointmentConflictPrompt.requestedSlot.label} entra em conflito com ${appointmentConflictPrompt.conflictingAppointmentsCount} agendamento(s) do profissional. Você pode escolher outro horario ou confirmar este encaixe manual mesmo com risco de atraso.`
                : "Revise o conflito antes de salvar o encaixe manual."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {appointmentConflictPrompt?.conflictingAppointments.length ? (
            <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              {appointmentConflictPrompt.conflictingAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{appointment.customerName}</p>
                  <p>
                    {formatConflictingAppointmentLabel(appointment)}
                    {appointment.staffName ? ` / ${appointment.staffName}` : ""}
                  </p>
                </div>
              ))}
              {appointmentConflictPrompt.conflictingAppointmentsCount > 5 ? (
                <p className="text-xs text-slate-500">
                  E mais {appointmentConflictPrompt.conflictingAppointmentsCount - 5} agendamentos.
                </p>
              ) : null}
            </div>
          ) : null}

          {appointmentConflictPrompt?.suggestions.length ? (
            <div className="grid gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Sugestoes sem conflito</p>
              <div className="flex flex-wrap gap-2">
                {appointmentConflictPrompt.suggestions.slice(0, 4).map((slot) => (
                  <button
                    key={slot.startAt}
                    type="button"
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    onClick={() => {
                      setSelectedSlot(slot)
                      setSlotSearchDate(slot.date)
                      setAppointmentConflictPrompt(null)
                      setPendingCreatePayload(null)
                      setConflictOverrideConfirmed(false)
                    }}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Voltar</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void handleChooseAnotherSlotAfterConflict()}
            >
              Escolher outro horario
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleConfirmAppointmentConflict()}
            >
              {saving ? "Salvando..." : "Manter mesmo assim"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        services={services}
        team={sortedTeam}
        storeScheduleDays={weeklySchedule}
        servicesLoading={servicesLoading && !servicesLoaded}
        onSave={handleAppointmentSaved}
        onCancel={handleAppointmentCanceled}
        onStatusChange={handleAppointmentStatusChange}
      />

      <Dialog
        open={blockDialogOpen}
        onOpenChange={(open) => {
          setBlockDialogOpen(open)
          if (!open) {
            setBlockSaveError(null)
            setBlockConflict(null)
            setPendingBlockPayload(null)
            setBlockingProfessional(null)
          }
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>Bloquear e desbloquear horarios</DialogTitle>
            <DialogDescription>
              Configure um bloqueio para {blockScope === "PROFESSIONAL" && blockingProfessional && !blockingProfessional.isUnassigned ? blockingProfessional.name : "a loja inteira"} em {parseDateKey(blockDate).toLocaleDateString("pt-BR")}. A disponibilidade continua validando bloqueios da loja e do profissional no backend.
            </DialogDescription>
          </DialogHeader>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleCreateBlock}>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1">
              {blockingProfessional && !blockingProfessional.isUnassigned ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Aplicar bloqueio em</label>
                  <AgendaSelectField
                    value={blockScope}
                    onValueChange={(value) => setBlockScope(value as BlockScope)}
                    options={[
                      {
                        value: "PROFESSIONAL",
                        label: blockingProfessional.name,
                      },
                      { value: "STORE", label: "Loja inteira" },
                    ]}
                  />
                </div>
              ) : null}

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
            </div>

            <DialogFooter className="mt-4 shrink-0 border-t border-slate-200 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBlockConflict(null)
                  setPendingBlockPayload(null)
                  setBlockDialogOpen(false)
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={blockSaving}>
                {blockSaving ? "Salvando..." : "Salvar bloqueio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(blockConflict)}
        onOpenChange={(open) => {
          if (!open && !blockSaving) {
            setBlockConflict(null)
            setPendingBlockPayload(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existem agendamentos neste periodo</AlertDialogTitle>
            <AlertDialogDescription>
              {blockConflict
                ? `Existem ${blockConflict.conflictingAppointmentsCount} agendamentos ativos neste periodo. Deseja manter esses atendimentos e bloquear apenas novos horarios, ou cancelar os atendimentos conflitantes?`
                : "Confirme como o bloqueio deve tratar os atendimentos existentes."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {blockConflict?.conflictingAppointments.length ? (
            <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              {blockConflict.conflictingAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{appointment.customerName}</p>
                  <p>
                    {formatConflictingAppointmentLabel(appointment)}
                    {appointment.staffName ? ` / ${appointment.staffName}` : ""}
                  </p>
                </div>
              ))}
              {blockConflict.conflictingAppointmentsCount > 5 ? (
                <p className="text-xs text-slate-500">
                  E mais {blockConflict.conflictingAppointmentsCount - 5} agendamentos.
                </p>
              ) : null}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockSaving}>Voltar</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={blockSaving}
              onClick={() => void handleConfirmBlockConflict("KEEP_EXISTING_APPOINTMENTS")}
            >
              Manter atendimentos
            </Button>
            <Button
              type="button"
              disabled={blockSaving}
              onClick={() => void handleConfirmBlockConflict("CANCEL_CONFLICTING_APPOINTMENTS")}
            >
              {blockSaving ? "Salvando..." : "Cancelar atendimentos"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
