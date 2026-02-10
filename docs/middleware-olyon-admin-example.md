# Middleware do olyon-admin (exemplo)

Quando você criar o projeto **olyon-admin**, use um middleware que:

1. Exige autenticação.
2. Permite **apenas** usuários com `globalRole === 'SUPER_ADMIN'`.

Exemplo (Next.js middleware no olyon-admin):

```ts
// middleware.ts (no olyon-admin)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { canAccessAdmin } from '@/lib/auth' // ou copie a lógica de auth.ts

export async function middleware(req: NextRequest) {
  const token = await getToken({ req })

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = token.role as string | undefined
  // No admin, o token.role deve vir do User.globalRole (SUPER_ADMIN)
  if (!canAccessAdmin(role)) {
    return NextResponse.redirect(new URL('/login?error=AdminAccessDenied', req.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/((?!login|_next|api/auth).*)'] }
```

No **NextAuth do olyon-admin**, no `authorize`:

- Buscar usuário por email.
- Validar senha.
- **Só permitir login se** `user.globalRole === 'SUPER_ADMIN'`.
- Retornar no token/session: `role: 'SUPER_ADMIN'` (e não preencher `storeId`).

Assim, o isolamento fica garantido: SUPER_ADMIN só entra no admin; usuários de loja só entram no app.
