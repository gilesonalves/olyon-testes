import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }
  if (session.user.globalRole !== SUPER_ADMIN_ROLE) {
    return Response.json({ ok: false, message: "Forbidden" }, { status: 403 })
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