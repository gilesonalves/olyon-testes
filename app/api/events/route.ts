import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { EventCreateSchema } from "../../(app)/eventos/schemas"


export async function GET() {
  try {
    const auth = await requireMembershipRole("STAFF")
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const events = await prisma.event.findMany({
      where: { storeId: auth.storeId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ ok: true, data: events })
  } catch (err) {
    console.error("[api/events][GET] error:", err)
    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno ao listar eventos",
        debug:
          err instanceof Error
            ? { message: err.message, name: err.name, stack: err.stack }
            : { message: String(err) },
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireMembershipRole("ADMIN")
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const parsed = EventCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Dados inválidos", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { serviceIds, ...eventData } = parsed.data

    const created = await prisma.event.create({
      data: {
        storeId: auth.storeId,
        ...eventData,
        services: {
          create: serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
      include: {
        services: { include: { service: true } },
      },
    })

    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (err) {
    console.error("[api/events][POST] error:", err)
    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno ao criar evento",
        debug:
          err instanceof Error
            ? { message: err.message, name: err.name, stack: err.stack }
            : { message: String(err) },
      },
      { status: 500 }
    )
  }
}