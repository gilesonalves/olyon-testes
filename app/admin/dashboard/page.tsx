import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth-options"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  if (session.user.globalRole !== SUPER_ADMIN_ROLE) {
    redirect("/login?error=AdminAccessDenied")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Olyon Admin</h1>
          <p className="text-sm text-muted-foreground">
            Logado como {session.user.email}
          </p>
        </div>
        <Link
          href="/api/auth/signout?callbackUrl=/login"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sair
        </Link>
      </header>

      <main className="flex-1 p-6">
        <h2 className="text-lg font-medium mb-2">Dashboard</h2>
        <p className="text-muted-foreground mb-4">
          Painel administrativo. (Em breve: usuarios, planos.)
        </p>
        <Link
          href="/admin/dashboard/stores/new"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Nova loja
        </Link>
      </main>
    </div>
  )
}
