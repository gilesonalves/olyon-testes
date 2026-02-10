import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-options"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.globalRole === SUPER_ADMIN_ROLE) {
    redirect("/admin/dashboard")
  }

  if (session.user.storeId) {
    redirect("/dashboard")
  }

  redirect("/login")
}
