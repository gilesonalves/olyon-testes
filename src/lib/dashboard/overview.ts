import { prisma } from "@/lib/prisma"
import {
  addDaysToDateKey,
  addMinutes,
  combineDateKeyAndTime,
  getBotTimezone,
  getDateKeyInTimeZone,
  getTimeKeyInTimeZone,
  getWeekdayFromDateKey,
  parseDateKeyToStoreDate,
  timeKeyToMinutes,
} from "@/lib/bot/datetime"
import { getAppointmentStatusBadgeProps, getAppointmentStatusLabel } from "@/lib/appointments/presentation"
import { AppointmentStatus } from "../../../generated/prisma/client"

const UPCOMING_APPOINTMENTS_LIMIT = 4
const DASHBOARD_SLOT_MINUTES = 15

export type DashboardUpcomingAppointmentItem = {
  id: string
  timeLabel: string
  dayLabel: string
  customerName: string
  staffName: string
  serviceName: string | null
  statusLabel: string
  statusClassName: string
}

export type DashboardFinanceSummary = {
  dayNetTotal: number
  monthNetTotal: number
  openExpensesTotal: number
  hasEntries: boolean
}

export type DashboardScheduleStatus = {
  openSlotsToday: number
  blockedSlotsToday: number
  note: string
  hasConfiguredAgendaToday: boolean
}

export type DashboardOverview = {
  upcomingAppointments: DashboardUpcomingAppointmentItem[]
  financeSummary: DashboardFinanceSummary
  scheduleStatus: DashboardScheduleStatus
}

type WorkingInterval = {
  startTime: string
  endTime: string
}

type WorkingDayWithIntervals = {
  enabled: boolean
  intervals: WorkingInterval[]
}

function formatDateKey(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function getMonthRange(dateKey: string, timeZone: string) {
  const [rawYear, rawMonth] = dateKey.split("-").map(Number)
  const year = Number.isFinite(rawYear) ? rawYear : new Date().getFullYear()
  const month = Number.isFinite(rawMonth) ? rawMonth : new Date().getMonth() + 1
  const nextMonthYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1

  const monthStartKey = formatDateKey(year, month, 1)
  const nextMonthStartKey = formatDateKey(nextMonthYear, nextMonth, 1)

  return {
    monthStart: combineDateKeyAndTime(monthStartKey, "00:00", timeZone),
    nextMonthStart: combineDateKeyAndTime(nextMonthStartKey, "00:00", timeZone),
  }
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === "object" && "toString" in value) {
    const parsed = Number(String(value))
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function getDisplayDayLabel(date: Date, referenceDateKey: string, timeZone: string) {
  const dateKey = getDateKeyInTimeZone(date, timeZone)

  if (dateKey === referenceDateKey) {
    return "Hoje"
  }

  if (dateKey === addDaysToDateKey(referenceDateKey, 1)) {
    return "Amanha"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
  }).format(date)
}

function getCustomerDisplayName(value: string) {
  const normalizedValue = value.trim()
  return normalizedValue ? normalizedValue : "Cliente sem nome"
}

async function getPeriodNetTotal(params: {
  storeId: string
  startAt: Date
  endAt: Date
}) {
  const rows = await prisma.financeEntry.groupBy({
    by: ["type"],
    where: {
      storeId: params.storeId,
      transactionDate: {
        gte: params.startAt,
        lt: params.endAt,
      },
    },
    _sum: {
      amount: true,
    },
  })

  return rows.reduce((total, row) => {
    const amount = toNumber(row._sum.amount)
    return total + (row.type === "INCOME" ? amount : amount * -1)
  }, 0)
}

function roundUpToStep(value: number, step: number) {
  return Math.ceil(value / step) * step
}

function getEffectiveProfessionalIntervals(
  professionalDay: WorkingDayWithIntervals | null | undefined,
  storeDay: WorkingDayWithIntervals | null | undefined
) {
  if (!professionalDay?.enabled || professionalDay.intervals.length === 0) {
    return [] as WorkingInterval[]
  }

  if (!storeDay?.enabled || storeDay.intervals.length === 0) {
    return [] as WorkingInterval[]
  }

  const intersections: WorkingInterval[] = []

  for (const professionalInterval of professionalDay.intervals) {
    const professionalStart = timeKeyToMinutes(professionalInterval.startTime)
    const professionalEnd = timeKeyToMinutes(professionalInterval.endTime)

    for (const storeInterval of storeDay.intervals) {
      const storeStart = timeKeyToMinutes(storeInterval.startTime)
      const storeEnd = timeKeyToMinutes(storeInterval.endTime)
      const startMinutes = Math.max(professionalStart, storeStart)
      const endMinutes = Math.min(professionalEnd, storeEnd)

      if (startMinutes < endMinutes) {
        intersections.push({
          startTime: String(Math.floor(startMinutes / 60)).padStart(2, "0") + ":" + String(startMinutes % 60).padStart(2, "0"),
          endTime: String(Math.floor(endMinutes / 60)).padStart(2, "0") + ":" + String(endMinutes % 60).padStart(2, "0"),
        })
      }
    }
  }

  return intersections
}

function slotOverlapsBlockedSchedule(
  blockedSchedules: Array<{
    allDay: boolean
    startTime: string | null
    endTime: string | null
  }>,
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
      timeKeyToMinutes(blocked.startTime) < slotEndMinutes &&
      timeKeyToMinutes(blocked.endTime) > slotStartMinutes
    )
  })
}

function getDashboardScheduleStatusNote(params: {
  hasConfiguredAgendaToday: boolean
  activeProfessionalsToday: number
  totalSlotsToday: number
}) {
  if (!params.hasConfiguredAgendaToday) {
    return "Nenhum profissional com expediente proprio configurado para hoje."
  }

  if (params.totalSlotsToday === 0) {
    return "Nao ha mais slots de agenda restantes para hoje."
  }

  return `Contagem em slots de 15 min restantes para hoje, considerando ${params.activeProfessionalsToday} ${params.activeProfessionalsToday === 1 ? "profissional com expediente valido" : "profissionais com expediente valido"}, bloqueios e agendamentos ativos.`
}

async function getDashboardScheduleStatus(params: {
  storeId: string
  currentDateKey: string
  nextDayStart: Date
  now: Date
  timeZone: string
}): Promise<DashboardScheduleStatus> {
  const evaluationStartMinutes = roundUpToStep(
    timeKeyToMinutes(getTimeKeyInTimeZone(params.now, params.timeZone)),
    DASHBOARD_SLOT_MINUTES
  )
  const weekday = getWeekdayFromDateKey(params.currentDateKey)

  const [storeWorkingDay, professionalMemberships, blockedSchedules, activeAppointments] =
    await Promise.all([
      prisma.weekScheduleDay.findFirst({
        where: {
          storeId: params.storeId,
          weekday,
        },
        select: {
          enabled: true,
          intervals: {
            orderBy: { startTime: "asc" },
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
      }),
      prisma.membership.findMany({
        where: {
          storeId: params.storeId,
          types: { some: { type: "PROFISSIONAL" } },
        },
        select: {
          id: true,
          professionalWeekSchedules: {
            where: { weekday },
            select: {
              enabled: true,
              intervals: {
                orderBy: { startTime: "asc" },
                select: {
                  startTime: true,
                  endTime: true,
                },
              },
            },
          },
        },
      }),
      prisma.blockedSchedule.findMany({
        where: {
          storeId: params.storeId,
          date: {
            gte: parseDateKeyToStoreDate(params.currentDateKey),
            lt: parseDateKeyToStoreDate(addDaysToDateKey(params.currentDateKey, 1)),
          },
        },
        select: {
          membershipId: true,
          allDay: true,
          startTime: true,
          endTime: true,
        },
      }),
      prisma.appointment.findMany({
        where: {
          storeId: params.storeId,
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
          },
          startAt: {
            lt: params.nextDayStart,
          },
          endAt: {
            gt: params.now,
          },
          staffMembershipId: {
            not: null,
          },
        },
        select: {
          startAt: true,
          endAt: true,
          staffMembershipId: true,
        },
      }),
    ])

  const storeDay = storeWorkingDay
    ? {
        enabled: storeWorkingDay.enabled,
        intervals: storeWorkingDay.intervals,
      }
    : null

  let totalSlotsToday = 0
  let openSlotsToday = 0
  let blockedSlotsToday = 0
  let activeProfessionalsToday = 0

  for (const membership of professionalMemberships) {
    const professionalDay = membership.professionalWeekSchedules[0]
      ? {
          enabled: membership.professionalWeekSchedules[0].enabled,
          intervals: membership.professionalWeekSchedules[0].intervals,
        }
      : null

    const effectiveIntervals = getEffectiveProfessionalIntervals(professionalDay, storeDay)

    if (effectiveIntervals.length === 0) {
      continue
    }

    activeProfessionalsToday += 1

    const applicableBlockedSchedules = blockedSchedules.filter(
      (blocked) => blocked.membershipId === null || blocked.membershipId === membership.id
    )
    const professionalAppointments = activeAppointments.filter(
      (appointment) => appointment.staffMembershipId === membership.id
    )

    for (const interval of effectiveIntervals) {
      let slotStartMinutes = Math.max(
        timeKeyToMinutes(interval.startTime),
        evaluationStartMinutes
      )
      const intervalEndMinutes = timeKeyToMinutes(interval.endTime)

      while (slotStartMinutes + DASHBOARD_SLOT_MINUTES <= intervalEndMinutes) {
        const slotEndMinutes = slotStartMinutes + DASHBOARD_SLOT_MINUTES
        const slotStartAt = combineDateKeyAndTime(
          params.currentDateKey,
          `${String(Math.floor(slotStartMinutes / 60)).padStart(2, "0")}:${String(slotStartMinutes % 60).padStart(2, "0")}`,
          params.timeZone
        )
        const slotEndAt = addMinutes(slotStartAt, DASHBOARD_SLOT_MINUTES)

        totalSlotsToday += 1

        if (
          slotOverlapsBlockedSchedule(
            applicableBlockedSchedules,
            slotStartMinutes,
            slotEndMinutes
          )
        ) {
          blockedSlotsToday += 1
        } else if (
          professionalAppointments.some(
            (appointment) =>
              appointment.startAt < slotEndAt && appointment.endAt > slotStartAt
          )
        ) {
          // Ocupado por agendamento ativo; nao entra no total de livres nem bloqueados.
        } else {
          openSlotsToday += 1
        }

        slotStartMinutes += DASHBOARD_SLOT_MINUTES
      }
    }
  }

  const hasConfiguredAgendaToday = activeProfessionalsToday > 0

  return {
    openSlotsToday,
    blockedSlotsToday,
    note: getDashboardScheduleStatusNote({
      hasConfiguredAgendaToday,
      activeProfessionalsToday,
      totalSlotsToday,
    }),
    hasConfiguredAgendaToday,
  }
}

export async function getDashboardOverview(
  storeId: string | null | undefined
): Promise<DashboardOverview> {
  if (!storeId) {
    return {
      upcomingAppointments: [],
      financeSummary: {
        dayNetTotal: 0,
        monthNetTotal: 0,
        openExpensesTotal: 0,
        hasEntries: false,
      },
      scheduleStatus: {
        openSlotsToday: 0,
        blockedSlotsToday: 0,
        note: "Nenhuma loja selecionada para calcular a agenda de hoje.",
        hasConfiguredAgendaToday: false,
      },
    }
  }

  const timeZone = getBotTimezone()
  const now = new Date()
  const currentDateKey = getDateKeyInTimeZone(now, timeZone)
  const dayStart = combineDateKeyAndTime(currentDateKey, "00:00", timeZone)
  const nextDayStart = combineDateKeyAndTime(addDaysToDateKey(currentDateKey, 1), "00:00", timeZone)
  const { monthStart, nextMonthStart } = getMonthRange(currentDateKey, timeZone)

  const [
    upcomingAppointments,
    dayNetTotal,
    monthNetTotal,
    openExpensesAggregate,
    financeEntriesCount,
    scheduleStatus,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        storeId,
        startAt: {
          gte: now,
        },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
      },
      orderBy: {
        startAt: "asc",
      },
      take: UPCOMING_APPOINTMENTS_LIMIT,
      select: {
        id: true,
        customerName: true,
        status: true,
        startAt: true,
        endAt: true,
        service: {
          select: {
            name: true,
          },
        },
        membership: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    getPeriodNetTotal({
      storeId,
      startAt: dayStart,
      endAt: nextDayStart,
    }),
    getPeriodNetTotal({
      storeId,
      startAt: monthStart,
      endAt: nextMonthStart,
    }),
    prisma.financeEntry.aggregate({
      where: {
        storeId,
        type: "EXPENSE",
        status: {
          not: "PAID",
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.financeEntry.count({
      where: {
        storeId,
      },
    }),
    getDashboardScheduleStatus({
      storeId,
      currentDateKey,
      nextDayStart,
      now,
      timeZone,
    }),
  ])

  return {
    upcomingAppointments: upcomingAppointments.map((appointment) => {
      const statusBadge = getAppointmentStatusBadgeProps(appointment.status, {
        endAt: appointment.endAt,
      })

      return {
        id: appointment.id,
        timeLabel: getTimeKeyInTimeZone(appointment.startAt, timeZone),
        dayLabel: getDisplayDayLabel(appointment.startAt, currentDateKey, timeZone),
        customerName: getCustomerDisplayName(appointment.customerName),
        staffName: appointment.membership?.user.name ?? "Sem profissional",
        serviceName: appointment.service?.name ?? null,
        statusLabel: getAppointmentStatusLabel(appointment.status, {
          endAt: appointment.endAt,
        }),
        statusClassName: statusBadge.className,
      }
    }),
    financeSummary: {
      dayNetTotal,
      monthNetTotal,
      openExpensesTotal: toNumber(openExpensesAggregate._sum.amount),
      hasEntries: financeEntriesCount > 0,
    },
    scheduleStatus,
  }
}
