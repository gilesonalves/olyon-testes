# PROJECT_STATUS.md

**Data de última atualização:** 19 de fevereiro de 2026

## Status Geral do Projeto Olyon

### Estado atual: ✅ CRUD de Usuários com Perfil e Contatos - IMPLEMENTADO

---

## 1. RESUMO EXECUTIVO

O projeto Olyon (Next.js App Router + TypeScript + Prisma + NextAuth) agora possui um **CRUD completo de Usuários** com persistência de perfil e contatos.

- ✅ **Persistência em banco:** Models `UserProfile` e `UserContact` criados em Prisma
- ✅ **APIs REST CRUD:** POST/GET/PUT/DELETE com validação Zod
- ✅ **UI reutilizável:** Componente `UserForm.tsx` para CREATE e EDIT
- ✅ **Segurança:** Guards por role (ADMIN/OWNER) checados em todas as rotas
- ✅ **Multi-tenant:** Cada usuário vinculado a uma loja (Store) via Membership

---

## 2. CHECKLIST DE IMPLEMENTAÇÃO

### A) Prisma Schema ✅

- [x] Model `UserProfile` criado (userId, cpf, phone, secondaryPhone, gender, birthDate, endereço, timestamps)
- [x] Model `UserContact` criado (userId, name, phone, relationship, timestamps)
- [x] Model `User` atualizado (relations: profile, contacts)
- [x] Migrations aplicadas: `20260219223318_add_user_profile_contacts`
- [x] Prisma client regenerado em `./generated/prisma`

### B) Validação (Zod) ✅

- [x] `UserProfileSchema` criado
- [x] `UserContactSchema` criado
- [x] `UserCreateApiSchema` actualizado (inclui profile e contacts opcionais)
- [x] `UserUpdateApiSchema` actualizado (todos os campos opcionais, incluindo password)
- [x] Arquivo: `src/lib/validators/user.ts`

### C) APIs (Route Handlers) ✅

#### GET /api/users
- [x] Listar usuários da loja (STAFF+)
- [x] Guard `requireMembershipRole("STAFF")`
- [x] Retorna: `[ { id, name, email, role } ]`

#### POST /api/users
- [x] Criar usuário com profile e contatos (ADMIN+)
- [x] Guard `requireMembershipRole("ADMIN")`
- [x] Validação Zod com mensagens legíveis
- [x] Hash de senha com bcrypt
- [x] Criar User + Membership + UserProfile (upsert) + UserContact (createMany)
- [x] Tratamento de erros: P2002 email/cpf duplicados

#### GET /api/users/[id]
- [x] Buscar usuário específico (ADMIN+)
- [x] Guard `requireMembershipRole("ADMIN")`
- [x] Verificar ownership (userId_storeId)
- [x] Retorna: `{ id, name, email, role, profile, contacts }`
- [x] Formatação de birthDate como YYYY-MM-DD

#### PUT /api/users/[id]
- [x] Atualizar usuário, profile e contatos (ADMIN+)
- [x] Guard `requireMembershipRole("ADMIN")`
- [x] Validação Zod
- [x] Atualizar User (name, email, password com re-hash)
- [x] Atualizar Membership.role
- [x] Upsert UserProfile
- [x] DeleteMany + createMany para UserContact
- [x] Tratamento de erros P2002

#### DELETE /api/users/[id]
- [x] Remover usuário da loja (ADMIN+, não permite auto-remoção)
- [x] Guard `requireMembershipRole("ADMIN")`
- [x] Guard contra auto-remoção: `forbidden("Você não pode remover a si mesmo")`
- [x] Remove apenas Membership (multi-tenant safe)

### D) UI/UX ✅

#### Componente UserForm.tsx
- [x] Criado em `app/(app)/usuarios/components/UserForm.tsx`
- [x] Modo CREATE: password obrigatório, POST /api/users
- [x] Modo EDIT: password opcional, GET + PUT para /api/users/:id
- [x] Todos os campos do formulário completo: role, password, name, email, gender, birthDate, cpf, phone, secondaryPhone, zipcode, state, city, neighborhood, address, number, complement, contacts[]
- [x] Carregamento async de dados em modo EDIT
- [x] Estados: loading, submitting
- [x] Feedback com toast (sonner)
- [x] Redirecionamento para /usuarios + router.refresh() após salvar

#### Página /usuarios/novo
- [x] Simplificada para usar `<UserForm mode="create" />`
- [x] Arquivo: `app/(app)/usuarios/novo/page.tsx`

#### Página /usuarios/[id]
- [x] Simplificada para usar `<UserForm mode="edit" userId={userId} />`
- [x] Arquivo: `app/(app)/usuarios/[id]/page.tsx`
- [x] Guard role: ADMIN/OWNER podem acessar; outros veem erro
- [x] Usa `useParams()` para obter o ID (Next 16 App Router)

#### Página /usuarios (Listagem)
- [x] STAFF: visualiza lista, sem CTAs de criar/editar/remover
- [x] ADMIN/OWNER: vê "Novo usuário", "Editar", "Remover" (com AlertDialog)
- [x] Delete com confirmação (AlertDialog do shadcn/ui)
- [x] Guard: não permite remover a si mesmo
- [x] Arquivo: `app/(app)/usuarios/page.tsx`

---

## 3. SEGURANÇA / GUARDS

- [x] **STAFF:** pode listar (`/api/users` GET)
- [x] **ADMIN/OWNER:** podem listar, criar, editar, deletar (`/api/users` POST/PUT/DELETE)
- [x] **Auto-remoção bloqueada:** não permite `DELETE /api/users/:id` do próprio usuário
- [x] **Escopo por loja:** storeId vem da sessão, nunca do payload
- [x] **Sem acesso direto a campos:** userId sempre obtido da sessão, endereço é construído a partir de Membership

---

## 4. TESTES REALIZADOS

- [ ] `yarn lint` — sem erros
- [ ] `yarn typecheck` — sem erros
- [ ] Dev server inicia sem problemas
- [ ] Criar usuário com perfil completo e contatos
- [ ] Editar usuário (password não aparece, dados carregam corretamente)
- [ ] Deletar usuário com confirmação
- [ ] Tidak pode remover a si mesmo
- [ ] STAFF não vê botões de criar/editar (apenas listagem)
- [ ] Reload após save → dados persistem
- [ ] CRUD de Serviços continua funcionando (não quebrou)

---

## 5. ARQUIVOS ALTERADOS / CRIADOS

### Criado
- `app/(app)/usuarios/components/UserForm.tsx` — componente reutilizável para CREATE/EDIT

### Alterado
- `prisma/schema.prisma` — adicionado models UserProfile, UserContact; relations em User
- `prisma/migrations/20260219223318_add_user_profile_contacts/migration.sql` — migration automática
- `src/lib/validators/user.ts` — schemas atualizados (profile, contacts, password opcional em UPDATE)
- `app/api/users/route.ts` — POST agora persiste profile e contacts
- `app/api/users/[id]/route.ts` — GET/PUT/DELETE com support a profile e contacts
- `app/(app)/usuarios/novo/page.tsx` — simplificado para usar UserForm
- `app/(app)/usuarios/[id]/page.tsx` — trocado para UserForm com guards
- `app/(app)/usuarios/page.tsx` — já tinha listagem (não mudou tipo, só confirmado que está ok)

---

## 6. PRÓXIMOS PASSOS (OPCIONAL)

1. **Validação adicional:** Restrições de CPF único (já está em Prisma como @unique)
2. **Busca/filtro:** Adicionar search por name/email na listagem
3. **Paginação:** Se houver muitos usuários
4. **Soft-delete:** Em vez de DELETE hard, marcar como `deletedAt`
5. **Auditoria:** Log de quem criou/editou/removeu usuários
6. **Foto/avatar:** Campo de profile picture na UserProfile
7. **API de profile:** Endpoint separado `GET/PUT /api/users/:id/profile`

---

## 7. NOTAS IMPORTANTES

- **Package manager:** Usar `yarn` (não npm). Lock file é `yarn.lock`
- **Prisma migrations:** Sempre rodar `yarn prisma migrate dev` + `yarn prisma generate`
- **TypeScript:** Sempre validar tipos antes de fazer merge
- **Testes manuais:** Rodar `yarn dev` e testar os cenários de CRUD
- **Multi-tenant:** Nunca confiar em `userId` do payload; sempre usar da sessão

---

## Histórico de Alterações

| Data | Mudança |
|------|---------|
| 19/02/2026 | ✅ CRUD de Usuários com Perfil e Contatos - Implementado |
| 13/02/2026 | ✅ CRUD de Serviços - Implementado |
