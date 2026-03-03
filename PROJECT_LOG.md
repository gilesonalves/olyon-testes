---

## 📅 25 de fevereiro de 2026 — CRUD de Eventos + melhoria no Admin (senha inicial do owner)

### ✅ Admin: criação de owner/admin com senha inicial definida
**Objetivo:** evitar senha “oculta”/hardcoded e permitir que o SUPER_ADMIN defina uma senha inicial no momento de criar o dono/admin da loja.

**Mudanças principais:**
- Atualizado schema/validação para incluir `password` e `confirmPassword`
- Hash da senha no server action antes de persistir
- UI do formulário de criação de owner atualizada com campos de senha + confirmação e opção de mostrar/ocultar

**Resultado:** fluxo mais seguro e UX melhor para onboarding da loja.

---

### ✅ Eventos: CRUD real com persistência e vínculo com Serviços
**Objetivo:** transformar Eventos de “mock UI” em CRUD real (multi-tenant), incluindo seleção de serviços e persistência.

#### Prisma / Modelo
- Mantido model `Event` com `storeId`, `active`, timestamps
- Criada relação **Event ↔ Service** via tabela de junção (`EventService`)
- Prisma client regenerado

#### Zod
- `EventCreateSchema` passou a aceitar `serviceIds: string[]`
- `EventUpdateSchema` aceita `active?: boolean` e `serviceIds?: string[]`
- Re-export correto em `app/(app)/eventos/schemas/index.ts`

#### APIs (Route Handlers)
- GET `/api/events` (STAFF+) — lista eventos por `storeId`
- POST `/api/events` (ADMIN+) — cria evento e cria vínculos com serviços
- PUT `/api/events/[id]` (ADMIN+) — atualiza `active` e sincroniza vínculos (deleteMany + createMany)
- DELETE `/api/events/[id]` (ADMIN+) — remove evento por loja

**Correções importantes durante a integração:**
- Ajuste para não enviar `serviceIds` direto no `prisma.event.create()` (mapeamento correto para `services: { create: ... }`)
- Fix no handler `[id]` para resolver casos de `params` indefinido (fallback para extrair `id` via `req.url`), evitando 400/500 indevidos

#### UI / Integração
- `/eventos`:
  - Listagem real consumindo `GET /api/events`
  - Modal “Novo item” cria via `POST /api/events`
  - Componente de Serviços passa a carregar lista real via `GET /api/services`
  - Toggle “Habilitar” (PUT active)
  - Delete (DELETE)
  - Refresh confirma persistência

**Resultado:** Eventos agora é CRUD real completo, multi-tenant e com seleção/persistência de serviços.

CHANGELOG DA SESSÃO

Admin (SUPER_ADMIN)

Rotas padronizadas e funcionando:

/admin/dashboard (dashboard)

/admin/dashboard/stores (listagem de lojas)

/admin/dashboard/stores/new (criação de loja)

/admin/dashboard/stores/[id] (detalhes da loja)

/admin/dashboard/stores/[id]/owner (gerenciar proprietário)

Criação de loja com OWNER (senha definida no fluxo)

Troca de OWNER: ao criar novo proprietário, o anterior é rebaixado para ADMIN (regra “1 owner por loja”)

Hard delete de loja implementado e testado (cascade)

Delete UI melhorada (modal/confirm por nome da loja); DeleteStoreButton antigo pode ser removido se não usado

Agendamentos / WhatsApp (fundação)

Models adicionados: Conversation, ConversationMessage, AppointmentDraft, Appointment

Webhook /api/webhooks/whatsapp funcionando com upsert de conversation + persistência de messages (idempotência por providerMessageId)

Seeds criaram registros e testes via PowerShell confirmaram persistência no Prisma Studio

Início de fluxo “quero agendar” e respostas bot registradas como OUT em ConversationMessage

Horários

APIs de bloqueio (/api/schedule/blocked) testadas: create/list/update/delete + validação de horário (endTime > startTime)

Weekly schedule: persistiu no banco (Prisma Studio mostra WeekScheduleDay/WeekScheduleInterval); GET retornando days=[] indica ajuste pendente no retorno/serializer do endpoint (próximo item de correção)
---