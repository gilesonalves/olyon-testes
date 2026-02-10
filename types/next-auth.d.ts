import { DefaultSession } from "next-auth"

type MembershipRole = "OWNER" | "ADMIN" | "STAFF"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role?: MembershipRole
      storeId?: string
      globalRole?: string
    }
  }

  interface User {
    id: string
    role?: MembershipRole
    storeId?: string
    globalRole?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string
    role?: MembershipRole
    storeId?: string
    globalRole?: string
  }
}
