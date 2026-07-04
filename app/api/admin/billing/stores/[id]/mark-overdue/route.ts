import {
  getAdminStoreBilling,
  handleAdminBillingMutation,
} from "@/lib/admin/store-billing"
import { requireSuperAdminApiAccess } from "@/lib/admin/require-super-admin"
import { markStoreBillingOverdueSchema } from "@/lib/billing/store-billing"
import { StoreBillingStatus, prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: RouteContext) {
  const authError = await requireSuperAdminApiAccess()
  if (authError) {
    return authError
  }

  const { id: storeId } = await params
  const parsed = markStoreBillingOverdueSchema.safeParse(
    await req.json().catch(() => undefined)
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

  return handleAdminBillingMutation("mark-overdue", storeId, async () => {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    })

    if (!store) {
      return Response.json(
        { ok: false, error: "Loja nao encontrada." },
        { status: 404 }
      )
    }

    await prisma.storeBilling.upsert({
      where: { storeId },
      create: {
        storeId,
        status: StoreBillingStatus.OVERDUE,
        currentPeriod: parsed.data.period,
        notes: parsed.data.notes,
      },
      update: {
        status: StoreBillingStatus.OVERDUE,
        ...(parsed.data.period !== undefined
          ? { currentPeriod: parsed.data.period }
          : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: parsed.data.notes }
          : {}),
      },
    })

    return Response.json({
      ok: true,
      data: await getAdminStoreBilling(storeId),
    })
  })
}
