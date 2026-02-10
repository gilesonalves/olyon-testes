import SidebarLayout from "@/components/sidebarLayout"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SidebarLayout>{children}</SidebarLayout>
}
