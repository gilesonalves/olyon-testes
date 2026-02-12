import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, GlobalRole, MembershipRole } from '../generated/prisma/client'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10)

  // SUPER_ADMIN: acesso exclusivo ao olyon-admin (sem membership)
  await prisma.user.upsert({
    where: { email: 'superadmin@olyon.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@olyon.com',
      password: passwordHash,
      globalRole: GlobalRole.SUPER_ADMIN,
    },
  })

  // Usuário OWNER da loja (acesso ao olyon-app)
  const owner = await prisma.user.upsert({
    where: { email: 'admin@olyon.com' },
    update: {},
    create: {
      name: 'Admin Loja',
      email: 'admin@olyon.com',
      password: passwordHash,
    },
  })

  const store = await prisma.store.upsert({
    where: { id: 'store-loja-principal' },
    update: {},
    create: {
      id: 'store-loja-principal',
      name: 'Loja Principal',
      slug: 'loja-principal',
      active: true,
    },
  })

  await prisma.membership.upsert({
    where: {
      userId_storeId: {
        userId: owner.id,
        storeId: store.id,
      },
    },
    update: { role: MembershipRole.OWNER },
    create: {
      userId: owner.id,
      storeId: store.id,
      role: MembershipRole.OWNER,
    },
  })

  console.log('Seed finalizado: superadmin@olyon.com (SUPER_ADMIN), admin@olyon.com (OWNER)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
