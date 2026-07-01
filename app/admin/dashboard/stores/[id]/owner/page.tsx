import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-options"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"
import { MembershipRole, prisma } from "@/lib/prisma"
import { NewOwnerForm } from "./owner-form"
import { OwnerManagement } from "./owner-management"

type OwnerPageProps = {
  params: Promise<{ id: string }>
}

export default async function OwnerPage({ params }: OwnerPageProps) {
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
      memberships: {
        where: { role: MembershipRole.OWNER },
        select: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: 1,
      },
    },
  })

  if (!store) {
    return (
      <div className="p-6">
        <p>Loja não encontrada.</p>
      </div>
    )
  }

  const ownerMembership = store.memberships[0]

  if (!ownerMembership) {
    return <NewOwnerForm storeId={store.id} />
  }

  return (
    <OwnerManagement
      storeId={store.id}
      storeName={store.name}
      initialOwner={{
        userId: ownerMembership.user.id,
        name: ownerMembership.user.name,
        email: ownerMembership.user.email,
        role: "OWNER",
      }}
    />
  )
}
