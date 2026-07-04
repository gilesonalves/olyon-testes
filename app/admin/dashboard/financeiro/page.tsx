import { getServerSession } from "next-auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { BillingAdmin } from "./billing-admin"
import { authOptions } from "@/lib/auth-options"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"

export default async function AdminBillingPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.globalRole !== SUPER_ADMIN_ROLE) {
    redirect("/login?error=AdminAccessDenied")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-background px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href="/admin/dashboard"
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Financeiro das lojas</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Controle manual de assinatura, pagamentos e suspensão.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6">
        <BillingAdmin />
      </main>
    </div>
  )
}
