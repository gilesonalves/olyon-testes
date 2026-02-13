import { prisma } from "@/lib/prisma"
import { requireStoreId } from "@/lib/current-store"
import { ServiceUpdateSchema } from "@/lib/validators/service"
import {
  badRequest,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"

type Params = {
  params: Promise<{ id: string }>
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const storeId = await requireStoreId()

    if (!storeId) {
      return unauthorized()
    }

    const { id } = await params
    const existing = await prisma.service.findFirst({ where: { id, storeId } })

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
    const storeId = await requireStoreId()

    if (!storeId) {
      return unauthorized()
    }

    const { id } = await params
    const existing = await prisma.service.findFirst({ where: { id, storeId } })

    if (!existing) {
      return notFound("Serviço não encontrado")
    }

    await prisma.service.delete({ where: { id } })

    return ok({ id })
  } catch {
    return serverError()
  }
}