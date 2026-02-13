import { prisma } from "@/lib/prisma"
import { requireStoreId } from "@/lib/current-store"
import { ServiceCreateSchema } from "@/lib/validators/service"
import { badRequest, created, ok, serverError, unauthorized } from "@/lib/api/response"
import { Prisma } from "@prisma/client"

export async function GET() {
  try {
    const storeId = await requireStoreId()
    if (!storeId) return unauthorized("Selecione uma loja para continuar.")

    const services = await prisma.service.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    })

    return ok(services)
  } catch (e) {
    console.error("[GET /api/services]", e)
    return serverError()
  }
}

export async function POST(req: Request) {
  try {
    const storeId = await requireStoreId()
    if (!storeId) return unauthorized("Selecione uma loja para continuar.")

    const body = await req.json()
    const parsed = ServiceCreateSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map(i => i.message).join(" • ") || "Payload inválido")
    }

    const service = await prisma.service.create({
      data: { storeId, ...parsed.data },
    })

    return created(service)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return badRequest("Já existe um serviço com esse nome nesta loja.")
    }
    console.error("[POST /api/services]", e)
    return serverError()
  }
}
