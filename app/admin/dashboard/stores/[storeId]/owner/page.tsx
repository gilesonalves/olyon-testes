import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-options"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"
import { NewOwnerForm } from "./owner-form"

type OwnerPageProps = {
  params: Promise<{ storeId: string }>
}

export default async function OwnerPage({ params }: OwnerPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.globalRole !== SUPER_ADMIN_ROLE) {
    redirect("/login?error=AdminAccessDenied")
  }

  const { storeId } = await params

  return <NewOwnerForm storeId={storeId} />
}
