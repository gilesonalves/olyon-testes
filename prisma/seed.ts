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
  // ====== TESTE: Conversation / Message / Draft / Appointment ======
  // Limpa conversas "bugadas" do Studio (id vazio) desta store
  await prisma.conversation.deleteMany({
    where: { storeId: store.id, id: '' },
  })

  // Cria (ou pega) uma conversa real com id gerado (cuid)
  const convo = await prisma.conversation.upsert({
    where: {
      storeId_channel_contact: {
        storeId: store.id,
        channel: 'WHATSAPP',
        contact: '+5527998000000',
      },
    },
    update: { state: 'IDLE' },
    create: {
      storeId: store.id,
      channel: 'WHATSAPP',
      contact: '+5527998000000',
      state: 'IDLE',
    },
  })

  console.log('Conversation criada:', convo.id)

  // Mensagem de entrada (idempotente por storeId + providerMessageId)
  const msg = await prisma.conversationMessage.upsert({
    where: {
      storeId_providerMessageId: {
        storeId: store.id,
        providerMessageId: 'wamid.TESTE-001',
      },
    },
    update: {},
    create: {
      storeId: store.id,
      conversationId: convo.id,
      direction: 'IN',
      providerMessageId: 'wamid.TESTE-001',
      text: 'oi',
      payload: { raw: true },
    },
  })

  console.log('Message criada:', msg.id)

  // Draft
  const draft = await prisma.appointmentDraft.create({
    data: {
      storeId: store.id,
      conversationId: convo.id,
      status: 'DRAFT',
      channel: 'WHATSAPP',
      customerName: 'Cliente Teste',
      customerPhone: '+5527998000000',
      notes: 'Rascunho via seed',
    },
  })

  console.log('Draft criado:', draft.id)

  // Appointment final + link no draft
  const appt = await prisma.appointment.create({
    data: {
      storeId: store.id,
      status: 'SCHEDULED',
      customerName: 'Cliente Teste',
      customerPhone: '+5527998000000',
      startAt: new Date(Date.now() + 60 * 60 * 1000),
      endAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      source: 'WHATSAPP',
      externalRef: 'seed:wamid.TESTE-001',
      metadata: { from: 'seed' },
    },
  })

  await prisma.appointmentDraft.update({
    where: { id: draft.id },
    data: {
      status: 'CONFIRMED',
      appointmentId: appt.id,
    },
  })

  console.log('Appointment criado:', appt.id)
  // ====== FIM TESTE ======
  console.log('Seed finalizado: superadmin@olyon.com (SUPER_ADMIN), admin@olyon.com (OWNER)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
