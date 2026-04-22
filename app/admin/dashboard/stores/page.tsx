import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth-options"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { StoresTable } from "./components/DeleteStoreDialogButton"

export default async function AdminStoresPage() {
    const session = await getServerSession(authOptions)
    if (!session?.user) redirect("/login")

    if (session.user.globalRole !== SUPER_ADMIN_ROLE) {
        redirect("/login?error=AdminAccessDenied")
    }

    const stores = await prisma.store.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            slug: true,
            active: true,
            createdAt: true,
        },
    })

    const serializedStores = stores.map((store) => ({
        ...store,
        createdAt: store.createdAt.toISOString(),
    }))

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/dashboard"
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        ← Voltar
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold">Lojas</h1>
                        <p className="text-sm text-muted-foreground">
                            Total: {stores.length}
                        </p>
                    </div>
                </div>

                <Link
                    href="/admin/dashboard/stores/new"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    Nova loja
                </Link>
            </header>

            <main className="flex-1 p-6">
                {stores.length === 0 ? (
                    <div className="border border-dashed p-4 text-sm text-muted-foreground">
                        Nenhuma loja cadastrada.
                    </div>
                ) : (
                    <StoresTable stores={serializedStores} />
                )}
            </main>
        </div>
    )
}