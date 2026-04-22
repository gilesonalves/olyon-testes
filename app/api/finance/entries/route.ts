import { Prisma, prisma } from "@/lib/prisma"
import { requireStoreId } from "@/lib/current-store"
import { FinanceEntryCreateSchema } from "@/lib/validators/finance-entry"
import {
  badRequest,
  created,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"

export async function GET() {
  try {
    const storeId = await requireStoreId()
    if (!storeId) return unauthorized("Selecione uma loja para continuar.")

    const items = await prisma.financeEntry.findMany({
      where: { storeId },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    })

    return ok({ items })
  } catch (e) {
    console.error("[GET /api/finance/entries]", e)
    return serverError()
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireMembershipRole("ADMIN")
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error)
    }

    const body = await req.json()
    const parsed = FinanceEntryCreateSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((issue) => issue.message).join(" • ") || "Payload inválido"
      )
    }

    const item = await prisma.financeEntry.create({
      data: {
        storeId: guard.storeId,
        createdById: guard.userId,
        type: parsed.data.type,
        status: parsed.data.status ?? "PENDING",
        amount: new Prisma.Decimal(parsed.data.amount),
        category: parsed.data.category,
        description: parsed.data.description,
        transactionDate: parsed.data.transactionDate,
        dueDate: parsed.data.dueDate,
      },
    })

    return created({ item })
  } catch (e) {
    console.error("[POST /api/finance/entries]", e)
    return serverError()
  }
}
