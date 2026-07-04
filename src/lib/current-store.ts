import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import {
  isStoreSuspended,
  STORE_SUSPENDED_ERROR,
} from "@/lib/billing/access"

export async function requireStoreId(
  options: { allowSuspended?: boolean } = {}
): Promise<string | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.storeId) {
    return null
  }

  if (
    !options.allowSuspended &&
    (await isStoreSuspended(session.user.storeId))
  ) {
    throw new Error(STORE_SUSPENDED_ERROR)
  }

  return session.user.storeId
}
