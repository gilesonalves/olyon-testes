import { MembershipRole, Prisma, prisma } from "@/lib/prisma"
import { requireSuperAdminApiAccess } from "@/lib/admin/require-super-admin"
import { updateStoreOwnerSchema } from "@/lib/admin/store-owner"

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
  const parsed = updateStoreOwnerSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      },
      { status: 400 }
    )
  }

  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        memberships: {
          where: { role: MembershipRole.OWNER },
          select: { userId: true, role: true },
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

    const emailOwner = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    })

    if (emailOwner && emailOwner.id !== ownerMembership.userId) {
      return Response.json(
        { ok: false, error: "Este e-mail já está em uso por outro usuário." },
        { status: 409 }
      )
    }

    const updatedOwner = await prisma.user.update({
      where: { id: ownerMembership.userId },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    return Response.json({
      ok: true,
      data: {
        userId: updatedOwner.id,
        name: updatedOwner.name,
        email: updatedOwner.email,
        role: ownerMembership.role,
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { ok: false, error: "Este e-mail já está em uso por outro usuário." },
        { status: 409 }
      )
    }

    console.error("admin store owner update failed", { storeId })
    return Response.json(
      { ok: false, error: "Não foi possível atualizar o proprietário." },
      { status: 500 }
    )
  }
}
