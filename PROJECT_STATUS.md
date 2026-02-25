# PROJECT_STATUS.md

**Data de última atualização:** 25 de fevereiro de 2026

## Status Geral do Projeto Olyon

### Estado atual: ✅ CRUD de Usuários + ✅ CRUD de Serviços + ✅ CRUD de Equipe + ✅ CRUD de Eventos (com serviços)

---

## 1. RESUMO EXECUTIVO

O projeto Olyon (Next.js App Router + TypeScript + Prisma + NextAuth) possui agora:

- ✅ **CRUD completo de Usuários** com persistência de **perfil** e **contatos**
- ✅ **CRUD completo de Serviços** com persistência por loja (multi-tenant)
- ✅ **CRUD completo de Equipe** (Membership + tipos + serviços)
- ✅ **CRUD completo de Eventos** com:
  - persistência real
  - ativar/desativar (active)
  - deletar
  - vínculo com **serviços** (seleção no modal e persistência via tabela de relação)
- ✅ **Segurança por role e loja:** Guards aplicados em todas as rotas
- ✅ **Padrão consistente:** Route Handlers + Zod + respostas padronizadas + UI list/create/edit/delete
- ✅ **Admin (SUPER_ADMIN):** criação de dono/admin já define senha inicial (melhora UX e elimina senha “oculta”)

---

## 2. CHECKLIST DE IMPLEMENTAÇÃO

### A) Usuários — ✅ Concluído

#### Prisma
- [x] Model `UserProfile` criado (userId, cpf unique opcional, campos de perfil, timestamps)
- [x] Model `UserContact` criado (userId, name, phone, relationship, timestamps)
- [x] Model `User` atualizado (relations: profile, contacts)
- [x] Prisma client regenerado em `./generated/prisma`

#### Validação (Zod)
- [x] Schemas nested (profile/contacts) em `src/lib/validators/user.ts`

#### APIs (Route Handlers)
- [x] GET `/api/users` (STAFF+)
- [x] POST `/api/users` (ADMIN+)
- [x] GET `/api/users/[id]` (ADMIN+)
- [x] PUT `/api/users/[id]` (ADMIN+)
- [x] DELETE `/api/users/[id]` (ADMIN+)

#### UI/UX
- [x] `/usuarios` listagem
- [x] `/usuarios/novo` create
- [x] `/usuarios/[id]` edit
- [x] Correção: enviar `contacts: []` permite remover todos os contatos

---

### B) Serviços — ✅ Concluído

- [x] Model `Service` com `storeId` e timestamps
- [x] Validators Zod (`lib/validators/service.ts`)
- [x] APIs:
  - [x] GET/POST `/api/services`
  - [x] PUT/DELETE `/api/services/[id]`
- [x] UI `/servicos` integrada com API real (sem mock)
- [x] Testes manuais: create/list/edit/delete + refresh

---

### C) Equipe — ✅ Concluído

- [x] Persistência via Membership (storeId + userId + role)
- [x] Tabelas auxiliares:
  - [x] `MembershipTypeLink` (tipos extras)
  - [x] `MembershipService` (serviços do profissional)
- [x] APIs:
  - [x] GET `/api/team` (STAFF+)
  - [x] POST `/api/team` (ADMIN+)
  - [x] GET `/api/team/[id]` (STAFF+)
  - [x] PUT `/api/team/[id]` (ADMIN+)
  - [x] DELETE `/api/team/[id]` (ADMIN+)
- [x] UI integrada: list/create/edit/delete + refresh

---

### D) Eventos — ✅ Concluído

#### Prisma
- [x] Model `Event` com `storeId`, `active`, timestamps
- [x] Relação Event ↔ Service via tabela de junção (`EventService`)
- [x] Prisma client regenerado em `./generated/prisma`

#### Validação (Zod)
- [x] `EventCreateSchema` (inclui `serviceIds`)
- [x] `EventUpdateSchema` (inclui `active` e opcional `serviceIds`)
- [x] Re-export correto em `app/(app)/eventos/schemas/index.ts`

#### APIs (Route Handlers)
- [x] GET `/api/events` (STAFF+) — lista por storeId
- [x] POST `/api/events` (ADMIN+) — cria evento + vincula services
- [x] GET `/api/events/[id]` (STAFF+) — por loja
- [x] PUT `/api/events/[id]` (ADMIN+) — atualiza `active` e (quando enviado) sincroniza services
- [x] DELETE `/api/events/[id]` (ADMIN+) — remove evento por loja
- [x] Correção importante: handler `[id]` resiliente para obter `id` (fallback) evitando falha por `params` indefinido

#### UI/UX
- [x] `/eventos` listagem real (GET)
- [x] Modal “Novo item” cria evento real (POST)
- [x] Serviços no modal carregam de `/api/services` e persistem no evento
- [x] Toggle “Habilitar” (PUT active)
- [x] Deletar (DELETE)
- [x] Testes manuais: create/list/toggle/delete + refresh

---

## 3. SEGURANÇA / GUARDS

- [x] **STAFF:** pode listar (rotas de leitura)
- [x] **ADMIN/OWNER:** podem criar/editar/remover (mutations)
- [x] **Escopo por loja:** storeId vem sempre da sessão (nunca do payload)
- [x] **Admin SUPER_ADMIN:** acesso restrito ao painel admin; criação de owner/admin com senha inicial definida

---

## 4. TESTES REALIZADOS (mínimo)

- [x] Dev server inicia sem problemas
- [x] Usuários: create/list/edit/delete + refresh
- [x] Serviços: create/list/edit/delete + refresh
- [x] Equipe: create/list/edit/delete + refresh
- [x] Eventos: create/list/toggle active/delete + refresh

> Observação: `yarn lint` pode falhar por um arquivo antigo de Horários (pendência fora do escopo atual).

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

### Equipe
- `app/(app)/equipe/**`
- `app/api/team/**`
- `prisma/schema.prisma`
- `prisma/migrations/**`

### Eventos
- `app/(app)/eventos/**`
- `app/api/events/**`
- `prisma/schema.prisma`
- `prisma/migrations/**`

### Admin (senha inicial do owner)
- `src/lib/actions/create-owner.*`
- UI do admin de criação de owner

---

## 6. PRÓXIMOS PASSOS (PRIORIDADE)

1) **CRUD de Agendamentos** (depende de Eventos + Equipe + Serviços)
2) **CRUD de Horários de Atendimento**
3) **Financeiro** (Entradas/Saídas, Contas a pagar, Controle de pagamentos)
4) **Usuários (extras):** busca/filtro, paginação, auditoria, soft-delete
5) **Polimento:** warnings/linters pendentes (ex.: dialog description, horários)

---

## Histórico de Alterações

| Data | Mudança |
|------|---------|
| 25/02/2026 | ✅ Eventos: CRUD real com serviços + toggle + delete; Admin: criação de owner com senha inicial |
| 20/02/2026 | ✅ Ajustes finais no CRUD de Usuários + consolidação de status |
| 19/02/2026 | ✅ CRUD de Usuários com Perfil e Contatos - Implementado |
| 13/02/2026 | ✅ CRUD de Serviços - Implementado |