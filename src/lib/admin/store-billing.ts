import { MembershipRole, Prisma, prisma } from "@/lib/prisma"

const adminStoreBillingSelect = {
  id: true,
  name: true,
  slug: true,
  active: true,
  billing: true,
  memberships: {
    where: { role: MembershipRole.OWNER },
    take: 1,
    select: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
} satisfies Prisma.StoreSelect

type AdminStoreBillingRecord = Prisma.StoreGetPayload<{
  select: typeof adminStoreBillingSelect
}>

export function serializeAdminStoreBilling(store: AdminStoreBillingRecord) {
  const owner = store.memberships[0]?.user ?? null

  return {
    storeId: store.id,
    name: store.name,
    slug: store.slug,
    active: store.active,
    billingStatus: store.billing?.status ?? "PENDING",
    operationalStatus: store.billing?.operationalStatus ?? "ACTIVE",
    monthlyAmount:
      store.billing?.monthlyAmount === null ||
      store.billing?.monthlyAmount === undefined
        ? null
        : Number(store.billing.monthlyAmount),
    dueDay: store.billing?.dueDay ?? null,
    currentPeriod: store.billing?.currentPeriod ?? null,
    lastPaidAt: store.billing?.lastPaidAt?.toISOString() ?? null,
    nextDueAt: store.billing?.nextDueAt?.toISOString() ?? null,
    notes: store.billing?.notes ?? null,
    configured: Boolean(store.billing),
    owner,
  }
}

export async function listAdminStoreBilling() {
  const stores = await prisma.store.findMany({
    orderBy: { name: "asc" },
    select: adminStoreBillingSelect,
  })

  return stores.map(serializeAdminStoreBilling)
}

export async function getAdminStoreBilling(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: adminStoreBillingSelect,
  })

  return store ? serializeAdminStoreBilling(store) : null
}

export async function handleAdminBillingMutation(
  operation: string,
  storeId: string,
  callback: () => Promise<Response>
) {
  try {
    return await callback()
  } catch {
    console.error("admin billing mutation failed", { operation, storeId })
    return Response.json(
      { ok: false, error: "Nao foi possivel atualizar o financeiro da loja." },
      { status: 500 }
    )
  }
}
