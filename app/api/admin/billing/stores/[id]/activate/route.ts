import {
  getAdminStoreBilling,
  handleAdminBillingMutation,
} from "@/lib/admin/store-billing"
import { requireSuperAdminApiAccess } from "@/lib/admin/require-super-admin"
import { changeStoreOperationalStatusSchema } from "@/lib/billing/store-billing"
import { StoreOperationalStatus, prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: RouteContext) {
  const authError = await requireSuperAdminApiAccess()
  if (authError) {
    return authError
  }

  const { id: storeId } = await params
  const parsed = changeStoreOperationalStatusSchema.safeParse(
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

  return handleAdminBillingMutation("activate", storeId, async () => {
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
        operationalStatus: StoreOperationalStatus.ACTIVE,
        notes: parsed.data.notes,
      },
      update: {
        operationalStatus: StoreOperationalStatus.ACTIVE,
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
