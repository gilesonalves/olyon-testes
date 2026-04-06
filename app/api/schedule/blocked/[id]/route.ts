import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { blockedScheduleUpdateSchema } from "@/lib/validators/schedule"
import { getCurrentStoreIdOrThrow } from "@/lib/store/current-store"
import { getBotTimezone, getDateKeyInTimeZone } from "@/lib/bot/datetime"

function parseDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function normalizeMembershipId(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
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

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { storeId } = await getCurrentStoreIdOrThrow(req)
    const { id } = await ctx.params

    const body = await req.json()
    const parsed = blockedScheduleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { ok: false, message: "Payload invalido", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const exists = await prisma.blockedSchedule.findFirst({ where: { id, storeId } })
    if (!exists) {
      return Response.json({ ok: false, message: "Bloqueio nao encontrado" }, { status: 404 })
    }

    const membershipId = await resolveProfessionalMembershipId(
      storeId,
      normalizeMembershipId(parsed.data.membershipId)
    )
    const { date, allDay, startTime, endTime } = parsed.data

    const updated = await prisma.blockedSchedule.update({
      where: { id },
      data: {
        membershipId,
        date: parseDateKey(date),
        allDay,
        startTime: allDay ? null : (startTime ?? null),
        endTime: allDay ? null : (endTime ?? null),
      },
      include: {
        membership: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    return Response.json({
      ok: true,
      data: {
        id: updated.id,
        date: getDateKeyInTimeZone(updated.date, getBotTimezone()),
        allDay: updated.allDay,
        startTime: updated.startTime ?? undefined,
        endTime: updated.endTime ?? undefined,
        membershipId: updated.membership?.id ?? null,
        membershipName: updated.membership?.user.name ?? null,
      },
    })
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? "Erro"
    const status = msg === "Unauthorized" ? 401 : 400
    return Response.json({ ok: false, message: msg }, { status })
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { storeId } = await getCurrentStoreIdOrThrow(req)
    const { id } = await ctx.params

    const exists = await prisma.blockedSchedule.findFirst({ where: { id, storeId } })
    if (!exists) {
      return Response.json({ ok: false, message: "Bloqueio nao encontrado" }, { status: 404 })
    }

    await prisma.blockedSchedule.delete({ where: { id } })
    return Response.json({ ok: true, data: { id } })
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? "Erro"
    const status = msg === "Unauthorized" ? 401 : 400
    return Response.json({ ok: false, message: msg }, { status })
  }
}
