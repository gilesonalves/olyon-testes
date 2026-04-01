"use client"

import { useMemo } from "react"

import ProfessionalScheduleColumn, {
  type EmptySlotSelection,
  type ProfessionalColumnItem,
} from "./professional-schedule-column"

export type BoardAppointment = {
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

type ProfessionalScheduleBoardProps = {
  selectedDate: string
  appointments: BoardAppointment[]
  professionals: ProfessionalColumnItem[]
  workingHoursRange?: {
    startMinutes: number
    endMinutes: number
  } | null
  loading?: boolean
  error?: string | null
  onAppointmentClick: (appointmentId: string) => void
  onEmptySlotClick: (slot: EmptySlotSelection) => void
  onBlockSchedule: (professional: ProfessionalColumnItem) => void
  onHideColumn: (professional: ProfessionalColumnItem) => void
}

const DEFAULT_DAY_START_MINUTES = 8 * 60
const DEFAULT_DAY_END_MINUTES = 20 * 60
const VISUAL_INTERVAL_MINUTES = 15
const GRID_ROW_HEIGHT = 44
const UNASSIGNED_STAFF_ID = "__unassigned__"

function getMinutesFromTime(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}

function floorToInterval(value: number, interval: number) {
  return Math.floor(value / interval) * interval
}

function ceilToInterval(value: number, interval: number) {
  return Math.ceil(value / interval) * interval
}

function ProfessionalColumnSkeleton() {
  return (
    <div className="w-62 shrink-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-4">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="mt-2 h-3 w-16 rounded bg-slate-200" />
        <div className="mt-3 h-9 w-full rounded-xl bg-slate-300" />
      </div>
      <div>
        {Array.from({ length: 18 }, (_, index) => (
          <div key={index} className="relative h-7 border-b border-slate-200 bg-white px-4 py-1">
            {index % 3 === 0 ? <div className="h-3 w-10 rounded bg-slate-200" /> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProfessionalScheduleBoard({
  selectedDate,
  appointments,
  professionals,
  workingHoursRange = null,
  loading = false,
  error = null,
  onAppointmentClick,
  onEmptySlotClick,
  onBlockSchedule,
  onHideColumn,
}: ProfessionalScheduleBoardProps) {
  const visibleProfessionals = useMemo(
    () =>
      professionals.length > 0
        ? professionals
        : [{ membershipId: UNASSIGNED_STAFF_ID, name: "Sem profissionais" }],
    [professionals]
  )

  const { groupedAppointments, dayStartMinutes, dayEndMinutes } = useMemo(() => {
    const configuredDayStart = workingHoursRange?.startMinutes ?? DEFAULT_DAY_START_MINUTES
    const configuredDayEnd = workingHoursRange?.endMinutes ?? DEFAULT_DAY_END_MINUTES
    const starts = appointments.map((appointment) => getMinutesFromTime(appointment.startTime))
    const ends = appointments.map((appointment) => getMinutesFromTime(appointment.endTime))

    const earliest = starts.length > 0 ? Math.min(...starts) : configuredDayStart
    const latest = ends.length > 0 ? Math.max(...ends) : configuredDayEnd

    const dayStart = Math.max(
      0,
      Math.min(
        configuredDayStart,
        floorToInterval(earliest, VISUAL_INTERVAL_MINUTES) - VISUAL_INTERVAL_MINUTES
      )
    )
    const dayEnd = Math.max(
      configuredDayEnd,
      ceilToInterval(latest, VISUAL_INTERVAL_MINUTES) + VISUAL_INTERVAL_MINUTES
    )

    const grouped = new Map<string, BoardAppointment[]>()
    for (const professional of visibleProfessionals) {
      grouped.set(professional.membershipId, [])
    }

    for (const appointment of appointments) {
      const membershipId = appointment.staff?.membershipId ?? UNASSIGNED_STAFF_ID
      const professionalAppointments = grouped.get(membershipId)

      if (professionalAppointments) {
        professionalAppointments.push(appointment)
      }
    }

    for (const items of grouped.values()) {
      items.sort((left, right) => left.startTime.localeCompare(right.startTime))
    }

    return {
      groupedAppointments: grouped,
      dayStartMinutes: dayStart,
      dayEndMinutes: dayEnd,
    }
  }, [appointments, visibleProfessionals, workingHoursRange])

  if (loading) {
    return (
      <section className="w-full min-w-0 max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-sm sm:p-5">
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-1">
          <div className="flex min-w-max gap-4">
            {Array.from({ length: Math.max(visibleProfessionals.length, 3) }, (_, index) => (
              <ProfessionalColumnSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (professionals.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center text-sm text-slate-600">
        Nenhuma coluna visivel no momento. Reexiba um profissional para continuar usando a agenda.
      </div>
    )
  }

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-sm sm:p-5">
      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-1">
        <div className="flex min-w-max items-start gap-4">
          {visibleProfessionals.map((professional) => (
            <ProfessionalScheduleColumn
              key={professional.membershipId}
              selectedDate={selectedDate}
              professional={professional}
              appointments={groupedAppointments.get(professional.membershipId) ?? []}
              dayStartMinutes={dayStartMinutes}
              dayEndMinutes={dayEndMinutes}
              visualIntervalMinutes={VISUAL_INTERVAL_MINUTES}
              gridRowHeight={GRID_ROW_HEIGHT}
              onAppointmentClick={onAppointmentClick}
              onEmptySlotClick={onEmptySlotClick}
              onBlockSchedule={onBlockSchedule}
              onHideColumn={onHideColumn}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
