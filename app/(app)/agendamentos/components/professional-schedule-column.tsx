"use client"

import AppointmentCard, { type AppointmentCardItem } from "./appointment-card"
import ProfessionalColumnMenu from "./professional-column-menu"

export type ProfessionalColumnItem = {
  membershipId: string
  name: string
  isUnassigned?: boolean
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

  const gridTemplateRows = `repeat(${timeMarks.length}, minmax(${gridRowHeight}px, ${gridRowHeight}px))`

  return (
    <article className="w-62 shrink-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
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
                  : "Agenda livre"}
            </p>
          </div>

          <ProfessionalColumnMenu
            professionalName={professional.name}
            onBlockSchedule={() => onBlockSchedule(professional)}
            onHideColumn={() => onHideColumn(professional)}
          />
        </div>
      </header>

      <div className="relative overflow-hidden bg-white">
        <div className="grid" style={{ gridTemplateRows }}>
          {timeMarks.map((slotMinutes, index) => {
            const slotStartAt = createIsoFromDateKey(selectedDate, slotMinutes)
            const nextSlotMinutes = Math.min(slotMinutes + visualIntervalMinutes, dayEndMinutes)
            const slotEndAt = createIsoFromDateKey(selectedDate, nextSlotMinutes)

            return (
              <button
                key={`${professional.membershipId}-${slotMinutes}`}
                type="button"
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
                className="relative col-start-1 row-span-1 border-t border-slate-200/90 bg-white text-left transition hover:bg-sky-50/60"
                style={{ gridRowStart: index + 1 }}
              >
                <span className="absolute left-4 top-1.5 text-[11px] font-medium text-slate-500">
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
    </article>
  )
}
