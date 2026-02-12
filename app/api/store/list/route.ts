import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = await getToken({ req })

  if (!token?.userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: token.userId, store: { active: true } },
    include: { store: true },
  })

  const stores = memberships.map((m) => m.store)

  return NextResponse.json(stores)
}
