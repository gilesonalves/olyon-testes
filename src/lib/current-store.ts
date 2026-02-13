import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

export async function requireStoreId(): Promise<string | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.storeId) {
    return null
  }

  return session.user.storeId
}