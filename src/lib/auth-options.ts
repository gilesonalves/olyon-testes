import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { MembershipRole } from "@/lib/auth"

type AuthUser = {
  id: string
  name?: string | null
  email?: string | null
  role?: MembershipRole
  storeId?: string
  globalRole?: string
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials): Promise<AuthUser | null> {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.trim().toLowerCase()

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: { include: { store: true } },
          },
        })

        if (!user) {
          console.warn("nextauth credentials user not found", { email })
          return null
        }

        if (!user.password?.trim()) {
          console.warn("nextauth credentials missing password hash", {
            userId: user.id,
          })
          return null
        }

        let passwordMatch = false
        try {
          passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          )
        } catch {
          console.warn("nextauth credentials invalid password", {
            userId: user.id,
          })
          return null
        }

        if (!passwordMatch) {
          console.warn("nextauth credentials invalid password", {
            userId: user.id,
          })
          return null
        }

        if (user.globalRole === "SUPER_ADMIN") {
          console.info("nextauth credentials success", {
            userId: user.id,
            globalRole: user.globalRole,
          })
          return {
            id: user.id,
            email: user.email ?? undefined,
            name: user.name,
            globalRole: user.globalRole ?? undefined,
          }
        }

        if (user.memberships.length === 0) {
          console.warn("nextauth credentials user without membership", {
            userId: user.id,
          })
          return null
        }

        const activeMembership = user.memberships.find((m) => m.store.active)
        if (!activeMembership) {
          console.warn("nextauth credentials inactive store", {
            userId: user.id,
          })
          return null
        }

        console.info("nextauth credentials success", {
          userId: user.id,
          storeId: activeMembership.storeId,
          role: activeMembership.role,
        })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: activeMembership.role as MembershipRole,
          storeId: activeMembership.storeId,
          globalRole: user.globalRole ?? undefined,
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.globalRole = user.globalRole ?? undefined
        token.role = user.role
        token.storeId = user.storeId
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId
        session.user.email = token.email ?? ""
        session.user.globalRole = token.globalRole
        session.user.role = token.role
        session.user.storeId = token.storeId
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
  },
}
