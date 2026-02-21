# PROJECT_STATUS.md

**Data de última atualização:** 20 de fevereiro de 2026

## Status Geral do Projeto Olyon

### Estado atual: ✅ CRUD de Usuários + ✅ CRUD de Serviços - IMPLEMENTADOS

---

## 1. RESUMO EXECUTIVO

O projeto Olyon (Next.js App Router + TypeScript + Prisma + NextAuth) possui agora:

- ✅ **CRUD completo de Usuários** com persistência de **perfil** e **contatos**
- ✅ **CRUD completo de Serviços** com persistência por loja (multi-tenant)
- ✅ **Segurança por role e loja:** Guards aplicados em todas as rotas
- ✅ **Padrão consistente:** Route Handlers + Zod + respostas padronizadas + UI list/create/edit/delete

---

## 2. CHECKLIST DE IMPLEMENTAÇÃO

### A) Usuários — ✅ Concluído

#### Prisma
- [x] Model `UserProfile` criado (userId, cpf unique opcional, campos de perfil, timestamps)
- [x] Model `UserContact` criado (userId, name, phone, relationship, timestamps)
- [x] Model `User` atualizado (relations: profile, contacts)
- [x] Migrations aplicadas: `20260219223318_add_user_profile_contacts`
- [x] Prisma client regenerado em `./generated/prisma`

#### Validação (Zod)
- [x] `UserProfileSchema` criado
- [x] `UserContactSchema` criado
- [x] `UserCreateApiSchema` atualizado (inclui profile/contacts)
- [x] `UserUpdateApiSchema` atualizado (campos opcionais, password opcional)
- [x] Arquivo: `src/lib/validators/user.ts`

#### APIs (Route Handlers)
- [x] GET `/api/users` (STAFF+) — lista usuários da loja
- [x] POST `/api/users` (ADMIN+) — cria usuário + membership + profile + contacts
- [x] GET `/api/users/[id]` (ADMIN+) — lê usuário por loja
- [x] PUT `/api/users/[id]` (ADMIN+) — atualiza user + role + upsert profile + replace contacts
- [x] DELETE `/api/users/[id]` (ADMIN+) — remove membership (bloqueia auto-remoção)

#### UI/UX
- [x] `/usuarios` listagem: STAFF vê lista; ADMIN/OWNER vê ações
- [x] `/usuarios/novo`: create via `<UserForm mode="create" />`
- [x] `/usuarios/[id]`: edit via `<UserForm mode="edit" userId=... />`
- [x] Correção importante: no edit, enviar `contacts: []` permite remover todos os contatos

---

### B) Serviços — ✅ Concluído

- [x] Model `Service` com `storeId` e timestamps
- [x] Migrations aplicadas + prisma generate
- [x] Validators Zod (`lib/validators/service.ts`)
- [x] APIs:
  - [x] GET/POST `/api/services`
  - [x] PUT/DELETE `/api/services/[id]`
- [x] UI `/servicos` integrada com API real (sem mock)
- [x] Testes manuais: create/list/edit/delete + refresh

---

## 3. SEGURANÇA / GUARDS

- [x] **STAFF:** pode listar usuários/serviços (rotas de leitura)
- [x] **ADMIN/OWNER:** podem criar/editar/remover (mutations)
- [x] **Auto-remoção bloqueada:** não permite remover a si mesmo da loja
- [x] **Escopo por loja:** storeId vem sempre da sessão (nunca do payload)

---

## 4. TESTES REALIZADOS

- [x] `yarn lint`
- [x] `yarn typecheck`
- [x] Dev server inicia sem problemas
- [x] Usuários: criar, editar (sem mudar senha), editar (mudando senha), deletar (com confirmação), bloquear auto-remoção
- [x] Usuários: remover todos os contatos no edit (persistindo vazio)
- [x] Serviços: create/list/edit/delete + refresh

---

## 5. ARQUIVOS ALTERADOS / CRIADOS (alto nível)

### Usuários
- `app/(app)/usuarios/**`
- `app/api/users/**`
- `src/lib/validators/user.ts`
- `prisma/schema.prisma`
- `prisma/migrations/**`

### Serviços
- `app/(app)/servicos/**`
- `app/api/services/**`
- `src/lib/validators/service.ts`
- `prisma/schema.prisma`
- `prisma/migrations/**`

---

## 6. PRÓXIMOS PASSOS (PRIORIDADE)

1) **CRUD de Equipe**
2) **CRUD de Eventos**
3) **CRUD de Horários**
4) **Financeiro**
5) **Usuários (extras): busca/filtro, paginação, auditoria, soft-delete**

---

## Histórico de Alterações

| Data | Mudança |
|------|---------|
| 20/02/2026 | ✅ Ajustes finais no CRUD de Usuários + consolidação de status |
| 19/02/2026 | ✅ CRUD de Usuários com Perfil e Contatos - Implementado |
| 13/02/2026 | ✅ CRUD de Serviços - Implementado |