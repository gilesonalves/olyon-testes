import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { blockedScheduleCreateSchema } from "@/lib/validators/schedule"
import { getCurrentStoreIdOrThrow } from "@/lib/store/current-store"

function parseDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export async function GET(req: NextRequest) {
  try {
    const { storeId } = await getCurrentStoreIdOrThrow(req)

    const items = await prisma.blockedSchedule.findMany({
      where: { storeId },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    })

    const data = items.map((i) => ({
      id: i.id,
      date: i.date.toISOString().slice(0, 10),
      allDay: i.allDay,
      startTime: i.startTime ?? undefined,
      endTime: i.endTime ?? undefined,
    }))

    return Response.json({ ok: true, data })
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? "Erro"
    const status = msg === "Unauthorized" ? 401 : 400
    return Response.json({ ok: false, message: msg }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { storeId } = await getCurrentStoreIdOrThrow(req)

    const body = await req.json()
    const parsed = blockedScheduleCreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { ok: false, message: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { dates, allDay, startTime, endTime } = parsed.data

    const created = await prisma.blockedSchedule.createMany({
      data: dates.map((dateKey) => ({
        storeId,
        date: parseDateKey(dateKey),
        allDay,
        startTime: allDay ? null : (startTime ?? null),
        endTime: allDay ? null : (endTime ?? null),
      })),
    })

    return Response.json(
      { ok: true, data: { created: created.count } },
      { status: 201 }
    )
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? "Erro"
    const status = msg === "Unauthorized" ? 401 : 400
    return Response.json({ ok: false, message: msg }, { status })
  }
}