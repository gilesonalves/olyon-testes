import { DefaultSession } from 'next-auth'

// Roles de membership (olyon-app). SUPER_ADMIN não tem membership.
type MembershipRole = 'OWNER' | 'ADMIN' | 'STAFF'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      role: MembershipRole
      storeId: string
    }
  }

  interface User {
    id: string
    role: MembershipRole
    storeId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    role: MembershipRole
    storeId: string
  }
}
