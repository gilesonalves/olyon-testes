import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Role } from '../generated/prisma/client'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'admin@olyon.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@olyon.com',
      password: passwordHash,
    },
  })

  const store = await prisma.store.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      name: 'Loja Principal',
    },
  })

  await prisma.membership.upsert({
    where: {
      userId_storeId: {
        userId: user.id,
        storeId: store.id,
      },
    },
    update: {
      role: Role.ADMIN,
    },
    create: {
      userId: user.id,
      storeId: store.id,
      role: Role.ADMIN,
    },
  })

  console.log('Seed finalizado com sucesso')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
