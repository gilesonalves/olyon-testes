import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"
import {
  storePublicInfoSchema,
  toStorePublicInfoUpdateData,
} from "@/lib/store/public-info"

async function requireSuperAdminSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  if (session.user.globalRole !== SUPER_ADMIN_ROLE) {
    return Response.json({ ok: false, message: "Forbidden" }, { status: 403 })
  }

  return session
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdminSession()
  if (authResult instanceof Response) {
    return authResult
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = storePublicInfoSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { ok: false, message: "Payload invalido", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.store.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!existing) {
    return Response.json({ ok: false, message: "Store not found" }, { status: 404 })
  }

  const updated = await prisma.store.update({
    where: { id },
    data: toStorePublicInfoUpdateData(parsed.data),
    select: {
      id: true,
      phone: true,
      whatsappPhone: true,
      address: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true,
      zipcode: true,
      serviceObservations: true,
      businessHoursSummary: true,
    },
  })

  return Response.json({ ok: true, data: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdminSession()
  if (authResult instanceof Response) {
    return authResult
  }

  const { id } = await params

  const existing = await prisma.store.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!existing) {
    return Response.json({ ok: false, message: "Store not found" }, { status: 404 })
  }

  // ⚠️ HARD DELETE: apaga tudo relacionado via onDelete: Cascade
  await prisma.store.delete({ where: { id } })

  return Response.json({ ok: true, data: { id } })
}
