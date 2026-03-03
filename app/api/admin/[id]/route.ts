import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }
  if (session.user.globalRole !== SUPER_ADMIN_ROLE) {
    return Response.json({ ok: false, message: "Forbidden" }, { status: 403 })
  }

  const updated = await prisma.store.update({
    where: { id: params.id },
    data: { active: false },
    select: { id: true, active: true },
  })

  return Response.json({ ok: true, data: updated })
}