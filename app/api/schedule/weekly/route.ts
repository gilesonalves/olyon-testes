import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { weekScheduleSchema } from "@/lib/validators/schedule"
import { getCurrentStoreIdOrThrow } from "@/lib/store/current-store"

const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const

type WeekScheduleDayResponse = {
  weekday: (typeof weekdays)[number]
  enabled: boolean
  intervals: Array<{
    startTime: string
    endTime: string
  }>
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
