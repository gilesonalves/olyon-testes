import { getServerSession } from "next-auth"
import SidebarLayout from "@/components/sidebarLayout"
import { authOptions } from "@/lib/auth-options"
import {
  DEFAULT_STORE_BILLING,
  serializeStoreBilling,
} from "@/lib/billing/store-billing"
import { prisma } from "@/lib/prisma"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const billing = session?.user?.storeId
    ? await prisma.storeBilling.findUnique({
        where: { storeId: session.user.storeId },
      })
    : null

  return (
    <SidebarLayout
      billing={billing ? serializeStoreBilling(billing) : DEFAULT_STORE_BILLING}
    >
      {children}
    </SidebarLayout>
  )
}
