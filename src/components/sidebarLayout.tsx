import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"
import { StoreBillingBanner } from "@/components/billing/store-billing-banner"
import type { StoreBillingSnapshot } from "@/lib/billing/store-billing"

export default function SidebarLayout({
  children,
  billing,
}: {
  children: React.ReactNode
  billing: StoreBillingSnapshot
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full min-w-0 max-w-full overflow-x-hidden">
        <AppSidebar operationalStatus={billing.operationalStatus} />

        <SidebarInset className="bg-white">
          <StoreBillingBanner billing={billing} />
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
