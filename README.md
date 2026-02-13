# Olyon

Painel administrativo web para gestao de servicos, agenda, equipe e financeiro.

## Visao geral

- App Router com grupos (app/auth/admin) e layout com sidebar.
- Formularios com React Hook Form + Zod e notificacoes Sonner.
- UI com Tailwind CSS + shadcn/ui (Radix) e icones Lucide.
- Prisma + Postgres com schema minimal (User/Store/Membership).
- Auth via NextAuth (credentials) e middleware de protecao de rotas.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui + Radix UI
- React Hook Form + Zod
- Sonner
- Prisma + Postgres
- NextAuth

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` no navegador.

## Scripts

- `npm run dev` - inicia o ambiente de desenvolvimento
- `npm run build` - gera o build de producao
- `npm run start` - executa o build gerado
- `npm run lint` - roda o linter

## Auditoria rapida (13/02/2026)

### A) Resumo do estado atual

- App Router com layouts em app/layout.tsx e app/(app)/layout.tsx.
- Prisma configurado e client gerado em generated/prisma.
- Autenticacao NextAuth com Credentials e middleware de protecao.
- APIs reais: auth e store (list/switch).
- UI de Servicos/Eventos/Equipe existe, mas controllers usam toast/mock.
- Nenhum CRUD persistente de negocio ainda.

### B) Inventario do que existe

**Paginas (App Router)**

- (auth): /login, /cadastro, /recuperar-senha
- (app): /dashboard, /usuarios, /servicos, /eventos, /agendamentos,
  /horarios-de-atendimento, /entradas-saidas, /contas-a-pagar,
  /controle-pagamentos, /equipe
- admin: /admin/dashboard

**APIs**

- /api/auth/[...nextauth]
- /api/store/list
- /api/store/switch

**Models Prisma**

- User, Store, Membership
- Enums: GlobalRole, MembershipRole

**Middlewares/Providers**

- middleware.ts com protecao por role/membership
- AuthProvider (SessionProvider)

### C) Lacunas e riscos

- Nao existem models de negocio (Service, Event, Team, etc) no schema.
- Nao existem endpoints CRUD reais para entidades de negocio.
- Selecionar loja nao persiste (store/switch e stub).
- Migrations com duas pastas init podem indicar historico confuso.
- DATABASE_URL obrigatorio para rodar Prisma.

### D) Proximo passo exato (proximas 2 horas)

1) Confirmar DATABASE_URL e migracoes atuais.
2) Adicionar model Service no Prisma e migrar.
3) Criar API /api/services (GET/POST/PUT/DELETE).
4) Integrar UI de /servicos com API real.
5) Teste manual: login, criar, listar, editar e deletar servico.

### E) Plano do CRUD #1 (Servicos)

- Rotas:
  - GET /api/services
  - POST /api/services
  - PUT /api/services/[id]
  - DELETE /api/services/[id]
- Payloads:
  - Create: { name, durationMin, description?, active? }
  - Update: { name?, durationMin?, description?, active? }
- Validacao:
  - Zod (schemas de servicos) e storeId vindo do token.
- UI:
  - Dialog cria servico via POST.
  - Lista consome GET e atualiza estado.
  - Editar/Remover via PUT/DELETE.
- Testes manuais:
  - Login -> criar -> listar -> editar -> deletar.

### F) Template para proximos CRUDs

- Model Prisma com storeId + campos + timestamps.
- API com GET/POST/PUT/DELETE.
- Validacao com Zod + token storeId.
- UI com listagem, modal, editar e excluir.
- Testes manuais basicos.

## Bloco 1 — Arvore do projeto

- Root: app/, prisma/, src/, package.json, prisma.config.ts
- Pastas principais em app/: (app), (auth), admin, api

## Bloco 2 — package.json + lockfiles

- package.json presente
- lockfile: yarn.lock

## Bloco 3 — Prisma

- schema.prisma presente
- prisma.config.ts presente
- migrations:
  - 20260202211010_init
  - 20260202212241_add_user
  - 20260204175042_init
  - 20260205120000_add_global_role_membership_role_and_store_active
  - 20260206000000_add_store_slug

## Bloco 4 — Rotas (App Router)

- app/layout.tsx
- middleware.ts

## Bloco 5 — APIs

- app/api/auth/[...nextauth]/route.ts
- app/api/store/list/route.ts
- app/api/store/switch/route.ts

## Bloco 6 — UI das paginas alvo

- /servicos, /eventos, /equipe existem e estao em UI com mock/toast

## Estrutura

```
app/                rotas do App Router
  (app)/
  (auth)/
  admin/
  api/
src/
  components/       layout e componentes compartilhados
  hooks/
  lib/
prisma/
  schema.prisma
  migrations/
```

## Configuracoes

- Alias de import: @/* aponta para src/*.
- Variavel obrigatoria: DATABASE_URL para Prisma.
