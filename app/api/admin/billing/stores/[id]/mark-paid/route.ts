import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import {
  getAdminStoreBilling,
  handleAdminBillingMutation,
} from "@/lib/admin/store-billing"
import { requireSuperAdminApiAccess } from "@/lib/admin/require-super-admin"
import { calculateNextCycleDueAt } from "@/lib/billing/due-date"
import { markStoreBillingPaidSchema } from "@/lib/billing/store-billing"
import {
  StoreBillingStatus,
  StoreOperationalStatus,
  prisma,
} from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: RouteContext) {
  const authError = await requireSuperAdminApiAccess()
  if (authError) {
    return authError
  }

  const session = await getServerSession(authOptions)
  const { id: storeId } = await params
  const parsed = markStoreBillingPaidSchema.safeParse(
    await req.json().catch(() => null)
  )

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados invalidos.",
      },
      { status: 400 }
    )
  }

  return handleAdminBillingMutation("mark-paid", storeId, async () => {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        billing: {
          select: {
            monthlyAmount: true,
            dueDay: true,
          },
        },
      },
    })

    if (!store) {
      return Response.json(
        { ok: false, error: "Loja nao encontrada." },
        { status: 404 }
      )
    }

    const paidAt = new Date(parsed.data.paidAt)
    const amount =
      parsed.data.amount === undefined
        ? store.billing?.monthlyAmount ?? null
        : parsed.data.amount
    const nextDueAt = store.billing?.dueDay
      ? calculateNextCycleDueAt(parsed.data.period, store.billing.dueDay)
      : null

    await prisma.$transaction([
      prisma.storeBillingPayment.create({
        data: {
          storeId,
          period: parsed.data.period,
          amount,
          paidAt,
          notes: parsed.data.notes,
          createdById: session?.user?.id ?? null,
        },
      }),
      prisma.storeBilling.upsert({
        where: { storeId },
        create: {
          storeId,
          status: StoreBillingStatus.PAID,
          operationalStatus: StoreOperationalStatus.ACTIVE,
          currentPeriod: parsed.data.period,
          lastPaidAt: paidAt,
          nextDueAt,
          notes: parsed.data.notes,
        },
        update: {
          status: StoreBillingStatus.PAID,
          currentPeriod: parsed.data.period,
          lastPaidAt: paidAt,
          nextDueAt,
          ...(parsed.data.notes !== undefined
            ? { notes: parsed.data.notes }
            : {}),
          ...(parsed.data.reactivate
            ? { operationalStatus: StoreOperationalStatus.ACTIVE }
            : {}),
        },
      }),
    ])

    return Response.json({
      ok: true,
      data: await getAdminStoreBilling(storeId),
    })
  })
}
