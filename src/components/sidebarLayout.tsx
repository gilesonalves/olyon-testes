import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"
 
export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full min-w-0 max-w-full overflow-x-hidden">
        <AppSidebar />

        <SidebarInset className="bg-white">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
