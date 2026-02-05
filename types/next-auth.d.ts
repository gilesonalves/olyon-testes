import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      role: 'ADMIN' | 'STAFF'
      storeId: string
    }
  }

  interface User {
    id: string
    role: 'ADMIN' | 'STAFF'
    storeId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    role: 'ADMIN' | 'STAFF'
    storeId: string
  }
}
