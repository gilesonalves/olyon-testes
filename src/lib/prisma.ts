import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL nao definida")
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool, { disposeExternalPool: true })

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

globalForPrisma.prisma = prisma

export * from "../../generated/prisma/client"
