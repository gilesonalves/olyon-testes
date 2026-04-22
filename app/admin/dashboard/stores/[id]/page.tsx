import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth-options"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toStorePublicInfoFormValues } from "@/lib/store/public-info"
import { StorePublicInfoForm } from "./store-public-info-form"
import { StoreWhatsAppConnectionForm } from "./store-whatsapp-connection-form"
import { whatsAppConnectionEditableSelect } from "@/lib/whatsapp/admin-connection"

type Props = {
  params: Promise<{ id: string }>
}

export default async function AdminStoreDetailsPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  if (session.user.globalRole !== SUPER_ADMIN_ROLE) {
    redirect("/login?error=AdminAccessDenied")
  }

  const { id } = await params

  if (!id) {
    redirect("/admin/dashboard/stores")
  }

  const store = await prisma.store.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      phone: true,
      whatsappPhone: true,
      address: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true,
      zipcode: true,
      serviceObservations: true,
      businessHoursSummary: true,
      WhatsAppConnection: {
        select: whatsAppConnectionEditableSelect,
      },
      createdAt: true,
      memberships: {
        where: { role: "OWNER" }, // se quiser tipar com enum depois, ajustamos
        select: {
          id: true,
          role: true,
          user: {
            select: { id: true, name: true, email: true, createdAt: true },
          },
        },
        take: 1,
      },
    },
  })

  if (!store) {
    return (
      <div className="p-6">
        <Link className="text-sm underline" href="/admin/dashboard/stores">
          ← Voltar
        </Link>
        <p className="mt-4">Loja não encontrada.</p>
      </div>
    )
  }

  const owner = store.memberships[0]?.user ?? null
  const initialConnection = store.WhatsAppConnection

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard/stores"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{store.name}</h1>
            <p className="text-sm text-muted-foreground">{store.slug}</p>
          </div>
        </div>

        <Link
          href={`/admin/dashboard/stores/${store.id}/owner`}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 border"
        >
          Gerenciar owner
        </Link>
      </header>

      <main className="flex-1 p-6 space-y-6">
        <div className="border rounded-lg p-4 space-y-2">
          <div>
            <b>ID:</b> {store.id}
          </div>
          <div>
            <b>Status:</b> {store.active ? "Ativa" : "Inativa"}
          </div>
          <div>
            <b>Criada em:</b> {new Date(store.createdAt).toLocaleString("pt-BR")}
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <h2 className="font-semibold">Informacoes publicas da loja</h2>
            <p className="text-sm text-muted-foreground">
              Esses dados alimentam a opcao 3 do menu do WhatsApp.
            </p>
          </div>

          <StorePublicInfoForm
            storeId={store.id}
            initialValues={toStorePublicInfoFormValues(store)}
          />
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <h2 className="font-semibold">Conexao WhatsApp</h2>
            <p className="text-sm text-muted-foreground">
              Configuracao tecnica da integracao Meta/WhatsApp desta loja.
            </p>
          </div>

          <StoreWhatsAppConnectionForm
            storeId={store.id}
            initialConnection={initialConnection}
          />
        </div>

        <div className="border rounded-lg p-4 space-y-2">
          <h2 className="font-semibold">Owner (dono)</h2>
          {owner ? (
            <>
              <div>
                <b>Nome:</b> {owner.name}
              </div>
              <div>
                <b>Email:</b> {owner.email}
              </div>
              <div>
                <b>User ID:</b> {owner.id}
              </div>
              <div>
                <b>Criado em:</b> {new Date(owner.createdAt).toLocaleString("pt-BR")}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum owner encontrado para esta loja.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
