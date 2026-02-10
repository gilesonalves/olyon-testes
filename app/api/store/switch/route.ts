import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function POST(req: NextRequest) {
  const token = await getToken({ req })

  if (!token?.userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { storeId } = await req.json()

  if (!storeId) {
    return NextResponse.json({ error: 'storeId obrigatório' }, { status: 400 })
  }

  // Aqui no futuro você pode atualizar sessão, cookie, etc
  return NextResponse.json({ success: true })
}
