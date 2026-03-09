import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  storeId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const token = await getToken({ req })
const userId =
  (token && typeof token === "object" && "userId" in token && typeof token.userId === "string"
    ? token.userId
    : typeof token?.sub === "string"
      ? token.sub
      : undefined)

  if (!userId) {
    return NextResponse.json({ ok: false, message: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Payload inválido", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { storeId } = parsed.data

  const membership = await prisma.membership.findUnique({
    where: { userId_storeId: { userId, storeId } },
    select: {
      id: true,
      role: true,
      store: { select: { id: true, name: true, slug: true } },
    },
  })

  if (!membership) {
    return NextResponse.json({ ok: false, message: "Sem acesso a esta loja" }, { status: 403 })
  }

  const res = NextResponse.json({
    ok: true,
    data: {
      store: membership.store,
      membership: { id: membership.id, role: membership.role },
    },
  })

  // cookie httpOnly (produção)
  res.cookies.set("current_store_id", storeId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // secure: true, // habilite em produção https
  })

  return res
}