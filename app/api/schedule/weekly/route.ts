import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { weekScheduleSchema } from "@/lib/validators/schedule"
import { getCurrentStoreIdOrThrow } from "@/lib/store/current-store"

const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const
const weekdayLabels: Record<(typeof weekdays)[number], string> = {
  SUN: "domingo",
  MON: "segunda-feira",
  TUE: "terca-feira",
  WED: "quarta-feira",
  THU: "quinta-feira",
  FRI: "sexta-feira",
  SAT: "sabado",
}

type WeekScheduleDayResponse = {
  weekday: (typeof weekdays)[number]
  enabled: boolean
  intervals: Array<{
    startTime: string
    endTime: string
  }>
}

type ScheduleIntervalInput = {
  startTime: string
  endTime: string
}

type ScheduleDayInput = {
  weekday: (typeof weekdays)[number]
  enabled: boolean
  intervals: ScheduleIntervalInput[]
}

function normalizeMembershipId(value: string | null) {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

async function resolveProfessionalMembershipId(storeId: string, membershipId: string | null) {
  if (!membershipId) {
    return null
  }

  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      storeId,
      types: { some: { type: "PROFISSIONAL" } },
    },
    select: { id: true },
  })

  if (!membership) {
    throw new Error("Profissional invalido para a loja atual.")
  }

  return membership.id
}

function serializeDays(
  days: Array<{
    weekday: (typeof weekdays)[number]
    enabled: boolean
    intervals: Array<{
      startTime: string
      endTime: string
    }>
  }>
) {
  const byWeekday = new Map<string, WeekScheduleDayResponse>()

  for (const day of days) {
    byWeekday.set(day.weekday, day)
  }

  return weekdays.map((weekday) => {
    const day = byWeekday.get(weekday)

    return {
      weekday,
      enabled: day?.enabled ?? false,
      intervals: day?.intervals ?? [],
    }
  })
}

function isValidTimeKey(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)
}

function sortIntervals(intervals: ScheduleIntervalInput[]) {
  return [...intervals].sort((left, right) => left.startTime.localeCompare(right.startTime))
}

function intervalFitsWithinStore(
  interval: ScheduleIntervalInput,
  storeIntervals: ScheduleIntervalInput[]
) {
  return storeIntervals.some(
    (storeInterval) =>
      storeInterval.startTime <= interval.startTime &&
      storeInterval.endTime >= interval.endTime
  )
}

function validateDayIntervals(day: ScheduleDayInput, scopeLabel: string) {
  if (!day.enabled || day.intervals.length === 0) {
    return
  }

  const sortedIntervals = sortIntervals(day.intervals)
  let previousEndTime: string | null = null

  for (const interval of sortedIntervals) {
    if (!isValidTimeKey(interval.startTime) || !isValidTimeKey(interval.endTime)) {
      throw new Error(
        `O expediente ${scopeLabel} possui um intervalo invalido em ${weekdayLabels[day.weekday]}.`
      )
    }

    if (interval.endTime <= interval.startTime) {
      throw new Error(
        `O expediente ${scopeLabel} possui um intervalo invalido em ${weekdayLabels[day.weekday]}.`
      )
    }

    if (previousEndTime && interval.startTime < previousEndTime) {
      throw new Error(
        `Os intervalos ${scopeLabel} nao podem se sobrepor em ${weekdayLabels[day.weekday]}.`
      )
    }

    previousEndTime = interval.endTime
  }
}

function validateScheduleDays(days: ScheduleDayInput[], scopeLabel: string) {
  for (const day of days) {
    validateDayIntervals(day, scopeLabel)
  }
}

function validateProfessionalScheduleAgainstStore(params: {
  storeDays: ScheduleDayInput[]
  professionalDays: ScheduleDayInput[]
}) {
  const storeDaysByWeekday = new Map(params.storeDays.map((day) => [day.weekday, day]))

  for (const day of params.professionalDays) {
    if (!day.enabled || day.intervals.length === 0) {
      continue
    }

    const storeDay = storeDaysByWeekday.get(day.weekday)

    if (!storeDay?.enabled || storeDay.intervals.length === 0) {
      throw new Error(
        "Nao e possivel configurar expediente para o profissional em um dia em que a loja nao abre."
      )
    }

    for (const interval of day.intervals) {
      if (!intervalFitsWithinStore(interval, storeDay.intervals)) {
        throw new Error(
          `O horario do profissional precisa estar dentro do expediente da loja. Este intervalo comeca antes da abertura da loja ou termina apos o fechamento. (${weekdayLabels[day.weekday]} ${interval.startTime} - ${interval.endTime})`
        )
      }
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { storeId } = await getCurrentStoreIdOrThrow(req)
    const membershipId = normalizeMembershipId(new URL(req.url).searchParams.get("membershipId"))
    const resolvedMembershipId = await resolveProfessionalMembershipId(storeId, membershipId)

    if (!resolvedMembershipId) {
      await prisma.$transaction(
        weekdays.map((weekday) =>
          prisma.weekScheduleDay.upsert({
            where: { storeId_weekday: { storeId, weekday } },
            update: {},
            create: { storeId, weekday, enabled: false },
          })
        )
      )
    }

    const days = resolvedMembershipId
      ? await prisma.membershipWeekScheduleDay.findMany({
          where: { membershipId: resolvedMembershipId },
          include: { intervals: { orderBy: { startTime: "asc" } } },
          orderBy: { weekday: "asc" },
        })
      : await prisma.weekScheduleDay.findMany({
          where: { storeId },
          include: { intervals: { orderBy: { startTime: "asc" } } },
          orderBy: { weekday: "asc" },
        })

    return Response.json({
      ok: true,
      data: {
        days: serializeDays(
          days.map((day) => ({
            weekday: day.weekday,
            enabled: day.enabled,
            intervals: day.intervals.map((interval) => ({
              startTime: interval.startTime,
              endTime: interval.endTime,
            })),
          }))
        ),
      },
    })
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? "Erro"
    const status = msg === "Unauthorized" ? 401 : 400
    return Response.json({ ok: false, message: msg }, { status })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { storeId } = await getCurrentStoreIdOrThrow(req)

    const body = await req.json()
    const parsed = weekScheduleSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { ok: false, message: "Payload invalido", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const resolvedMembershipId = await resolveProfessionalMembershipId(
      storeId,
      parsed.data.membershipId
    )
    const { days } = parsed.data

    validateScheduleDays(days, resolvedMembershipId ? "do profissional" : "da loja")

    if (resolvedMembershipId) {
      const storeDays = await prisma.weekScheduleDay.findMany({
        where: { storeId },
        include: { intervals: { orderBy: { startTime: "asc" } } },
        orderBy: { weekday: "asc" },
      })

      validateProfessionalScheduleAgainstStore({
        storeDays: storeDays.map((day) => ({
          weekday: day.weekday,
          enabled: day.enabled,
          intervals: day.intervals.map((interval) => ({
            startTime: interval.startTime,
            endTime: interval.endTime,
          })),
        })),
        professionalDays: days,
      })
    }

    await prisma.$transaction(async (tx) => {
      for (const day of days) {
        if (resolvedMembershipId) {
          const dayRow = await tx.membershipWeekScheduleDay.upsert({
            where: {
              membershipId_weekday: {
                membershipId: resolvedMembershipId,
                weekday: day.weekday,
              },
            },
            update: { enabled: day.enabled },
            create: {
              membershipId: resolvedMembershipId,
              weekday: day.weekday,
              enabled: day.enabled,
            },
          })

          await tx.membershipWeekScheduleInterval.deleteMany({ where: { dayId: dayRow.id } })

          if (day.enabled && day.intervals.length > 0) {
            await tx.membershipWeekScheduleInterval.createMany({
              data: day.intervals.map((interval) => ({
                dayId: dayRow.id,
                startTime: interval.startTime,
                endTime: interval.endTime,
              })),
            })
          }

          continue
        }

        const dayRow = await tx.weekScheduleDay.upsert({
          where: { storeId_weekday: { storeId, weekday: day.weekday } },
          update: { enabled: day.enabled },
          create: { storeId, weekday: day.weekday, enabled: day.enabled },
        })

        await tx.weekScheduleInterval.deleteMany({ where: { dayId: dayRow.id } })

        if (day.enabled && day.intervals.length > 0) {
          await tx.weekScheduleInterval.createMany({
            data: day.intervals.map((interval) => ({
              dayId: dayRow.id,
              startTime: interval.startTime,
              endTime: interval.endTime,
            })),
          })
        }
      }
    })

    return Response.json({ ok: true })
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? "Erro"
    const status = msg === "Unauthorized" ? 401 : 400
    return Response.json({ ok: false, message: msg }, { status })
  }
}
