# PROJECT_STATUS.md

**Data de ultima atualizacao:** 13 de marco de 2026

## Status geral do projeto Olyon

### Estado atual

[x] CRUD de Usuarios  
[x] CRUD de Servicos  
[x] CRUD de Equipe  
[x] CRUD de Eventos  
[x] Horarios semanais e bloqueios de agenda  
[x] Fluxo WhatsApp de agendamento ate a criacao do `Appointment`  
[x] Selecao de profissional no fluxo WhatsApp  
[x] Entrada conversacional com boas-vindas e menu inicial hibrido
[x] Sugestao ativa de horarios com escolha por numero no WhatsApp
[x] Massa minima real de seed para teste do fluxo WhatsApp
[x] Fluxo real de desmarcar/remarcar agendamento no WhatsApp
[x] Opcao 3 do WhatsApp com dados reais da `Store` quando cadastrados
[x] UI/admin minima para editar informacoes publicas da `Store`
[x] Infraestrutura base multi-tenant de conexao WhatsApp/Meta por `Store`
[x] Webhook Meta com verificacao `GET` e inbound real `POST`
[x] Roteamento inbound nativo por `phoneNumberId`
[x] Onboarding/admin minimo da `WhatsAppConnection` por `Store`
[x] Envio outbound real de texto via Meta Graph API usando a `WhatsAppConnection` da loja

---

## 1. Resumo executivo

O projeto Olyon (Next.js App Router + TypeScript + Prisma + NextAuth + Zod) possui hoje:

- CRUD real e multi-tenant de Usuarios, Servicos, Equipe e Eventos.
- APIs de horarios semanais e bloqueios de agenda persistidas em Prisma.
- Base de conversas WhatsApp com `Conversation`, `ConversationMessage`, `AppointmentDraft` e `Appointment`.
- Fluxo de bot via WhatsApp com menu inicial hibrido, selecao de servico, resolucao de profissional, sugestao ativa de horarios, escolha de horario por numero ou texto livre, confirmacao, cancelamento, remarcacao e resposta institucional da loja na opcao `3`.
- `Store` agora possui campos publicos para telefone, WhatsApp, endereco, observacoes e resumo textual de horario de funcionamento.
- `WhatsAppConnection` agora separa a conexao tecnica Meta/WhatsApp dos dados publicos da loja.
- O webhook da Meta agora aceita verificacao `GET`, parseia payload real `POST` e resolve a `Store` por `phoneNumberId`.
- As mensagens `OUT` do bot agora podem ser entregues de verdade pela Meta Graph API, usando a conexao ativa da `Store` apos a persistencia local.
- O envio outbound real via Meta ja esta implementado no codigo e a tentativa de entrega acontece logo apos o commit da `ConversationMessage OUT`.
- O envio outbound real pela Graph API ja foi confirmado no backend com resposta 200 da Meta e geracao de `wamid`.
- O proximo foco e observar callbacks de `statuses` para confirmar se a mensagem esta sendo marcada como `sent`, `delivered`, `read` ou `failed`.
- O gargalo atual parece estar no ambiente Meta/destino, nao mais na chamada outbound do Olyon.
- O teste E2E real ainda esta em diagnostico porque a mensagem segue persistindo no banco, mas ainda nao chega ao usuario final no WhatsApp.
- Foram adicionados logs diagnosticos de payload inbound, dispatch outbound e request/response/fetch failure da Graph API para rastrear a falha de entrega.
- Foram adicionados logs diagnosticos e persistencia leve de `statusEvents` para callbacks `statuses` da Meta quando a correlacao com a `OUT` e possivel.
- O criterio de conexao foi alinhado entre inbound e outbound, exigindo `status = CONNECTED` nos dois caminhos.
- Admin existente de lojas agora permite editar esses campos sem criar um fluxo paralelo.
- A tela de detalhes da loja agora tambem permite cadastrar e manter a conexao tecnica `WhatsAppConnection` via API admin store-scoped.
- Respostas JSON consistentes, validacoes no servidor e escopo por loja.
- Seed oficial com massa minima idempotente para validar agenda, bloqueios, conflitos e equipe no canal WhatsApp.

---

## 2. Entregas concluidas

### A) CRUDs principais

- [x] Usuarios
- [x] Servicos
- [x] Equipe
- [x] Eventos com vinculo de servicos

### B) Agenda

- [x] `WeekScheduleDay`
- [x] `WeekScheduleInterval`
- [x] `BlockedSchedule`
- [x] Endpoints para horario semanal
- [x] Endpoints para bloqueios de agenda

### C) Loja / Atendimento

- [x] Campos publicos em `Store` para contato e localizacao
- [x] Campo textual `businessHoursSummary` para horario institucional
- [x] Campo textual `serviceObservations` para observacoes de atendimento
- [x] Formulario no admin de lojas para editar dados publicos
- [x] Endpoint `PATCH /api/admin/stores/[id]` para persistir dados publicos

### D) WhatsApp / Agendamento

- [x] Upsert de `Conversation`
- [x] Persistencia de `ConversationMessage`
- [x] Garantia de `AppointmentDraft` ativo
- [x] Menu inicial com boas-vindas em `IDLE`
- [x] Aceite de opcoes por numero (`1`, `2`, `3`) ou texto livre
- [x] Atalho direto para intencoes claras sem passar pelo menu
- [x] Fallback inicial mais amigavel sem repetir o menu desnecessariamente
- [x] Selecao de servico por texto
- [x] Resolucao de profissional elegivel por `Membership` + `MembershipService`
- [x] Auto-selecao quando existe 1 profissional elegivel
- [x] Estado `CHOOSING_STAFF` quando existem 2 ou mais profissionais elegiveis
- [x] Selecao de profissional por numero ou nome
- [x] Estado `CHOOSING_TIME`
- [x] Estado `CHOOSING_APPOINTMENT` para selecionar agendamento futuro
- [x] Estado `CHOOSING_APPOINTMENT_ACTION` para escolher entre desmarcar e remarcar
- [x] Estado `CONFIRMING_APPOINTMENT_CANCELLATION`
- [x] Sugestao ativa de 3 a 5 horarios ao entrar em `CHOOSING_TIME`
- [x] Persistencia de sugestoes em `conversation.context`
- [x] Escolha de horario sugerido por numero
- [x] Parser de data/hora textual
- [x] Validacao real de disponibilidade
- [x] Persistencia de `startAt` e `endAt` no draft
- [x] Estado `CONFIRMING`
- [x] Confirmacao via `SIM`
- [x] Retorno para `CHOOSING_TIME` via `NAO`
- [x] Criacao final de `Appointment`
- [x] Listagem de appointments futuros do cliente pelo telefone da conversa
- [x] Selecao de appointment futuro por numero
- [x] Cancelamento real de appointment futuro
- [x] Remarcacao real reaproveitando draft, profissional, disponibilidade e confirmacao
- [x] Idempotencia de inbound por `providerMessageId`
- [x] Sugestao de horarios proximos quando o slot pedido nao estiver disponivel
- [x] Seed oficial (`prisma/seed.ts`) com loja, servico, profissionais, agenda, bloqueio e appointment existente
- [x] Opcao `3` com resposta institucional baseada em dados reais da `Store`

### E) WhatsApp / Meta Multi-tenant - Fase 1

- [x] Model `WhatsAppConnection` dedicada por `Store`
- [x] Campos tecnicos para `phoneNumberId`, `businessAccountId`, `displayPhoneNumber`, `verifyToken`, `accessToken`, `status` e `isActive`
- [x] Uniques para `storeId`, `phoneNumberId` e `verifyToken`
- [x] Webhook Meta `GET` para challenge verification
- [x] Parser real do payload da WhatsApp Cloud API para mensagens inbound
- [x] Resolucao da `Store` pelo `phoneNumberId` recebido no payload
- [x] Persistencia inbound com `storeId` correto sem depender de `x-store-id` para eventos Meta
- [x] Helper minimo para leitura da conexao WhatsApp ativa

### F) WhatsApp / Meta Multi-tenant - Fase 2

- [x] API admin store-scoped `GET /api/admin/stores/[id]/whatsapp-connection`
- [x] API admin store-scoped `PUT /api/admin/stores/[id]/whatsapp-connection`
- [x] Validacao com Zod para criacao e edicao da conexao tecnica
- [x] Upsert Prisma garantindo no maximo 1 `WhatsAppConnection` por `Store`
- [x] Card "Conexao WhatsApp" na tela de detalhes da loja
- [x] Formulario minimo para criar e editar `provider`, `phoneNumberId`, `businessAccountId`, `displayPhoneNumber`, `verifyToken`, `accessToken`, `status` e `isActive`
- [x] `accessToken` restrito a tela de detalhes da loja, mascarado por padrao

### G) WhatsApp / Meta Multi-tenant - Fase 3

- [x] Helper dedicado para outbound real via `src/lib/whatsapp/meta-outbound.ts`
- [x] Resolucao da `WhatsAppConnection` ativa por `storeId` com `provider = META_WHATSAPP`, `isActive = true` e `status = CONNECTED`
- [x] Envio real de texto simples para `https://graph.facebook.com/v22.0/{phoneNumberId}/messages`
- [x] Atualizacao da `ConversationMessage OUT` com `provider = meta`, `whatsappConnectionId`, `graphMessageId`, `deliveryRequest` e `graphResponse`
- [x] Atualizacao de `providerMessageId` da `OUT` com o `graphMessageId` retornado quando o envio e aceito pela Meta
- [x] Persistencia local preservada quando o envio outbound falha
- [x] Reprocessamento do inbound continua sem reenviar mensagens antigas ja tratadas
- [x] Observabilidade reforcada com logs de payload recebido, dispatch outbound e request/response/fetch failure da Meta
- [x] Inbound e outbound agora compartilham o mesmo criterio de conexao ativa: `provider = META_WHATSAPP`, `isActive = true` e `status = CONNECTED`
- [x] Webhook Meta agora observa callbacks de `statuses` para `sent`, `delivered`, `read` e `failed`
- [x] Tentativa de correlacao entre `status.id` e `ConversationMessage OUT` via `providerMessageId`
- [x] Persistencia leve de `statusEvents` no `payload` da `OUT` quando a correlacao e encontrada

---

## 3. Regras de comportamento implementadas

- [x] Saudacao simples em `IDLE` abre com boas-vindas + menu
- [x] Intencao clara de agendar ignora o menu e vai direto para `CHOOSING_SERVICE`
- [x] Intencao de desmarcar/remarcar entra no fluxo real de alteracao
- [x] Intencao de informacoes responde com dados reais da loja quando houver cadastro
- [x] Intencao de informacoes cai em fallback seguro quando a loja ainda nao preencheu os dados
- [x] Intencao de informacoes aceita `3`, `informacoes`, `endereco`, `horario`, `telefone`, `contato` e `onde fica`
- [x] `conversation.context.mainMenuShown` evita repetir o menu completo em toda mensagem
- [x] `conversation.context.appointmentOptions` guarda a lista numerada de agendamentos futuros
- [x] `conversation.context.selectedAppointmentId` e `rescheduleAppointmentId` controlam cancelamento/remarcacao com seguranca
- [x] `conversation.context.timeSlotSuggestions` guarda os slots sugeridos para escolha por numero
- [x] Estados existentes do agendamento foram preservados
- [x] Conflito de disponibilidade continua considerando o profissional escolhido
- [x] Texto livre para horario continua funcionando como fallback

---

## 4. Observacoes operacionais

- Como o fluxo atual ainda nao coleta nome do cliente, `Appointment.customerName` usa fallback `Cliente WhatsApp` quando o draft nao traz nome.
- O timezone do bot usa `conversation.context.timezone` quando existir; caso contrario usa `WHATSAPP_SCHEDULING_TIMEZONE`, depois `APP_TIMEZONE`, e por fim `America/Sao_Paulo`.
- Quando existe `Appointment` sem profissional (`staffMembershipId = null`), ele continua sendo tratado como bloqueio geral da loja para evitar sobreposicao ambigua.
- O modelo atual nao possui flag de ativo para `Membership`, entao a elegibilidade considera profissional da loja com tipo `PROFISSIONAL` e vinculo ao servico.
- A localizacao de appointments para alteracao usa `Appointment.customerPhone` igual ao numero da conversa WhatsApp.
- Quando a remarcacao e confirmada, o sistema cancela o appointment original e cria um novo appointment, preservando melhor o historico sem sobrescrever o slot anterior.
- A opcao 3 nao usa agenda dinamica nem o cadastro semanal de disponibilidade para montar texto institucional; ela responde apenas com os campos publicos da `Store`.
- No banco atual, todas as `Store` existentes continuam com os novos campos publicos nulos apos a migration aplicada em 10/03/2026; por isso o fallback seguro ainda aparece ate haver preenchimento no admin.
- A edicao desses dados foi adicionada na tela existente [app/admin/dashboard/stores/[id]/page.tsx](/c:/Users/surft/olyon/app/admin/dashboard/stores/[id]/page.tsx), acessivel ao super admin.
- As sugestoes numeradas sao sempre revalidadas antes de salvar ou confirmar o slot, para evitar confirmar horario que ficou indisponivel.
- O seed oficial foi ajustado para nao deixar appointment antigo sem profissional bloqueando a loja inteira durante os testes.
- Nesta fase, a conexao tecnica Meta/WhatsApp passou a morar em `WhatsAppConnection`; `Store.whatsappPhone` continua sendo apenas dado publico/institucional.
- O webhook `POST` da Meta nao usa mais `x-store-id`; esse header foi preservado apenas para payload de teste legado fora do fluxo Meta real.
- Agora existe onboarding/admin minimo da conexao WhatsApp na tela existente [app/admin/dashboard/stores/[id]/page.tsx](/c:/Users/surft/olyon/app/admin/dashboard/stores/[id]/page.tsx), sem criar fluxo paralelo fora do detalhe da loja.
- O `accessToken` nao e exibido em listagens amplas; nesta fase ele fica restrito a tela de detalhes da loja e mascarado por padrao no formulario.
- O modelo atual de admin global continua baseado em `SUPER_ADMIN`; por isso a edicao da conexao tecnica segue o mesmo guard ja existente no admin de lojas.
- O outbound real roda somente no caminho Meta real; o payload de teste legado com `x-store-id` continua sem disparar envio para a Graph API para evitar envios acidentais fora do fluxo validado.
- Cada `ConversationMessage OUT` continua sendo criada primeiro no banco e so depois enviada a Meta; falhas de entrega atualizam o `payload` com `deliveryRequest.ok = false`, sem apagar o historico local.
- O diagnostico operacional do outbound agora deve observar os logs `whatsapp webhook meta payload received`, `whatsapp webhook meta inbound message`, `whatsapp outbound dispatch start`, `meta outbound request start` e `meta outbound response` ou `meta outbound fetch failure`.
- O diagnostico operacional agora tambem deve observar `whatsapp webhook meta statuses received`, `whatsapp webhook meta status item` e `whatsapp webhook meta status unmatched`.
- Quando existe correlacao por `providerMessageId`, o `payload` da `ConversationMessage OUT` recebe `statusEvents` sem perder `text`, `source`, `provider`, `graphResponse`, `deliveryRequest` e demais campos ja persistidos.

---

## 5. Verificacoes realizadas

- [x] `yarn prisma format`
- [x] `yarn prisma generate`
- [x] `yarn prisma migrate deploy`
- [x] `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/bot/flow.ts src/lib/bot/types.ts src/lib/store/public-info.ts app/api/admin/stores/[id]/route.ts app/admin/dashboard/stores/[id]/page.tsx app/admin/dashboard/stores/[id]/store-public-info-form.tsx`
- [x] `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/whatsapp/parse.ts src/lib/whatsapp/connection.ts`
- [x] `yarn eslint src/lib/whatsapp/admin-connection.ts app/api/admin/stores/[id]/whatsapp-connection/route.ts app/admin/dashboard/stores/[id]/store-whatsapp-connection-form.tsx app/admin/dashboard/stores/[id]/page.tsx`
- [x] `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/whatsapp/connection.ts src/lib/whatsapp/meta-outbound.ts`
- [x] `yarn eslint app/api/webhooks/whatsapp/route.ts`
- [x] Smoke test local do flow com:
  - [x] `oi`
  - [x] `1`
  - [x] `2`
  - [x] `3`
  - [x] `informacoes`
  - [x] `endereco`
  - [x] `horario`
  - [x] `telefone`
  - [x] `contato`
  - [x] `onde fica`
  - [x] `quero agendar cabelo`
  - [x] fallback generico com `mainMenuShown = true`
  - [x] `CHOOSING_APPOINTMENT` com escolha por numero
  - [x] `CHOOSING_APPOINTMENT_ACTION` para desmarcar
  - [x] `CHOOSING_APPOINTMENT_ACTION` para remarcar
  - [x] `CONFIRMING_APPOINTMENT_CANCELLATION` com `SIM`
  - [x] `CHOOSING_TIME` com escolha por numero
  - [x] `CHOOSING_TIME` com texto livre
  - [x] `CONFIRMING` com remarcacao via `SIM`
  - [x] `CONFIRMING` com retorno para sugestoes via `NAO`
  - [x] formatacao textual de dados publicos da loja
- [x] Consulta direta no banco confirmou que os novos campos de `Store` estao nulos em todas as lojas existentes neste ambiente

Observacao:

- `yarn tsc --noEmit --ignoreDeprecations 5.0` continua falhando por erros antigos fora do escopo desta entrega (`.next/dev/types`, `usuarios/controllers`, `auth-options`, `seed`, etc.), mas os erros novos desta feature foram saneados antes do fechamento.
- A migration `20260310193000_add_whatsapp_connection` foi aplicada com sucesso em 10/03/2026.
- O checklist manual da Fase 2 no navegador ainda nao foi executado neste fechamento; a entrega foi validada por leitura de codigo e lint direcionado.
- O checklist manual da Fase 3 com envio real via Graph API segue em diagnostico neste fechamento; a entrega foi validada por leitura de codigo, observabilidade reforcada e lint direcionado.
- O checklist manual dos callbacks `statuses` da Meta ainda precisa ser repetido apos esta sessao para confirmar `sent`, `delivered`, `read` ou `failed` no payload da `OUT`.

---

## 6. Arquivos principais desta etapa

- `app/api/webhooks/whatsapp/route.ts`
- `src/lib/bot/flow.ts`
- `src/lib/bot/types.ts`
- `src/lib/store/public-info.ts`
- `src/lib/whatsapp/parse.ts`
- `src/lib/whatsapp/connection.ts`
- `src/lib/whatsapp/meta-outbound.ts`
- `src/lib/whatsapp/admin-connection.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260310113000_add_store_public_info/migration.sql`
- `prisma/migrations/20260310193000_add_whatsapp_connection/migration.sql`
- `app/api/admin/stores/[id]/route.ts`
- `app/api/admin/stores/[id]/whatsapp-connection/route.ts`
- `app/admin/dashboard/stores/[id]/page.tsx`
- `app/admin/dashboard/stores/[id]/store-public-info-form.tsx`
- `app/admin/dashboard/stores/[id]/store-whatsapp-connection-form.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

---

## 7. Proximos passos

1. Preencher no admin os dados reais das lojas ja existentes para que a opcao `3` pare de cair no fallback seguro neste ambiente.
2. Avaliar se a edicao desses campos tambem deve ficar disponivel no app multi-tenant para owner/admin da loja, alem do super admin.
3. Coletar nome do cliente no fluxo WhatsApp antes da confirmacao final.
4. Evoluir disponibilidade por profissional para agendas individuais quando o produto suportar agenda propria por staff.
5. Limpar type errors e warnings antigos fora do escopo da feature.

---

## 8. Historico resumido

| Data | Mudanca |
|------|---------|
| 13/03/2026 | WhatsApp/Meta multi-tenant fase 3: envio outbound real de texto via Graph API, usando a `WhatsAppConnection` ativa da `Store` e persistindo retorno/erro no `payload` da `ConversationMessage OUT` |
| 11/03/2026 | WhatsApp/Meta multi-tenant fase 2: API admin store-scoped e UI minima no detalhe da loja para cadastrar/editar `WhatsAppConnection` |
| 10/03/2026 | WhatsApp/Meta multi-tenant fase 1: model `WhatsAppConnection`, webhook Meta `GET`/`POST`, parser real e roteamento inbound por `phoneNumberId` |
| 10/03/2026 | WhatsApp: opcao 3 agora le dados publicos da `Store`; schema, migration e admin de lojas foram atualizados para telefone, WhatsApp, endereco, observacoes e horario institucional |
| 09/03/2026 | WhatsApp: fluxo real de desmarcar/remarcar com listagem de agendamentos futuros, cancelamento confirmado e remarcacao reaproveitando disponibilidade |
| 09/03/2026 | WhatsApp: sugestao ativa de horarios com escolha por numero em `CHOOSING_TIME` e seed minima real para teste fim a fim |
| 09/03/2026 | WhatsApp: entrada conversacional com boas-vindas, menu inicial hibrido e atalhos diretos em `IDLE` |
| 09/03/2026 | WhatsApp: selecao de profissional com auto-selecao, escolha por numero/nome e conflito de agenda por profissional |
| 09/03/2026 | WhatsApp: fluxo completo de agendamento com parse de data/hora, disponibilidade real, confirmacao e criacao de `Appointment` |
| 25/02/2026 | Eventos: CRUD real com servicos e melhoria no admin para senha inicial do owner |
| 20/02/2026 | Ajustes finais no CRUD de Usuarios |
| 19/02/2026 | CRUD de Usuarios com Perfil e Contatos |
