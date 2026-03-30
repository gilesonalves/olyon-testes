import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient, Prisma } from "../../generated/prisma/client"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL não definida")
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  })
}

// Temporariamente evitamos o cache global em desenvolvimento para validar
// se o processo do Next estava reutilizando uma instância stale do client.
export const prisma =
  process.env.NODE_ENV === "production"
    ? ((globalThis as unknown as { prisma?: PrismaClient }).prisma ?? createPrismaClient())
    : createPrismaClient()

if (process.env.NODE_ENV === "production") {
  ;(globalThis as unknown as { prisma?: PrismaClient }).prisma = prisma
}

export { Prisma }