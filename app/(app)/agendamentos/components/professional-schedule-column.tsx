"use client"

import AppointmentCard, { type AppointmentCardItem } from "./appointment-card"
import ProfessionalColumnMenu from "./professional-column-menu"

export type ProfessionalColumnBlockedSchedule = {
  id: string
  allDay: boolean
  startTime?: string
  endTime?: string
}

export type ProfessionalColumnItem = {
  membershipId: string
  name: string
  isUnassigned?: boolean
  workingHoursRange?: {
    startMinutes: number
    endMinutes: number
  } | null
  canCreateAppointments?: boolean
  blockedSchedules?: ProfessionalColumnBlockedSchedule[]
}

export type EmptySlotSelection = {
  startAt: string
  endAt: string
  date: string
  time: string
  endTime: string
  label: string
  staffMembershipId: string | null
}

type ProfessionalScheduleColumnProps = {
  selectedDate: string
  professional: ProfessionalColumnItem
  appointments: AppointmentCardItem[]
  dayStartMinutes: number
  dayEndMinutes: number
  visualIntervalMinutes: number
  gridRowHeight: number
  onAppointmentClick: (appointmentId: string) => void
  onEmptySlotClick: (slot: EmptySlotSelection) => void
  onBlockSchedule: (professional: ProfessionalColumnItem) => void
  onHideColumn: (professional: ProfessionalColumnItem) => void
}

function getMinutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}

function formatMinutesLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function createIsoFromDateKey(dateKey: string, totalMinutes: number) {
  const [year, month, day] = dateKey.split("-").map(Number)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString()
}

function slotOverlapsBlockedSchedule(
  blockedSchedules: ProfessionalColumnBlockedSchedule[],
  slotStartMinutes: number,
  slotEndMinutes: number
) {
  return blockedSchedules.some((blocked) => {
    if (blocked.allDay) {
      return true
    }

    if (!blocked.startTime || !blocked.endTime) {
      return false
    }

    return (
      getMinutesFromTime(blocked.startTime) < slotEndMinutes &&
      getMinutesFromTime(blocked.endTime) > slotStartMinutes
    )
  })
}

export default function ProfessionalScheduleColumn({
  selectedDate,
  professional,
  appointments,
  dayStartMinutes,
  dayEndMinutes,
  visualIntervalMinutes,
  gridRowHeight,
  onAppointmentClick,
  onEmptySlotClick,
  onBlockSchedule,
  onHideColumn,
}: ProfessionalScheduleColumnProps) {
  const timeMarks: number[] = []
  for (let cursor = dayStartMinutes; cursor < dayEndMinutes; cursor += visualIntervalMinutes) {
    timeMarks.push(cursor)
  }

  const blockedSchedules = professional.blockedSchedules ?? []
  const canCreateAppointments = professional.canCreateAppointments ?? true
  const gridTemplateRows = `repeat(${timeMarks.length}, minmax(${gridRowHeight}px, ${gridRowHeight}px))`

  return (
    <article className="flex h-[min(72vh,860px)] w-62 shrink-0 flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <header className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold uppercase tracking-[0.04em] text-slate-900">
              {professional.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {appointments.length > 0
                ? `${appointments.length} ${appointments.length === 1 ? "agendamento" : "agendamentos"}`
                : professional.isUnassigned
                  ? "Sem profissional definido"
                  : canCreateAppointments
                    ? "Agenda livre"
                    : "Sem expediente"}
            </p>
          </div>

          <ProfessionalColumnMenu
            professionalName={professional.name}
            onBlockSchedule={() => onBlockSchedule(professional)}
            onHideColumn={() => onHideColumn(professional)}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {timeMarks.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            Sem expediente configurado para esta data.
          </div>
        ) : (
          <div className="relative">
            <div className="grid" style={{ gridTemplateRows }}>
              {timeMarks.map((slotMinutes, index) => {
                const nextSlotMinutes = Math.min(slotMinutes + visualIntervalMinutes, dayEndMinutes)
                const slotStartAt = createIsoFromDateKey(selectedDate, slotMinutes)
                const slotEndAt = createIsoFromDateKey(selectedDate, nextSlotMinutes)
                const slotBlocked = slotOverlapsBlockedSchedule(
                  blockedSchedules,
                  slotMinutes,
                  nextSlotMinutes
                )
                const slotDisabled = slotBlocked || !canCreateAppointments

                return (
                  <button
                    key={`${professional.membershipId}-${slotMinutes}`}
                    type="button"
                    disabled={slotDisabled}
                    title={
                      slotBlocked
                        ? "Horario bloqueado"
                        : !canCreateAppointments
                          ? "Sem expediente disponivel nesta data"
                          : undefined
                    }
                    onClick={() =>
                      onEmptySlotClick({
                        startAt: slotStartAt,
                        endAt: slotEndAt,
                        date: selectedDate,
                        time: formatMinutesLabel(slotMinutes),
                        endTime: formatMinutesLabel(nextSlotMinutes),
                        label: `${formatMinutesLabel(slotMinutes)} - ${formatMinutesLabel(nextSlotMinutes)}`,
                        staffMembershipId: professional.isUnassigned ? null : professional.membershipId,
                      })
                    }
                    className={`relative col-start-1 row-span-1 border-t border-slate-200/90 transition ${
                      slotBlocked
                        ? "cursor-not-allowed bg-slate-100 text-slate-400 hover:bg-slate-100"
                        : !canCreateAppointments
                          ? "cursor-default bg-slate-50/80 text-slate-400 hover:bg-slate-50/80"
                          : "bg-white text-left hover:bg-sky-50/60"
                    }`}
                    style={{ gridRowStart: index + 1 }}
                  >
                    <span className="absolute inset-x-0 top-1.5 text-center text-[11px] font-medium text-slate-500">
                      {formatMinutesLabel(slotMinutes)}
                    </span>
                  </button>
                )
              })}

              {appointments.map((appointment) => {
                const startMinutes = getMinutesFromTime(appointment.startTime)
                const endMinutes = getMinutesFromTime(appointment.endTime)
                const rowStart = Math.max(
                  1,
                  Math.floor((startMinutes - dayStartMinutes) / visualIntervalMinutes) + 1
                )
                const rowSpan = Math.max(
                  1,
                  Math.ceil((endMinutes - startMinutes) / visualIntervalMinutes)
                )

                return (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    rowStart={rowStart}
                    rowSpan={rowSpan}
                    onClick={onAppointmentClick}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
