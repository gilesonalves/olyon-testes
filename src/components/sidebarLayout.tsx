import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"
 
export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-screen">
        <AppSidebar />

        <SidebarInset className="bg-white">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}