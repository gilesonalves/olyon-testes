import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

type AuthUser = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'STAFF'
  storeId: string
}


const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials): Promise<AuthUser | null> {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            memberships: true,
          },
        })

        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!passwordMatch) return null

        const membership = user.memberships[0]
        if (!membership) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: membership.role,
          storeId: membership.storeId,
        }
      }
    }),
  ],

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.role = user.role
        token.storeId = user.storeId
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId
        session.user.role = token.role
        session.user.storeId = token.storeId
      }
      return session
    },
  },


  pages: {
    signIn: '/login',
  },
})

export { handler as GET, handler as POST }
