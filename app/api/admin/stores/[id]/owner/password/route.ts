import { MembershipRole, prisma } from "@/lib/prisma"
import { requireSuperAdminApiAccess } from "@/lib/admin/require-super-admin"
import { resetStoreOwnerPasswordSchema } from "@/lib/admin/store-owner"
import { hashPassword } from "@/lib/actions/create-owner.utils"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const authError = await requireSuperAdminApiAccess()
  if (authError) {
    return authError
  }

  const { id: storeId } = await params
  const body = await req.json().catch(() => null)
  const parsed = resetStoreOwnerPasswordSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Senha inválida.",
      },
      { status: 400 }
    )
  }

  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        memberships: {
          where: { role: MembershipRole.OWNER },
          select: { userId: true },
          take: 1,
        },
      },
    })

    if (!store) {
      return Response.json(
        { ok: false, error: "Loja não encontrada." },
        { status: 404 }
      )
    }

    const ownerMembership = store.memberships[0]
    if (!ownerMembership) {
      return Response.json(
        { ok: false, error: "Proprietário não encontrado." },
        { status: 404 }
      )
    }

    const passwordHash = await hashPassword(parsed.data.password)

    await prisma.user.update({
      where: { id: ownerMembership.userId },
      data: { password: passwordHash },
      select: { id: true },
    })

    return Response.json({
      ok: true,
      data: { userId: ownerMembership.userId },
    })
  } catch {
    console.error("admin store owner password reset failed", { storeId })
    return Response.json(
      { ok: false, error: "Não foi possível redefinir a senha." },
      { status: 500 }
    )
  }
}
