import { StoreOperationalStatus, prisma } from "@/lib/prisma"

export const STORE_SUSPENDED_ERROR =
  "Sua loja esta suspensa. Acesse Financeiro para consultar a assinatura."

export async function isStoreSuspended(storeId: string): Promise<boolean> {
  const billing = await prisma.storeBilling.findUnique({
    where: { storeId },
    select: { operationalStatus: true },
  })

  return billing?.operationalStatus === StoreOperationalStatus.SUSPENDED
}
