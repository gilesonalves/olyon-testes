import { prisma } from "@/lib/prisma"
import { ServiceUpdateSchema } from "@/lib/validators/service"
import { badRequest, notFound, ok, serverError, unauthorized, forbidden } from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"

type Params = {
  params: Promise<{ id: string }>
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const guard = await requireMembershipRole("ADMIN")
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error)
    }

    const { id } = await params
    const existing = await prisma.service.findFirst({ where: { id, storeId: guard.storeId } })

    if (!existing) {
      return notFound("Serviço não encontrado")
    }

    const body = await req.json()
    const parsed = ServiceUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Payload inválido")
    }

    const service = await prisma.service.update({
      where: { id },
      data: parsed.data,
    })

    return ok(service)
  } catch {
    return serverError()
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const guard = await requireMembershipRole("ADMIN")
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error)
    }

    const { id } = await params
    const existing = await prisma.service.findFirst({ where: { id, storeId: guard.storeId } })

    if (!existing) {
      return notFound("Serviço não encontrado")
    }

    await prisma.service.delete({ where: { id } })

    return ok({ id })
  } catch {
    return serverError()
  }
}
