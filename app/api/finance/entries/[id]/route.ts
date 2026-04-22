import { prisma } from "@/lib/prisma"
import { FinanceEntryUpdateSchema } from "@/lib/validators/finance-entry"
import { badRequest, notFound, ok, serverError, unauthorized, forbidden } from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { Prisma } from "../../../../../generated/prisma/client"

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
    const existing = await prisma.financeEntry.findFirst({
      where: { id, storeId: guard.storeId },
    })

    if (!existing) {
      return notFound("Lançamento financeiro não encontrado")
    }

    const body = await req.json()
    const parsed = FinanceEntryUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Payload inválido")
    }

    const item = await prisma.financeEntry.update({
      where: { id },
      data: {
        ...parsed.data,
        amount:
          parsed.data.amount !== undefined ? new Prisma.Decimal(parsed.data.amount) : undefined,
        paidAt: parsed.data.paidAt,
      },
    })

    return ok({ item })
  } catch (e) {
    console.error("[PUT /api/finance/entries/[id]]", e)
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
    const existing = await prisma.financeEntry.findFirst({
      where: { id, storeId: guard.storeId },
    })

    if (!existing) {
      return notFound("Lançamento financeiro não encontrado")
    }

    await prisma.financeEntry.delete({ where: { id } })

    return ok({ success: true })
  } catch (e) {
    console.error("[DELETE /api/finance/entries/[id]]", e)
    return serverError()
  }
}