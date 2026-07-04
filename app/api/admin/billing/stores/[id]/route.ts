import {
  getAdminStoreBilling,
  handleAdminBillingMutation,
} from "@/lib/admin/store-billing"
import { requireSuperAdminApiAccess } from "@/lib/admin/require-super-admin"
import { calculateNextDueAt } from "@/lib/billing/due-date"
import { updateStoreBillingSchema } from "@/lib/billing/store-billing"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const authError = await requireSuperAdminApiAccess()
  if (authError) {
    return authError
  }

  const { id: storeId } = await params
  const parsed = updateStoreBillingSchema.safeParse(
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

  return handleAdminBillingMutation("update-settings", storeId, async () => {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        billing: {
          select: { dueDay: true },
        },
      },
    })

    if (!store) {
      return Response.json(
        { ok: false, error: "Loja nao encontrada." },
        { status: 404 }
      )
    }

    const dueDay =
      parsed.data.dueDay !== undefined
        ? parsed.data.dueDay
        : store.billing?.dueDay ?? null
    const data = {
      ...(parsed.data.monthlyAmount !== undefined
        ? { monthlyAmount: parsed.data.monthlyAmount }
        : {}),
      dueDay,
      nextDueAt: dueDay === null ? null : calculateNextDueAt(dueDay),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    }

    await prisma.storeBilling.upsert({
      where: { storeId },
      create: {
        storeId,
        ...data,
      },
      update: data,
    })

    return Response.json({
      ok: true,
      data: await getAdminStoreBilling(storeId),
    })
  })
}
