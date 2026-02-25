import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { EventUpdateSchema } from "../../../(app)/eventos/schemas"


type Ctx = { params: { id: string } }

export async function GET(_: Request, { params }: Ctx) {
  try {
    const auth = await requireMembershipRole("STAFF")
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const event = await prisma.event.findFirst({
      where: { id: params.id, storeId: auth.storeId },
    })

    if (!event) {
      return NextResponse.json({ ok: false, error: "Evento não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, data: event })
  } catch (err) {
    console.error("[api/events/[id]][GET] error:", err)
    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno ao buscar evento",
        debug:
          err instanceof Error
            ? { message: err.message, name: err.name, stack: err.stack }
            : { message: String(err) },
      },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request, ctx: { params?: { id?: string } }) {
  try {
    const auth = await requireMembershipRole("ADMIN")
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    // ✅ pega por params e faz fallback pelo URL
    const idFromParams = ctx?.params?.id
    const idFromUrl = new URL(req.url).pathname.split("/").pop()
    const id = idFromParams ?? idFromUrl

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID do evento ausente na URL." }, { status: 400 })
    }

    const body = await req.json()
    const parsed = EventUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Dados inválidos", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const exists = await prisma.event.findFirst({ where: { id, storeId: auth.storeId } })
    if (!exists) {
      return NextResponse.json({ ok: false, error: "Evento não encontrado" }, { status: 404 })
    }

    const { serviceIds, ...rest } = parsed.data

    await prisma.event.update({
      where: { id },
      data: rest,
    })

    // sincroniza vínculos se veio serviceIds
    if (Array.isArray(serviceIds)) {
      await prisma.eventService.deleteMany({ where: { eventId: id } })
      if (serviceIds.length > 0) {
        await prisma.eventService.createMany({
          data: serviceIds.map((serviceId) => ({ eventId: id, serviceId })),
          skipDuplicates: true,
        })
      }
    }

    const final = await prisma.event.findFirst({
      where: { id, storeId: auth.storeId },
      include: { services: { include: { service: true } } },
    })

    return NextResponse.json({ ok: true, data: final })
  } catch (err) {
    console.error("[api/events/[id]][PUT] error:", err)
    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno ao atualizar evento",
        debug:
          err instanceof Error
            ? { message: err.message, name: err.name, stack: err.stack }
            : { message: String(err) },
      },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request, ctx: { params?: { id?: string } }) {
  try {
    const auth = await requireMembershipRole("ADMIN")
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const idFromParams = ctx?.params?.id
    const idFromUrl = new URL(req.url).pathname.split("/").pop()
    const id = idFromParams ?? idFromUrl

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID do evento ausente na URL." }, { status: 400 })
    }

    const deleted = await prisma.event.deleteMany({
      where: { id, storeId: auth.storeId },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ ok: false, error: "Evento não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/events/[id]][DELETE] error:", err)
    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno ao remover evento",
        debug:
          err instanceof Error
            ? { message: err.message, name: err.name, stack: err.stack }
            : { message: String(err) },
      },
      { status: 500 }
    )
  }
}
