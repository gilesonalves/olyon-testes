import type { PrismaClient } from "../../../generated/prisma/client"
import { AppointmentStatus, MembershipRole, Weekday } from "../../../generated/prisma/client"
import {
  addDaysToDateKey,
  addMinutes,
  combineDateKeyAndTime,
  formatDateTimeForBot,
  getDateKeyInTimeZone,
  getTimeKeyInTimeZone,
  getWeekdayFromDateKey,
  minutesToTimeKey,
  normalizeBotText,
  parseDateKeyToStoreDate,
  timeKeyToMinutes,
} from "@/lib/bot/datetime"

type AvailabilityDbClient = Pick<
  PrismaClient,
  "weekScheduleDay" | "blockedSchedule" | "appointment" | "membership"
>

export type EligibleStaffMember = {
  membershipId: string
  name: string
  role: MembershipRole
}

export type SuggestedSlot = {
  startAt: Date
  endAt: Date
  label: string
}

type AvailabilityReason =
  | "NO_WORKING_HOURS_CONFIGURED"
  | "OUTSIDE_WORKING_HOURS"
  | "BLOCKED"
  | "APPOINTMENT_CONFLICT"

type AvailabilitySuccess = {
  available: true
  startAt: Date
  endAt: Date
  suggestions: SuggestedSlot[]
}

type AvailabilityFailure = {
  available: false
  startAt: Date
  endAt: Date
  reason: AvailabilityReason
  message: string
  suggestions: SuggestedSlot[]
}

export type SlotAvailabilityResult = AvailabilitySuccess | AvailabilityFailure

export type StaffChoiceResult =
  | {
      ok: true
      staff: EligibleStaffMember
    }
  | {
      ok: false
      reason: "INVALID" | "AMBIGUOUS"
      matches: EligibleStaffMember[]
    }

type WorkingDay = {
  weekday: Weekday
  enabled: boolean
  intervals: Array<{
    startTime: string
    endTime: string
  }>
}

type BlockedWindow = {
  allDay: boolean
  startTime: string | null
  endTime: string | null
}

type AppointmentWindow = {
  id: string
  startAt: Date
  endAt: Date
  staffMembershipId: string | null
}

type AvailabilityContext = {
  timeZone: string
  requestedDateKey: string
  durationMin: number
  stepMin: number
  searchDays: number
  staffMembershipId: string | null
  workingDaysByWeekday: Map<Weekday, WorkingDay>
  blockedByDateKey: Map<string, BlockedWindow[]>
  appointments: AppointmentWindow[]
}

export async function listEligibleStaffForService(params: {
  db: AvailabilityDbClient
  storeId: string
  serviceId: string
}) {
  const memberships = await params.db.membership.findMany({
    where: {
      storeId: params.storeId,
      types: { some: { type: "PROFISSIONAL" } },
      services: { some: { serviceId: params.serviceId } },
    },
    select: {
      id: true,
      role: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  })

  return memberships
    .map((membership) => ({
      membershipId: membership.id,
      name: membership.user.name,
      role: membership.role,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")) satisfies EligibleStaffMember[]
}

export function resolveEligibleStaffChoice(params: {
  text: string
  staffMembers: EligibleStaffMember[]
}): StaffChoiceResult {
  const normalizedText = normalizeBotText(params.text)
  if (!normalizedText) {
    return {
      ok: false,
      reason: "INVALID",
      matches: [],
    }
  }

  const numericMatch = normalizedText.match(/\b(\d{1,2})\b/)
  if (numericMatch) {
    const index = Number(numericMatch[1]) - 1
    const selectedByIndex = params.staffMembers[index]
    if (selectedByIndex) {
      return {
        ok: true,
        staff: selectedByIndex,
      }
    }
  }

  const exactMatch = params.staffMembers.find(
    (staff) => normalizeBotText(staff.name) === normalizedText
  )
  if (exactMatch) {
    return {
      ok: true,
      staff: exactMatch,
    }
  }

  const partialMatches = params.staffMembers.filter((staff) => {
    const normalizedName = normalizeBotText(staff.name)
    return normalizedName.includes(normalizedText) || normalizedText.includes(normalizedName)
  })

  if (partialMatches.length === 1) {
    return {
      ok: true,
      staff: partialMatches[0],
    }
  }

  if (partialMatches.length > 1) {
    return {
      ok: false,
      reason: "AMBIGUOUS",
      matches: partialMatches,
    }
  }

  return {
    ok: false,
    reason: "INVALID",
    matches: [],
  }
}

export async function checkAvailabilityForSlot(params: {
  db: AvailabilityDbClient
  storeId: string
  requestedStartAt: Date
  durationMin: number
  timeZone: string
  staffMembershipId?: string | null
  suggestionsLimit?: number
  searchDays?: number
  stepMin?: number
}) {
  const suggestionsLimit = params.suggestionsLimit ?? 3
  const searchDays = params.searchDays ?? 14
  const stepMin = params.stepMin ?? 15
  const requestedDateKey = getDateKeyInTimeZone(params.requestedStartAt, params.timeZone)

  const context = await buildAvailabilityContext({
    db: params.db,
    storeId: params.storeId,
    timeZone: params.timeZone,
    requestedDateKey,
    durationMin: params.durationMin,
    searchDays,
    stepMin,
    staffMembershipId: params.staffMembershipId ?? null,
  })

  const requestedEndAt = addMinutes(params.requestedStartAt, params.durationMin)
  const requestedEvaluation = evaluateSlot(context, params.requestedStartAt, requestedEndAt)

  if (requestedEvaluation.available) {
    return {
      available: true,
      startAt: params.requestedStartAt,
      endAt: requestedEndAt,
      suggestions: [],
    } satisfies AvailabilitySuccess
  }

  return {
    available: false,
    startAt: params.requestedStartAt,
    endAt: requestedEndAt,
    reason: requestedEvaluation.reason,
    message: requestedEvaluation.message,
    suggestions: findSuggestedSlots(context, params.requestedStartAt, suggestionsLimit),
  } satisfies AvailabilityFailure
}

export async function listNextAvailableSlots(params: {
  db: AvailabilityDbClient
  storeId: string
  durationMin: number
  timeZone: string
  staffMembershipId?: string | null
  searchStartAt?: Date
  limit?: number
  searchDays?: number
  stepMin?: number
}) {
  const limit = params.limit ?? 5
  const searchDays = params.searchDays ?? 14
  const stepMin = params.stepMin ?? 15
  const searchStartAt = params.searchStartAt ?? new Date()
  const requestedDateKey = getDateKeyInTimeZone(searchStartAt, params.timeZone)

  const context = await buildAvailabilityContext({
    db: params.db,
    storeId: params.storeId,
    timeZone: params.timeZone,
    requestedDateKey,
    durationMin: params.durationMin,
    searchDays,
    stepMin,
    staffMembershipId: params.staffMembershipId ?? null,
  })

  return findSuggestedSlots(context, searchStartAt, limit)
}

export async function listAvailableSlotsForDate(params: {
  db: AvailabilityDbClient
  storeId: string
  dateKey: string
  durationMin: number
  timeZone: string
  staffMembershipId?: string | null
  notBefore?: Date | null
  stepMin?: number
}) {
  const stepMin = params.stepMin ?? 15

  const context = await buildAvailabilityContext({
    db: params.db,
    storeId: params.storeId,
    timeZone: params.timeZone,
    requestedDateKey: params.dateKey,
    durationMin: params.durationMin,
    searchDays: 1,
    stepMin,
    staffMembershipId: params.staffMembershipId ?? null,
  })

  return findAvailableSlotsForDate({
    context,
    dateKey: params.dateKey,
    notBefore: params.notBefore ?? null,
  })
}

async function buildAvailabilityContext(params: {
  db: AvailabilityDbClient
  storeId: string
  timeZone: string
  requestedDateKey: string
  durationMin: number
  searchDays: number
  stepMin: number
  staffMembershipId: string | null
}) {
  const lastDateKey = addDaysToDateKey(params.requestedDateKey, params.searchDays - 1)
  const appointmentRangeStart = combineDateKeyAndTime(params.requestedDateKey, "00:00", params.timeZone)
  const appointmentRangeEnd = combineDateKeyAndTime(
    addDaysToDateKey(lastDateKey, 1),
    "00:00",
    params.timeZone
  )

  const [workingDays, blockedSchedules, appointments] = await Promise.all([
    params.db.weekScheduleDay.findMany({
      where: { storeId: params.storeId },
      include: { intervals: { orderBy: { startTime: "asc" } } },
      orderBy: { weekday: "asc" },
    }),
    params.db.blockedSchedule.findMany({
      where: {
        storeId: params.storeId,
        date: {
          gte: parseDateKeyToStoreDate(params.requestedDateKey),
          lte: parseDateKeyToStoreDate(lastDateKey),
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    params.db.appointment.findMany({
      where: {
        storeId: params.storeId,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        startAt: { lt: appointmentRangeEnd },
        endAt: { gt: appointmentRangeStart },
        ...(params.staffMembershipId
          ? {
              OR: [
                { staffMembershipId: params.staffMembershipId },
                { staffMembershipId: null },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        staffMembershipId: true,
      },
    }),
  ])

  const workingDaysByWeekday = new Map<Weekday, WorkingDay>(
    workingDays.map((day) => [
      day.weekday,
      {
        weekday: day.weekday,
        enabled: day.enabled,
        intervals: day.intervals.map((interval) => ({
          startTime: interval.startTime,
          endTime: interval.endTime,
        })),
      },
    ])
  )

  const blockedByDateKey = new Map<string, BlockedWindow[]>()

  for (const blocked of blockedSchedules) {
    const dateKey = blocked.date.toISOString().slice(0, 10)
    const entries = blockedByDateKey.get(dateKey) ?? []
    entries.push({
      allDay: blocked.allDay,
      startTime: blocked.startTime,
      endTime: blocked.endTime,
    })
    blockedByDateKey.set(dateKey, entries)
  }

  return {
    timeZone: params.timeZone,
    requestedDateKey: params.requestedDateKey,
    durationMin: params.durationMin,
    stepMin: params.stepMin,
    searchDays: params.searchDays,
    staffMembershipId: params.staffMembershipId,
    workingDaysByWeekday,
    blockedByDateKey,
    appointments,
  } satisfies AvailabilityContext
}

function evaluateSlot(context: AvailabilityContext, startAt: Date, endAt: Date) {
  const startDateKey = getDateKeyInTimeZone(startAt, context.timeZone)
  const endDateKey = getDateKeyInTimeZone(endAt, context.timeZone)
  const startTimeKey = getTimeKeyInTimeZone(startAt, context.timeZone)
  const endTimeKey = getTimeKeyInTimeZone(endAt, context.timeZone)
  const weekday = getWeekdayFromDateKey(startDateKey)
  const workingDay = context.workingDaysByWeekday.get(weekday)

  if (!hasAnyEnabledWorkingDay(context.workingDaysByWeekday)) {
    return {
      available: false as const,
      reason: "NO_WORKING_HOURS_CONFIGURED" as const,
      message: "Ainda nao ha horarios de atendimento configurados para a agenda.",
    }
  }

  if (startDateKey !== endDateKey) {
    return {
      available: false as const,
      reason: "OUTSIDE_WORKING_HOURS" as const,
      message: "Esse horario nao cabe dentro do expediente configurado.",
    }
  }

  if (!workingDay?.enabled || !fitsAnyInterval(workingDay.intervals, startTimeKey, endTimeKey)) {
    return {
      available: false as const,
      reason: "OUTSIDE_WORKING_HOURS" as const,
      message: "Esse horario fica fora do expediente ou nao comporta toda a duracao do servico.",
    }
  }

  const blocked = context.blockedByDateKey.get(startDateKey) ?? []
  if (blocked.some((item) => overlapsBlockedWindow(item, startTimeKey, endTimeKey))) {
    return {
      available: false as const,
      reason: "BLOCKED" as const,
      message: "Esse horario esta bloqueado na agenda.",
    }
  }

  if (context.appointments.some((appointment) => appointment.startAt < endAt && appointment.endAt > startAt)) {
    return {
      available: false as const,
      reason: "APPOINTMENT_CONFLICT" as const,
      message: context.staffMembershipId
        ? "Esse horario ja esta ocupado para o profissional escolhido."
        : "Esse horario ja foi ocupado por outro agendamento.",
    }
  }

  return {
    available: true as const,
  }
}

function hasAnyEnabledWorkingDay(workingDaysByWeekday: Map<Weekday, WorkingDay>) {
  for (const day of workingDaysByWeekday.values()) {
    if (day.enabled && day.intervals.length > 0) {
      return true
    }
  }

  return false
}

function fitsAnyInterval(
  intervals: Array<{ startTime: string; endTime: string }>,
  startTime: string,
  endTime: string
) {
  return intervals.some((interval) => interval.startTime <= startTime && interval.endTime >= endTime)
}

function overlapsBlockedWindow(blocked: BlockedWindow, startTime: string, endTime: string) {
  if (blocked.allDay) {
    return true
  }

  if (!blocked.startTime || !blocked.endTime) {
    return false
  }

  return blocked.startTime < endTime && blocked.endTime > startTime
}

function findSuggestedSlots(
  context: AvailabilityContext,
  requestedStartAt: Date,
  limit: number
) {
  const suggestions: SuggestedSlot[] = []
  const seen = new Set<string>()

  for (let offset = 0; offset < context.searchDays && suggestions.length < limit; offset += 1) {
    const dateKey = addDaysToDateKey(context.requestedDateKey, offset)
    suggestions.push(
      ...findAvailableSlotsForDate({
        context,
        dateKey,
        notBefore: offset === 0 ? requestedStartAt : null,
        limit: limit - suggestions.length,
        seen,
      })
    )
  }

  return suggestions
}

function findAvailableSlotsForDate(params: {
  context: AvailabilityContext
  dateKey: string
  notBefore?: Date | null
  limit?: number
  seen?: Set<string>
}) {
  const suggestions: SuggestedSlot[] = []
  const seen = params.seen ?? new Set<string>()
  const weekday = getWeekdayFromDateKey(params.dateKey)
  const workingDay = params.context.workingDaysByWeekday.get(weekday)

  if (!workingDay?.enabled || workingDay.intervals.length === 0) {
    return suggestions
  }

  const notBeforeDateKey = params.notBefore
    ? getDateKeyInTimeZone(params.notBefore, params.context.timeZone)
    : null
  const requestedTimeMinutes =
    params.notBefore && notBeforeDateKey === params.dateKey
      ? roundUpToStep(
          timeKeyToMinutes(getTimeKeyInTimeZone(params.notBefore, params.context.timeZone)),
          params.context.stepMin
        )
      : null

  for (const interval of workingDay.intervals) {
    let candidateMinutes = timeKeyToMinutes(interval.startTime)
    const intervalEndMinutes = timeKeyToMinutes(interval.endTime)

    if (requestedTimeMinutes !== null) {
      candidateMinutes = Math.max(candidateMinutes, requestedTimeMinutes)
    }

    while (
      candidateMinutes + params.context.durationMin <= intervalEndMinutes &&
      (params.limit === undefined || suggestions.length < params.limit)
    ) {
      const timeKey = minutesToTimeKey(candidateMinutes)
      const startAt = combineDateKeyAndTime(params.dateKey, timeKey, params.context.timeZone)

      if (params.notBefore && startAt.getTime() < params.notBefore.getTime()) {
        candidateMinutes += params.context.stepMin
        continue
      }

      const endAt = addMinutes(startAt, params.context.durationMin)
      const evaluation = evaluateSlot(params.context, startAt, endAt)

      if (evaluation.available) {
        const key = startAt.toISOString()
        if (!seen.has(key)) {
          suggestions.push({
            startAt,
            endAt,
            label: formatDateTimeForBot(startAt, params.context.timeZone),
          })
          seen.add(key)
        }
      }

      candidateMinutes += params.context.stepMin
    }
  }

  return suggestions
}

function roundUpToStep(value: number, step: number) {
  return Math.ceil(value / step) * step
}
