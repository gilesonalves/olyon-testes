## 13 de marco de 2026 - Observabilidade de statuses da Meta

### Objetivo

Adicionar observabilidade para callbacks de `statuses` da WhatsApp Cloud API e tentar correlacionar esses eventos com a `ConversationMessage OUT` ja salva, para diagnosticar por que a Meta aceita o outbound com HTTP 200 e `wamid`, mas a mensagem ainda nao aparece no celular final.

### Arquivos alterados

- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Logs para callbacks `statuses`

Foram adicionados no webhook os logs:

- `whatsapp webhook meta statuses received`
- `whatsapp webhook meta status item`

Esses logs mostram, de forma defensiva:

- `id`
- `recipientId`
- `status`
- `timestamp`
- `conversationId`
- `expirationTimestamp`
- `pricingCategory`
- `pricingModel`
- `billable`
- `errors`

#### 2. Tentativa de correlacao com a `OUT`

Quando `status.id` chega no callback, o webhook agora tenta localizar a `ConversationMessage OUT` correspondente via `providerMessageId`.

Quando a correlacao funciona:

- o `payload` existente e preservado
- `statusEvents` e acrescentado ao `payload`
- callbacks repetidos do mesmo status nao sao duplicados

#### 3. Log de status sem match

Quando o callback chega com `status.id`, mas nenhuma `ConversationMessage OUT` e encontrada, o webhook agora registra:

- `whatsapp webhook meta status unmatched`

Isso ajuda a identificar falha de correlacao entre `wamid` salvo e callback de status recebido.

### Validacao executada

- `yarn eslint app/api/webhooks/whatsapp/route.ts`

### Resultado da validacao

- O lint do arquivo alterado passou sem erros.
- Proximo passo: repetir o teste real e capturar se a Meta marca a mensagem como `sent`, `delivered`, `read` ou `failed`.

## 13 de marco de 2026 - Diagnostico do outbound Meta e alinhamento de conexao

### Objetivo

Reforcar a observabilidade do outbound Meta e alinhar a regra de conexao entre inbound e outbound para diagnosticar por que a mensagem `OUT` fica persistida no banco, mas ainda nao chega ao WhatsApp real do usuario final.

### Arquivos alterados

- `src/lib/whatsapp/connection.ts`
- `src/lib/whatsapp/meta-outbound.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Observabilidade do payload Meta recebido

Foram adicionados logs objetivos no webhook para registrar:

- `whatsapp webhook meta payload received`
- `whatsapp webhook meta inbound message`

Esses logs mostram quantidade de mensagens, `phoneNumberId`, `businessAccountId`, `providerMessageId`, `from` e se o evento trouxe texto.

#### 2. Observabilidade do dispatch outbound

O webhook agora registra tambem:

- `whatsapp outbound dispatch start`
- `whatsapp outbound dispatch finished`

Assim fica claro se a tentativa de entrega outbound realmente partiu apos o commit da `ConversationMessage OUT`.

#### 3. Observabilidade do helper da Graph API

`src/lib/whatsapp/meta-outbound.ts` recebeu logs para:

- `meta outbound request start`
- `meta outbound response`
- `meta outbound fetch failure`

Com isso, o teste E2E real passa a capturar `endpoint`, `whatsappConnectionId`, `phoneNumberId`, `to`, `textLength`, `status`, `ok` e `responsePreview`.

#### 4. Alinhamento da regra de conexao

O inbound passou a exigir `status = CONNECTED` em `findActiveWhatsAppConnectionForInboundMessage`, ficando semanticamente alinhado ao outbound para evitar diagnosticos falsos em que a entrada era aceita por uma conexao ativa, mas a saida exigia uma conexao mais restritiva.

#### 5. Erro outbound enriquecido

O log `whatsapp outbound send error` agora inclui tambem:

- `graphError`
- `responsePreview`
- `whatsappConnectionId`
- `phoneNumberId`

### Validacao executada

- `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/whatsapp/connection.ts src/lib/whatsapp/meta-outbound.ts`

### Resultado da validacao

- O lint dos arquivos alterados passou sem erros.
- Proximo passo operacional: executar teste E2E real e capturar `statusCode`, `graphError`, `responsePreview` e `graphMessageId`.

## 13 de marco de 2026 - WhatsApp/Meta outbound real via Graph API - Fase 3

### Objetivo

Fechar o elo outbound real do fluxo WhatsApp/Meta, fazendo as mensagens `OUT` ja persistidas no banco serem enviadas para a Meta Graph API com a `WhatsAppConnection` ativa da `Store`, sem quebrar o inbound real ja validado.

### Arquivos alterados

- `src/lib/whatsapp/connection.ts`
- `src/lib/whatsapp/meta-outbound.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Helper dedicado para envio outbound Meta

Foi criado `src/lib/whatsapp/meta-outbound.ts` com um helper unico para:

- receber `storeId`, `to` e `text`
- resolver a conexao ativa da loja
- validar `provider`, `accessToken`, `phoneNumberId`, `status` e `isActive`
- enviar `POST` para `https://graph.facebook.com/v22.0/{phoneNumberId}/messages`
- usar `fetch` nativo com timeout
- retornar estrutura tipada com `ok`, `statusCode`, `whatsappConnectionId`, `graphMessageId`, `graphResponse` resumida e erro legivel quando necessario

O parse da resposta usa `zod` para tratar retorno de sucesso, erro HTTP e JSON inesperado de forma previsivel.

#### 2. Resolucao explicita da conexao ativa por loja

`src/lib/whatsapp/connection.ts` ganhou `findActiveWhatsAppConnectionByStoreId(storeId)`, filtrando:

- `storeId`
- `provider = META_WHATSAPP`
- `isActive = true`
- `status = CONNECTED`

Esse helper concentra a leitura da conexao valida para outbound sem alterar o roteamento inbound ja aprovado por `phoneNumberId`.

#### 3. Integracao do outbound no webhook sem perder a persistencia local

`app/api/webhooks/whatsapp/route.ts` foi ajustado para:

- rastrear cada `ConversationMessage OUT` criada por `appendBotReply`
- manter a criacao da `OUT` dentro da transacao como antes
- tentar o envio real so depois do commit
- atualizar o `payload` da `OUT` com:
  - `provider: "meta"`
  - `whatsappConnectionId`
  - `phoneNumberId`
  - `graphMessageId` / `providerMessageId`
  - `deliveryRequest.ok`
  - `statusCode`
  - `graphResponse` resumida
- atualizar `providerMessageId` da `OUT` quando a Meta retorna `graphMessageId`
- salvar erro resumido no `payload` quando o envio falha
- manter `console.error` legivel sem derrubar a resposta do webhook inbound

#### 4. Compatibilidade e idempotencia preservadas

- o inbound continua idempotente por `providerMessageId`; se a Meta reprocessar o mesmo evento, o sistema nao recria nem reenfila `OUT`
- a entrega outbound nao acontece dentro da transacao, entao falha na Meta nao apaga a mensagem local
- o caminho legado de payload de teste com `x-store-id` foi mantido sem disparar envio real, evitando spam acidental fora do fluxo Meta validado
- se algum `payload` de `OUT` ja indicar `deliveryRequest.ok = true`, o helper de entrega ignora reenvio naquele processamento

### Validacao executada

- `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/whatsapp/connection.ts src/lib/whatsapp/meta-outbound.ts`

### Resultado da validacao

- O lint dos arquivos alterados passou sem erros.
- O checklist manual com um numero real da Meta ainda nao foi executado neste fechamento.

### Fora do escopo desta fase

- envio de midia, template ou interactive messages
- reconciliacao de status/delivery/read receipts da Meta
- retry assinado com fila para outbound
- alteracao do parse inbound que ja estava validado

## 11 de marco de 2026 - WhatsAppConnection por loja - Fase 2 onboarding/admin minimo

### Objetivo

Permitir que o super admin cadastre e mantenha a configuracao tecnica minima da `WhatsAppConnection` por `Store` sem depender de script ou insercao manual no banco, preservando o webhook da Meta ja validado na Fase 1.

### Arquivos alterados

- `src/lib/whatsapp/admin-connection.ts`
- `app/api/admin/stores/[id]/whatsapp-connection/route.ts`
- `app/admin/dashboard/stores/[id]/page.tsx`
- `app/admin/dashboard/stores/[id]/store-whatsapp-connection-form.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Schema e helper unico da conexao tecnica

Foi criado `src/lib/whatsapp/admin-connection.ts` para concentrar:

- schema Zod da conexao tecnica
- labels de `provider`, `status` e estado geral da conexao
- `defaultValues` do formulario
- serializacao para `upsert` no Prisma
- serializacao padronizada da resposta da API

Isso evita duplicacao entre a UI admin e a API store-scoped.

#### 2. API admin store-scoped para ler e salvar a conexao

Foi criado `app/api/admin/stores/[id]/whatsapp-connection/route.ts` com:

- `GET` para retornar a conexao tecnica da store ou `null` quando ainda nao existir
- `PUT` para criar ou atualizar a conexao via `upsert`
- validacao Zod do payload
- verificacao de autenticacao e permissao seguindo o guard atual de `SUPER_ADMIN`
- erro legivel para conflito de `phoneNumberId`, `verifyToken` ou `storeId`
- garantia pratica de no maximo 1 conexao por loja usando a unique `storeId`

#### 3. UI minima no detalhe da loja

A tela existente `app/admin/dashboard/stores/[id]/page.tsx` recebeu um novo card "Conexao WhatsApp" com:

- estado atual da conexao: sem conexao, ativa ou inativa
- formulario para criar ou editar a configuracao tecnica
- campos para `provider`, `phoneNumberId`, `businessAccountId`, `displayPhoneNumber`, `verifyToken`, `accessToken`, `status` e `isActive`
- feedback visual com `toast` de sucesso/erro

O formulario foi isolado em `app/admin/dashboard/stores/[id]/store-whatsapp-connection-form.tsx`, reaproveitando o mesmo padrao visual da tela de detalhes da loja.

#### 4. Seguranca e compatibilidade com a Fase 1

- `Store.whatsappPhone` continua separado dos dados tecnicos da conexao
- `accessToken` ficou restrito a tela de detalhe da loja e mascarado por padrao
- o webhook continua compativel porque a persistencia salva exatamente os campos usados na Fase 1, incluindo `phoneNumberId`, `verifyToken` e `isActive`

### Validacao executada

- `yarn eslint src/lib/whatsapp/admin-connection.ts app/api/admin/stores/[id]/whatsapp-connection/route.ts app/admin/dashboard/stores/[id]/store-whatsapp-connection-form.tsx app/admin/dashboard/stores/[id]/page.tsx`

### Resultado da validacao

- O lint dos arquivos alterados passou sem erros.
- O checklist manual da Fase 2 ainda nao foi executado no navegador neste fechamento.

### Fora do escopo desta fase

- outbound real via Graph API
- envio de mensagem teste
- OAuth/onboarding automatizado com Meta
- multiplas conexoes por loja
- refactor amplo do webhook

## 10 de marco de 2026 - WhatsApp/Meta multi-tenant por loja - Fase 1

### Objetivo

Implementar a infraestrutura base para suportar uma conexao WhatsApp Business por `Store`, com roteamento inbound nativo pelo identificador tecnico da Meta, sem depender de `x-store-id` no webhook real.

### Arquivos alterados

- `prisma/schema.prisma`
- `prisma/migrations/20260310193000_add_whatsapp_connection/migration.sql`
- `src/lib/whatsapp/parse.ts`
- `src/lib/whatsapp/connection.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Modelagem tecnica por loja

Foi criada a model `WhatsAppConnection`, relacionada diretamente com `Store`, contendo:

- `storeId`
- `provider`
- `phoneNumberId`
- `businessAccountId`
- `displayPhoneNumber`
- `verifyToken`
- `accessToken`
- `status`
- `isActive`
- `createdAt`
- `updatedAt`

Tambem foram adicionados:

- enum `WhatsAppProvider`
- enum `WhatsAppConnectionStatus`
- uniques para `storeId`, `phoneNumberId` e `verifyToken`

#### 2. Parser real do payload da Meta

`src/lib/whatsapp/parse.ts` deixou de ser apenas um parser de teste e passou a:

- aceitar payload real `object = "whatsapp_business_account"`
- extrair `phone_number_id`
- extrair `display_phone_number`
- extrair `entry.id` como `businessAccountId`
- extrair `providerMessageId`
- extrair `from`
- extrair `timestamp`
- extrair `type`
- extrair `text` quando a mensagem for `text`
- manter tratamento seguro para outros tipos

O payload de teste legado foi preservado para nao quebrar o fluxo local existente.

#### 3. Resolucao da conexao ativa

Foi criado `src/lib/whatsapp/connection.ts` com helpers minimos para:

- localizar conexao ativa por `verifyToken` no `GET`
- localizar conexao ativa por `phoneNumberId` no `POST`

Isso centraliza a leitura da conexao tecnica e deixa explicito o roteamento inbound por numero.

#### 4. Webhook Meta real

`app/api/webhooks/whatsapp/route.ts` passou a suportar:

- `GET` para challenge verification da Meta
- `POST` com payload real da WhatsApp Cloud API

No `GET`, o handler:

- valida `hub.mode`
- valida `hub.verify_token`
- responde `hub.challenge` quando a conexao ativa e encontrada

No `POST`, o handler:

- parseia o payload real
- ignora com seguranca eventos sem mensagens inbound
- resolve a conexao correta via `phoneNumberId`
- identifica a `Store` associada
- persiste a mensagem inbound em `ConversationMessage` usando o `storeId` correto
- reutiliza o fluxo conversacional existente sem depender de `x-store-id` para eventos Meta

O caminho legado com `x-store-id` foi mantido apenas para payload de teste fora da Meta real.

### Validacao executada

- `yarn prisma format`
- `yarn prisma generate`
- `yarn prisma migrate deploy`
- `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/whatsapp/parse.ts src/lib/whatsapp/connection.ts`
- `yarn tsc --noEmit --ignoreDeprecations 5.0`

### Resultado da validacao

- A migration `20260310193000_add_whatsapp_connection` foi aplicada com sucesso.
- O lint dos arquivos alterados passou sem erros.
- O `tsc` continua falhando por erros antigos fora do escopo, incluindo `.next/dev/types/validator.ts`, `app/(app)/usuarios/controllers/index.tsx`, `src/components/ui/app-sidebar.tsx`, `src/lib/auth-options.ts` e `src/scripts/seed.ts`.

### Fora do escopo desta fase

- UI/admin de onboarding da conexao WhatsApp por loja
- OAuth ou fluxo de autorizacao complexo
- envio outbound real para Graph API
- refactor amplo do fluxo conversacional

## 10 de marco de 2026 - Opcao 3 do WhatsApp com dados publicos da loja

### Objetivo

Tirar a opcao `3. Informacoes de atendimento` do fallback estatico e fazer o bot responder com dados reais da `Store`, mantendo fallback seguro quando a loja ainda nao tiver cadastro suficiente.

### Diagnostico encontrado antes da implementacao

- O model `Store` nao possuia campos publicos para telefone, WhatsApp, endereco, observacoes ou horario institucional.
- A intencao de informacoes existia em `src/lib/bot/flow.ts`, mas respondia sempre com texto fixo.
- Nao existia UI/admin para editar esses dados da `Store`.
- O projeto tinha UI para agenda semanal em `app/(app)/horarios-de-atendimento`, mas isso nao era usado como texto institucional da opcao `3`.
- Seed e migrations existentes nao tinham nenhuma coluna publica de loja.

### Arquivos alterados

- `prisma/schema.prisma`
- `prisma/migrations/20260310113000_add_store_public_info/migration.sql`
- `src/lib/store/public-info.ts`
- `src/lib/bot/types.ts`
- `src/lib/bot/flow.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `app/api/admin/stores/[id]/route.ts`
- `app/admin/dashboard/stores/[id]/page.tsx`
- `app/admin/dashboard/stores/[id]/store-public-info-form.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Persistencia de dados publicos na `Store`

Foram adicionados ao model `Store` os campos:

- `phone`
- `whatsappPhone`
- `address`
- `complement`
- `neighborhood`
- `city`
- `state`
- `zipcode`
- `serviceObservations`
- `businessHoursSummary`

A migration `20260310113000_add_store_public_info` foi criada e aplicada com `yarn prisma migrate deploy`.

#### 2. Resposta institucional real no WhatsApp

- O flow passou a emitir a acao explicita `REPLY_STORE_INFO`.
- A intencao de informacoes agora aceita:
  - `3`
  - `informacoes`
  - `endereco`
  - `horario`
  - `telefone`
  - `contato`
  - `onde fica`
- O webhook resolve essa acao lendo a `Store` pelo `storeId` ja existente no contexto seguro do webhook.
- A resposta do bot monta texto com telefone, WhatsApp, endereco, horario institucional e observacoes apenas quando esses campos estiverem preenchidos.
- Quando a loja nao tiver dados preenchidos, o fluxo continua com fallback honesto.

#### 3. UI/admin minima

- A tela existente de detalhes da loja no admin recebeu um formulario para editar os novos campos publicos.
- Foi adicionado `PATCH /api/admin/stores/[id]` com validacao em Zod e protecao por `SUPER_ADMIN`.
- Nenhum fluxo paralelo de configuracao foi criado nesta etapa.

### Validacao executada

- `yarn prisma format`
- `yarn prisma generate`
- `yarn prisma migrate deploy`
- `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/bot/flow.ts src/lib/bot/types.ts src/lib/store/public-info.ts app/api/admin/stores/[id]/route.ts app/admin/dashboard/stores/[id]/page.tsx app/admin/dashboard/stores/[id]/store-public-info-form.tsx`
- Smoke test local do flow para:
  - `3`
  - `informacoes`
  - `endereco`
  - `horario`
  - `telefone`
  - `contato`
  - `onde fica`
- Smoke test local da formatacao de resposta institucional
- Consulta direta ao banco apos a migration

### Resultado real no ambiente atual

- A estrutura e o fluxo estao prontos para responder com dados reais da loja.
- A migration ja foi aplicada ao banco configurado.
- Neste ambiente, todas as lojas existentes continuam com os novos campos nulos; portanto a opcao `3` ainda responde com fallback seguro ate que esses dados sejam preenchidos no admin.

### Pendencias fora do escopo

- `yarn tsc --noEmit --ignoreDeprecations 5.0` continua falhando por erros antigos em `.next/dev/types`, `usuarios/controllers`, `auth-options`, `app-sidebar` e `src/scripts/seed.ts`.
- Ainda nao foi criado fluxo de edicao desses dados para owner/admin da loja dentro do app multi-tenant; nesta etapa a edicao ficou no admin ja existente.

## 09 de marco de 2026 - Fluxo real de desmarcar/remarcar no WhatsApp

### Objetivo

Implementar a opcao 2 do menu do WhatsApp com fluxo real para listar agendamentos futuros do cliente, cancelar um agendamento ou iniciar a remarcacao reaproveitando a logica ja existente de disponibilidade e confirmacao.

### Arquivos alterados

- `src/lib/bot/types.ts`
- `src/lib/bot/flow.ts`
- `src/lib/appointments/availability.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260309153000_add_whatsapp_change_appointment_states/migration.sql`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Novos estados do bot

O `ConversationState` passou a suportar:

- `CHOOSING_APPOINTMENT`
- `CHOOSING_APPOINTMENT_ACTION`
- `CONFIRMING_APPOINTMENT_CANCELLATION`

Esses estados permitem manter o fluxo tipado no banco e no webhook, sem depender de subestado implícito em texto livre.

#### 2. Localizacao de agendamentos futuros

- A opcao `2` agora lista appointments futuros do cliente usando `Appointment.customerPhone` igual ao numero da conversa WhatsApp.
- A lista e apresentada de forma numerada para escolha simples e segura.
- Apenas appointments com status `SCHEDULED` ou `CONFIRMED` e `startAt` futuro entram no fluxo.

#### 3. Cancelamento real

- Depois de escolher o appointment, o bot pergunta se o cliente quer desmarcar ou remarcar.
- No caminho de cancelamento, o bot pede confirmacao explicita.
- Ao confirmar, o appointment recebe status `CANCELED` e metadata de auditoria do canal/conversa.
- Ao final, a conversa volta para `IDLE`.

#### 4. Remarcacao real

- Ao escolher remarcar, o webhook carrega os dados do appointment selecionado para o `AppointmentDraft`.
- O fluxo reaproveita:
  - servico
  - profissional, quando existir
  - sugestoes de horarios
  - texto livre
  - confirmacao final
- Na confirmacao da remarcacao, o sistema cancela o appointment original e cria um novo appointment, preservando melhor o historico do que sobrescrever o mesmo registro.

#### 5. Disponibilidade

- `src/lib/appointments/availability.ts` recebeu suporte para ignorar o appointment original durante a remarcacao.
- Isso evita falso conflito do agendamento com ele mesmo ao sugerir ou validar novo horario.

#### 6. Contexto da conversa

Foram adicionados campos em `conversation.context` para:

- `appointmentOptions`
- `selectedAppointmentId`
- `selectedAppointmentLabel`
- `rescheduleAppointmentId`

Esses campos permitem escolher o appointment por numero, manter o fluxo seguro e limpar o contexto ao concluir cancelamento ou remarcacao.

### Validacao executada

- `yarn prisma generate`
- `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/appointments/availability.ts src/lib/bot/flow.ts src/lib/bot/types.ts prisma/seed.ts`
- Smoke test local do flow para:
  - entrada pela opcao `2`
  - escolha de appointment por numero
  - acao `1` desmarcar
  - acao `2` remarcar
  - confirmacao de cancelamento
  - confirmacao de remarcacao

### Pendencias fora do escopo

- `yarn tsc --noEmit --ignoreDeprecations 5.0` continua falhando por erros antigos em outras partes do projeto.
- A opcao `3` do menu ainda permanece em fallback honesto.

### Resultado

O bot de WhatsApp agora consegue localizar appointments futuros do cliente pelo telefone, cancelar com confirmacao e conduzir remarcacao usando a mesma infraestrutura ja consolidada de draft, disponibilidade e confirmacao final.

## 09 de marco de 2026 - Sugestao ativa de horarios no WhatsApp

### Objetivo

Reduzir a dependencia de texto livre na etapa de horario do fluxo WhatsApp, oferecendo slots disponiveis de forma ativa e permitindo a escolha por numero, sem perder o comportamento atual de parse textual.

### Arquivos alterados

- `src/lib/appointments/availability.ts`
- `src/lib/bot/types.ts`
- `src/lib/bot/flow.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `prisma/seed.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Sugestao ativa em `CHOOSING_TIME`

- Ao entrar em `CHOOSING_TIME`, o bot agora calcula de 3 a 5 horarios validos para o servico e profissional escolhidos.
- A resposta passou a listar slots numerados com orientacao clara:
  - responder com o numero da opcao
  - ou informar outro dia e horario em texto livre

#### 2. Escolha de slot por numero

- `CHOOSING_TIME` agora diferencia:
  - numero isolado, que vira selecao de slot sugerido
  - texto livre, que continua usando o parser atual
- O slot escolhido por numero passa novamente pela validacao centralizada de disponibilidade antes de ser salvo no draft.

#### 3. Contexto de conversa

- `conversation.context.timeSlotSuggestions` passou a guardar os slots sugeridos mais recentes.
- O webhook atualiza esse contexto dentro da mesma transacao do processamento.
- As sugestoes sao limpas quando:
  - o servico muda
  - o profissional muda
  - o horario e salvo
  - o appointment final e confirmado

#### 4. Disponibilidade centralizada

Em `src/lib/appointments/availability.ts` foi adicionada a funcao reutilizavel para listar proximos slots disponiveis, reaproveitando a mesma regra ja existente de:

- agenda semanal
- bloqueios
- duracao do servico
- conflito com appointments
- profissional selecionado
- timezone consistente
- exclusao de horarios no passado

#### 5. Seed minima real

O seed oficial `prisma/seed.ts` foi reestruturado para criar uma massa idempotente de teste com:

- 1 loja ativa
- 1 owner
- 2 profissionais elegiveis para o mesmo servico
- 1 servico de 60 minutos
- agenda semanal de segunda a sexta
- 1 bloqueio real
- 1 appointment existente apenas para Ana

Esse seed tambem remove o appointment antigo sem profissional, que antes podia bloquear a loja inteira nos testes.

### Validacao executada

- `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/appointments/availability.ts src/lib/bot/flow.ts src/lib/bot/types.ts prisma/seed.ts`
- Smoke test local do flow para:
  - `CHOOSING_TIME` com numero
  - `CHOOSING_TIME` com texto livre
  - `CONFIRMING` com `NAO` e retorno para novas sugestoes

### Pendencias fora do escopo

- `yarn tsc --noEmit --ignoreDeprecations 5.0` continua falhando por erros antigos em outras partes do projeto.
- Desmarcar/remarcar e informacoes completas de atendimento continuam em fallback honesto no canal WhatsApp.

### Resultado

O fluxo de agendamento passou a ser mais guiado na etapa de horario, com menor atrito para o usuario final e uma massa minima real pronta para validar o comportamento com bloqueios, conflitos e diferenca entre profissionais.

## 09 de marco de 2026 - Entrada conversacional com menu inicial hibrido

### Objetivo

Melhorar a entrada do fluxo de WhatsApp para lidar melhor com mensagens genericas em `IDLE`, sem quebrar os atalhos existentes para usuarios que ja chegam com intencao clara.

### Arquivos alterados

- `src/lib/bot/types.ts`
- `src/lib/bot/flow.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Entrada conversacional em `IDLE`

- Mensagens como `oi`, `ola`, `bom dia`, `boa tarde`, `boa noite` e textos genericos agora recebem uma abertura mais acolhedora.
- O bot passou a responder com menu inicial hibrido:
  - `1. Agendar horario`
  - `2. Desmarcar ou remarcar`
  - `3. Informacoes de atendimento`
- O menu aceita tanto numero quanto texto livre.

#### 2. Atalhos diretos preservados

- Intencoes claras continuam ignorando o menu e indo direto para o caminho correto.
- `quero agendar`, `marcar horario` e similares continuam levando direto para `CHOOSING_SERVICE`.
- `desmarcar`, `remarcar` e similares recebem fallback honesto sem travar a conversa.
- `horario de atendimento`, `endereco` e similares recebem fallback seguro e objetivo.

#### 3. Controle de repeticao do menu

- Foi adicionado `PATCH_CONTEXT` no fluxo do bot para atualizar contexto leve da conversa.
- `conversation.context.mainMenuShown` passou a controlar se o menu completo ja foi exibido.
- Depois da primeira abertura, o fallback fica mais curto e evita repetir a mensagem completa em toda interacao.

#### 4. Webhook

O webhook `app/api/webhooks/whatsapp/route.ts` passou a:

- montar um contexto tipado para o flow
- aplicar `PATCH_CONTEXT` dentro da mesma transacao do processamento
- persistir `mainMenuShown` sem quebrar a idempotencia existente
- preservar integralmente o fluxo atual de servico, profissional, horario e confirmacao

### Validacao executada

- `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/bot/flow.ts src/lib/bot/types.ts`
- Smoke test local do flow com:
  - `oi`
  - `1`
  - `2`
  - `3`
  - `quero agendar cabelo`
  - fallback generico com `mainMenuShown = true`

### Pendencias fora do escopo

- `yarn tsc --noEmit --ignoreDeprecations 5.0` continua falhando por erros antigos fora desta entrega, nos mesmos arquivos ja conhecidos do projeto.

### Resultado

O canal WhatsApp agora recebe melhor usuarios que chegam com saudacao ou mensagem vaga, mas continua rapido para quem ja entra com intencao clara de agendar.

## 09 de marco de 2026 - Selecao de profissional no fluxo WhatsApp

### Objetivo

Implementar a etapa de selecao de profissional no fluxo de agendamento via WhatsApp usando a modelagem atual de equipe:

- buscar profissionais elegiveis por servico
- auto-selecionar quando existir apenas 1 elegivel
- perguntar ao usuario quando existir mais de 1 elegivel
- aceitar resposta por numero ou nome
- validar disponibilidade por profissional
- garantir que o `Appointment` final fique vinculado ao profissional correto

### Arquivos alterados

- `src/lib/bot/types.ts`
- `src/lib/bot/flow.ts`
- `src/lib/appointments/availability.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Flow do bot

- Reaproveitado o estado existente `CHOOSING_STAFF` do Prisma.
- `CHOOSING_SERVICE` agora executa:
  - `SELECT_SERVICE_FROM_TEXT`
  - `RESOLVE_STAFF_FOR_DRAFT`
- `CHOOSING_STAFF` agora executa:
  - `SELECT_STAFF_FROM_TEXT`
- `CONFIRMING` continua retornando para `CHOOSING_TIME` quando o usuario responde `NAO`, preservando o profissional ja escolhido.

#### 2. Elegibilidade de profissional

Em `src/lib/appointments/availability.ts` foram adicionados helpers reutilizaveis para:

- listar profissionais elegiveis da loja atual
- exigir tipo `PROFISSIONAL`
- exigir vinculo com o servico via `MembershipService`
- ordenar a lista por nome para manter estavel a escolha por numero
- resolver a resposta do usuario por numero, nome completo ou nome parcial

#### 3. Webhook WhatsApp

O handler `app/api/webhooks/whatsapp/route.ts` passou a:

- salvar o servico no draft e, em seguida, resolver o profissional
- tratar os casos:
  - 0 elegiveis -> responde indisponibilidade e volta para `CHOOSING_SERVICE`
  - 1 elegivel -> salva automaticamente e segue para `CHOOSING_TIME`
  - 2+ elegiveis -> envia lista e muda para `CHOOSING_STAFF`
- aceitar selecao por:
  - indice (`1`, `2`, `3`)
  - nome
  - parte do nome
- persistir `staffMembershipId` no `AppointmentDraft`
- criar `Appointment` final com `staffMembershipId` correto

#### 4. Disponibilidade por profissional

A regra centralizada em `src/lib/appointments/availability.ts` foi ajustada para:

- manter agenda semanal e bloqueios no nivel da loja
- filtrar conflito de `Appointment` pelo `staffMembershipId` escolhido
- permitir que um horario esteja ocupado para Ana e livre para Bruno
- continuar tratando `Appointment` sem profissional (`staffMembershipId = null`) como bloqueio geral da loja

### Regras e observacoes

- O modelo atual nao possui flag de ativo para `Membership`; por isso a elegibilidade usa apenas:
  - `storeId`
  - tipo `PROFISSIONAL`
  - vinculo ao servico
- Como o fluxo ainda nao coleta nome do cliente, `Appointment.customerName` continua usando fallback `Cliente WhatsApp` quando necessario.

### Validacao executada

- `eslint` dos arquivos alterados: OK
- smoke test local do helper de selecao de profissional:
  - escolha por numero
  - escolha por nome
  - escolha por nome parcial
  - resposta invalida

### Pendencias fora do escopo

- `yarn tsc --noEmit --ignoreDeprecations 5.0` ainda falha por erros antigos em outros pontos do projeto:
  - `.next/dev/types/validator.ts`
  - `app/(app)/usuarios/controllers/index.tsx`
  - `src/components/ui/app-sidebar.tsx`
  - `src/lib/auth-options.ts`
  - `src/scripts/seed.ts`

### Resultado

O fluxo do WhatsApp agora resolve profissional antes da escolha de horario e a disponibilidade deixa de bloquear a loja inteira quando apenas um profissional especifico esta ocupado.
