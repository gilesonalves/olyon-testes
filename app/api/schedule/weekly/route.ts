import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { weekScheduleSchema } from "@/lib/validators/schedule"
import { getCurrentStoreIdOrThrow } from "@/lib/store/current-store"

const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const

export async function GET(req: NextRequest) {
  try {
    const { storeId } = await getCurrentStoreIdOrThrow(req)

    // garante 7 dias (upsert)
    await prisma.$transaction(
      weekdays.map((weekday) =>
        prisma.weekScheduleDay.upsert({
          where: { storeId_weekday: { storeId, weekday } },
          update: {},
          create: { storeId, weekday, enabled: false },
        })
      )
    )

    const days = await prisma.weekScheduleDay.findMany({
      where: { storeId },
      include: { intervals: { orderBy: { startTime: "asc" } } },
      orderBy: { weekday: "asc" },
    })

    return Response.json({
      ok: true,
      data: {
        days: days.map((d) => ({
          weekday: d.weekday,
          enabled: d.enabled,
          intervals: d.intervals.map((i) => ({
            startTime: i.startTime,
            endTime: i.endTime,
          })),
        })),
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
        { ok: false, message: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { days } = parsed.data

    await prisma.$transaction(async (tx) => {
      for (const day of days) {
        const dayRow = await tx.weekScheduleDay.upsert({
          where: { storeId_weekday: { storeId, weekday: day.weekday } },
          update: { enabled: day.enabled },
          create: { storeId, weekday: day.weekday, enabled: day.enabled },
        })

        await tx.weekScheduleInterval.deleteMany({ where: { dayId: dayRow.id } })

        if (day.enabled && day.intervals.length) {
          await tx.weekScheduleInterval.createMany({
            data: day.intervals.map((i) => ({
              dayId: dayRow.id,
              startTime: i.startTime,
              endTime: i.endTime,
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