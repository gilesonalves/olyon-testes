## 1 de julho de 2026 - Diagnostico e correcao do login de owner criado pelo admin

### Objetivo

Diagnosticar o `CredentialsSignin` de `jhonatan@olyon.com`, tornar as recusas do `authorize()` observaveis sem dados sensiveis e transformar `Gerenciar owner` em uma tela capaz de editar e redefinir a senha do proprietario atual.

### Diagnostico

- A leitura segura do banco confirmou que o `User` existe e que a senha salva e nao vazia e possui formato bcrypt.
- O usuario possui `Membership OWNER` na loja `Brunela`, e essa `Store` esta ativa.
- Assim, foram descartadas as hipoteses de senha ausente, membership ausente, role invalida e loja inativa.
- Para o e-mail exato, o fluxo atual so pode chegar a `CredentialsSignin` porque a senha informada nao confere com o hash salvo. O valor em texto usado na criacao nao existe no banco e nao foi registrado em log.
- Havia ainda uma falha independente: o `authorize()` buscava o e-mail sem `trim` ou normalizacao para minusculas, podendo classificar variacoes do mesmo e-mail como `user not found`.
- O cadastro publico atual e apenas uma tela sem persistencia e nao oferece um fluxo reutilizavel de convite ou definicao de senha.
- Os formularios admin de nova loja e novo owner ja exigiam senha inicial por Zod; as actions ja usavam `bcrypt.hash(..., 10)`, criavam Store ativa e `Membership OWNER`.
- O bug confirmado nessas actions era a rejeicao de um e-mail ja cadastrado, impedindo que o mesmo usuario recebesse membership em outra Store.
- A rota `/admin/dashboard/stores/[id]/owner` nao consultava a loja nem o `Membership OWNER`; ela sempre mostrava `Novo proprietario`, mesmo quando o owner ja existia.
- Nao havia API ou action administrativa para editar os dados do owner atual ou redefinir `User.password`.

### O que foi corrigido

- `authorize()` agora normaliza o e-mail antes do `findUnique`.
- Foram adicionados logs para `user not found`, `missing password hash`, `invalid password`, `user without membership`, `inactive store` e `success`.
- Nenhum desses logs inclui senha, hash, token ou payload de credenciais.
- A mensagem publica da tela de login continua generica: `Credenciais inválidas ou acesso negado.`
- `createStore` passou a fazer `upsert` do owner por e-mail: cria um usuario novo com bcrypt ou reutiliza o existente com `update: {}`, sem sobrescrever nome, senha ou role global.
- `createOwner` recebeu o mesmo comportamento e agora cria ou promove o `Membership` da Store alvo para `OWNER`.
- A troca de owner preserva o usuario atual quando ele ja e o owner e rebaixa para `ADMIN` apenas um owner anterior diferente.
- Os formularios informam que a senha atual sera preservada quando o e-mail ja existir.
- A pagina de owner agora busca somente `user.id`, nome, e-mail e role do `Membership OWNER`; nenhum hash e selecionado ou enviado ao client.
- Quando existe owner, a tela mostra `Proprietario atual`, formulario separado de nome/e-mail e formulario separado de redefinicao de senha com mostrar/ocultar.
- Quando nao existe owner, o formulario anterior de `Novo proprietario` continua sendo usado.
- `PATCH /api/admin/stores/[id]/owner` atualiza nome/e-mail, recusa e-mail pertencente a outro usuario com 409 e nao faz merge automatico.
- `PATCH /api/admin/stores/[id]/owner/password` valida senha/confirmacao com Zod e usa o helper bcrypt de custo 10 para atualizar `User.password`.
- Os dois endpoints exigem `SUPER_ADMIN` e usam respostas `{ ok: true, data }` ou `{ ok: false, error }`.

### Arquivos alterados

- `src/lib/auth-options.ts`
- `src/lib/actions/create-store.ts`
- `src/lib/actions/create-store.types.ts`
- `src/lib/actions/create-owner.ts`
- `src/lib/actions/create-owner.types.ts`
- `src/lib/admin/require-super-admin.ts`
- `src/lib/admin/store-owner.ts`
- `app/(auth)/login/page.tsx`
- `app/api/admin/stores/[id]/owner/route.ts`
- `app/api/admin/stores/[id]/owner/password/route.ts`
- `app/admin/dashboard/stores/new/page.tsx`
- `app/admin/dashboard/stores/[id]/page.tsx`
- `app/admin/dashboard/stores/[id]/owner/page.tsx`
- `app/admin/dashboard/stores/[id]/owner/owner-form.tsx`
- `app/admin/dashboard/stores/[id]/owner/owner-management.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### Validacao

- A consulta diagnostica selecionou apenas indicadores seguros: existencia do usuario, presenca/formato do hash, role do membership e status da loja.
- Um teste transacional isolado confirmou owner novo com bcrypt valido, criacao de `Membership OWNER`, preservacao da senha do usuario existente e rollback sem residuos.
- Um segundo teste transacional confirmou edicao de nome/e-mail e redefinicao bcrypt do owner da Brunela; o rollback restaurou nome, e-mail e hash originais sem imprimir esses valores.
- `yarn eslint` concluiu sem erros e apresentou somente os 2 warnings legados de variavel `data` nao utilizada em cadastro e recuperacao de senha.
- `yarn tsc --noEmit --pretty false --incremental false` concluiu sem erros.
- O teste manual de redefinicao e login de Jhonatan nao foi executado automaticamente para evitar escolher ou expor uma nova credencial sem orientacao do operador.
- A verificacao manual final deve redefinir uma senha controlada pela nova tela, confirmar login, recusa da senha errada, Store Brunela selecionada e logs seguros de sucesso/falha.

## 30 de junho de 2026 - Retomada automatica apos 30 minutos de inatividade

### Objetivo

Evitar que uma conversa em atendimento humano fique presa em `PAUSED`: no primeiro inbound recebido apos 30 minutos sem movimentacao, o bot deve retomar e processar normalmente a mensagem do cliente.

### Arquivos alterados

- `src/lib/whatsapp/human-attendance.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### Diagnostico

- `Conversation.lastMessageAt` e o campo atual que representa a ultima movimentacao da conversa.
- O webhook atualizava `lastMessageAt` no `upsert` antes de verificar `PAUSED`; isso apagaria a referencia anterior e impediria qualquer expiracao por inatividade.
- O schema ja possui campos antigos de auto-retomada em `BotSettings`, mas a nova regra de negocio foi definida globalmente em 30 minutos e nao exige nova tela ou migration.

### O que foi ajustado

- Criada a constante `HUMAN_ATTENDANCE_AUTO_RESUME_MINUTES = 30`.
- A helper compartilhada classifica a conversa como `wasNotPaused`, `stillPaused` ou `resumedByInactivity`.
- A helper usa o timestamp mais recente entre o `lastMessageAt` anterior ao inbound e a ultima mensagem persistida, abandona drafts ativos, reseta o contexto do bot e move a conversa expirada de `PAUSED` para `IDLE`.
- O inbound agora preserva o timestamp anterior para a verificacao e atualiza `lastMessageAt` somente depois de persistir a nova `ConversationMessage IN`.
- Antes de 30 minutos, a mensagem continua salva no historico, a conversa permanece pausada e o bot nao responde automaticamente.
- Apos 30 minutos, o webhook reutiliza `Atendimento automatico retomado.`, registra o log de retomada e continua o fluxo normal para o texto recebido.
- Comandos de retomada existentes, como `menu`, `agendar`, `retomar bot` e `atendimento automatico`, permanecem preservados quando a pausa ainda nao expirou.
- Foram adicionados os logs seguros `whatsapp human attendance still paused` e `whatsapp human attendance resumed by inactivity`, contendo somente loja, conversa, timestamp e minutos aproximados.

### Estrategia de teste segura

1. Usar somente uma conversa de teste e anotar seu `id` e `lastMessageAt` original.
2. Confirmar primeiro que um inbound antes de 30 minutos permanece sem resposta automatica, exceto pelos comandos de retomada ja existentes.
3. Em ambiente controlado, alterar apenas o `lastMessageAt` dessa conversa para pelo menos 31 minutos no passado.
4. Enviar uma nova mensagem do cliente e confirmar o log `whatsapp human attendance resumed by inactivity`, a mensagem de retomada e a resposta normal do bot.
5. O proprio inbound deve atualizar `lastMessageAt` para o horario atual; se o teste falhar antes do inbound, restaurar imediatamente o valor original anotado.
6. Nao aplicar o ajuste temporario em conversas reais de clientes.

### Validacao local

- `yarn eslint`
- `yarn tsc --noEmit --pretty false --incremental false`
- `git diff --check`

## 30 de junho de 2026 - Pausa do bot por smb_message_echoes

### Objetivo

Pausar automaticamente o bot quando a loja responder pelo WhatsApp Business, WhatsApp Web ou outro dispositivo vinculado suportado pela Meta, mantendo o atendimento e o historico sincronizados no Olyon.

### Arquivos alterados

- `src/lib/whatsapp/parse.ts`
- `src/lib/whatsapp/connection.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `app/api/store/current/whatsapp/conversations/[id]/messages/send/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### Arquivo criado

- `src/lib/whatsapp/human-attendance.ts`

### Diagnostico

- O campo `message_echoes` comum nao e o evento correto para mensagens manuais do WhatsApp Business em coexistencia.
- O campo Meta correto e `smb_message_echoes`, cujo payload usa `value.message_echoes[]` e identifica o contato do cliente em `to`.
- O painel `/atendimento` ja pausava a conversa ao enviar manualmente, mas essa transicao estava implementada dentro da propria rota e nao era reutilizavel pelo webhook.

### O que foi ajustado

- O parser Meta agora reconhece somente `changes[].field = "smb_message_echoes"` para esse fluxo e extrai WABA, phone number, contato do cliente, tipo, texto e `providerMessageId`.
- O webhook resolve a conexao ativa por `phoneNumberId` e procura a conversa WhatsApp da mesma loja pelo contato do cliente.
- Antes de pausar, o webhook compara o `providerMessageId` com mensagens outbound ja persistidas. Echoes do proprio Olyon/bot sao ignorados.
- Mensagens desconhecidas enviadas externamente sao persistidas como `ConversationMessage OUT`, com metadados `human`, `manual` e origem `smb_message_echoes`.
- A atualizacao para `PAUSED` foi extraida para uma helper compartilhada e passou a ser usada tanto pelo painel quanto pelo webhook.
- Na primeira pausa externa, o aviso usa o `humanHandoffMessage` configurado em `/configuracoes/bot`. Conversas ja pausadas nao recebem o aviso novamente.
- Logs seguros foram adicionados para recebimento do echo, deteccao de mensagem manual e eventual falha no aviso, sem token ou payload completo.

### Requisito Meta

- O app Meta precisa permanecer assinado no campo `smb_message_echoes`.
- `message_echoes` nao substitui esse campo no fluxo WhatsApp Business em coexistencia.

### Teste manual pendente

1. Confirmar `smb_message_echoes` assinado na Meta.
2. Enviar `menu` de um cliente para `+55 27 99823-8437` e confirmar a resposta do bot.
3. Responder `um momento` pelo WhatsApp Business da loja.
4. Confirmar os logs `whatsapp smb_message_echo received` e `whatsapp manual external message detected, pausing bot`.
5. Confirmar a conversa `PAUSED` e a mensagem manual no `/atendimento`.
6. Enviar `Agendar horario` pelo cliente e confirmar que o bot nao responde.
7. Retomar ou encerrar pelo fluxo existente e confirmar que o bot so volta quando permitido.

### Validacao local

- `yarn eslint`
- `yarn tsc --noEmit --pretty false --incremental false`

## 30 de junho de 2026 - Inscricao automatica da WABA nos webhooks da Meta

### Objetivo

Garantir que toda WABA conectada pelo Embedded Signup seja inscrita no app Meta via `subscribed_apps` e permitir a recuperacao segura de conexoes ja salvas.

### Arquivos alterados

- `app/api/whatsapp/embedded-signup/callback/route.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### Arquivos criados

- `src/lib/whatsapp/meta-webhook-subscription.ts`
- `app/api/admin/stores/[id]/whatsapp/subscribe-webhook/route.ts`

### Diagnostico

- O teste fake da Meta chega em `POST /api/webhooks/whatsapp`, confirmando a configuracao do webhook global e a assinatura do campo `messages`.
- Mensagens reais para a loja Teste Meta nao chegavam ao Vercel.
- O token do Graph API Explorer nao acessava a WABA criada via Embedded Signup.
- A WABA nova precisava ser inscrita no app com `POST /{businessAccountId}/subscribed_apps`, usando o `accessToken` salvo na conexao da propria loja.

### O que foi ajustado

- Criado helper server-side para assinar a WABA na Graph API, com timeout, versao configuravel por `META_GRAPH_API_VERSION` e logs sem `accessToken`.
- O callback do Embedded Signup agora assina a WABA depois do upsert da `WhatsAppConnection`.
- Se a assinatura falhar, o callback marca a conexao como `ERROR` e retorna `502` com mensagem legivel, evitando manter como `CONNECTED` uma conexao sem inbound funcional.
- Criada a rota `POST /api/admin/stores/{storeId}/whatsapp/subscribe-webhook`, restrita a `SUPER_ADMIN`, para reassinar uma conexao ativa existente.
- A rota administrativa valida loja, provider, `businessAccountId` e `accessToken`, nunca devolve o token e restaura o status `CONNECTED` depois da assinatura.
- O log de conexao inbound nao encontrada agora inclui motivo, `phoneNumberId`, `businessAccountId`, `providerMessageId`, remetente e presenca de texto, sem payload completo.

### Proximo teste manual

1. Fazer deploy da branch.
2. Chamar `POST /api/admin/stores/cmoinxmwy000004icphodyy2s/whatsapp/subscribe-webhook` autenticado como `SUPER_ADMIN`.
3. Confirmar resposta de sucesso para a WABA `180613333431995`.
4. Enviar mensagem real para `+55 27 99823-8437` e confirmar o POST no Vercel.
5. Confirmar `phoneNumberId` `1041807935681242`, conversa em `/atendimento` e resposta do bot ao comando `menu`.
6. Repetir o Embedded Signup em outra loja para validar a assinatura automatica.

### Validacao local

- `yarn eslint`
- `yarn tsc --noEmit --pretty false --incremental false`

## 2 de junho de 2026 - Favicon oficial do Olyon

### Objetivo

Adicionar o icone oficial do Olyon para aparecer corretamente na aba do navegador.

### Arquivos alterados

- `app/layout.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### Arquivos criados

- `app/icon.png`

### Diagnostico

- Ja existia `app/favicon.png`, um PNG quadrado de 1254x1254 com o icone do Olyon.
- Nao havia `public/` com assets adicionais nem `src/assets/`.
- As telas de login/sidebar referenciam `/imagens/logo-login.svg`, mas esse arquivo nao foi localizado no workspace atual.
- O App Router reconhece `app/icon.png` como arquivo especial de metadata; `app/favicon.png` nao e o nome mais adequado para favicon automatico.
- `app/layout.tsx` ja possuia metadata global.

### O que foi ajustado

- Gerada uma versao 512x512 do PNG existente em `app/icon.png`.
- Atualizada a metadata global para usar a descricao do Olyon e declarar `icons.icon`/`icons.apple` apontando para `/icon.png`.

### Fora de escopo mantido

- Sem Prisma.
- Sem migration.
- Sem webhook.
- Sem fluxo WhatsApp.
- Sem alterar `/atendimento`.
- Sem alterar `/configuracoes/bot`.

### Validacao

- O arquivo `app/icon.png` foi gerado e servido pelo dev server em `/icon.png`.
- `yarn eslint` e `yarn tsc --noEmit --pretty false --incremental false` foram executados apos a alteracao.

## 2 de junho de 2026 - BotSettings no menu inicial do WhatsApp real

### Objetivo

Garantir que as respostas de boas-vindas, menu e retomada do bot WhatsApp usem `BotSettings` da loja atual, sem manter o menu inicial hardcoded antigo no fluxo do bot.

### Arquivos alterados

- `src/lib/bot/flow.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### Diagnostico

- O webhook real ja carrega `getBotSettingsForStore(currentStoreId)` usando o `storeId` resolvido pela conexao WhatsApp inbound.
- Os pontos que montam o menu inicial no webhook passam por `buildMainMenuMessage(botSettings)`, que usa `welcomeMessage` e respeita `showMenuAfterWelcome`.
- O comando de pausa/handoff do cliente ja usa `botSettings.customerRequestedHumanMessage`.
- Ainda existia em `src/lib/bot/flow.ts` um helper legado `getWelcomeMenuText()` com `WELCOME_MENU_TEXT` contendo `Olá! Como posso te ajudar?` e as opcoes do menu hardcoded.
- Na retomada de conversa pausada, o webhook enviava uma frase fixa `Atendimento automatico retomado. Vou te mostrar o menu inicial.` antes do menu.

### O que foi ajustado

- Removido o helper legado `getWelcomeMenuText()` e a constante `WELCOME_MENU_TEXT` de `src/lib/bot/flow.ts`.
- A retomada de conversa pausada agora envia apenas `Atendimento automático retomado.` e, em seguida, chama `buildMainMenuMessage(botSettings)`.
- O menu inicial segue centralizado em `buildMainMenuMessage(botSettings)`:
  - com `showMenuAfterWelcome = true`, envia `settings.welcomeMessage` com lista de opcoes;
  - com `showMenuAfterWelcome = false`, envia somente `settings.welcomeMessage`.

### Deploy e banco

- Para o WhatsApp real, o inbound usa o webhook publico `https://olyon-testes.vercel.app/api/webhooks/whatsapp`.
- As configuracoes precisam estar salvas no banco usado por esse deploy publico.
- Se `/configuracoes/bot` for testada em `localhost`, o `/atendimento` local pode ler o banco local, mas mensagens inbound do WhatsApp continuam usando o ambiente publico configurado na Meta.
- Confirmar no deploy que a migration `20260602221348_add_bot_settings` foi aplicada no banco da Vercel; se necessario, usar `yarn prisma migrate deploy` no ambiente de deploy.
- Depois de confirmar o banco correto, salvar a mensagem em `/configuracoes/bot` no mesmo ambiente do webhook publico.

### Validacao

- Busca por `Olá! Como posso te ajudar?`, `Atendimento automático retomado`, `Chat pausado` e `Como posso te ajudar` foi refeita.
- O unico `Olá! Como posso te ajudar?` remanescente em codigo fica em `DEFAULT_BOT_SETTINGS`, como fallback seguro quando nao ha `BotSettings` salvo.
- `yarn eslint` e `yarn tsc --noEmit --pretty false --incremental false` foram executados apos a correcao.

## 2 de junho de 2026 - Correcao do GET/PUT de Configuracoes do Bot

### Objetivo

Corrigir a falha de carregamento e salvamento da tela `/configuracoes/bot`, mantendo o salvamento restrito a perfis com permissao administrativa.

### Arquivos alterados

- `app/api/store/current/bot-settings/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### Diagnostico

- A model `BotSettings` existe no Prisma schema.
- A migration `20260602221348_add_bot_settings` existe e a tabela `BotSettings` esta criada no banco atual.
- O banco possui indice unico `BotSettings_storeId_key` e indice `BotSettings_storeId_idx`.
- O Prisma Client gerado conhece `prisma.botSettings`.
- O erro real no terminal do Next era `Cannot read properties of undefined (reading 'findUnique')` no GET e `Cannot read properties of undefined (reading 'upsert')` no PUT, indicando que o processo `next dev` antigo ainda estava com Prisma Client carregado antes do `BotSettings`.
- Apos `yarn prisma generate` e restart do `next dev`, `prisma.botSettings` passou a responder corretamente na API.
- Tambem foi encontrada uma divergencia no contrato de permissao do `GET /api/store/current/bot-settings`: ele exigia `ADMIN`, enquanto rotas estaveis de leitura operacional da loja, como conversas WhatsApp, usam `STAFF`.

### O que foi ajustado

- `GET /api/store/current/bot-settings` agora exige apenas membro da loja (`STAFF` ou superior), carrega defaults/configuracao para a loja atual e segue sem aceitar `storeId` por body.
- `PUT /api/store/current/bot-settings` permanece restrito a `ADMIN` ou superior, com Zod, upsert por `storeId` da sessao e sem alterar `storeId` no update.
- Logs controlados foram ajustados para `bot settings load failed` e `bot settings save failed`, sem dados sensiveis.

### Validacao

- A checagem direta com Prisma confirmou tabela, indices, registro salvo e delegate `prisma.botSettings`.
- Com sessao JWT local autenticada, `GET /api/store/current/bot-settings` retornou 200 com defaults quando nao havia registro salvo.
- Com sessao `OWNER`, `PUT /api/store/current/bot-settings` retornou 200 e criou o registro `BotSettings` para a loja atual.
- `PUT /api/store/current/bot-settings` com `storeId` no body retornou 400.
- Um novo `GET /api/store/current/bot-settings` retornou 200 com os valores salvos.
- `yarn prisma generate`, `yarn eslint` e `yarn tsc --noEmit --pretty false --incremental false` foram executados apos a correcao.

## 2 de junho de 2026 - Configuracoes do Bot por loja

### Objetivo

Criar a primeira versao persistida das configuracoes do bot por loja, cobrindo mensagens configuraveis e preparo do tempo de retorno automatico.

### Arquivos criados

- `prisma/migrations/20260602221348_add_bot_settings/migration.sql`
- `src/lib/validators/bot-settings.ts`
- `src/lib/bot/settings.ts`
- `app/api/store/current/bot-settings/route.ts`
- `app/(app)/configuracoes/bot/page.tsx`

### Arquivos alterados

- `prisma/schema.prisma`
- `src/components/ui/app-sidebar.tsx`
- `src/lib/bot/flow.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `app/api/store/current/whatsapp/conversations/[id]/messages/send/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- Criada a model `BotSettings`, 1:1 por `Store`, com mensagens configuraveis, `showMenuAfterWelcome`, `autoResumeEnabled` e `autoResumeAfterMinutes`.
- Criada migration Prisma `20260602221348_add_bot_settings` via `yarn prisma migrate dev --name add_bot_settings --create-only` e aplicada depois com `yarn prisma migrate dev --name add_bot_settings`.
- Criado helper `getBotSettingsForStore(storeId)`, retornando sempre configuracao completa com defaults quando ainda nao existe registro salvo.
- Criado validator Zod `botSettingsSchema`, com trim, limite de 1000 caracteres para mensagens e intervalo de 5 a 1440 minutos para retorno automatico.
- Criada API `GET/PUT /api/store/current/bot-settings`, store-scoped por sessao, com `ADMIN`, rejeitando `storeId` no body e usando respostas JSON padronizadas.
- Criada pagina `/configuracoes/bot` com formulario de mensagens, toggles e tempo de retorno automatico.
- Sidebar ganhou o item `Configuracoes do Bot` dentro do grupo `Configuracoes`.
- O webhook passa a usar `welcomeMessage` e `showMenuAfterWelcome` no menu inicial e `customerRequestedHumanMessage` quando o cliente pede atendente.
- O envio manual em `/atendimento` passa a usar `humanHandoffMessage` configurada e, quando a conversa ainda nao estava `PAUSED`, envia/persiste o handoff antes da mensagem manual do operador.

### Fora de escopo mantido

- Sem alterar Embedded Signup.
- Sem alterar templates WhatsApp.
- Sem expor `accessToken` no frontend.
- Sem cron de retorno automatico nesta etapa.

### Pendencia registrada

- `autoResumeEnabled` e `autoResumeAfterMinutes` ficam persistidos e editaveis, mas o retorno automatico ainda nao foi ativado tecnicamente porque o schema atual nao diferencia com seguranca pausa solicitada pelo cliente, pausa iniciada pelo operador e existencia de resposta humana posterior.

### Validacao

- `yarn prisma migrate dev --name add_bot_settings --create-only` criou a migration.
- `yarn prisma migrate dev --name add_bot_settings` aplicou a migration e deixou o banco em sync com o schema.
- `yarn prisma generate` passou.
- `yarn eslint` passou sem erros. Permanecem 2 warnings antigos fora do escopo em `app/(auth)/cadastro/controllers/index.tsx` e `app/(auth)/recuperar-senha/controllers/index.tsx`, ambos por `data` nao usada.
- `yarn tsc --noEmit --pretty false --incremental false` passou sem erros.
- O Yarn/Node exibiu o warning legado `DEP0005 Buffer()`, sem falha.

## 2 de junho de 2026 - Aviso automatico ao iniciar atendimento humano WhatsApp

### Objetivo

Avisar o cliente no WhatsApp quando o operador iniciar o atendimento humano pelo `/atendimento`, sem repetir esse aviso enquanto a conversa ja estiver `PAUSED`.

### Arquivos alterados

- `app/api/store/current/whatsapp/conversations/[id]/messages/send/route.ts`
- `app/(app)/atendimento/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- O endpoint de envio manual passou a ler o `state` da conversa e a calcular se o aviso de handoff deve ser enviado.
- Quando a conversa ainda nao estava `PAUSED`, o fluxo envia a mensagem manual do operador, persiste a `ConversationMessage OUT`, pausa a conversa e envia uma segunda mensagem automatica: "Certo, vou te passar para o atendimento humano. Nossa equipe continuará a conversa por aqui."
- A mensagem automatica tambem e persistida como `ConversationMessage OUT`, com payload `manual_attendance_handoff_notice`.
- Quando a conversa ja estava `PAUSED`, o endpoint envia somente a mensagem manual e nao repete o aviso automatico.
- Se a mensagem manual falhar na Meta, nada e pausado nem persistido, mantendo o comportamento anterior.
- Se o aviso automatico falhar depois da mensagem manual, a falha e registrada em uma `ConversationMessage OUT` com status `FAILED` e a resposta retorna `handoffError` para a UI.
- A UI passa a adicionar `handoffMessage` no historico imediatamente quando a API retornar essa mensagem, mantendo a conversa como `HUMANO`/`PAUSED`.

### Fora de escopo mantido

- Sem migration Prisma.
- Sem alterar schema Prisma.
- Sem alterar webhook.
- Sem alterar templates WhatsApp.
- Sem alterar Embedded Signup.
- Sem expor `accessToken` no frontend.

### Validacao

- `yarn eslint` passou sem erros. Permanecem 2 warnings antigos fora do escopo em `app/(auth)/cadastro/controllers/index.tsx` e `app/(auth)/recuperar-senha/controllers/index.tsx`, ambos por `data` nao usada.
- `yarn tsc --noEmit --pretty false --incremental false` passou sem erros.
- O Yarn/Node exibiu o warning legado `DEP0005 Buffer()`, sem falha.

## 2 de junho de 2026 - Envio manual pausa bot no atendimento WhatsApp

### Objetivo

Garantir que qualquer mensagem manual enviada pela aba `/atendimento` assuma atendimento humano ativo, impedindo o bot de responder automaticamente no meio da conversa.

### Arquivos alterados

- `app/api/store/current/whatsapp/conversations/[id]/messages/send/route.ts`
- `app/(app)/atendimento/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- O endpoint de envio manual continua resolvendo a loja pela sessao, rejeitando `storeId` no body e validando a conversa por `id`, `storeId` e `channel = WHATSAPP`.
- Depois do envio pela WhatsApp Cloud API e da persistencia da mensagem `OUT`, a conversa passa para `state = PAUSED` e atualiza `lastMessageAt`.
- A resposta do endpoint agora devolve a conversa atualizada junto com a mensagem enviada, para a UI refletir o novo estado sem aguardar polling.
- A lista lateral de `/atendimento` passa a mostrar `HUMANO` para conversas `PAUSED`.
- O painel da conversa selecionada exibe o aviso "Atendimento humano ativo. O bot está pausado nesta conversa." e mantem o botao `Retomar bot`.
- Ao enviar mensagem manual ou retomar o bot, a UI atualiza estado selecionado, badge e historico imediatamente e depois reconcilia com reload silencioso.

### Fora de escopo mantido

- Sem migration Prisma.
- Sem alterar schema Prisma.
- Sem alterar webhook.
- Sem alterar fluxo de templates WhatsApp.
- Sem alterar Embedded Signup.
- Sem expor `accessToken` no frontend.

### Validacao

- `yarn eslint` passou sem erros. Permanecem 2 warnings antigos fora do escopo em `app/(auth)/cadastro/controllers/index.tsx` e `app/(auth)/recuperar-senha/controllers/index.tsx`, ambos por `data` nao usada.
- `yarn tsc --noEmit --pretty false --incremental false` passou sem erros.
- O Yarn/Node exibiu o warning legado `DEP0005 Buffer()`, sem falha.

## 1 de junho de 2026 - Aba oficial de atendimento WhatsApp

### Objetivo

Criar a primeira versao oficial do inbox humano WhatsApp em `/atendimento`, usando as conversas reais persistidas pelo webhook, envio manual pela Cloud API e a `WhatsAppConnection` ativa da loja atual.

### Arquivos criados

- `app/(app)/atendimento/page.tsx`
- `app/api/store/current/whatsapp/conversations/route.ts`
- `app/api/store/current/whatsapp/conversations/[id]/messages/route.ts`
- `app/api/store/current/whatsapp/conversations/[id]/messages/send/route.ts`
- `src/lib/validators/whatsapp-attendance.ts`

### Arquivos alterados

- `src/components/ui/app-sidebar.tsx`
- `middleware.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### APIs criadas

- `GET /api/store/current/whatsapp/conversations`
- `GET /api/store/current/whatsapp/conversations/[id]/messages`
- `POST /api/store/current/whatsapp/conversations/[id]/messages/send`

### O que foi implementado

- A pagina `/atendimento` foi criada no app autenticado com status da conexao WhatsApp, aviso da janela de 24h, busca, lista de conversas, historico e polling simples a cada 5 segundos.
- `middleware.ts` passou a proteger `/atendimento` como rota do app autenticado.
- O sidebar ganhou o item oficial `Atendimento` apontando para `/atendimento`, com icone `MessageCircle`.
- A listagem usa `Conversation.channel = WHATSAPP`, `Conversation.contact`, `Conversation.lastMessageAt`, `ConversationMessage.text`, `providerMessageId` e `payload`, sempre filtrando por `storeId` resolvido pela sessao/membership.
- O historico normaliza `ConversationMessage.text` para `body`, retorna mensagens em ordem crescente e nao devolve dados sensiveis.
- O envio manual valida body com Zod, rejeita `storeId`, exige `ADMIN`, busca a `WhatsAppConnection` ativa da loja, chama `sendMetaTextMessage` e persiste a mensagem `OUT` com `providerMessageId`/`graphMessageId` no padrao de `payload` usado pelo webhook.
- Erros da Meta relacionados a janela de atendimento de 24h retornam mensagem legivel orientando o uso de template aprovado.
- Conversas `PAUSED` podem ser retomadas pela UI usando o endpoint existente `POST /api/store/current/whatsapp/conversations/[id]/resume`.

### Fora de escopo mantido

- Sem WebSocket.
- Sem inbox multicanal generico.
- Sem IA.
- Sem anexos ou midia.
- Sem templates nessa tela.
- Sem migration Prisma.
- Sem alteracao do fluxo do webhook.

### Validacao

- `yarn eslint` passou sem erros. Permanecem 2 warnings antigos fora do escopo em `app/(auth)/cadastro/controllers/index.tsx` e `app/(auth)/recuperar-senha/controllers/index.tsx`, ambos por `data` nao usada.
- `yarn tsc --noEmit --pretty false --incremental false` passou sem erros.
- `curl.exe -I http://localhost:3001/atendimento` sem sessao retornou `307` para `/login?callbackUrl=%2Fatendimento`, confirmando a protecao pelo middleware.
- O Yarn/Node exibiu o warning legado `DEP0005 Buffer()`, sem falha.

### Pendencias e riscos

- O teste manual real de screencast ainda depende de sessao valida, `WhatsAppConnection` conectada, webhook publico recebendo inbound e envio dentro da janela de 24h.
- `unreadCount` retorna `0`, porque o schema atual nao possui campo de leitura por operador.
- `customerName` e exibido quando vier do perfil Meta em `payload.contacts` ou de `AppointmentDraft`; caso contrario a UI usa o telefone da conversa.

## 10 de maio de 2026 - Retomada de conversa WhatsApp pausada

### Objetivo

Permitir que uma conversa WhatsApp em `state = PAUSED` volte ao atendimento automatico sem intervencao direta no banco, cobrindo tanto retomada manual pela loja quanto retomada pelo proprio cliente via palavra-chave.

### Arquivos alterados

- `src/lib/bot/flow.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `app/api/store/current/whatsapp/conversations/[id]/resume/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Endpoint manual store-scoped

- Criado `POST /api/store/current/whatsapp/conversations/[id]/resume`.
- O endpoint exige usuario autenticado com papel `ADMIN` ou superior na loja atual.
- A conversa e buscada por `id`, `storeId` da sessao e `channel = WHATSAPP`.
- Se a conversa nao existir para a loja atual, retorna `404`.
- Se a conversa nao estiver `PAUSED`, retorna `409`.
- Ao retomar, atualiza `state` para `IDLE`, atualiza `lastMessageAt`, limpa contexto de fluxo e abandona draft ativo sem apagar historico de mensagens.

#### 2. Retomada pelo cliente no webhook

- O webhook continua retornando cedo para conversas `PAUSED` quando a mensagem nao e comando de retomada.
- Antes desse retorno, agora reconhece:
  - `voltar bot`
  - `retomar bot`
  - `menu`
  - `iniciar`
  - `agendar`
  - `atendimento automatico`
  - `atendimento automático`
- Quando reconhece retomada, registra `whatsapp bot paused conversation resumed by customer`, reseta a conversa para `IDLE` e envia uma mensagem curta junto com o menu inicial.

#### 3. Helper de reset reutilizavel

- O reset dos campos de contexto do fluxo foi extraido para `buildBotFlowResetContext`, mantendo o mesmo conjunto de chaves ja usado pelo webhook.

### Fora de escopo

- Sem migration Prisma.
- Sem alterar webhook GET.
- Sem alterar configuracao Meta.
- Sem alterar templates WhatsApp.
- Sem timeout automatico de `PAUSED`.

### Melhoria futura registrada

- Avaliar auto-retomada de conversas `PAUSED` apos X horas sem atendimento humano, quando o produto tiver uma definicao clara de mensagem humana/atendimento manual.

### Validacao executada

- `yarn eslint "app/api/store/current/whatsapp/conversations/[id]/resume/route.ts" "app/api/webhooks/whatsapp/route.ts" "src/lib/bot/flow.ts"`
- `yarn tsc --noEmit --pretty false --incremental false`

As duas validacoes passaram. O Yarn/Node exibiu apenas o warning legado `DEP0005 Buffer()`, sem falha.

## 10 de maio de 2026 - Placeholders nomeados em templates WhatsApp

### Objetivo

Ajustar a tela minima de App Review para suportar o template aprovado `confirmacao_agendamento_olyon` (`pt_BR`), que usa placeholders nomeados no BODY: `{{customer_name}}`, `{{appointment_date}}` e `{{order_id}}`.

### Arquivos alterados

- `app/(app)/configuracoes/whatsapp/templates/page.tsx`
- `app/api/store/current/whatsapp/templates/test-send/route.ts`
- `src/lib/validators/whatsapp-template.ts`
- `src/lib/meta/meta-templates.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Deteccao de placeholders numericos e nomeados

- A tela agora detecta placeholders do BODY com regex que cobre:
  - numericos: `{{1}}`, `{{2}}`
  - nomeados: `{{customer_name}}`, `{{appointment_date}}`, `{{order_id}}`
- A ordem usada no envio segue a ordem em que os placeholders aparecem no BODY.

#### 2. Examples da Meta para placeholders nomeados

- Para placeholders nomeados, a tela le `components[].example.body_text_named_params`.
- Os labels passam a ser os nomes dos parametros (`customer_name`, `appointment_date`, `order_id`).
- Os valores iniciais usam `example` quando a Meta retorna esses exemplos.

#### 3. Payload correto para Cloud API

- O schema Zod passou a aceitar `namedBodyParameters?: Record<string, string>` mantendo `bodyParameters: string[]`.
- O endpoint de envio monta parametros nomeados como `{ type: "text", parameter_name, text }`.
- Templates numericos continuam usando `{ type: "text", text }`.

### Fora de escopo

- Sem alterar Prisma.
- Sem alterar chatbot.
- Sem alterar webhook.
- Sem expor `accessToken` no frontend.

### Validacao executada

- `yarn eslint "app/(app)/configuracoes/whatsapp/templates/page.tsx" "app/api/store/current/whatsapp/templates/test-send/route.ts" "src/lib/validators/whatsapp-template.ts" "src/lib/meta/meta-templates.ts"`
- `yarn tsc --noEmit --pretty false --incremental false`

O lint e o typecheck passaram. O Yarn/Node exibiu apenas o warning legado `DEP0005 Buffer()`, sem falha.

## 10 de maio de 2026 - Tela minima de templates WhatsApp para App Review Meta

### Objetivo

Criar o menor fluxo funcional possivel para demonstrar, no App Review da Meta, uso de `whatsapp_business_management`: listar templates da WABA, selecionar um template utility/marketing ja aprovado, preencher placeholders simples do BODY, enviar para destinatario de teste e exibir o retorno da Graph API sem expor `accessToken` no frontend.

### Arquivos alterados

- `src/lib/meta/meta-templates.ts`
- `src/lib/validators/whatsapp-template.ts`
- `app/api/store/current/whatsapp/templates/route.ts`
- `app/api/store/current/whatsapp/templates/test-send/route.ts`
- `app/(app)/configuracoes/whatsapp/templates/page.tsx`
- `app/(app)/configuracoes/whatsapp/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Helper server-side para templates Meta

- `listMetaWhatsAppTemplates` chama `GET /v25.0/{wabaId}/message_templates` usando `businessAccountId` e `accessToken` da `WhatsAppConnection`.
- `sendMetaWhatsAppTemplate` chama `POST /v25.0/{phoneNumberId}/messages` com `type = "template"`, `template.name`, `language.code` e `components`.
- Erros da Meta sao resumidos com status HTTP, `graphError`, preview controlado e `fbtrace_id` quando disponivel.

#### 2. Endpoints store-scoped

- `GET /api/store/current/whatsapp/templates` lista templates usando apenas a Store atual da sessao.
- `POST /api/store/current/whatsapp/templates/test-send` valida o payload com Zod, rejeita `storeId` no body, monta `components.body.parameters` como textos e envia o template.
- Ambos reutilizam a `WhatsAppConnection` ativa ja existente e nao retornam `accessToken` ao client.

#### 3. Tela autenticada para demonstracao

- Criada `/configuracoes/whatsapp/templates` com botao `Carregar templates`, select de template, resumo de status/categoria/idioma e JSON de componentes.
- A tela detecta placeholders simples no BODY por `/{{\d+}}/g` e gera inputs dinamicos.
- O envio mostra sucesso/erro, `graphMessageId`, JSON da Meta e `fbtrace_id` quando a Meta devolver erro.
- A tela principal `/configuracoes/whatsapp` ganhou o atalho `Testar templates WhatsApp`.

### Fora de escopo

- Sem migration Prisma.
- Sem alteracao no chatbot.
- Sem alteracao no webhook.
- Sem alteracao de dominio/callback.
- Sem persistencia obrigatoria em `ConversationMessage`, para evitar acoplamento com o fluxo conversacional.

### Validacao executada

- `yarn eslint "app/api/store/current/whatsapp/templates/route.ts" "app/api/store/current/whatsapp/templates/test-send/route.ts" "app/(app)/configuracoes/whatsapp/templates/page.tsx" "src/lib/meta/meta-templates.ts" "src/lib/validators/whatsapp-template.ts"`
- `yarn eslint "app/(app)/configuracoes/whatsapp/page.tsx"`

As duas validacoes passaram. O Yarn/Node exibiu apenas o warning legado `DEP0005 Buffer()`, sem falha de lint.

## 24 de abril de 2026 - Correção da regressão do bot silencioso no WhatsApp

### Objetivo

Restabelecer a resposta do bot no canal WhatsApp após a regressão introduzida no patch do novo menu com `Meus agendamentos` e `Preços`, priorizando o diagnóstico do webhook e a eliminação de branches que terminavam sem outbound.

### Arquivos alterados

- `app/api/webhooks/whatsapp/route.ts`
- `src/lib/bot/flow.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Logs temporários de diagnóstico no webhook

- `processIncomingWhatsAppMessage` agora registra:
  - estado atual da conversa
  - texto inbound bruto
  - texto inbound efetivo
  - `selectedOptionId`
  - actions resolvidas por `handleIncomingMessage`
  - cada `action.type` executada
  - decisão final de dispatch outbound
  - quantidade de mensagens outbound persistidas

#### 2. Normalização robusta de intents interativas

- O webhook passou a converter `selectedOptionId` em texto canônico para o roteamento interno do bot.
- Isso cobre principalmente os novos itens interativos do menu e navegação:
  - `Agendar horário`
  - `Meus agendamentos`
  - `Preços`
  - `Informações`
  - `Menu`
  - `Voltar`
  - `Encerrar`
  - `Mais preços`

#### 3. Proteção contra branch silenciosa

- Foi adicionado um fallback operacional quando o loop de actions termina sem nenhuma `ConversationMessage OUT`.
- Em `IDLE`, o bot responde com o menu principal.
- Fora de `IDLE`, o bot responde com uma mensagem curta orientando a usar `menu`.
- O matcher de agendamento também passou a aceitar explicitamente `agenda`.

### Causa raiz

- O fluxo não tinha proteção para branches que mutavam apenas estado/contexto sem persistir nenhuma resposta.
- Como o dispatch real para a Meta só acontece quando `persistedOutboundMessages.length > 0`, o webhook podia responder `200` e ainda assim não disparar outbound.
- Além disso, o roteamento dependia principalmente do texto humanizado da resposta interativa; agora o `selectedOptionId` também é tratado como fonte canônica.

### Validação executada

- `yarn lint`
- `yarn build`

## 24 de abril de 2026 - Preços e meus agendamentos no menu principal do WhatsApp

### Objetivo

Integrar a opção `Preços` ao fluxo real do WhatsApp usando os serviços ativos da loja com `Service.price` preenchido, e reorganizar o menu inicial para destacar `Meus agendamentos` sem criar fluxo paralelo novo para remarcação ou cancelamento.

### Arquivos alterados

- `app/api/webhooks/whatsapp/route.ts`
- `src/lib/bot/flow.ts`
- `src/lib/bot/types.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Menu principal reorganizado

- O menu inicial do WhatsApp passou a usar quatro opções:
  - `Agendar horário`
  - `Meus agendamentos`
  - `Preços`
  - `Informações`
- Como o menu agora tem quatro opções, o outbound principal passou a usar `interactive_list` da Meta em vez de `reply buttons`.

#### 2. Meus agendamentos reaproveitando o fluxo real

- A opção `Meus agendamentos` agora chama a mesma listagem real de agendamentos futuros por telefone já usada no fluxo de desmarcar/remarcar.
- O bot continua reaproveitando os mesmos caminhos reais para:
  - selecionar o agendamento
  - desmarcar
  - remarcar

#### 3. Preços com serviços reais da loja

- A nova opção `Preços` busca apenas serviços:
  - da loja atual
  - ativos
  - com `price` preenchido
- A listagem é enviada em texto curto, com formatação em BRL (`R$ 79,90`) e paginação simples quando houver muitos serviços.
- Após cada página, o bot envia navegação curta com botões oficiais da Meta para:
  - `Mais preços` quando houver próxima página
  - `Agendar horário`
  - `Menu`

### Validação executada

- `yarn lint`
- `yarn build`

## 24 de abril de 2026 - Preço real persistido em Serviços

### Objetivo

Adicionar suporte real a preço no domínio de `Service`, com persistência segura em Prisma e integração completa no CRUD de `/servicos`, sem backfill fake e sem quebrar os serviços já existentes.

### Arquivos alterados

- `prisma/schema.prisma`
- `prisma/migrations/20260424194444_add_service_price/migration.sql`
- `src/lib/validators/service.ts`
- `app/api/services/route.ts`
- `app/api/services/[id]/route.ts`
- `app/(app)/servicos/schemas/index.ts`
- `app/(app)/servicos/controllers/index.tsx`
- `app/(app)/servicos/page.tsx`
- `prisma/seed.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Prisma e migration segura

- O model `Service` ganhou o campo `price Decimal? @db.Decimal(12, 2)`.
- A migration adiciona a coluna como nullable, sem backfill artificial e sem forçar `0.00` em serviços já existentes.

#### 2. Validators e API

- O create de serviço agora exige `price` positivo com no máximo 2 casas decimais.
- O update aceita `price` opcional, preservando a compatibilidade com serviços antigos ainda nulos.
- `POST /api/services` e `PUT /api/services/[id]` passaram a persistir `price` via `Prisma.Decimal`.

#### 3. UI e seed

- A tela `/servicos` agora permite informar preço no create e no edit.
- A listagem passou a exibir preço formatado em BRL, com fallback legível quando o serviço antigo ainda não tem preço.
- O seed foi ajustado para criar o serviço de teste já com preço válido.

### Validação executada

- `yarn prisma migrate dev --name add_service_price`
- `yarn lint`
- `yarn build`
- `yarn prisma db seed`

## 24 de abril de 2026 - Refinamento textual do fluxo WhatsApp

### Objetivo

Ajustar apenas a UX textual do fluxo WhatsApp já funcionando, sem alterar a lógica principal de disponibilidade, create, remarcação ou cancelamento real de `Appointment`.

### Arquivos alterados

- `app/api/webhooks/whatsapp/route.ts`
- `src/lib/bot/datetime.ts`
- `src/lib/bot/flow.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Etapas mais limpas

- Foram removidos os textos de progresso como `Etapa 1 de 5`, `Etapa 3 de 5` e equivalentes.
- O menu inicial e os prompts de serviço, profissional, dia, horário e confirmação ficaram mais curtos e diretos.

#### 2. Lista de datas simplificada

- A seleção de dias agora mostra apenas a data disponível em cada opção.
- A descrição `Primeiro horário ...` deixou de aparecer para o cliente, sem mexer no dado interno usado pelo backend.

#### 3. PT-BR revisado

- Labels, títulos e mensagens do fluxo foram revisados com acentuação correta e tom mais natural.
- O helper de data/hora também passou a formatar saídas como `segunda 27/04 às 14:00`.

### Validação executada

- `yarn lint`
- `yarn build`

## 24 de abril de 2026 - Fluxo WhatsApp guiado por etapas com mensagens interativas

### Objetivo

Refatorar o fluxo real de WhatsApp do Olyon para uma UX mais guiada, curta e operacional, usando mensagens interativas oficiais da Meta quando fizer sentido, sem quebrar a disponibilidade real nem o create real de `Appointment`.

### Arquivos alterados

- `app/api/webhooks/whatsapp/route.ts`
- `src/lib/appointments/availability.ts`
- `src/lib/bot/datetime.ts`
- `src/lib/bot/flow.ts`
- `src/lib/bot/types.ts`
- `src/lib/whatsapp/meta-outbound.ts`
- `src/lib/whatsapp/parse.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Entrada e saida interativa oficiais da Meta

- O parser inbound agora entende respostas `interactive` da Meta (`button_reply` e `list_reply`) e preserva o `id` selecionado para o backend.
- O outbound passou a suportar `reply buttons` e `list messages` alem do texto simples, mantendo um preview textual persistido nas `ConversationMessage OUT`.
- Quando uma etapa nao cabe bem em interativa, o bot continua respondendo com texto curto e orientado.

#### 2. Fluxo de agendamento reorganizado por etapa

- O agendamento agora segue a sequencia guiada:
  - menu inicial
  - servico
  - profissional
  - dia
  - horario
  - confirmacao
- `CHOOSING_TIME` passou a distinguir internamente as subetapas de dia e horario via contexto conversacional, sem exigir mudanca de schema Prisma.
- Quando existe apenas um profissional elegivel, o bot continua auto-selecionando e avanca direto para a escolha de dia.

#### 3. Disponibilidade e create real preservados

- A escolha de dia usa a engine real de disponibilidade para descobrir proximos dias com vagas.
- A escolha de horario usa a disponibilidade real por dia/profissional/servico antes de salvar o draft.
- O create real de `Appointment` e a remarcacao real continuam acontecendo no mesmo fluxo transacional do webhook, com as mesmas validacoes finais de disponibilidade.

#### 4. Navegacao, fallback e compatibilidade

- `menu`, `voltar`, `encerrar`, `atendente`/`humano`/`chatbot`, `PAUSED` e timeout por inatividade foram preservados.
- O bot aceita clique interativo, numero e texto livre nas etapas guiadas.
- Cancelamento e remarcacao continuam funcionando sem inbox interna e sem mover a logica principal para fora do sistema.

### Validacao executada

- `yarn lint`
- `yarn build`

## 23 de abril de 2026 - Timeout, encerrar, voltar e menu no fluxo WhatsApp

### Objetivo

Melhorar o fluxo conversacional do WhatsApp com controles operacionais de inatividade e navegacao, preservando a pausa humana ja existente e sem alterar o dominio principal de agendamento.

### Arquivos alterados

- `app/api/webhooks/whatsapp/route.ts`
- `src/lib/bot/flow.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Timeout por inatividade

- Conversas em estados ativos agora expiram apos 5 minutos sem interacao.
- O timeout nao se aplica a:
  - `IDLE`
  - `PAUSED`
- Quando expira, o bot encerra o fluxo atual, abandona o draft em andamento, limpa o contexto temporario e responde:
  - `Encerramos este atendimento por falta de interação. Quando quiser agendar novamente, é só me chamar.`

#### 2. Comando para encerrar atendimento

- O fluxo agora reconhece comandos como:
  - `encerrar`
  - `encerrar atendimento`
  - `finalizar`
  - `cancelar atendimento`
  - `parar`
- Ao receber esses comandos, a conversa volta para estado neutro, com limpeza do draft/contexto temporario, e responde:
  - `Atendimento encerrado. Quando quiser agendar novamente, é só me chamar.`

#### 3. Comandos para voltar etapa e voltar ao menu

- O fluxo agora reconhece:
  - `menu`
  - `menu inicial`
  - `inicio`
  - `voltar ao menu`
  - `home`
- E tambem:
  - `voltar`
  - `voltar etapa`
  - `voltar opcao`
  - `voltar uma opcao`
- O retorno de etapa foi implementado respeitando o estado atual e o caminho real do fluxo, inclusive em desmarcar/remarcar.

#### 4. Prioridade operacional preservada

- O webhook agora segue esta ordem antes do fluxo automatico principal:
  - conversa `PAUSED`
  - gatilho de pausa humana
  - timeout por inatividade
  - encerrar atendimento
  - voltar ao menu
  - voltar uma etapa
  - fluxo normal

### Validacao executada

- script local via `tsx` cobrindo timeout, pause, encerrar, menu e voltar
- `yarn eslint src/lib/bot/flow.ts app/api/webhooks/whatsapp/route.ts`
- `yarn build`

## 23 de abril de 2026 - Correcao do matcher de pausa do chatbot WhatsApp

### Objetivo

Garantir que a pausa do chatbot no WhatsApp continue acontecendo antes do fluxo automatico principal, mas com reconhecimento mais robusto de pedidos reais por atendimento humano.

### Arquivos alterados

- `src/lib/bot/flow.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Matcher de pausa fortalecido

- `isPauseChatbotTriggerText` deixou de depender apenas de igualdade exata com poucas frases fechadas.
- A funcao agora normaliza a mensagem com:
  - lowercase
  - trim
  - remocao de acentos
  - colapso de espacos
  - limpeza basica de pontuacao

#### 2. Reconhecimento de frases naturais

- A pausa agora cobre, no minimo:
  - `atendente`
  - `humano`
  - `falar com a loja`
  - `chatbot`
- E tambem reconhece variacoes naturais como:
  - `falar com atendente`
  - `quero falar com atendente`
  - `quero falar com humano`
  - `preciso de um atendente`
  - `me passa para um atendente`
  - `quero atendimento humano`
  - `falar com alguem`

#### 3. Prioridade da pausa preservada

- O webhook continua avaliando a pausa antes de chamar o fluxo automatico principal.
- Conversas em `PAUSED` continuam persistindo mensagens inbound normalmente, sem novas respostas do bot.
- A mensagem automatica de pausa permaneceu inalterada:
  - `Chat pausado. Em breve um atendente continuará por aqui.`

### Validacao executada

- script local via `tsx` cobrindo os cenarios reais de pausa
- `yarn eslint src/lib/bot/flow.ts`

## 23 de abril de 2026 - Correcao do CTA de mapa na confirmacao da agenda publica

### Objetivo

Garantir que o botao `Ver no mapa` apareca na confirmacao da agenda publica sempre que a loja ja tiver os dados minimos de endereco exibidos na propria pagina.

### Arquivos alterados

- `app/agenda/[slug]/public-booking-page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Condicao de mapa alinhada ao endereco visivel

- A verificacao do CTA de mapa passou a usar validacao minima explicita para:
  - `address`
  - `city`
  - `state`
- A URL do Google Maps agora reaproveita o mesmo endereco montado por `buildAddressLabel`, evitando diferenca entre o bloco institucional visivel e a area de confirmacao.

#### 2. CTA de confirmacao mais evidente

- O bloco `Acoes complementares` ganhou um destaque visual discreto com fundo suave e borda leve.
- O CTA de WhatsApp foi preservado sem alterar o fluxo ja homologado.

### Validacao executada

- `yarn eslint app/agenda/[slug]/public-booking-page.tsx`
- `yarn build`

## 23 de abril de 2026 - CTAs de mapa e WhatsApp na confirmacao da agenda publica

### Objetivo

Adicionar acoes complementares na tela de sucesso da agenda publica para o cliente abrir o endereco da loja no mapa e falar com a loja no WhatsApp, sem alterar o fluxo principal do agendamento e mantendo a `Store` como fonte unica dos dados publicos.

### Arquivos alterados

- `app/agenda/[slug]/public-booking-page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. CTA condicional para mapa

- A confirmacao publica agora exibe o botao `Ver no mapa` apenas quando a `Store` possui endereco suficiente para uma busca estavel.
- O link e montado com os campos publicos ja vindos da `Store`:
  - `address`
  - `complement`
  - `neighborhood`
  - `city`
  - `state`
  - `zipcode`
- A URL usa busca simples no Google Maps com query string codificada e abertura em nova aba.

#### 2. CTA condicional para WhatsApp

- A mesma area da confirmacao agora exibe o botao `Falar no WhatsApp` quando existe numero valido para `wa.me`.
- A prioridade segue:
  - `whatsappPhone`
  - fallback para `phone`
- O numero e normalizado para digitos e so gera link quando estiver em formato compativel.

#### 3. Fluxo principal preservado

- A mensagem de sucesso, o resumo do agendamento, os selects, o calendario, a disponibilidade e o submit permaneceram intactos.
- Os novos CTAs entram apenas como acoes complementares abaixo do bloco principal de confirmacao.

### Validacao executada

- `yarn eslint app/agenda/[slug]/public-booking-page.tsx`
- `yarn build`

## 23 de abril de 2026 - Pausa operacional do chatbot WhatsApp com handoff humano

### Objetivo

Permitir que o cliente interrompa imediatamente o fluxo automatico do chatbot no proprio WhatsApp, preservando as mensagens no backend e deixando a conversa em estado operacional claro para atendimento humano fora do Olyon.

### Arquivos alterados

- `prisma/schema.prisma`
- `prisma/migrations/20260423150000_add_paused_conversation_state/migration.sql`
- `app/api/webhooks/whatsapp/route.ts`
- `src/lib/bot/flow.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Novo estado operacional `PAUSED`

- O enum `ConversationState` ganhou o valor `PAUSED`.
- Foi adicionada uma migration SQL simples para refletir o novo estado no banco sem criar modelos novos.

#### 2. Gatilhos diretos de pausa no fluxo inbound

- O bot agora detecta as mensagens normalizadas:
  - `atendente`
  - `humano`
  - `falar com a loja`
  - `chatbot`
- A deteccao acontece antes de qualquer automacao do fluxo de servico, profissional, horario, confirmacao, cancelamento ou remarcacao.

#### 3. Mensagem unica de handoff humano

- Quando a conversa entra em pausa, o webhook persiste a mensagem do cliente, atualiza a conversa para `PAUSED` e envia imediatamente:
  - `Chat pausado. Em breve um atendente continuará por aqui.`
- Novas mensagens recebidas em uma conversa ja pausada continuam sendo salvas, mas nao geram novas respostas automaticas nem repetem a mensagem de pausa.

#### 4. Protecao extra no orchestrator

- `handleIncomingMessage` passou a devolver zero acoes quando recebe uma conversa em `PAUSED`.
- Com isso, mesmo que outro ponto do fluxo esqueça de curto-circuitar o webhook no futuro, a automacao continua bloqueada por seguranca.

### Validacao executada

- `yarn prisma generate`
- `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/bot/flow.ts`

## 23 de abril de 2026 - Agenda online como hub e `Store` como fonte unica dos dados publicos

### Objetivo

Remover a duplicidade de edicao institucional em `/agenda-online`, promover `Store` como fonte unica dos dados publicos da loja e criar uma tela store-scoped propria para manter telefone, endereco, resumo de horario e observacoes.

### Arquivos alterados

- `app/(app)/agenda-online/page.tsx`
- `app/(app)/configuracoes/loja/page.tsx`
- `app/api/store/current/route.ts`
- `app/agenda/[slug]/public-booking-page.tsx`
- `src/lib/public-booking.ts`
- `src/lib/store/public-info.ts`
- `src/components/ui/app-sidebar.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. `/agenda-online` simplificada para hub do link publico

- A pagina deixou de editar telefone, endereco e textos institucionais.
- Ela agora mostra apenas:
  - nome da loja
  - slug/link publico
  - CTA para copiar o link
  - CTA para abrir a agenda publica
  - atalho para horarios de atendimento
  - atalho para `/configuracoes/loja`
- O texto da tela passou a deixar explicito que os dados publicos vem da `Store`.

#### 2. Nova tela store-scoped em `/configuracoes/loja`

- Foi criada uma pagina autenticada da propria loja para editar:
  - `phone`
  - `whatsappPhone`
  - `address`
  - `complement`
  - `neighborhood`
  - `city`
  - `state`
  - `zipcode`
  - `businessHoursSummary`
  - `serviceObservations`
- A tela usa `react-hook-form` + `zodResolver(storePublicInfoSchema)`.
- O save reaproveita `PATCH /api/store/current`, sem criar modelo novo.

#### 3. Validacao e normalizacao consolidadas

- `src/lib/store/public-info.ts` passou a centralizar a validacao dos campos publicos da loja.
- Telefones agora sao validados no schema e normalizados para digitos antes de persistir.
- `app/api/store/current/route.ts` deixou de manter um schema paralelo para esses campos e passou a reutilizar o helper compartilhado.

#### 4. Agenda publica mantida com `Store` como fonte unica

- `src/lib/public-booking.ts` ganhou um select explicito para os dados publicos lidos da `Store`.
- O fluxo principal de agendamento nao foi alterado.
- Na confirmacao publica foram deixados apenas os TODOs pequenos para:
  - botao "Ver no mapa"
  - botao "Falar no WhatsApp"

#### 5. Navegacao ajustada

- A sidebar passou a comunicar `/agenda-online` como `Hub da agenda online`.
- Foi adicionado o item `Dados da loja` em `Configuracoes`, apontando para `/configuracoes/loja`.

### Validacao executada

- `yarn eslint app/(app)/agenda-online/page.tsx app/(app)/configuracoes/loja/page.tsx app/api/store/current/route.ts app/agenda/[slug]/public-booking-page.tsx src/lib/public-booking.ts src/lib/store/public-info.ts src/components/ui/app-sidebar.tsx`

## 07 de abril de 2026 - Agenda online publica com controles mobile refinados

### Objetivo

Corrigir a UX mobile dos campos `Servico`, `Profissional` e `Data` na agenda online publica, evitando os overlays grandes e pesados dos controles nativos do navegador.

### Arquivos alterados

- `app/agenda/[slug]/public-booking-page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Selects nativos substituidos no fluxo publico

- Os campos `Servico` e `Profissional` deixaram de usar `select` nativo.
- Eles passaram a usar dropdowns compactos, com visual branco, radius maior, scroll interno e largura controlada.

#### 2. Campo de data com calendario proprio

- O `input[type=date]` do fluxo publico foi substituido por um calendario compacto no proprio card.
- Isso evita o popup grande do navegador em viewport pequena e deixa a interacao mais consistente com o restante da interface.

#### 3. Melhor alinhamento visual no mobile

- Os dropdowns agora ficam contidos no card, alinhados ao trigger e sem o visual nativo azul pesado.
- O calendario da data tambem passou a respeitar melhor o espaco da coluna mobile, com navegacao por mes e selecao direta do dia.

### Validacao executada

- `yarn eslint app/agenda/[slug]/public-booking-page.tsx`

## 07 de abril de 2026 - Dados publicos da agenda online com fluxo claro de edicao

### Objetivo

Descobrir de onde vinham os dados institucionais exibidos no link publico de agendamento e criar um caminho claro no app para editar essas informacoes sem duplicar fluxo desnecessariamente.

### Arquivos alterados

- `app/api/store/current/route.ts`
- `app/(app)/agenda-online/page.tsx`
- `src/components/ui/app-sidebar.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Diagnostico da origem dos dados

- A agenda publica em `app/agenda/[slug]/public-booking-page.tsx` ja consumia dados da `Store`.
- O loader `src/lib/public-booking.ts` confirmou os campos reais:
  - `phone`
  - `whatsappPhone`
  - `address`
  - `complement`
  - `neighborhood`
  - `city`
  - `state`
  - `zipcode`
  - `businessHoursSummary`
  - `serviceObservations`

#### 2. Ausencia de fluxo claro no app da loja

- Nao existia uma tela clara no app autenticado para editar esses dados publicos da `Store`.
- Havia contexto da loja atual (`/api/store/current`), mas sem edicao desses campos e sem atalho intuitivo no menu.

#### 3. Nova tela enxuta de manutencao

- Foi criada a pagina `/agenda-online` no app autenticado.
- Ela permite editar os dados publicos que alimentam o link de agendamento online da loja atual.
- A pagina tambem mostra:
  - o link publico da agenda
  - CTA para abrir a agenda online
  - CTA para ir a `Horarios de atendimento`

#### 4. Reaproveitamento do endpoint da loja atual

- O endpoint `app/api/store/current/route.ts` passou a:
  - retornar os campos publicos da `Store` no `GET`
  - aceitar `PATCH` para atualizar esses dados
- O escopo continua sendo a loja atual da sessao.

#### 5. Descoberta facilitada no menu

- Foi adicionado o item `Dados publicos da agenda` na secao `Agendamentos` da sidebar.
- Isso evita esconder o fluxo dentro de telas nao relacionadas ou depender de area admin para uma manutencao cotidiana da loja.

### Validacao executada

- `yarn eslint app/api/store/current/route.ts app/(app)/agenda-online/page.tsx src/components/ui/app-sidebar.tsx`

## 07 de abril de 2026 - Selects de `/agendamentos` alinhados ao padrao discreto da busca de cliente

### Objetivo

Aplicar nos selects e filtros de `/agendamentos` o mesmo modelo visual leve da lista de busca de cliente, substituindo menus nativos pesados e desalinhados em mobile.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Helper local para selects do modulo

- Foi criado um helper local em `app/(app)/agendamentos/page.tsx` para padronizar trigger, dropdown e itens.
- O dropdown passou a usar:
  - container branco
  - borda suave
  - radius maior
  - sombra leve
  - scroll interno

#### 2. Selects nativos removidos de `/agendamentos`

- Foram trocados os selects nativos de:
  - filtros `Profissional` e `Status`
  - formulario `Novo agendamento` (`Servico` e `Profissional`)
  - dialog de detalhes (`Servico` e `Profissional`)
  - dialog de bloqueio (`Aplicar bloqueio em`)

#### 3. UX alinhada ao modelo da busca de cliente

- Os novos dropdowns seguem o mesmo padrao visual da ultima referencia:
  - lista contida
  - itens mais confortaveis para toque
  - melhor leitura em viewport pequena
  - sem o visual nativo azul pesado do navegador

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`

## 07 de abril de 2026 - Selects de `/horarios-de-atendimento` revisados para mobile

### Objetivo

Corrigir a UX dos selects da tela `/horarios-de-atendimento`, principalmente em viewport pequena, evitando dropdowns desconfortaveis, desalinhados ou grandes demais.

### Arquivos alterados

- `app/(app)/horarios-de-atendimento/page.tsx`
- `src/components/ui/select.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Troca dos `select` nativos da tela

- Os dois selects da tela (`Escopo do expediente` e `Aplicar bloqueio em`) deixaram de usar o elemento nativo.
- Eles passaram a usar o `Select` do projeto com dropdown em portal, melhor controle de largura e posicionamento e comportamento mais previsivel em mobile.

#### 2. Dropdown mais estavel e confortavel

- O menu agora abre alinhado ao trigger e limitado pela largura da viewport.
- A lista ganhou altura maxima controlada com scroll interno.
- Os itens ficaram mais altos e confortaveis para toque em telas pequenas.

#### 3. Ajustes no componente base de `Select`

- O `SelectContent` passou a respeitar melhor a largura do trigger e o limite da viewport.
- O `overflow` foi refinado para evitar corte visual do conteudo.
- O `SelectItem` ficou com area clicavel maior, melhorando a experiencia de toque sem prejudicar o desktop.

### Validacao executada

- `yarn eslint app/(app)/horarios-de-atendimento/page.tsx src/components/ui/select.tsx`

## 07 de abril de 2026 - Indicador flutuante do Next removido da interface

### Objetivo

Remover o icone flutuante circular com `N` que estava aparecendo sobre a sidebar durante o desenvolvimento local e atrapalhando o acesso ao logout.

### Arquivos alterados

- `next.config.mjs`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Origem confirmada como overlay do Next em desenvolvimento

- O elemento nao vinha do layout do app, da sidebar ou de widget de terceiros.
- A origem era o `devIndicators` do Next 16, que por padrao renderiza um indicador visual no canto inferior da tela durante o ambiente de desenvolvimento.

#### 2. Desativacao global do indicador

- Foi criado `next.config.mjs` com `devIndicators: false`.
- Isso remove o botao flutuante `N` do ambiente local sem alterar a estrutura do layout autenticado nem a logica da sidebar.

### Validacao executada

- `yarn eslint next.config.mjs`

## 07 de abril de 2026 - Campo Categoria de Entradas/Saidas refinado para autocomplete discreto

### Objetivo

Substituir o painel fixo de sugestoes do campo `Categoria` em `Entradas/Saidas > Novo` por uma UX mais leve, mantendo as categorias por tipo e a digitacao livre.

### Arquivos alterados

- `app/(app)/entradas-saidas/novo/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Painel grande removido

- O bloco fixo de chips abaixo do input foi removido.
- Isso deixa o formulario mais leve e devolve espaco visual para os demais campos.

#### 2. Autocomplete discreto no proprio campo

- O campo `Categoria` agora abre um dropdown pequeno e contextual ao focar ou digitar.
- As sugestoes continuam mudando por tipo:
  - `Entrada` usa categorias de receita
  - `Saida` usa categorias de despesa
- A lista inicial e limitada e possui scroll interno quando necessario.

#### 3. Digitacao livre preservada

- O usuario continua podendo digitar qualquer categoria personalizada.
- Selecionar uma sugestao apenas preenche o `input`; o valor final salvo continua sendo uma string livre.

#### 4. Navegacao basica por teclado

- O campo agora suporta abrir as sugestoes e navegar com `ArrowUp`, `ArrowDown`, `Enter` e `Escape`.

### Validacao executada

- `yarn eslint app/(app)/entradas-saidas/novo/page.tsx`

## 07 de abril de 2026 - UX das categorias sugeridas em Entradas/Saidas refinada

### Objetivo

Substituir o `datalist` nativo do campo `Categoria` em `Entradas/Saidas > Novo` por uma lista de sugestoes mais clara e consistente com a UI do projeto, mantendo digitacao livre.

### Arquivos alterados

- `app/(app)/entradas-saidas/novo/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Remocao do dropdown nativo escuro

- O `datalist` nativo foi removido do campo `Categoria`.
- Isso elimina o popup escuro do navegador que estava destoando visualmente da tela.

#### 2. Lista de sugestoes clara dentro do formulario

- As categorias sugeridas agora aparecem em um bloco leve logo abaixo do input.
- A lista respeita o tipo selecionado:
  - `Entrada` usa categorias de receita
  - `Saida` usa categorias de despesa
- O usuario pode clicar em uma sugestao para preencher rapidamente o campo.

#### 3. Digitacao livre preservada

- O campo continua sendo um `input` de texto normal.
- O usuario pode ignorar as sugestoes e salvar qualquer categoria personalizada.
- As sugestoes tambem passam a filtrar conforme o texto digitado, sem travar o valor final.

### Validacao executada

- `yarn eslint app/(app)/entradas-saidas/novo/page.tsx`

## 07 de abril de 2026 - Categorias sugeridas no Novo lancamento de Entradas/Saidas

### Objetivo

Adicionar sugestoes de categoria no formulario `Entradas/Saidas > Novo`, aproveitando as categorias do Glaavo como base, sem transformar `category` em enum fechada e preservando digitacao livre.

### Arquivos alterados

- `src/constants/finance-categories.ts`
- `app/(app)/entradas-saidas/novo/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Base local de categorias adaptada do Glaavo

- Foi criada uma constante local em `src/constants/finance-categories.ts` com as categorias de receita e despesa adaptadas do arquivo `CATEGORIES.ts` do Glaavo.
- A adaptacao ficou interna ao projeto Olyon, evitando dependencia direta entre repositorios.

#### 2. Campo assistido sem travar digitacao

- O campo `Categoria` do formulario `Entradas/Saidas > Novo` passou a usar `input + datalist`.
- Quando o tipo e `Entrada`, o campo sugere `CATEGORIES_INCOME_ARRAY`.
- Quando o tipo e `Saida`, o campo sugere `CATEGORIES_EXPENSES_ARRAY`.
- O usuario continua podendo digitar qualquer categoria personalizada.

#### 3. Backend mantido como string livre

- Nenhuma validacao fechada foi adicionada no schema Zod nem no endpoint.
- `category` continua sendo `string` livre no frontend, no validator e na rota de criacao.
- Isso preserva compatibilidade com lancamentos antigos e com categorias customizadas novas.

### Validacao executada

- `yarn eslint src/constants/finance-categories.ts app/(app)/entradas-saidas/novo/page.tsx`

## 07 de abril de 2026 - Resumo financeiro da dashboard alinhado aos modulos reais

### Objetivo

Revisar os tres indicadores do card `Resumo financeiro` da dashboard para que os labels e os calculos reflitam corretamente os modulos reais `Entradas/Saidas`, `Contas a Pagar` e `Controle de Pagamentos`.

### Arquivos alterados

- `src/lib/dashboard/overview.ts`
- `src/components/dashboard/finance-summary-card.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Labels ajustados para a semantica real

- `Total do dia` virou `Saldo liquido do dia`
- `Total do mes` virou `Saldo liquido do mes`
- `Pagamentos pendentes` virou `Despesas em aberto`

#### 2. Origem dos dados explicitada

- Os dois primeiros indicadores continuam vindo de `FinanceEntry` por `transactionDate`, somando `INCOME - EXPENSE`, o que corresponde ao modulo `Entradas/Saidas`.
- O terceiro indicador passou a ficar semanticamente amarrado ao dominio de despesas nao pagas (`type = EXPENSE` e `status != PAID`), que e a base usada nas areas `Contas a Pagar` e `Controle de Pagamentos`.

#### 3. Tipagem do helper ajustada

- O helper da dashboard passou a expor os campos:
  - `dayNetTotal`
  - `monthNetTotal`
  - `openExpensesTotal`
- Isso reduz ambiguidade entre o nome do campo e o dado realmente calculado.

#### 4. Texto auxiliar revisado

- A observacao do card foi reescrita para explicar de forma curta a origem de cada grupo de indicadores, sem sugerir leitura errada nem misturar recebimentos com controle de pagamento de despesas.

### Validacao executada

- `yarn eslint src/lib/dashboard/overview.ts src/components/dashboard/finance-summary-card.tsx`

## 07 de abril de 2026 - Card `Status da agenda` com dados reais na dashboard

### Objetivo

Substituir os numeros mockados do card `Status da agenda` por dados reais da store atual, mantendo o layout da dashboard e usando a mesma base operacional da agenda por profissional.

### Arquivos alterados

- `app/(app)/dashboard/page.tsx`
- `src/components/dashboard/schedule-status-card.tsx`
- `src/lib/dashboard/overview.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Card conectado ao helper real da dashboard

- `ScheduleStatusCard` deixou de usar constantes locais mockadas e passou a receber props tipadas vindas de `getDashboardOverview`.
- O layout do card foi mantido; mudou apenas a origem dos numeros e do texto descritivo.

#### 2. Calculo real de `Horarios livres hoje`

- O helper da dashboard agora calcula slots livres reais da agenda de hoje com base em slots de 15 minutos por profissional.
- A contagem considera somente profissionais com expediente proprio valido para hoje.
- Cada slot livre respeita:
  - expediente da loja
  - expediente proprio do profissional
  - bloqueios da loja e do profissional
  - agendamentos ativos (`SCHEDULED` e `CONFIRMED`)

#### 3. Calculo real de `Horarios bloqueados`

- O card passou a contar slots bloqueados reais de hoje na mesma granularidade de 15 minutos usada para os slots livres.
- Bloqueios globais da loja e bloqueios especificos do profissional entram na conta.
- Como a unidade passou a ser capacidade de agenda por profissional, um bloqueio da loja impacta todos os profissionais com agenda ativa naquele intervalo.

#### 4. Texto descritivo neutro e auditavel

- A frase promocional/mockada do card foi removida.
- No lugar, o card agora mostra uma observacao neutra baseada no proprio calculo:
  - ausencia de expediente proprio hoje
  - ausencia de slots restantes hoje
  - ou nota explicando que a contagem usa slots de 15 min restantes para hoje

### Validacao executada

- `yarn eslint app/(app)/dashboard/page.tsx src/components/dashboard/schedule-status-card.tsx src/lib/dashboard/overview.ts`

## 07 de abril de 2026 - Loading da agenda separado do estado vazio em /agendamentos

### Objetivo

Evitar que a mensagem de vazio da agenda apareca enquanto a board ainda esta carregando dados de appointments, equipe ou expediente semanal.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/professional-schedule-board.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Loading composto da board

- A tela passou a compor um `scheduleBoardLoading` com os carregamentos reais que impactam a board:
  - `appointmentsLoading`
  - `teamLoading`
  - `weeklyScheduleLoading`
- Isso impede que a regra de vazio rode cedo demais quando ainda faltam dependencias da agenda por profissional.

#### 2. Mensagem explicita durante o carregamento

- A `ProfessionalScheduleBoard` agora mostra skeleton das colunas acompanhado do texto `Carregando agendas...`.
- Esse estado aparece tanto no carregamento inicial quanto em refetches que realmente disparam nova consulta.

#### 3. Empty state so depois da resposta

- A mensagem `Nenhum profissional possui expediente proprio configurado dentro do horario da loja para esta data.` continua existindo, mas agora so aparece quando o loading da board terminou e realmente nao ha colunas validas para renderizar.
- O aviso de `Nenhum agendamento...` abaixo da board tambem passou a respeitar o loading consolidado para evitar mensagem incorreta entre requests.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx app/(app)/agendamentos/components/professional-schedule-board.tsx`

## 07 de abril de 2026 - Regra final de expediente da loja x profissional consolidada

### Objetivo

Fechar a regra operacional entre `/horarios-de-atendimento` e `/agendamentos`, garantindo que o expediente do profissional fique sempre contido no expediente da loja e que a agenda por profissional nao herde abertura automatica da loja.

### Arquivos alterados

- `app/api/schedule/weekly/route.ts`
- `src/lib/appointments/availability.ts`
- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Validacao backend no salvamento do expediente semanal

- O `PUT /api/schedule/weekly` passou a validar intervalos no backend antes de persistir.
- Quando o escopo e de um profissional, cada intervalo configurado agora precisa caber integralmente dentro dos intervalos ativos da loja no mesmo dia da semana.
- O backend tambem passou a impedir expediente do profissional em dias sem abertura da loja e a rejeitar intervalos invalidos ou sobrepostos.

#### 2. Disponibilidade sem heranca automatica para profissional

- A engine central em `src/lib/appointments/availability.ts` deixou de abrir agenda automaticamente pelo expediente da loja quando existe `staffMembershipId`.
- Para profissional selecionado, a disponibilidade agora considera somente o expediente proprio dele, limitado pelos intervalos validos da loja.
- Quando o profissional nao possui expediente proprio configurado, a resposta operacional passa a informar isso de forma explicita.

#### 3. Grade de `/agendamentos` alinhada com a mesma regra

- A tela passou a calcular o range visual do profissional considerando apenas o expediente proprio dele dentro da janela valida da loja.
- Profissionais sem expediente proprio valido continuam fora da grade.
- O filtro por profissional e os textos de estado vazio foram ajustados para refletir a regra consolidada.

### Fora do escopo mantido

- Nao foram criados models, migrations ou arquivos novos para essa consolidacao.
- A coluna `Sem profissional` continua usando o expediente da loja, porque nao representa um profissional com agenda propria.

### Validacao executada

- `yarn eslint app/api/schedule/weekly/route.ts src/lib/appointments/availability.ts app/(app)/agendamentos/page.tsx`

## 07 de abril de 2026 - Agenda por profissional sem heranca de expediente da loja

### Objetivo

Ajustar `/agendamentos` para exibir na grade apenas profissionais que tenham expediente proprio configurado na data, sem abrir agenda automaticamente pelo horario geral da loja.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/professional-schedule-board.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Helper de expediente proprio por data

- A tela passou a usar helpers locais para identificar se um profissional possui expediente proprio configurado no dia selecionado.
- O criterio considera apenas configuracao explicita no escopo do profissional para o weekday da data, com intervalos ativos.

#### 2. Grade sem fallback da loja para profissional

- A montagem das colunas em `/agendamentos` deixou de herdar `selectedDayWorkingHoursRange` e `fallbackWorkingHoursRange` para profissionais.
- Agora as colunas de profissionais usam somente o range retornado pelo expediente proprio deles.
- Se o profissional nao tiver expediente proprio na data, ele fica fora da grade.

#### 3. Filtro e estado vazio coerentes

- O filtro por profissional continua aceitando a selecao normal da equipe.
- Quando o filtro aponta para um profissional sem expediente proprio na data, a board mostra estado vazio explicito em vez de abrir uma coluna vazia.
- A mensagem de vazio da agenda tambem deixou de sugerir que toda a equipe continua aberta quando nao ha coluna renderizavel.

#### 4. Fluxos internos do modal alinhados

- O modal de criacao e o dialog de remarcacao passaram a considerar apenas profissionais com expediente proprio na data de referencia ao montar a equipe elegivel.
- Isso evita que o board esconda o profissional enquanto o modal ainda ofereca expediente herdado da loja no mesmo fluxo operacional.

### Fora do escopo mantido

- Nenhuma alteracao foi feita na API `/api/team`.
- A engine global de disponibilidade nao foi reescrita nesta etapa; o ajuste ficou concentrado no comportamento da tela `/agendamentos`.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx app/(app)/agendamentos/components/professional-schedule-board.tsx`

## 07 de abril de 2026 - Dashboard com dados reais da loja

### Objetivo

Conectar a dashboard `/dashboard` a dados reais do banco sem alterar o layout base, substituindo cards estaticos por informacao real da loja atual e revisando os links das acoes rapidas.

### Arquivos alterados

- `app/(app)/dashboard/page.tsx`
- `src/components/dashboard/upcoming-appointments-card.tsx`
- `src/components/dashboard/finance-summary-card.tsx`
- `src/components/dashboard/quick-actions-card.tsx`
- `src/lib/dashboard/overview.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Dashboard carregando dados reais no servidor

- `app/(app)/dashboard/page.tsx` continua como Server Component, mas agora resolve `storeId` da sessao e busca os dados da dashboard no servidor.
- Foi criado `src/lib/dashboard/overview.ts` para centralizar as consultas e transformacoes do resumo, evitando regra duplicada dentro da UI.

#### 2. Bloco `Proximos agendamentos` com appointments reais

- O card deixou de usar o array mockado local.
- A consulta agora busca appointments futuros da loja atual, ordenados por `startAt asc`, limitados para o layout do card e com escopo multi-tenant real.
- O bloco exibe:
  - horario
  - referencia de dia (`Hoje`, `Amanha` ou `dd/mm`)
  - cliente
  - profissional
  - servico quando existir
  - badge com status amigavel reutilizando os helpers de `src/lib/appointments/presentation.ts`
- Os botoes visuais `Ver detalhes`, `Remarcar` e `Cancelar` foram removidos do card porque nao apontavam para uma acao item-a-item realmente implementada na dashboard. O acesso real continua pelo CTA `Ver agenda`.

#### 3. Bloco `Resumo financeiro` com agregacao real

- O card passou a receber os dados prontos do servidor em vez de calcular tudo no client com fetch tardio.
- Os numeros agora usam a estrutura real de `FinanceEntry`, sempre escopada pela store atual:
  - `Total do dia`: saldo liquido do dia por `transactionDate` (`INCOME - EXPENSE`)
  - `Total do mes`: saldo liquido do mes por `transactionDate`
  - `Pagamentos pendentes`: soma de despesas ainda nao pagas (`status != PAID`)
- O card ganhou texto curto explicando a origem desses numeros para nao sugerir placeholder nem criterio oculto.

#### 4. Acoes rapidas revisadas

- `Novo agendamento` permaneceu em `/agendamentos`
- `Novo cliente` foi corrigido de `/usuarios` para `/clientes`
- `Novo servico` permaneceu em `/servicos`
- `Bloquear horario` permaneceu em `/horarios-de-atendimento`

### Fora do escopo mantido

- O card `Status da agenda` nao foi alterado nesta etapa.
- Nao foram criadas rotas novas, models novas ou acoes falsas para detalhe/remarcacao/cancelamento direto na dashboard.

### Validacao executada

- `yarn eslint app/(app)/dashboard/page.tsx src/components/dashboard/upcoming-appointments-card.tsx src/components/dashboard/finance-summary-card.tsx src/components/dashboard/quick-actions-card.tsx src/lib/dashboard/overview.ts`

## 06 de abril de 2026 - Status real de appointments na tela /agendamentos

### Objetivo

Colocar os statuses reais de `AppointmentStatus` na operacao de `/agendamentos`, com badge, filtro, acoes rapidas e endpoint dedicado para atualizar somente o status sem depender de texto livre no payload.

### Arquivos alterados

- `src/lib/appointments/presentation.ts`
- `src/lib/validators/appointment.ts`
- `app/api/appointments/route.ts`
- `app/api/appointments/[id]/status/route.ts`
- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/appointment-status-menu.tsx`
- `app/(app)/agendamentos/components/appointment-card.tsx`
- `app/(app)/agendamentos/components/professional-schedule-board.tsx`
- `app/(app)/agendamentos/components/professional-schedule-column.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Mapeamento unico de status para UI

- `src/lib/appointments/presentation.ts` passou a concentrar os valores suportados de `AppointmentStatus`, labels PT-BR, opcoes de filtro e tons visuais.
- O label de `DONE` foi ajustado para `Atendido`, alinhado ao requisito operacional da tela.
- Os helpers agora distinguem estados ativos (`SCHEDULED`, `CONFIRMED`) de estados finais (`CANCELED`, `DONE`, `NO_SHOW`).

#### 2. Endpoint dedicado para trocar apenas o status

- Foi criada a rota `PATCH /api/appointments/[id]/status` em App Router.
- O payload e validado com Zod no formato `{ status: AppointmentStatus }`.
- A rota resolve `storeId` pela sessao/token com `requireMembershipRole`, busca o appointment por `id + storeId`, retorna `404` amigavel quando nao encontra e persiste apenas `status` + metadata de historico simples da mudanca.

#### 3. Agenda operacional exibindo todos os statuses reais

- `GET /api/appointments?date=...` deixou de filtrar so statuses ativos e passou a devolver todos os agendamentos do dia para a UI.
- A tela `/agendamentos` ganhou filtro por status com opcao `Todos`.
- Os cards da grade agora exibem badge/status visual real e um menu rapido com as acoes:
  - `Marcar como confirmado`
  - `Marcar como atendido`
  - `Marcar como cancelado`
  - `Marcar como nao compareceu`

#### 4. Comportamento coerente para estados finais

- Cards finais continuam visiveis na grade com tom mais leve e borda tracejada.
- O corpo desses cards deixa de bloquear o clique do slot abaixo, preservando a leitura operacional e novos encaixes onde a disponibilidade real permitir.
- O dialog de detalhes tambem ganhou badge visual de status e menu de acoes rapidas.

### Validacao executada

- `yarn eslint app/api/appointments/route.ts app/api/appointments/[id]/status/route.ts src/lib/validators/appointment.ts src/lib/appointments/presentation.ts app/(app)/agendamentos/page.tsx app/(app)/agendamentos/components/appointment-status-menu.tsx app/(app)/agendamentos/components/appointment-card.tsx app/(app)/agendamentos/components/professional-schedule-board.tsx app/(app)/agendamentos/components/professional-schedule-column.tsx`

## 02 de abril de 2026 - Saneamento em cadeia do build ate `yarn build` concluir

### Objetivo

Continuar a limpeza do build a partir do erro confirmado em `app/(app)/contas-a-pagar/novo/page.tsx`, corrigindo em cadeia os proximos bloqueios reais enquanto as mudancas fossem pequenas, seguras e sem alterar regra de negocio.

### Arquivos alterados

- `app/(app)/contas-a-pagar/novo/page.tsx`
- `app/(app)/usuarios/controllers/index.tsx`
- `src/components/ui/app-sidebar.tsx`
- `src/lib/auth-options.ts`
- `src/scripts/seed.ts`
- `app/(auth)/login/page.tsx`
- `tsconfig.json`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. `contas-a-pagar/novo` alinhado ao payload real

- O `createEntry` local usa `FinanceExpenseCreatePayload`, que nao aceita `type`.
- O payload da pagina deixou de enviar `type: "EXPENSE"`, preservando a semantica existente no controller, que ja injeta o tipo ao chamar `/api/finance/entries`.
- O campo `dueDate` tambem passou a normalizar `null` para `""` no `<Input type="date" />`, evitando quebra de tipagem em build.

#### 2. Controller legado de usuarios ajustado ao schema atual

- `app/(app)/usuarios/controllers/index.tsx` ainda importava `formSchema`, mas o modulo atual exporta `userFormCreateSchema` e `userFormEditSchema`.
- O controller foi alinhado para usar `userFormCreateSchema as formSchema`.
- O alias de `Contact` foi corrigido para `NonNullable<FormValues["contacts"]>[number]`, evitando erro quando `contacts` e opcional no `z.input`.

#### 3. Tipagem local da sidebar normalizada

- `src/components/ui/app-sidebar.tsx` usava `item.isActive`, mas o objeto `data.navMain` nao declarava esse campo no tipo inferido.
- Foi adicionada tipagem explicita dos itens/grupos da navegacao com `isActive?: boolean`, sem mudar o comportamento visual.

#### 4. Compatibilidade de `auth-options` com os tipos do NextAuth

- `src/lib/auth-options.ts` declarava `globalRole?: string | null` no tipo local `AuthUser`.
- O modulo `types/next-auth.d.ts` declara `globalRole?: string`.
- A correcao removeu `null` do tipo local e normalizou o retorno de `authorize` com `user.globalRole ?? undefined`.

#### 5. Script de seed alinhado ao model Prisma atual

- `src/scripts/seed.ts` tentava criar `User` sem `password`, o que nao compila mais com o schema atual.
- O script agora gera `password` hashada com `bcryptjs`, no mesmo padrao ja usado em `prisma/seed.ts`.

#### 6. Configuracao TypeScript corrigida

- `tsconfig.json` estava com `ignoreDeprecations: "6.0"`.
- No TypeScript 5.9 usado no projeto, esse valor e invalido e passou a quebrar o `next build`.
- O arquivo voltou para `ignoreDeprecations: "5.0"`.

#### 7. `/login` ajustado para o App Router no prerender

- `app/(auth)/login/page.tsx` usava `useSearchParams()` diretamente no componente da pagina.
- No Next 16, isso exigiu `Suspense` durante o prerender.
- A leitura do `error` da query string foi isolada em um componente `LoginErrorMessage`, renderizado dentro de `<Suspense fallback={null}>`.

### Validacao executada

- `yarn eslint app/(app)/contas-a-pagar/novo/page.tsx`
- `yarn eslint app/(app)/usuarios/controllers/index.tsx`
- `yarn eslint src/components/ui/app-sidebar.tsx`
- `yarn eslint src/lib/auth-options.ts`
- `yarn eslint src/scripts/seed.ts`
- `yarn eslint app/(auth)/login/page.tsx`
- `yarn build`

### Resultado

- O `yarn build` voltou a concluir com sucesso.
- Permanecem apenas warnings nao bloqueantes:
  - `baseline-browser-mapping` desatualizado
  - root inferido pelo Next/Turbopack por coexistencia de `package-lock.json` no pai e `yarn.lock` no projeto
  - deprecacao do arquivo `middleware` em favor de `proxy`

### Proximo passo sugerido

- Tratar os warnings de build, com prioridade para migrar `middleware` para `proxy` e fixar `turbopack.root`.

## 02 de abril de 2026 - Remocao segura da tela Tipos de eventos

### Objetivo

Remover a tela redundante `Tipos de eventos` do sistema sem alterar o layout geral, preservando `Servicos` como fonte unica para combinacoes como `corte + barba`.

### Diagnostico

- A pagina existia em `app/(app)/eventos/page.tsx`, com rota filha morta em `app/(app)/eventos/novo/page.tsx`.
- O item aparecia na sidebar em `src/components/ui/app-sidebar.tsx` apontando para `/eventos`.
- Havia API propria em `app/api/events/route.ts` e `app/api/events/[id]/route.ts`, consumindo `EventCreateSchema` e `EventUpdateSchema` do modulo `app/(app)/eventos/schemas`.
- Nao foi encontrada dependencia ativa em `agendamentos`, `servicos`, WhatsApp, seed ou regras de disponibilidade; os usos de `services.some({ serviceId })` no backend pertencem a vinculo de profissional com servico, nao a `EventService`.
- O schema Prisma ainda possui `Event` e `EventService`, mas eles ficaram preservados nesta etapa para evitar migracao destrutiva e manter a persistencia atual fora do escopo.

### Arquivos alterados

- `src/components/ui/app-sidebar.tsx`
- `middleware.ts`
- `README.md`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### Arquivos removidos

- `app/(app)/eventos/page.tsx`
- `app/(app)/eventos/loading.tsx`
- `app/(app)/eventos/novo/page.tsx`
- `app/(app)/eventos/controllers/index.tsx`
- `app/(app)/eventos/controllers/README.md`
- `app/(app)/eventos/components/servicos.tsx`
- `app/(app)/eventos/components/README.md`
- `app/(app)/eventos/schemas/index.ts`
- `app/(app)/eventos/schemas/event.ts`
- `app/(app)/eventos/schemas/README.md`
- `app/api/events/route.ts`
- `app/api/events/[id]/route.ts`

### O que foi implementado

- A rota `/eventos` e sua rota filha `novo` foram removidas do App Router.
- O item `Tipos de eventos` saiu da sidebar sem redesenhar o restante do menu.
- As rotas `GET/POST/PUT/DELETE` de `/api/events` foram removidas junto com schemas, controller e componente exclusivos do modulo.
- O `middleware` deixou de tratar `/eventos` como rota protegida do app.
- `Servicos` foi mantido intacto como cadastro principal para combinacoes operacionais.

### Validacao executada

- `yarn eslint middleware.ts src/components/ui/app-sidebar.tsx`
- `yarn build` falhou por um erro preexistente em `app/(app)/equipe/controllers/page`, sem relacao com a remocao de `/eventos`

### Proximo passo sugerido

- Avaliar em outra tarefa se o dominio Prisma `Event`/`EventService` ainda deve existir no banco ou se merece uma migracao dedicada de limpeza com estrategia explicita para dados ja persistidos.

## 01 de abril de 2026 - Cancelamento liberando slot corretamente em /agendamentos

### Objetivo

Fazer o cancelamento em `/agendamentos` deixar de ocupar horario na grade, no contador da coluna e na agenda do dia.

### Arquivos alterados

- `app/api/appointments/route.ts`
- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- `GET /api/appointments` passou a retornar apenas appointments ativos para a agenda operacional (`SCHEDULED` e `CONFIRMED`).
- A tela `/agendamentos` passou a filtrar localmente apenas statuses ativos antes de montar colunas, contadores e cards.
- O fluxo de `PUT /api/appointments/[id]` ja persistia `status: "CANCELED"`; a UI agora remove imediatamente esse appointment da agenda local e faz refetch do dia atual apos salvar ou cancelar.
- A engine central de disponibilidade nao precisou mudar, porque ja ignorava cancelados e so considerava `SCHEDULED` e `CONFIRMED` como conflito.

### Validacao executada

- `yarn eslint app/api/appointments/route.ts app/(app)/agendamentos/page.tsx`

### Proximo passo sugerido

- Cobrir com teste automatizado o fluxo de cancelamento seguido de novo encaixe no mesmo horario para evitar regressao entre agenda e disponibilidade.

## 01 de abril de 2026 - Refino do modal retroativo em /agendamentos

### Objetivo

Completar o fluxo de registro retroativo em `/agendamentos`, exibindo campos manuais de data/hora quando a excecao estiver marcada e evitando corte do CTA de salvar no modal.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- O checkbox `Registrar atendimento ja realizado` agora revela campos explicitos de `Data` e `Hora` no proprio modal.
- Quando a excecao esta ativa, o create deixa de depender do slot selecionado e passa a usar os campos manuais enviados no payload.
- O rodape com `Salvar agendamento` saiu da area rolavel do formulario e ficou fixo no final do modal, evitando corte visual do CTA.
- O restante do layout do modal e da tela foi preservado.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`

### Proximo passo sugerido

- Validar no navegador os cenarios de retroativo com e sem slot selecionado, incluindo datas passadas com profissional travado por coluna.

## 01 de abril de 2026 - Registro retroativo controlado no modal de /agendamentos

### Objetivo

Permitir lancamento retroativo de atendimento em `/agendamentos` sem remover a protecao padrao contra agendamento no passado.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/api/appointments/route.ts`
- `app/api/appointments/[id]/route.ts`
- `src/lib/validators/appointment.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- O modal de novo agendamento ganhou a opcao explicita `Registrar atendimento ja realizado`, desmarcada por padrao.
- O frontend passou a enviar `allowPastScheduling` no payload do create quando a excecao e ativada.
- O schema Zod de appointments passou a aceitar `allowPastScheduling`.
- `POST /api/appointments` continua bloqueando horario no passado por padrao, mas passa a aceitar quando `allowPastScheduling` estiver ativo.
- `PUT /api/appointments/[id]` recebeu o mesmo tratamento para remarcacoes explicitas, preservando compatibilidade futura do endpoint.
- As validacoes reais de cliente, servico, profissional, elegibilidade do profissional e multi-tenant foram mantidas.
- Nao foi necessario alterar a engine central de disponibilidade, porque a trava de passado estava nas rotas de appointments, nao em `checkAvailabilityForSlot`.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx app/api/appointments/route.ts app/api/appointments/[id]/route.ts src/lib/validators/appointment.ts`

### Proximo passo sugerido

- Cobrir create e remarcacao com testes automatizados para garantir os dois cenarios: bloqueio padrao de passado e excecao controlada com `allowPastScheduling`.

## 01 de abril de 2026 - Modal de novo agendamento com profissional pre-selecionado pela coluna

### Objetivo

Fazer o modal de novo agendamento em `/agendamentos` respeitar automaticamente o contexto da coluna clicada, mantendo o layout atual e a validacao real do backend.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- Ao clicar em um slot de uma coluna de profissional, o modal agora abre com esse profissional ja selecionado.
- Nesse fluxo, o campo `Profissional` permanece visivel, mas fica bloqueado para edicao.
- A lista de servicos do modal passa a exibir somente os servicos ativos vinculados ao profissional da coluna clicada.
- O filtro usa a relacao real ja carregada de `MembershipService` via `/api/team`, sem criar regra paralela fake no frontend.
- As validacoes de backend foram preservadas em `POST /api/appointments` e `GET /api/appointments/availability`, que continuam recusando combinacoes invalidas de profissional + servico.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`

## 01 de abril de 2026 - Agenda por profissional, modal de novo agendamento e bloqueio por profissional

### Objetivo

Evoluir `/agendamentos` sem alterar o layout geral da tela, passando a respeitar expediente por profissional, bloqueio por profissional, modal de novo agendamento e scroll vertical interno por coluna.

### Arquivos alterados

- `app/(app)/agendamentos/components/professional-schedule-board.tsx`
- `app/(app)/agendamentos/components/professional-schedule-column.tsx`
- `app/(app)/agendamentos/page.tsx`
- `app/(app)/horarios-de-atendimento/controllers/useWeekScheduleFormController.ts`
- `app/(app)/horarios-de-atendimento/page.tsx`
- `app/api/schedule/blocked/[id]/route.ts`
- `app/api/schedule/blocked/route.ts`
- `app/api/schedule/weekly/route.ts`
- `app/api/team/route.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260401143000_add_professional_schedule_and_blocks/migration.sql`
- `src/lib/appointments/availability.ts`
- `src/lib/validators/schedule.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Agenda com expediente efetivo por profissional

- Foi criada modelagem minima para horario semanal por profissional (`MembershipWeekScheduleDay` e `MembershipWeekScheduleInterval`).
- A agenda de `/agendamentos` passou a usar o expediente do profissional quando existir, com fallback para o horario geral da loja quando nao houver configuracao individual.
- O board e as colunas mantiveram o visual atual, mas cada profissional agora pode ter range proprio de inicio/fim.

#### 2. Bloqueio por loja e por profissional

- `BlockedSchedule` passou a aceitar `membershipId` opcional.
- O backend continua aceitando bloqueio da loja inteira e agora tambem aceita bloqueio restrito a um profissional.
- A engine central de disponibilidade passou a considerar simultaneamente bloqueios globais e bloqueios do profissional.

#### 3. Novo agendamento em modal

- O formulario inline do topo saiu da tela e foi substituido por um `Dialog`.
- O clique em horario livre continua sendo o gatilho do fluxo, agora abrindo modal centralizado com scroll interno.
- O modal chega pre-preenchido com profissional, data e horario do slot clicado.

#### 4. Scroll vertical por coluna e leitura da grade

- Cada coluna passou a ter altura fixa baseada na viewport e scroll vertical proprio.
- O board horizontal foi preservado e continua rolando apenas dentro do container da agenda.
- O texto do horario nas celulas foi centralizado apenas na horizontal.
- Slots bloqueados agora ficam visualmente indisponiveis na coluna sem remover a revalidacao final do backend.

#### 5. Configuracao do expediente individual

- `/horarios-de-atendimento` ganhou um seletor simples para editar o expediente da loja inteira ou de um profissional especifico usando a mesma rota base.
- As rotas de horario semanal foram mantidas compativeis com o fluxo atual da loja.

### Validacao executada

- `yarn prisma generate`
- `yarn prisma db execute --file prisma/migrations/20260401143000_add_professional_schedule_and_blocks/migration.sql`
- `yarn eslint app/(app)/agendamentos/page.tsx app/(app)/agendamentos/components/professional-schedule-board.tsx app/(app)/agendamentos/components/professional-schedule-column.tsx app/(app)/horarios-de-atendimento/page.tsx app/(app)/horarios-de-atendimento/controllers/useWeekScheduleFormController.ts app/api/team/route.ts app/api/schedule/weekly/route.ts app/api/schedule/blocked/route.ts app/api/schedule/blocked/[id]/route.ts src/lib/appointments/availability.ts src/lib/validators/schedule.ts`

### Proximo passo sugerido

- Cobrir a engine de disponibilidade com testes automatizados focados em expediente individual, bloqueio global, bloqueio por profissional e ranges diferentes por coluna.

## 01 de abril de 2026 - Remocao do card visual de bloqueios ativos em /agendamentos

### Objetivo

Remover da tela de `/agendamentos` o card visual de bloqueios ativos do dia, preservando a logica de bloqueios da agenda e a indisponibilidade no backend.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- Foi removido o bloco visual que exibia:
  - `Bloqueios ativos em ...`
  - texto auxiliar de indisponibilidade
  - botao `Gerenciar bloqueios`
  - acoes `Desbloquear` nesse card
- O dialog de bloqueios, acessado por outros pontos da tela, foi preservado.
- A carga de bloqueios no frontend foi mantida para sustentar o dialog existente.
- Nenhuma regra de negocio de bloqueio foi alterada; a disponibilidade continua respeitando os horarios bloqueados no backend.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`

## 01 de abril de 2026 - Scroll horizontal isolado no container da agenda

### Objetivo

Evitar que o horizontal scroll de varias colunas de profissionais vaze para a pagina inteira de `/agendamentos`, mantendo a rolagem apenas dentro do bloco das agendas.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/professional-schedule-board.tsx`
- `src/components/sidebarLayout.tsx`
- `src/components/ui/sidebar.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- O wrapper principal da tela passou a bloquear overflow horizontal da pagina.
- O `ProfessionalScheduleBoard` passou a declarar largura limitada ao container (`w-full`, `min-w-0`, `max-w-full`).
- A rolagem horizontal foi mantida apenas no container interno das colunas, com `overflow-x-auto`.
- O shell autenticado tambem passou a usar `min-w-0` e `overflow-x-hidden`, evitando que a largura da agenda force scroll no viewport e arraste junto a faixa de filtros e CTA.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx app/(app)/agendamentos/components/professional-schedule-board.tsx src/components/sidebarLayout.tsx src/components/ui/sidebar.tsx`

## 01 de abril de 2026 - Simplificacao do formulario de novo agendamento

### Objetivo

Remover os campos visiveis de telefone e e-mail do formulario principal de novo agendamento, mantendo essas informacoes apenas no modal de cadastro rapido de cliente.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- Os campos `Telefone` e `E-mail` foram removidos da tela principal de novo agendamento.
- O modal de novo cliente foi mantido como unico ponto visual para informar telefone e e-mail durante o cadastro rapido.
- A logica existente de selecao de cliente e o restante do fluxo de agendamento foram preservados.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`

## 01 de abril de 2026 - Correcao do create manual futuro e listagem por data em /agendamentos

### Objetivo

Corrigir o fluxo de criacao manual para permitir agendamento em datas futuras, manter a mesma engine de disponibilidade como fonte de verdade e garantir consulta confiavel dos agendamentos por data.

### Arquivos alterados

- `app/api/appointments/route.ts`
- `app/api/appointments/[id]/route.ts`
- `app/api/appointments/availability/route.ts`
- `src/lib/validators/appointment.ts`
- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/professional-schedule-board.tsx`
- `app/(app)/agendamentos/components/professional-schedule-column.tsx`
- `app/(app)/agendamentos/components/appointment-card.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Fluxo manual com payload seguro

- O create manual deixou de depender de `startAt` ISO no payload e passou a trafegar `date` + `time`.
- O modal de disponibilidade continua consultando a mesma engine central, mas agora tambem devolve `date`, `time` e `endTime` junto do slot.
- A tela deixou de limpar o slot escolhido quando a data do modal era diferente da data selecionada na pagina; ao escolher um slot futuro, a tela sincroniza para a mesma data.

#### 2. Montagem explicita de `startAt` e `endAt` no backend

- `POST /api/appointments` e `PUT /api/appointments/[id]` agora montam o datetime com `combineDateKeyAndTime`, usando o timezone configurado da agenda.
- A validacao passou a bloquear apenas horario no passado quando ha criacao ou remarcacao explicita.
- A revalidacao final do slot continuou centralizada em `checkAvailabilityForSlot`, sem duplicar regra de disponibilidade no frontend.

#### 3. Listagem por data no backend

- `GET /api/appointments` agora aceita `?date=YYYY-MM-DD`.
- A rota monta o intervalo completo do dia no timezone da agenda e consulta o Prisma por `startAt` dentro desse range.
- A tela `/agendamentos` passou a carregar os agendamentos do dia selecionado diretamente pela API, em vez de depender apenas de filtro client-side com `new Date(iso)`.

#### 4. Exibicao menos dependente do timezone do navegador

- As respostas de appointments agora incluem `date`, `startTime` e `endTime`.
- As colunas da agenda, os cards e os dialogs passaram a usar esses campos para posicionamento e exibicao do horario do dia.
- Isso reduz o risco de a UI mostrar o agendamento no dia errado por parse local ambiguo.

### Validacao executada

- `yarn eslint app/api/appointments/route.ts app/api/appointments/[id]/route.ts app/api/appointments/availability/route.ts src/lib/validators/appointment.ts app/(app)/agendamentos/page.tsx app/(app)/agendamentos/components/professional-schedule-board.tsx app/(app)/agendamentos/components/professional-schedule-column.tsx app/(app)/agendamentos/components/appointment-card.tsx`
- `yarn tsc --noEmit --pretty false --incremental false --ignoreDeprecations 5.0`

### Observacoes

- O `tsc` continua falhando por erros antigos fora do escopo em `.next/dev/types/validator.ts`, `app/(app)/contas-a-pagar/novo/page.tsx`, `app/(app)/usuarios/controllers/index.tsx`, `src/components/ui/app-sidebar.tsx`, `src/lib/auth-options.ts` e `src/scripts/seed.ts`.
- A checagem de TypeScript nao apontou erro novo nos arquivos ajustados do fluxo de agendamentos.

### Proximo passo sugerido

- Cobrir `POST /api/appointments`, `PUT /api/appointments/[id]` e `GET /api/appointments?date=...` com testes automatizados de integracao focados em timezone e datas futuras.

## 31 de marco de 2026 - Busca de clientes e desbloqueio explicito no formulario de /agendamentos

### Objetivo

Refinar o formulario de novo agendamento para integrar clientes existentes com boa UX, melhorar o alinhamento dos campos de contato e tornar o fluxo de bloqueio/desbloqueio da agenda claramente reversivel.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Bloco de novo agendamento mais estavel

- O texto auxiliar do campo `Profissional` foi reduzido para mensagens curtas e discretas.
- Os campos `Cliente`, `Telefone` e `E-mail` foram reorganizados para manter alinhamento melhor em larguras intermediarias e pequenas.

#### 2. Busca e selecao de clientes existentes

- O campo `Cliente` passou a buscar clientes reais da loja por nome ou telefone.
- Ao selecionar um cliente existente, o formulario preenche telefone e e-mail automaticamente.
- Quando o cliente nao e encontrado, o usuario pode abrir um cadastro rapido sem sair do agendamento.

#### 3. Cadastro rapido de cliente no proprio fluxo

- Foi adicionado um dialog para criar cliente diretamente da tela de agendamentos.
- Apos salvar, o novo cliente volta selecionado no formulario atual.
- Telefone e e-mail continuam editaveis mesmo apos a selecao do cliente.

#### 4. Bloqueio e desbloqueio visiveis

- A pagina passou a listar os bloqueios ativos da data selecionada.
- Cada bloqueio mostra uma acao explicita de `Desbloquear`.
- O dialog de bloqueio agora deixa claro quando o usuario esta criando um novo bloqueio e quando esta removendo um bloqueio existente.

### Observacoes

- A logica de appointments, detalhe, criacao, edicao, loading, erro e filtros foi preservada.
- O backend existente de clientes e bloqueios foi reaproveitado sem criar endpoints novos.

## 31 de marco de 2026 - Cards reintegrados a grid da coluna em /agendamentos

### Objetivo

Remover a sensacao de overlay sobre a tabela e fazer os agendamentos voltarem a ser itens diretos da propria grid da coluna.

### Arquivos alterados

- `app/(app)/agendamentos/components/appointment-card.tsx`
- `app/(app)/agendamentos/components/professional-schedule-column.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Fim da camada absoluta dos cards

- Os agendamentos deixaram de ser renderizados em uma grid absoluta por cima da coluna.
- Os cards voltaram a ser filhos diretos da mesma grid usada pela malha de horarios.
- O alinhamento por `rowStart` e `rowSpan` foi mantido.

#### 2. Aparencia mais integrada a tabela

- O card teve sombra e margens suavizadas para parecer parte da estrutura da agenda.
- A malha continua visivel como base da coluna, sem transformar o agendamento em elemento flutuante.

## 31 de marco de 2026 - Cards sempre visiveis e menu funcional no topo da coluna em /agendamentos

### Objetivo

Corrigir a leitura dos agendamentos dentro da coluna por profissional, mantendo os cards sempre visiveis acima da malha de horarios e substituindo o topo da coluna por um unico menu funcional.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/appointment-card.tsx`
- `app/(app)/agendamentos/components/appointments-page-skeleton.tsx`
- `app/(app)/agendamentos/components/professional-column-menu.tsx`
- `app/(app)/agendamentos/components/professional-schedule-board.tsx`
- `app/(app)/agendamentos/components/professional-schedule-column.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Cards acima da malha, sem depender de hover

- A coluna passou a usar uma camada de fundo para a malha de horarios e uma camada superior exclusiva para os cards.
- Os agendamentos continuam alinhados pela grid de 15 minutos, mas agora ficam sempre visiveis, legiveis e clicaveis.
- O hover virou apenas detalhe visual; o conteudo principal do card continua aparente sem interacao.

#### 2. Header simplificado com menu unico

- O botao grande `Bloquear` foi removido.
- Os tres pontinhos soltos foram substituidos por um menu discreto no topo da coluna.
- Esse menu concentra as acoes de `Bloquear horario` e `Ocultar coluna`.

#### 3. Fluxo funcional para esconder e reexibir colunas

- Colunas podem ser ocultadas diretamente pelo menu do profissional.
- Quando isso acontece, a pagina exibe controles de restauracao para mostrar a coluna novamente.
- A estrutura geral por profissional, filtros e interacoes existentes foi mantida.

#### 4. Acao de bloqueio conectada ao fluxo atual

- O menu abre um dialog para salvar bloqueio de horario usando a rota ja existente de bloqueios.
- Nao foi criado backend novo nem alterada a regra de negocio de appointments.

### Observacoes

- Foram preservados o clique no card, o fluxo de novo agendamento, detalhes, loading, erro e empty state.
- O ajuste foi concentrado em camada visual, UX do header e acoes locais da coluna.

## 31 de marco de 2026 - Cards encaixados na malha da agenda por profissional

### Objetivo

Fazer os agendamentos parecerem parte da propria estrutura da coluna, trocando o overlay absoluto por uma renderizacao baseada em grid com linhas de 15 minutos.

### Arquivos alterados

- `app/(app)/agendamentos/components/appointment-card.tsx`
- `app/(app)/agendamentos/components/professional-schedule-board.tsx`
- `app/(app)/agendamentos/components/professional-schedule-column.tsx`
- `app/(app)/agendamentos/components/appointments-page-skeleton.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Coluna baseada em grade real

- Cada agenda por profissional passou a ser renderizada como uma grid vertical.
- Cada linha da grid representa 15 minutos da regua visual.
- Os horarios continuam visiveis dentro da propria coluna, agora como parte da malha estrutural.

#### 2. Agendamentos encaixados na coluna

- Os cards deixaram de usar `top` e `height` absolutos.
- Cada agendamento agora calcula `rowStart` e `rowSpan` com base no horario de inicio e fim.
- Um agendamento de `08:30` ate `09:15` ocupa exatamente as linhas correspondentes dentro da coluna.

#### 3. Aparencia menos flutuante

- Os blocos agora ocupam a propria malha da agenda, em vez de parecerem sobrepostos sobre ela.
- O skeleton foi ajustado para acompanhar a leitura em linhas regulares da nova estrutura.

### Observacoes

- A arquitetura por profissional foi mantida.
- A logica existente de detalhes, criacao, edicao, loading, erro e empty state foi preservada.

## 31 de marco de 2026 - Regua visual de 15 minutos com posicionamento real na agenda por profissional

### Objetivo

Reduzir a poluicao visual da timeline por profissional, trocando a leitura da coluna para marcacoes principais de 15 em 15 minutos sem perder o posicionamento real dos agendamentos por minuto.

### Arquivos alterados

- `app/(app)/agendamentos/components/appointment-card.tsx`
- `app/(app)/agendamentos/components/professional-schedule-board.tsx`
- `app/(app)/agendamentos/components/professional-schedule-column.tsx`
- `app/(app)/agendamentos/components/appointments-page-skeleton.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Separacao entre regua visual e calculo real

- A coluna deixou de usar intervalos de 5 minutos como base visual principal.
- A timeline passou a mostrar apenas marcacoes principais de 15 em 15 minutos.
- O posicionamento dos cards continua sendo calculado por minuto real a partir de `startAt` e `endAt`.

#### 2. Cards proporcionais ao horario real

- A posicao vertical do card agora usa os minutos corridos desde o inicio do expediente.
- A altura do card agora acompanha a duracao real do agendamento em minutos.
- Isso permite que um bloco iniciado em `08:30` com 45 minutos termine visualmente em `09:15` sem depender do tamanho do slot visual.

#### 3. Leitura mais limpa da coluna

- A agenda continuou organizada em uma coluna por profissional.
- As linhas de leitura ficaram mais espacadas e legiveis, sem a sensacao de grade excessivamente granular.
- O loading foi ajustado para refletir a nova densidade visual da timeline.

### Observacoes

- A logica existente de appointments, detalhes, criacao, edicao, erro, empty state e loading foi mantida.
- O ajuste foi restrito ao modelo visual da coluna e ao calculo de altura/posicao dos cards.

## 31 de marco de 2026 - Correcao estrutural da agenda para colunas independentes por profissional

### Objetivo

Corrigir a implementacao da agenda diaria para abandonar a grade compartilhada e passar a renderizar uma mini agenda propria para cada profissional, lado a lado.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/appointment-card.tsx`
- `app/(app)/agendamentos/components/professional-schedule-column.tsx`
- `app/(app)/agendamentos/components/professional-schedule-board.tsx`
- `app/(app)/agendamentos/components/appointments-page-skeleton.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Fim da malha global compartilhada

- A renderizacao deixou de usar uma unica regua/grade para todos os profissionais.
- A tela agora monta varias agendas independentes lado a lado dentro de um container com scroll horizontal.
- Cada profissional passou a ter sua propria coluna com timeline interna.

#### 2. Nova composicao em board, coluna e card

- Foi criado um board horizontal para mapear e renderizar as agendas de cada profissional.
- Cada coluna agora tem header proprio com nome, acao visual no topo e botao `Bloquear`.
- Cada card de agendamento fica posicionado apenas dentro da agenda do profissional correspondente.

#### 3. Timeline dentro da propria coluna

- Os horarios agora aparecem dentro de cada coluna, seguindo intervalos regulares da timeline interna.
- O clique em area vazia continua iniciando o fluxo existente de novo agendamento com data, horario e profissional contextualizados.
- O clique em bloco continua abrindo o detalhe existente do agendamento.

#### 4. Loading alinhado com a nova arquitetura

- O skeleton de `/agendamentos` foi ajustado para abrir como conjunto de colunas-agenda independentes.
- A leitura inicial da tela agora bate com a estrutura final da experiencia operacional.

### Observacoes

- A logica de carregamento, filtros, detalhes, criacao, edicao e cancelamento foi preservada.
- A mudanca foi concentrada na arquitetura visual e na forma de renderizar a agenda por profissional.

## 31 de marco de 2026 - Refinamento visual dos blocos da agenda diaria por profissional

### Objetivo

Aproximar os cards da grade diaria do comportamento visual de uma agenda operacional classica, com mais informacoes visiveis dentro do bloco e maior ocupacao da faixa horaria.

### Arquivos alterados

- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- Os blocos da grade diaria ganharam altura minima maior para atravessar melhor os intervalos de horario quando necessario.
- O card agora exibe mais informacoes dentro da propria coluna, com hierarquia visual mais forte para horario, cliente, servico e status.
- A apresentacao ficou mais proxima de agendas operacionais de clinica/salao, onde o agendamento ocupa visualmente a faixa do horario e empurra a leitura do proximo slot para baixo.

## 31 de marco de 2026 - Agenda diaria operacional por profissional em /agendamentos

### Objetivo

Substituir a experiencia de calendario/resumo por uma grade diaria mais operacional, com leitura imediata da ocupacao de cada profissional no dia selecionado.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `app/(app)/agendamentos/components/appointments-page-skeleton.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Nova visualizacao principal da agenda

- A tela `/agendamentos` deixou de usar o calendario mensal como experiencia principal.
- A visualizacao central agora mostra 1 dia por vez, com uma coluna por profissional e eixo de horarios na lateral esquerda.
- O layout aceita scroll horizontal para varios profissionais e preserva leitura rapida de ocupacao por coluna.

#### 2. Cards posicionados por horario real

- Os agendamentos passaram a ser renderizados como blocos posicionados por `startAt` e `endAt`.
- Cada card mostra horario, cliente, servico e status, mantendo o visual do projeto com variacoes discretas por status.
- O clique no card continua abrindo o dialog de detalhes/edicao/cancelamento ja existente.

#### 3. Clique em horario vazio reaproveitando o fluxo atual

- Cada faixa vazia da grade pode iniciar um novo agendamento diretamente da coluna clicada.
- O formulario existente e reutilizado, chegando pre-preenchido com data, horario e profissional quando essa informacao existe na coluna.
- O backend e os contratos nao foram alterados; o `POST` continua revalidando a disponibilidade real com base no servico escolhido.

#### 4. Loading e empty state alinhados com a nova UX

- O skeleton da pagina foi refeito para parecer a nova grade diaria operacional.
- Quando nao existem agendamentos no dia, a grade continua visivel para destacar horarios livres, com mensagem complementar de agenda vazia.
- O tratamento de erro e o carregamento real da tela foram preservados.

### Observacoes

- A logica de dados, detalhes, edicao, cancelamento, listagem real e disponibilidade foi reaproveitada.
- A mudanca foi concentrada na camada de visualizacao e na forma de iniciar o fluxo de novo agendamento a partir da grade.

## 31 de marco de 2026 - CRUD real de /clientes com Prisma, API e formularios dedicados

### Objetivo

Transformar `/clientes` em um modulo real do sistema, reaproveitando o padrao visual e estrutural de `/usuarios` sem misturar o dominio operacional de cliente com o dominio de autenticacao.

### Arquivos alterados

- `prisma/schema.prisma`
- `src/lib/validators/client.ts`
- `app/api/clients/route.ts`
- `app/api/clients/[id]/route.ts`
- `app/(app)/clientes/page.tsx`
- `app/(app)/clientes/loading.tsx`
- `app/(app)/clientes/components/ClientForm.tsx`
- `app/(app)/clientes/schemas/index.ts`
- `app/(app)/clientes/novo/page.tsx`
- `app/(app)/clientes/[id]/page.tsx`
- `generated/prisma/*`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Dominio proprio de clientes no Prisma

- Foi adicionado o model `Client` com escopo obrigatorio por `storeId`.
- O model inclui nome, email, CPF, telefones, genero, data de nascimento, observacoes e status ativo.
- Tambem foram adicionados indices por loja para suportar listagem e validacoes operacionais.

#### 2. API real em `/api/clients`

- Foi criado `GET /api/clients` com permissao minima `STAFF` para listar clientes da loja ativa.
- Foram criados `POST`, `PUT` e `DELETE` com permissao minima `ADMIN` para criacao, atualizacao e remocao.
- O backend protege `storeId` via sessao e valida payloads com Zod, incluindo CPF e tratamento de duplicidade por email/CPF na mesma loja.

#### 3. UI de listagem e formularios no padrao da area de Usuarios

- `/clientes` deixou de ser stub e passou a listar dados reais da API com loading interno, empty state e paginacao simples via `Carregar mais`.
- Foram criadas as rotas `/clientes/novo` e `/clientes/[id]` com um `ClientForm` reutilizavel.
- O formulario cobre criacao e edicao com mascara de CPF/telefone, selecao de genero, observacoes e chave de cliente ativo.

#### 4. Geracao local do Prisma Client

- O Prisma Client foi regenerado localmente para refletir o novo model `Client`.
- Isso deixa o codigo tipado e pronto para uso assim que a migracao puder ser aplicada no banco.

### Observacoes

- A execucao de `prisma migrate dev` ficou bloqueada por drift ja existente entre o banco de desenvolvimento e o historico local de migrations.
- O Prisma apontou migrations aplicadas no banco e ausentes no diretorio local, entao a aplicacao da nova migration depende de resolver esse drift antes ou de autorizar um reset do schema de desenvolvimento.

## 31 de marco de 2026 - Nova rota /clientes e ajuste da sidebar

### Objetivo

Corrigir a navegacao lateral para separar claramente Home e Clientes, criando a rota `/clientes` com uma base visual consistente sem inventar backend novo nesta etapa.

### Arquivos alterados

- `app/(app)/clientes/page.tsx`
- `src/components/ui/app-sidebar.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Ajuste da navegacao lateral

- Foi adicionado um grupo `Home` no topo da sidebar apontando para `/dashboard`.
- O item `Clientes` deixou de apontar para dashboard e passou a usar a rota correta `/clientes`.
- A estrutura de grupos do menu foi preservada, sem refatoracao desnecessaria da sidebar.

#### 2. Criacao da rota /clientes

- Foi criada a pagina `app/(app)/clientes/page.tsx`.
- A tela segue o mesmo idioma visual das listagens administrativas ja existentes no projeto.
- A pagina abre sem erro e ja se comporta como uma tela real do sistema, mesmo sem integracao completa de dados.

#### 3. Base visual inspirada em /usuarios

- A nova tela usa cabecalho com acao principal, cards introdutorios e area de listagem com empty state.
- A implementacao evita acoplar cliente a usuario onde essa regra ainda nao existe.
- A estrutura ficou preparada para evolucao futura com busca, listagem e acoes reais quando a fonte de dados for definida.

### Observacoes

- Nenhum backend novo foi criado nesta etapa.
- O foco foi rota, navegacao e consistencia visual inicial.

## 31 de marco de 2026 - Padronizacao de loading nas paginas principais

### Objetivo

Unificar o comportamento de carregamento das paginas principais do app para usar sempre skeleton + texto curto, evitando tela em branco e eliminando fallback solto apenas com "Carregando...".

### Arquivos alterados

- `src/components/loading/list-page-skeleton.tsx`
- `app/(app)/agendamentos/components/appointments-page-skeleton.tsx`
- `app/(app)/horarios-de-atendimento/components/schedule-page-skeleton.tsx`
- `app/(app)/usuarios/page.tsx`
- `app/(app)/usuarios/loading.tsx`
- `app/(app)/equipe/page.tsx`
- `app/(app)/equipe/loading.tsx`
- `app/(app)/eventos/page.tsx`
- `app/(app)/eventos/loading.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Skeleton reutilizavel para telas de listagem

- Foi criado um componente compartilhado para listagens administrativas com header placeholder, linhas de cards e area de acao.
- Esse componente passou a ser reutilizado nas telas de usuarios, equipe e eventos.
- O objetivo foi manter proporcao, espacamento e identidade visual consistentes entre paginas do painel.

#### 2. Loading interno padronizado em usuarios, equipe e eventos

- As paginas client-side agora usam skeleton interno no primeiro carregamento real, com a regra `loading && items.length === 0`.
- Isso elimina o fallback simples de texto solto e evita abertura com aparencia vazia.
- O conteudo real continua substituindo o skeleton naturalmente quando os dados chegam.

#### 3. loading.tsx complementar nas rotas que faltavam

- Foram adicionados `loading.tsx` para `/usuarios`, `/equipe` e `/eventos`.
- Esses fallbacks complementam o App Router, mas nao substituem o loading interno das paginas client-side.
- A navegacao entre rotas ficou visualmente mais consistente desde o primeiro frame.

#### 4. Ajuste dos skeletons ja existentes

- Os skeletons de `/agendamentos` e `/horarios-de-atendimento` passaram a exibir texto curto de carregamento.
- O padrao visual agora segue a mesma direcao nas cinco telas prioritarias.
- Nenhuma regra de negocio, endpoint ou fluxo operacional foi alterado.

### Observacoes

- O foco desta etapa foi exclusivamente a padronizacao visual de loading.
- A implementacao reaproveita os estados de loading existentes nas paginas.

## 31 de marco de 2026 - Loading visual em /agendamentos e /horarios-de-atendimento

### Objetivo

Evitar que as telas de agendamentos e gerenciador de horarios aparecam em branco enquanto os dados iniciais ainda estao carregando no App Router e nos controllers client-side.

### Arquivos alterados

- `app/(app)/agendamentos/components/appointments-page-skeleton.tsx`
- `app/(app)/agendamentos/loading.tsx`
- `app/(app)/horarios-de-atendimento/components/schedule-page-skeleton.tsx`
- `app/(app)/horarios-de-atendimento/loading.tsx`
- `app/(app)/horarios-de-atendimento/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Skeleton de rota para /agendamentos

- Foi criado um `loading.tsx` proprio para a rota de agendamentos.
- O fallback replica a estrutura principal da tela, com cabecalho de filtros e area do calendario mensal.
- Isso evita o frame inicial vazio antes da hidratacao do client component.

#### 2. Skeleton de rota para /horarios-de-atendimento

- Foi criado um `loading.tsx` para o gerenciador de horarios.
- O fallback cobre tanto a semana operacional quanto a secao de bloqueios.
- A tela passa a manter contexto visual mesmo antes do primeiro fetch ser concluido.

#### 3. Skeleton interno no carregamento real dos controllers

- Alem do fallback de rota, `/horarios-de-atendimento` agora mostra skeleton interno enquanto os controllers ainda nao carregaram os dados iniciais.
- A lista de bloqueios tambem ganhou skeleton proprio quando ainda nao existem itens renderizados.
- O resultado e uma transicao mais estavel, sem areas grandes vazias durante o carregamento.

### Observacoes

- A mudanca foi focada apenas em experiencia visual de loading.
- Nenhuma regra de negocio, endpoint ou fluxo de persistencia foi alterado.

## 31 de marco de 2026 - Ajuste do modal de edicao e dos breakpoints intermediarios em /agendamentos

### Objetivo

Corrigir o modal de edicao em telas pequenas e evitar que a grade mensal de 7 colunas continue comprimindo a leitura em larguras intermediarias como por volta de 1160px.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Modal de edicao mais estavel no mobile

- O dialog de detalhes/edicao passou a respeitar melhor a largura util da viewport.
- O rodape do modal agora empilha os botoes em telas pequenas para evitar quebra horizontal.
- As acoes continuam lado a lado apenas quando existe espaco suficiente.

#### 2. Calendario mensal com breakpoint mais conservador

- A grade mensal de 7 colunas deixou de aparecer ja em larguras menores.
- Ate telas intermediarias, a agenda permanece em cards responsivos mais legiveis.
- A grade completa do calendario mensal fica restrita a telas maiores, onde ha espaco real para leitura.

### Observacoes

- O ajuste preserva toda a logica existente de sheet do dia, dialog de edicao e filtros.
- O foco desta etapa foi somente responsividade e legibilidade.

## 31 de marco de 2026 - Refino extra do mobile em /agendamentos para telas muito estreitas

### Objetivo

Melhorar a leitura do calendario mensal em telas menores que cerca de 420px e adicionar um atalho rapido para exibir somente os dias com agendamento.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Uma coluna em telas muito estreitas

- O calendario mobile passou a usar uma unica coluna abaixo de 420px.
- A partir desse ponto, a leitura deixa de competir com dois cards por linha.
- Em larguras um pouco maiores, o layout continua em 2 colunas no mobile.

#### 2. CTA para mostrar so dias com agendamento

- Foi adicionado um CTA mobile para alternar entre todos os dias do mes e apenas os dias com agendamento.
- Quando o filtro esta ativo, o calendario mostra somente os dias relevantes para a operacao.
- Se nao houver resultados, a interface mostra um empty state especifico para o filtro atual.

### Observacoes

- O comportamento desktop segue inalterado.
- O refinamento foi focado apenas na experiencia mobile da navegacao mensal.

## 31 de marco de 2026 - Refino mobile do calendario mensal em /agendamentos

### Objetivo

Corrigir a leitura ruim do calendario mensal em telas pequenas, evitando a grade espremida de 7 colunas sem mexer na experiencia desktop que ja estava adequada.

### Arquivos alterados

- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Calendario mobile proprio

- Em telas pequenas, o calendario mensal deixou de usar a mesma grade de 7 colunas do desktop.
- O mobile agora renderiza os dias do mes atual em cards de 2 colunas, com leitura mais confortavel.
- O clique no dia continua abrindo o mesmo sheet lateral com os agendamentos ordenados.

#### 2. Hierarquia mais legivel no celular

- Cada card mobile destaca dia da semana, numero do dia, badge de quantidade e resumo curto dos horarios.
- O dia atual e o dia selecionado continuam com destaque visual proprio.
- Os indicadores por status foram preservados tambem na versao mobile.

### Observacoes

- O desktop foi mantido sem alteracoes de comportamento.
- O ajuste foi focado apenas na responsividade da experiencia mensal.

## 31 de marco de 2026 - Refatoracao de /agendamentos para calendario mensal limpo

### Objetivo

Trocar a visualizacao poluida da agenda por uma experiencia mensal mais limpa, onde cada dia resume a existencia de agendamentos e o detalhe completo fica sob demanda em um painel lateral.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Calendario mensal como experiencia principal

- A grade principal de `/agendamentos` deixou de exibir blocos horarios cheios na tela inicial.
- O componente de calendario foi refeito como uma grade mensal limpa, com foco em navegacao e leitura rapida.
- Cada dia agora destaca numero, contador de agendamentos e um resumo curto dos primeiros horarios.

#### 2. Destaques visuais e navegacao por mes

- O calendario passou a destacar hoje, dia selecionado e dias fora do mes atual.
- A navegacao entre meses ficou concentrada no proprio calendario.
- O filtro de profissional continua sendo aplicado sobre a mesma fonte real da pagina.

#### 3. Detalhe do dia sob demanda em sheet lateral

- O clique em qualquer dia abre um sheet lateral com os agendamentos daquele dia.
- A lista vem em ordem cronologica e mostra horario, cliente, servico, profissional e status.
- Dias sem agendamento tambem abrem o painel com empty state consistente.

#### 4. Fluxos existentes preservados

- O formulario de novo agendamento foi mantido, assim como a consulta real de disponibilidade.
- O dialog de detalhes/edicao/remarcacao do appointment continua funcionando sobre os mesmos endpoints existentes.
- Nao houve mudanca em persistencia, regras de disponibilidade ou APIs da agenda.

### Observacoes

- A refatoracao focou em layout, navegacao e legibilidade.
- O laboratorio `/agendamentos-lab` foi mantido apenas como apoio e nao faz parte da entrega final desta etapa.

## 30 de marco de 2026 - Refino estrutural do modal de agendamento

### Objetivo

Corrigir o modal de agendamento que estava estourando a viewport, reorganizar a experiencia em abas e trocar os fluxos de remarcacao e exclusao por alternativas mais seguras para operacao real.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Modal com altura controlada e scroll interno

- O dialog passou a usar altura maxima relativa a viewport.
- Header, corpo e rodape ficaram estruturalmente separados.
- O conteudo interno agora rola sem jogar o modal para fora da tela.

#### 2. Abas para detalhes e edicao

- O conteudo foi dividido em `Detalhes` e `Editar e remarcar`.
- Isso reduz a densidade inicial e deixa a leitura mais objetiva.
- As acoes principais ficaram no rodape, sem alongar desnecessariamente o corpo do modal.

#### 3. Remarcacao por horarios disponiveis

- O campo livre de `datetime-local` foi removido do modal.
- A remarcacao agora consulta `GET /api/appointments/availability` e permite escolher apenas slots validados.
- O save continua usando `PUT /api/appointments/[id]`, preservando a revalidacao final no backend.

#### 4. Cancelamento logico no lugar de exclusao fisica

- A acao principal deixou de remover o appointment da base.
- O modal agora envia `status = CANCELED` via `PUT`.
- O item permanece visivel na agenda e no historico operacional com status de cancelado.

### Observacoes

- O backend continua sendo a fonte de verdade para disponibilidade e validacao.
- A rota `DELETE` existente nao e mais utilizada pelo fluxo principal da agenda.

## 30 de marco de 2026 - Modal de agendamento com edicao, remarcacao e exclusao

### Objetivo

Transformar o modal de detalhes do agendamento em um ponto de acao real, permitindo editar dados, remarcar para outra data/hora e excluir o agendamento diretamente da agenda.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/api/appointments/[id]/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Modal com modo de edicao

- O modal deixou de ser apenas leitura.
- Agora ele permite editar cliente, telefone, e-mail, servico, profissional e observacoes.
- A remarcacao acontece no mesmo fluxo por meio do campo de data/hora.

#### 2. Salvamento real

- O salvamento usa `PUT /api/appointments/[id]`.
- A lista local da agenda e o agendamento selecionado sao atualizados logo apos o retorno da API.
- A verificacao de disponibilidade continua centralizada no backend durante a remarcacao.

#### 3. Exclusao real

- Foi adicionada rota `DELETE /api/appointments/[id]`.
- O modal ganhou fluxo de confirmacao antes da exclusao.
- Depois da exclusao, o item e removido da agenda local e o modal e fechado.

### Observacoes

- O backend continua validando escopo por loja e permissao administrativa.
- A remarcacao segue respeitando a regra de disponibilidade existente.

## 30 de marco de 2026 - Ajuste do wrapper desktop da agenda em /agendamentos

### Objetivo

Remover o padding do wrapper desktop que criava uma faixa branca em volta do calendario, mas sem perder a leitura do radius visivel na agenda.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Remocao do padding do wrapper desktop

- O bloco desktop que envolve o `FullCalendarView` deixou de usar `p-4`.
- Isso elimina a falsa borda gerada pelo espacamento interno entre wrapper e calendario.

#### 2. Radius preservado no desktop

- O container externo da agenda deixa de competir visualmente com o card do calendario no desktop.
- O radius que passa a prevalecer e o do proprio componente do calendario.

### Observacoes

- O ajuste foi restrito ao desktop.
- No mobile, a estrutura da secao continua a mesma.

## 30 de marco de 2026 - Remocao da borda externa duplicada em /agendamentos

### Objetivo

Eliminar a dupla borda visivel na agenda desktop de `/agendamentos`, mantendo apenas a moldura da grade do FullCalendar.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Remocao da moldura externa

- O container externo da agenda deixou de aplicar borda propria.
- A grade do FullCalendar segue com seu contorno interno como unica borda visivel.
- Isso reduz ruído visual e evita a sensacao de tabela com duas caixas sobrepostas.

### Observacoes

- Ajuste apenas visual.
- Nenhuma regra de negocio ou interacao foi alterada.

## 30 de marco de 2026 - Limpeza da area acima da grade e refinamento de contraste em /agendamentos

### Objetivo

Remover o bloco textual acima da grade do calendario para deixar a tela mais limpa e melhorar o contraste dos agendamentos, destacando melhor o texto com um fundo ainda mais suave.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Remocao do bloco explicativo acima da grade

- A area com titulo e texto explicativo acima da tabela dos dias foi removida.
- A tela agora entrega mais rapido o que interessa: a grade do calendario.

#### 2. Contraste melhor nos eventos

- O fundo dos agendamentos ficou ainda mais claro.
- O texto principal passou a ter mais peso visual para ganhar leitura mesmo com muitos blocos na agenda.
- O nome do profissional foi mantido, mas com hierarquia abaixo de cliente e servico.

### Observacoes

- O ajuste foi somente visual e de composicao da interface.
- Nenhuma regra de negocio ou integracao foi alterada.

## 30 de marco de 2026 - Definicao da view 3 dias como padrao em /agendamentos

### Objetivo

Assumir a visualizacao `3 dias` como modo padrao do desktop em `/agendamentos`, consolidando a decisao de usar uma grade intermediaria mais equilibrada para a operacao.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Padrao explicitado na interface

- A view `3 dias` foi mantida como estado inicial da pagina.
- O seletor visual passou a priorizar `3 dias` como primeira opcao.
- Foi adicionado um indicativo visual de que este e o padrao atual do desktop.

#### 2. Decisao consolidada

- A agenda continua oferecendo `Mes`, `Dia` e `Semana` como alternativas.
- O desktop passa a assumir `3 dias` como ponto de entrada principal para uso operacional.
- Isso preserva contexto suficiente sem comprimir a leitura como na semana cheia.

### Observacoes

- Nao houve alteracao de backend, regras de negocio ou endpoints.
- A mudanca formaliza uma escolha de UX para a tela principal de agenda.

## 30 de marco de 2026 - Ajuste de densidade visual e grade de 3 dias em /agendamentos

### Objetivo

Reduzir o peso visual da agenda quando ha muitos agendamentos e disponibilizar uma visualizacao intermediaria de 3 dias no desktop, para comparar poucos dias lado a lado sem a carga visual da semana inteira.

### Arquivos alterados

- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Fundo dos eventos suavizado

- Os blocos de agendamento deixaram de usar azul muito saturado como base principal.
- Os eventos agora usam fundos mais claros e texto escuro nas views de grade horaria.
- Isso melhora a leitura quando varios agendamentos ficam empilhados na tela.

#### 2. Nova grade de 3 dias

- Foi adicionada a opcao `3 dias` ao seletor de visualizacao desktop.
- A agenda passa a exibir 3 colunas consecutivas a partir da data de referencia.
- A navegacao avanca e retorna em blocos de 3 dias, o que atende bem o cenario de mostrar segunda, terca e quarta, depois seguir para os proximos dias.

#### 3. Impacto funcional

- Esta abordagem nao e ruim para uso operacional; ela tende a ser mais equilibrada que a semana inteira quando a agenda fica carregada.
- O usuario ganha comparacao lateral entre dias sem comprimir demais cada coluna.
- A view semanal continua disponivel para quando fizer sentido ver mais contexto.

### Observacoes

- O ajuste foi visual e de layout do calendario, sem mudanca de backend ou regra de negocio.
- A agenda mensal e diaria continuam disponiveis junto da nova opcao `3 dias`.

## 30 de marco de 2026 - Ajuste de legibilidade dos eventos em /agendamentos

### Objetivo

Melhorar a legibilidade das informacoes do agendamento no FullCalendar de `/agendamentos`, exibindo tambem o profissional responsavel e removendo a borda duplicada ao redor da grade.

### Arquivos alterados

- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Tipografia maior nos eventos

- O horario e o nome do cliente passaram a usar fonte maior nas views de grade horaria.
- Servico e profissional tambem foram ampliados para leitura mais confortavel.
- Os eventos do mes receberam aumento leve de fonte para continuar legiveis sem poluir a celula.

#### 2. Profissional visivel no bloco do agendamento

- Os eventos agora mostram o nome do profissional responsavel quando houver espaco suficiente.
- Na view mensal, o profissional tambem passou a aparecer de forma compacta.

#### 3. Remocao da borda duplicada

- A borda externa do container do calendario foi removida.
- A grade principal passou a manter apenas o contorno necessario da propria tabela do FullCalendar.

### Observacoes

- O ajuste foi visual e nao mudou regras de negocio, API ou interacoes existentes.
- A intencao foi aproximar a agenda de uma leitura operacional mais limpa, sem excesso de molduras.

## 30 de marco de 2026 - Refino da visao mensal do FullCalendar em /agendamentos

### Objetivo

Melhorar a view mensal de `/agendamentos` para ficar mais proxima do modelo classico do print, reduzindo densidade, estabilizando a altura das celulas e limpando o visual da grade.

### Arquivos alterados

- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Celulas mensais mais estaveis

- A view mensal passou a usar semanas fixas para manter a grade mais previsivel.
- Cada celula ganhou altura fixa e alinhamento mais consistente do numero do dia.
- O resultado reduz a sensacao de grade variavel entre meses.

#### 2. Menos densidade por dia

- O mes agora limita melhor a quantidade de eventos visiveis por celula.
- Os textos dos eventos ficaram menores e mais discretos.
- O link de excesso de eventos foi mantido como sumario curto.

#### 3. Visual mais neutro

- O cabecalho do mes ficou mais limpo e leve.
- O fundo das celulas foi neutralizado para parecer mais calendario classico.
- O destaque do dia atual foi mantido, mas com intensidade menor.

### Observacoes

- O ajuste foi focado na view mensal desktop.
- Nenhuma regra de negocio, API ou dialogo do fluxo atual foi alterado.

## 30 de marco de 2026 - Correcao do sync do FullCalendar e adicao da visao mensal em /agendamentos

### Objetivo

Remover o erro de sincronizacao do FullCalendar na tela `/agendamentos` e habilitar uma visualizacao mensal classica, no formato de calendario por dias semelhante ao print de referencia.

### Arquivos alterados

- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `app/(app)/agendamentos/page.tsx`
- `package.json`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Correcao do erro de sincronizacao

- A navegacao do FullCalendar deixou de depender de `gotoDate` e `changeView` imperativos dentro de efeito React.
- O calendario agora e remontado de forma controlada a partir de `view` e `selectedDate`.
- Isso elimina o erro de `flushSync` disparado durante a renderizacao da pagina.

#### 2. Visualizacao mensal classica

- Foi adicionada a view `Mes` ao seletor de visualizacao da pagina.
- O componente passou a suportar `dayGridMonth` com layout classico por celula.
- Os dias agora aparecem como quadrados de calendario, e os agendamentos ficam dentro de cada dia quando existirem.

#### 3. Navegacao e textos ajustados

- A toolbar agora trata corretamente navegacao por mes, semana e dia.
- Headline, contadores e textos de apoio foram ajustados para refletir o modo atual.
- O visual mensal foi aproximado do estilo simples e classico do print de referencia.

### Observacoes

- A view mensal foi adicionada sem alterar backend, regras de negocio ou dialogos da tela.
- O mobile continua com a estrutura simplificada atual; a visualizacao mensal foi adicionada ao desktop.

## 30 de marco de 2026 - Ajuste do FullCalendar para visual classico em /agendamentos

### Objetivo

Deixar os eventos do FullCalendar em `/agendamentos` mais proximos do modelo classico mostrado no print de referencia, reduzindo ornamentacao visual e aproximando o calendario da aparencia nativa esperada.

### Arquivos alterados

- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Evento com aparencia mais nativa

- Os eventos deixaram de usar o card rico com badge e barra lateral.
- O bloco agora ficou mais reto, compacto e com preenchimento azul predominante.
- O conteudo interno foi reduzido para horario, cliente e servico quando houver altura suficiente.

#### 2. Grade mais proxima do exemplo classico

- As bordas e espacamentos dos eventos foram reduzidos.
- O acabamento visual ficou mais simples e menos “cardizado”.
- O resultado aproxima a leitura do estilo padrao que normalmente se espera em calendarios web.

### Observacoes

- Este ajuste mudou a estetica da visualizacao, nao a regra de negocio.
- Nao foi adicionada view mensal nesta etapa; o foco foi aproximar o estilo visual do print dentro das views atuais da agenda.

## 30 de marco de 2026 - Refino dos cards do FullCalendar em /agendamentos

### Objetivo

Corrigir o aspecto quebrado dos eventos na grade do FullCalendar em `/agendamentos`, deixando os agendamentos com leitura mais proxima de um calendario operacional real sem alterar backend, integracao de dados ou fluxos da pagina.

### Arquivos alterados

- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Conteudo do evento simplificado por densidade

- Os cards do calendario agora se adaptam a duracoes curtas, medias e longas.
- Eventos mais curtos mostram apenas o essencial para evitar quebra visual.
- Eventos maiores mantem cliente, servico e profissional sem empurrar o texto para fora da area util.

#### 2. Visual mais proximo de agenda real

- Os chips excessivos foram reduzidos em peso visual.
- Cada evento passou a usar uma barra lateral de destaque por status.
- O bloco ganhou hierarquia mais clara entre horario, cliente, servico e status.

#### 3. Ajuste de altura minima e acabamento

- A altura minima dos eventos foi elevada para melhorar respiracao do conteudo.
- O container do evento agora segura melhor overflow, cursor e padding internos.
- O resultado reduz a sensacao de evento quebrado ou “esticado vazio” na grade.

### Observacoes

- Nao houve alteracao de API, Prisma, disponibilidade ou dialogos reais.
- A rota-lab `/agendamentos-lab` foi mantida intacta; o ajuste foi focado apenas na tela oficial.

## 30 de marco de 2026 - Laboratorio isolado /agendamentos-lab com FullCalendar Standard

### Objetivo

Criar uma rota separada para validar o layout e a renderizacao do FullCalendar dentro do projeto Olyon sem acoplar a POC diretamente ao fluxo real de `/agendamentos`.

### Arquivos alterados

- `app/(app)/agendamentos-lab/page.tsx`
- `app/(app)/agendamentos-lab/components/calendar-lab.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Rota-lab separada da tela oficial

- Foi criada a rota `/agendamentos-lab` dentro do app autenticado.
- A pagina usa `HeaderPage`, mas nao depende da tela oficial de `/agendamentos`.
- O objetivo e permitir teste visual do FullCalendar em ambiente controlado antes de nova integracao.

#### 2. FullCalendar com dados mockados

- A grade usa apenas FullCalendar Standard com `timeGridDay` e `timeGridWeek`.
- Os eventos sao mockados localmente e distribuidos pela semana da data selecionada.
- Nao houve integracao com `/api/appointments`, disponibilidade, modal de horarios ou backend.

#### 3. Comparacao entre modo simples e modo leve

- A toolbar da POC permite alternar entre renderizacao nativa do FullCalendar e uma customizacao leve de evento.
- Isso ajuda a avaliar se o visual puro da biblioteca ja e suficiente ou se vale uma camada minima de apresentacao.
- O clique no evento atualiza um pequeno painel-resumo local e registra o evento no console para validar interacao.

#### 4. Foco exclusivo em layout desktop

- A grade do FullCalendar fica ativa apenas em `lg` para cima.
- Em telas pequenas, a rota exibe apenas um aviso de que a avaliacao foi pensada para desktop.
- A pagina oficial `/agendamentos` nao foi retrabalhada nesta entrega.

### Observacoes

- Esta rota-lab nao substitui nenhum fluxo real do projeto.
- A intencao e avaliar largura, altura, leitura da grade e aparencia dos eventos antes de decidir por integracao oficial.

## 30 de marco de 2026 - Migracao desktop de /agendamentos para FullCalendar Standard

### Objetivo

Substituir a POC desktop anterior por uma integracao com FullCalendar Standard, validando `timeGridDay` e `timeGridWeek` com os appointments reais do projeto, sem usar recursos premium e sem quebrar filtros, criacao manual, modal de horarios, dialog de detalhes e o mobile ja aprovado.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/full-calendar-view.tsx`
- `app/globals.css`
- `global.d.ts`
- `package.json`
- `yarn.lock`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. FullCalendar isolado como camada visual desktop

- A renderizacao desktop do calendario foi isolada em `app/(app)/agendamentos/components/full-calendar-view.tsx`.
- A pagina principal continua dona da toolbar, filtros, formulario manual, modal de horarios e dialog de detalhes.
- Essa separacao reduz acoplamento e deixa a POC reversivel ou substituivel no futuro.

#### 2. Uso apenas de recursos gratuitos do FullCalendar

- Foram adicionados apenas `@fullcalendar/react`, `@fullcalendar/core` e `@fullcalendar/timegrid`.
- Nao foi usado nenhum recurso premium de scheduler, resource timeline, drag and drop ou resize.
- O clique no evento continua abrindo o dialog proprio do Olyon, sem depender de modal nativo da biblioteca.

#### 3. Integracao com os appointments reais do projeto

- Os appointments reais de `/api/appointments` passaram a ser mapeados para eventos do FullCalendar no desktop.
- A POC suporta alternancia entre `timeGridDay` e `timeGridWeek`, com a toolbar do Olyon controlando periodo e view.
- Os eventos preservam `extendedProps` com dados necessarios para abrir o detalhe do agendamento.

#### 4. Mobile preservado

- A lista mobile existente foi mantida sem retrabalho.
- A troca para FullCalendar acontece apenas em `lg` para cima.

### Observacoes

- A POC nao usa views por recurso/profissional no desktop porque isso entraria no escopo premium do ecossistema FullCalendar.
- O `global.d.ts` continua apenas com a declaracao generica de `*.css`; a integracao atual nao precisou de workaround especifico adicional.

## 30 de marco de 2026 - POC desktop de /agendamentos com Schedule-X

### Objetivo

Validar uma troca temporaria da camada visual desktop de `/agendamentos` para Schedule-X, usando apenas recursos gratuitos da biblioteca e preservando filtros, criacao manual, modal de horarios, dialog de detalhes e o mobile ja aprovado.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/schedule-x-calendar.tsx`
- `app/globals.css`
- `global.d.ts`
- `package.json`
- `yarn.lock`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Isolamento da POC em componente proprio

- A renderizacao desktop do calendario foi movida para `app/(app)/agendamentos/components/schedule-x-calendar.tsx`.
- A pagina principal continua dona da toolbar, filtros, formulario manual, modal de horarios e dialog de detalhes.
- Essa isolacao reduz acoplamento e facilita trocar depois para FullCalendar, se necessario.

#### 2. Uso apenas de recursos gratuitos do Schedule-X

- Foram usados apenas os pacotes livres de `calendar`, `react`, `theme-default`, `events-service` e `calendar-controls`.
- Nao foi habilitado plugin premium de drag and drop, resize, modal interativo ou scheduling assistant.
- O clique no evento abre o dialog proprio do Olyon, sem depender de modal nativo premium da biblioteca.

#### 3. Integracao com os appointments reais do projeto

- Os appointments reais de `/api/appointments` passaram a ser mapeados para eventos do Schedule-X no desktop.
- A POC suporta visualizacao `Dia` e `Semana`, com `Dia` como padrao.
- A toolbar do Olyon continua controlando data, profissional e navegacao do periodo.

#### 4. Mobile preservado

- A lista mobile existente foi mantida sem retrabalho.
- A troca para Schedule-X acontece apenas em `lg` para cima.

### Observacoes

- A POC nao usa colunas por profissional no desktop, porque isso entraria em recursos de scheduler/resource view fora do escopo gratuito adotado nesta validacao.
- O `global.d.ts` recebeu declaracao para a importacao ESM `@schedule-x/react/dist/index`, conforme necessidade de integracao com Next.
## 27 de marco de 2026 - Correção do header ausente em páginas autenticadas

### Objetivo

Corrigir as páginas internas do app autenticado que estavam sendo renderizadas sem o header interno padrão, mantendo o menu/navegação visível e preservando o padrão já aplicado de listagens com 10 itens iniciais e CTA `Carregar mais`.

### Arquivos alterados

- `app/(app)/dashboard/page.tsx`
- `app/(app)/entradas-saidas/page.tsx`
- `app/(app)/contas-a-pagar/page.tsx`
- `app/(app)/controle-pagamentos/page.tsx`
- `app/(app)/horarios-de-atendimento/page.tsx`
- `app/(app)/contas-a-pagar/novo/page.tsx`
- `app/(app)/entradas-saidas/novo/page.tsx`
- `app/(app)/equipe/novo/page.tsx`
- `app/(app)/usuarios/components/UserForm.tsx`
- `app/(app)/usuarios/[id]/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### Causa do problema

- O layout autenticado em `app/(app)/layout.tsx` aplica apenas a estrutura com sidebar.
- O header interno com `SidebarTrigger` nao e injetado automaticamente pelo layout compartilhado.
- Esse header depende do uso explicito do componente `HeaderPage` dentro de cada pagina.
- Algumas telas seguiram esse padrao, mas outras renderizavam apenas o conteudo principal, ficando sem o topo com navegacao.

### O que foi implementado

#### 1. Alinhamento ao padrão existente

- As paginas autenticadas sem `HeaderPage` passaram a usar o mesmo cabeçalho interno ja adotado em outras areas do app.
- Os titulos e acoes principais foram movidos para o header quando fazia sentido.
- O conteúdo principal da pagina foi mantido abaixo do header, preservando o layout desktop e mobile.

#### 2. Cobertura de páginas principais

- Dashboard
- Entradas e saídas
- Contas a pagar
- Controle de pagamentos
- Horarios de atendimento
- Formularios principais de criacao/edicao que estavam sem o header visual do app

#### 3. Regra das listagens preservada

- As paginas de listagem já ajustadas continuam usando `PAGE_SIZE = 10`, `visibleCount` e `Carregar mais`.
- `entradas-saidas` e `controle-pagamentos` continuam resetando a quantidade visível ao alterar filtros.
- Nenhuma alteração de backend foi feita para paginação.

### Observação arquitetural

- Existe um ponto comum de causa: o layout autenticado nao injeta `HeaderPage` por conta própria.
- Uma solução compartilhada mais profunda exigiria refatorar o layout para suportar header configurável por rota ou por slot, evitando duplicação com as páginas que já usam `HeaderPage`.
- Nesta correção, a opção mais segura foi alinhar as páginas fora do padrão ao componente já estabelecido no projeto.

### Resultado

As páginas internas do app autenticado voltam a exibir o header/menu conforme o padrão visual existente, e as listagens permanecem com o limite inicial de 10 itens e CTA `Carregar mais`.

## 27 de marco de 2026 - Fase 8.6 do financeiro (responsivo mobile da listagem de entradas e saidas)

### Objetivo

Melhorar a leitura e a usabilidade da listagem de `/entradas-saidas` em telas pequenas, separando melhor as informacoes e a area de acoes, sem alterar o layout de desktop.

### Arquivos alterados

- `app/(app)/entradas-saidas/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Linha tratada como card no mobile

- Cada item da listagem passa a usar borda, arredondamento e espacamento proprios em telas pequenas.
- O `tbody` passou a ganhar espacamento vertical entre itens no mobile.
- No desktop, a linha continua sendo renderizada no formato de tabela atual.

#### 2. Melhor leitura de label e valor

- As labels mobile passaram a ter largura minima consistente.
- Os valores agora usam area flexivel com melhor distribuicao do espaco.
- Foram reduzidos pontos de compressao que deixavam textos e badges espremidos.

#### 3. Acoes separadas no mobile

- A celula de acoes agora vira um bloco proprio no fim do item em telas pequenas.
- Os botoes `Editar` e `Excluir` passam a ocupar largura total no mobile quando necessario.
- Em larguras intermediarias, os botoes podem voltar a dividir linha sem esmagar o conteudo principal.

### Fora do escopo (mantido)

- Sem alteracao de regras de negocio
- Sem alteracao de API
- Sem alteracao de Prisma
- Sem alteracao de validacao
- Sem alteracao do layout desktop

### Resultado

`/entradas-saidas` passa a ficar mais legivel no mobile, com cada item visualmente mais proximo de um card e com a area de acoes desacoplada do conteudo principal.

## 27 de marco de 2026 - Padronizacao de listagens com carregamento incremental local

### Objetivo

Padronizar as páginas reais de listagem para mostrar inicialmente 10 itens e permitir avanço local por blocos de 10 com o CTA `Carregar mais`, sem introduzir paginação por backend ou URL.

### Arquivos alterados

- `app/(app)/contas-a-pagar/page.tsx`
- `app/(app)/usuarios/page.tsx`
- `app/(app)/servicos/page.tsx`
- `app/(app)/eventos/page.tsx`
- `app/(app)/equipe/page.tsx`
- `app/(app)/horarios-de-atendimento/page.tsx`
- `app/(app)/controle-pagamentos/page.tsx`
- `app/admin/dashboard/stores/components/DeleteStoreDialogButton.tsx`
- `app/admin/dashboard/stores/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Padrão de paginação incremental local

- As listagens passam a iniciar com `PAGE_SIZE = 10`.
- Cada tela passou a controlar `visibleCount` localmente no frontend.
- O CTA `Carregar mais` adiciona mais 10 itens por clique usando `slice(0, visibleCount)`.

#### 2. Cobertura das páginas com listagem

- `contas-a-pagar`
- `usuarios`
- `servicos`
- `eventos`
- `equipe`
- `controle-pagamentos`
- lista de bloqueios em `horarios-de-atendimento`
- listagem de lojas em `admin/dashboard/stores`

#### 3. Reset em telas com filtro

- `controle-pagamentos` agora reseta `visibleCount` para 10 ao alterar status ou período.
- `entradas-saidas` já estava aderente ao padrão e foi mantida sem ajuste adicional.

#### 4. Escopo preservado

- Nenhuma rota foi alterada.
- Nenhum endpoint novo foi criado.
- Nenhuma mudança foi feita em Prisma.
- Regras de negócio, filtros, edição, exclusão e estados vazios existentes foram mantidos.

### Observação específica do admin

- A listagem de lojas do admin estava em Server Component.
- Para evitar arquivo novo e não ampliar escopo para API extra, a paginação incremental foi movida para um componente cliente já existente no mesmo módulo de `stores/components/DeleteStoreDialogButton.tsx`.

### Resultado

As telas de listagem ficam menos poluídas visualmente, com carregamento incremental local consistente e sem expansão de escopo para backend.

## 27 de marco de 2026 - Fase 6.2 do financeiro (filtros em controle de pagamentos)

### Objetivo

Adicionar em `/controle-pagamentos` filtros combinados por status de pagamento e por periodo, reaproveitando o estado ja carregado pela tela e mantendo o padrao visual usado no financeiro.

### Arquivos alterados

- `app/(app)/controle-pagamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Filtro por status

- Foi adicionado um filtro visual com as opcoes `Todos`, `Pago` e `Nao pago`.
- `Pago` mostra apenas itens com status operacional pago.
- `Nao pago` agrupa itens pendentes e vencidos, sem alterar qualquer dado persistido.

#### 2. Filtro por periodo

- Foram adicionados os campos `Data inicial` e `Data final`.
- A comparacao usa a data principal operacional da tela, o `dueDate`.
- A normalizacao da data e feita no frontend para reduzir erro de timezone na comparacao do intervalo.

#### 3. Combinacao dos filtros

- O filtro final passou a ser calculado com `useMemo` sobre `state.items`, sem endpoint novo.
- Status e periodo funcionam em conjunto.
- Foi adicionada a acao `Limpar periodo` para restaurar o intervalo atual rapidamente.

#### 4. Estados vazios coerentes

- Quando nao existem despesas carregadas, a tela continua mostrando a mensagem base de vazio.
- Quando existem dados mas nenhum item atende aos filtros, a tela mostra uma mensagem amigavel especifica para filtro sem resultado.

### Fora do escopo (mantido)

- Sem alteracao de backend
- Sem alteracao de Prisma
- Sem alteracao de rotas
- Sem alteracao de autenticacao
- Sem alteracao de paginacao

### Resultado

`/controle-pagamentos` passa a permitir leitura operacional por status e por periodo diretamente na listagem atual, sem expandir escopo para novas APIs ou novas regras de negocio.

## 24 de marco de 2026 - Fase 8.5 do financeiro (modal de edicao com vencimento condicional)

### Objetivo

Replicar no modal de edicao de `/entradas-saidas` a mesma regra ja aplicada no formulario de novo lancamento: mostrar `Vencimento` apenas para `Saída` e ocultar o campo para `Entrada`.

### Arquivos alterados

- `app/(app)/entradas-saidas/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Exibicao condicional no modal

- O campo `Vencimento` do modal de edicao passou a ser renderizado apenas quando o tipo selecionado e `EXPENSE`.
- Quando o tipo selecionado e `INCOME`, o campo deixa de aparecer imediatamente.

#### 2. Limpeza de `dueDate`

- Ao trocar o tipo do item em edicao para `Entrada`, o valor local de `dueDate` e limpo no formulario.
- Isso evita reaproveitar um vencimento antigo quando o usuario muda a natureza do lancamento.

#### 3. Preservacao do fluxo de edicao

- O preenchimento dos demais campos foi mantido.
- O submit continua usando o mesmo endpoint e o mesmo fluxo de recarga da lista.
- O payload da edicao agora evita enviar `dueDate` quando o tipo final e `Entrada`.

### Fora do escopo (mantido)

- Sem alteracao de backend
- Sem alteracao do Prisma
- Sem alteracao de validators
- Sem alteracao em `/entradas-saidas/novo`
- Sem alteracao em outras telas do financeiro

### Resultado

O modal de edicao de `Entradas e saídas` passa a ter comportamento consistente com o formulario de criacao, evitando exibicao e reaproveitamento indevido de vencimento em lancamentos de entrada.

## 24 de marco de 2026 - Fase 8.4 do financeiro (cards alinhados com vencimento por data)

### Objetivo

Corrigir os cards `Pendentes` e `Vencidas` em `/entradas-saidas` para usar a mesma semantica de vencimento por data ja aplicada na tabela.

### Arquivos alterados

- `app/(app)/entradas-saidas/controllers/index.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Regra de vencimento reaproveitada no resumo

- O resumo passa a considerar como vencida toda despesa com:
  - `type = EXPENSE`
  - `status != PAID`
  - `dueDate` valido
  - `dueDate` anterior a hoje

#### 2. Separacao entre pendentes e vencidas

- O card `Pendentes` agora soma apenas despesas nao pagas que ainda nao venceram.
- O card `Vencidas` soma apenas despesas nao pagas ja vencidas.
- Isso evita dupla contagem entre os dois indicadores.

#### 3. Escopo mantido na UI/controller

- Nenhum dado salvo em `FinanceEntry` foi alterado.
- Nenhuma rota, validator ou model Prisma foi modificada.
- Os cards `Entradas`, `Saídas` e `Saldo` permaneceram com a mesma regra anterior.

### Resultado

Os cards da tela `Entradas e saídas` passam a refletir a mesma leitura operacional de vencimento exibida na tabela, sem alterar backend ou persistencia.

## 24 de marco de 2026 - Fase 9 do financeiro (card de resumo real no dashboard)

### Objetivo

Substituir os dados mockados do card `Resumo financeiro` no dashboard por dados reais do modulo financeiro ja exposto por `GET /api/finance/entries`, sem alterar o restante do dashboard.

### Arquivos alterados

- `src/components/dashboard/finance-summary-card.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Troca do mock por fetch real

- O componente deixou de usar objeto estatico local.
- O card agora busca os lancamentos em `GET /api/finance/entries` no carregamento do componente.
- O escopo por loja ativa continua sendo respeitado pela propria rota ja existente.

#### 2. Calculo dos indicadores no frontend

- `Total do dia` soma os lancamentos com `transactionDate` no dia atual.
- `Total do mes` soma os lancamentos com `transactionDate` no mes atual.
- `Pagamentos pendentes` soma apenas despesas com `type = EXPENSE` e `status != PAID`.

#### 3. Tratamento de estados da UI

- Em loading, o card mostra mensagem discreta de carregamento sem quebrar o layout.
- Em erro, o card mostra mensagem amigavel e preserva os valores formatados.
- Em vazio, os tres indicadores permanecem em `R$ 0,00`.

### Fora do escopo (mantido)

- Sem alteracao em `app/(app)/dashboard/page.tsx`
- Sem alteracao de backend
- Sem endpoint novo de analytics
- Sem alteracao de Prisma
- Sem alteracao de validators
- Sem alteracao das telas do financeiro

### Resultado

O dashboard passa a exibir um resumo financeiro real por loja no proprio card, sem expandir o escopo para o restante da pagina ou para novas APIs.

## 24 de marco de 2026 - Fase 8.3 do financeiro (status visual vencido por data)

### Objetivo

Corrigir a exibicao de status na tabela de `/entradas-saidas` para marcar como `Vencido` as despesas nao pagas cujo `dueDate` ja passou, sem alterar qualquer dado persistido no banco.

### Arquivos alterados

- `app/(app)/entradas-saidas/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Regra de exibicao do status

- Itens com `type = INCOME` continuam exibindo `Receita`.
- Itens com `type = EXPENSE` e `status = PAID` continuam exibindo `Pago`.
- Itens com `type = EXPENSE`, ainda nao pagos, e com `dueDate` anterior a hoje passam a exibir `Vencido`.
- Itens com `type = EXPENSE` sem vencimento ou com vencimento atual/futuro continuam exibindo `Pendente`.

#### 2. Comparacao robusta de data

- A regra ignora `dueDate` nulo.
- A regra ignora datas invalidas.
- A comparacao e feita normalizando `dueDate` e a data atual para meia-noite, evitando ruido de horario na UI.

#### 3. Escopo mantido apenas na UI

- Nenhum valor de `status` foi alterado.
- Nenhum update automatico foi adicionado.
- Nenhuma regra de backend, Prisma ou validator foi modificada.

### Observacao sobre cards

- Os cards de resumo foram mantidos como estavam, baseados no status bruto atual.
- Nesta tarefa a prioridade foi corrigir a exibicao da tabela sem expandir a logica derivada para o resumo.

### Resultado

`/entradas-saidas` passa a refletir melhor a situacao operacional das despesas vencidas na tabela, sem alterar a persistencia nem o comportamento de outras areas do sistema.

## 24 de marco de 2026 - Fase 8.2 do financeiro (UX de exclusao e vencimento condicional)

### Objetivo

Refinar a experiencia de `/entradas-saidas` removendo o popup nativo da exclusao e exibindo `Vencimento` no formulario de novo lancamento apenas quando o tipo selecionado for `Saída`.

### Arquivos alterados

- `app/(app)/entradas-saidas/page.tsx`
- `app/(app)/entradas-saidas/novo/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Exclusao sem popup nativo

- O fluxo de exclusao da listagem deixou de usar `window.confirm`.
- O clique no botao `Excluir` agora dispara a exclusao diretamente.
- Foram mantidos sem alteracao:
  - loading no botao
  - disable durante exclusao
  - tratamento de erro amigavel
  - recarga da lista apos sucesso

#### 2. Vencimento condicional no formulario novo

- O formulario de `/entradas-saidas/novo` passou a observar o tipo selecionado.
- Quando o tipo e `INCOME`, o campo `Vencimento` deixa de ser exibido.
- Quando o tipo e `EXPENSE`, o campo `Vencimento` volta a aparecer normalmente.

#### 3. Garantia de payload coerente

- Quando o tipo selecionado e `Entrada`, o submit nao envia `dueDate` no payload.
- Ao trocar para `Entrada`, o valor local de `dueDate` tambem e limpo no formulario para evitar reaproveitamento indevido.

### Fora do escopo (mantido)

- Sem alteracao de backend
- Sem alteracao do Prisma
- Sem alteracao dos validators de backend
- Sem alteracao em `contas-a-pagar`
- Sem alteracao em `controle-pagamentos`

### Resultado

`/entradas-saidas` fica mais fluida na exclusao e o formulario de criacao passa a refletir melhor a diferenca entre entrada e saida, sem enviar `dueDate` indevido para receitas.

## 24 de marco de 2026 - Fase 8.1 do financeiro (filtro por tipo e status coerente em entradas e saidas)

### Objetivo

Corrigir a apresentacao dos lancamentos de entrada em `/entradas-saidas` e adicionar um filtro simples por tipo no padrao visual leve da tela.

### Arquivos alterados

- `app/(app)/entradas-saidas/page.tsx`
- `app/(app)/entradas-saidas/controllers/index.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Status visual coerente para entradas

- Itens com `type = INCOME` passam a exibir badge `Receita` na coluna de status.
- O valor persistido em `status` nao foi alterado.
- Itens com `type = EXPENSE` continuam exibindo os badges operacionais existentes:
  - `Pendente`
  - `Pago`
  - `Vencido`

#### 2. Filtro por tipo na tela

- Foi adicionado um filtro visual acima da tabela com as opcoes:
  - `Todos`
  - `Entradas`
  - `Saídas`
- O filtro atua sobre a listagem sem criar endpoint novo nem alterar backend.

#### 3. Controller local

- O controller passou a centralizar:
  - estado do filtro atual
  - lista filtrada
  - resumo calculado a partir do conjunto visivel
- A pagina continua consumindo a mesma API e preserva os fluxos de edicao e exclusao.

#### 4. Resumo acompanhando o filtro

- Os cards de entradas, saidas, saldo, pendentes e vencidas passaram a refletir o conjunto filtrado atual.
- Isso manteve a leitura da tela consistente sem duplicar regras na pagina.

### Fora do escopo (mantido)

- Sem alteracao de backend
- Sem alteracao do Prisma
- Sem alteracao de validators
- Sem alteracao em `contas-a-pagar`
- Sem alteracao em `controle-pagamentos`
- Sem alteracao em `/entradas-saidas/novo`

### Resultado

`/entradas-saidas` passa a distinguir visualmente receitas de despesas na coluna de status e ganha filtro funcional por tipo, mantendo a tela coerente com o comportamento atual e sem expandir o escopo para outras areas.

## 23 de marco de 2026 - Diagnostico temporario do financeiro (Prisma sem cache global em dev)

### Objetivo

Aplicar uma mitigacao temporaria e controlada no helper central do Prisma para validar a hipotese de runtime stale do `PrismaClient` nas rotas do financeiro.

### Arquivos alterados

- `src/lib/prisma.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Ajuste temporario do helper central

- O projeto continua usando `PrismaClient` a partir de `generated/prisma/client`.
- O adapter PostgreSQL atual foi preservado.
- Os logs atuais do Prisma (`error` e `warn`) foram preservados.

#### 2. Remocao do reuso global em desenvolvimento

- Em desenvolvimento, o helper passou a criar uma nova instância de `PrismaClient` sem reutilizar `globalThis.prisma`.
- O objetivo e confirmar se o erro 500 do financeiro vinha de uma instância antiga, ainda viva em runtime, sem o delegate `financeEntry`.

#### 3. Escopo controlado

- Nenhuma rota foi alterada.
- Nenhum validator foi alterado.
- Nenhum schema ou migration Prisma foi alterado.
- Nenhuma outra infraestrutura fora do helper central foi modificada.

### Fora do escopo (mantido)

- Sem alteracao em `app/api/finance/entries`
- Sem alteracao em `src/lib/validators/finance-entry.ts`
- Sem alteracao de frontend
- Sem alteracao de services, events, appointments ou webhooks

### Resultado esperado

Ao reiniciar o ambiente de desenvolvimento, os testes manuais de `GET /api/finance/entries` e `POST /api/finance/entries` passam a indicar com mais clareza se o 500 vinha de reuso de uma instância stale do `PrismaClient`.

## 23 de marco de 2026 - Fase 8 do financeiro (resumo gerencial em entradas e saidas)

### Objetivo

Adicionar uma visao gerencial basica na tela `Entradas e saídas`, exibindo um resumo financeiro calculado a partir da mesma base `FinanceEntry` ja carregada na tela.

### Arquivos alterados

- `app/(app)/entradas-saidas/page.tsx`
- `app/(app)/entradas-saidas/controllers/index.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Resumo financeiro acima da listagem

- Foram adicionados cards simples acima da tabela com os totais de:
  - entradas
  - saidas
  - saldo
  - pendentes
  - vencidas
- Todos os valores sao exibidos em BRL no formato pt-BR.

#### 2. Calculo no frontend

- O resumo e calculado a partir dos itens ja carregados por `GET /api/finance/entries`.
- Nao foi criada chamada extra nem endpoint novo.
- O calculo considera:
  - `type = INCOME` para entradas
  - `type = EXPENSE` para saidas
  - `status = PENDING` para pendentes
  - `status = OVERDUE` para vencidas
  - `saldo = entradas - saidas`

#### 3. Controller local

- O controller da tela passou a expor `summary` junto com:
  - `items`
  - `loading`
  - `error`
- A agregacao foi centralizada no controller para manter a pagina mais simples e sem duplicacao de logica.

### Fora do escopo (mantido)

- Sem filtro por periodo avancado
- Sem endpoint de analytics
- Sem dashboard separado
- Sem graficos ou exportacao

### Resultado

`/entradas-saidas` passa a oferecer uma leitura gerencial basica do financeiro sem depender de backend adicional, usando a mesma base de dados ja carregada pela tela.

## 23 de marco de 2026 - Fase 7 do financeiro (edicao em entradas e saidas)

### Objetivo

Adicionar edicao real de lancamentos financeiros na tela `Entradas e saídas`, reaproveitando o backend existente com `PUT /api/finance/entries/[id]` e mantendo criacao e exclusao ja entregues.

### Arquivos alterados

- `app/(app)/entradas-saidas/page.tsx`
- `app/(app)/entradas-saidas/controllers/index.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Acao de editar na listagem

- Foi adicionada a acao `Editar` ao lado da exclusao em cada linha da tabela de `/entradas-saidas`.
- O fluxo escolhido foi um dialogo simples na propria tela, evitando rota nova e mantendo o padrao ja usado em outras areas do projeto.

#### 2. Reaproveitamento do formulario

- A edicao reaproveita o mesmo `formSchema` da pasta.
- Ao abrir o dialogo, o formulario e preenchido com os dados atuais do item:
  - `type`
  - `amount`
  - `category`
  - `description`
  - `transactionDate`
  - `dueDate`
- O envio usa o mesmo contrato ja suportado pelo backend.

#### 3. Integracao com PUT

- O controller local passou a expor `updateEntry`.
- A edicao envia `PUT /api/finance/entries/[id]` com os campos principais do lancamento.
- A lista e recarregada apos sucesso para refletir os dados atualizados.

### Fora do escopo (mantido)

- Sem alteracao do Prisma
- Sem alteracao do backend
- Sem alteracao em contas-a-pagar
- Sem alteracao em controle-pagamentos
- `status` ficou fora do formulario de edicao para nao aumentar a complexidade da UI nesta fase

### Resultado

`/entradas-saidas` passa a permitir edicao real de lancamentos com fluxo simples, mantendo a mesma tela como ponto central de listagem, criacao e exclusao, sem abrir arquitetura paralela.

## 23 de marco de 2026 - Fase 6.1 do financeiro (ajuste backend da baixa)

### Objetivo

Fechar a lacuna do fluxo de baixa ajustando o backend para que `PUT /api/finance/entries/[id]` aceite e persista corretamente o campo `paidAt`.

### Arquivos alterados

- `src/lib/validators/finance-entry.ts`
- `app/api/finance/entries/[id]/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Ajuste do validator

- `FinanceEntryUpdateSchema` passou a aceitar `paidAt` como campo opcional/nullable com coercao para data.
- O `create schema` foi mantido sem alteracoes para nao expandir a semantica da criacao inicial.
- A regra de `refine()` exigindo ao menos um campo no update foi preservada.

#### 2. Ajuste do PUT por id

- O `PUT /api/finance/entries/[id]` passou a incluir `paidAt` no objeto de update quando o valor vier no payload validado.
- Foram mantidos sem alteracao:
  - `requireMembershipRole("ADMIN")`
  - busca por `id + storeId`
  - `notFound` para item inexistente ou de outra loja
  - compatibilidade com `amount` em `Prisma.Decimal`
  - comportamento do `DELETE`

### Resultado

O fluxo de baixa deixa de ter a lacuna entre frontend e backend: a UI continua enviando `status = PAID` e `paidAt`, e o backend agora persiste ambos corretamente mantendo o isolamento multi-tenant.

## 23 de marco de 2026 - Fase 6 do financeiro (integracao de controle de pagamentos)

### Objetivo

Integrar a tela de `Controle de Pagamentos` com a base real `FinanceEntry`, tratando essa rota como uma visao operacional de baixa das despesas existentes.

### Arquivos alterados

- `app/(app)/controle-pagamentos/page.tsx`
- `app/(app)/controle-pagamentos/controllers/index.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Listagem real em `/controle-pagamentos`

- A tela passou a consumir `GET /api/finance/entries`.
- O controller filtra localmente apenas `type = EXPENSE`.
- A listagem foi organizada com foco operacional em:
  - descricao/categoria
  - valor
  - vencimento
  - status
  - pago em
  - acao
- O mock principal da tela foi removido.
- Foram adicionados estados de:
  - loading
  - erro amigavel
  - vazio sem registros

#### 2. Baixa operacional via PUT

- Foi adicionada a acao `Marcar como pago` apenas para itens que ainda nao estao pagos.
- A acao usa `PUT /api/finance/entries/[id]` com payload contendo:
  - `status: "PAID"`
  - `paidAt: new Date().toISOString()`
- Ha confirmacao simples antes da baixa.
- A lista e recarregada apos sucesso.

#### 3. Priorizacao visual da operacao

- A listagem destaca os status `Vencido`, `Pendente` e `Pago` com badges legiveis.
- A ordenacao local prioriza:
  - vencidos
  - pendentes
  - pagos
- Em seguida, usa o vencimento mais proximo primeiro.

### Fora do escopo (mantido)

- Sem alteracao de Prisma
- Sem alteracao do backend do financeiro
- Sem edicao ampla
- `/controle-pagamentos/novo` ficou fora do escopo desta fase

### Observacao tecnica

- A UI envia `paidAt` no payload da baixa para respeitar o contrato desejado desta fase.
- Como o backend atual ainda valida update apenas com os campos da fase 2, a persistencia efetiva de `paidAt` depende de suporte explicito do backend em etapa futura.

### Resultado

`/controle-pagamentos` passa a operar sobre despesas reais da base financeira com foco em baixa operacional, removendo o mock principal e utilizando a API existente de listagem e update.

## 23 de marco de 2026 - Fase 5 do financeiro (integracao de contas a pagar)

### Objetivo

Integrar a tela de `Contas a pagar` com a base real do financeiro, tratando a rota como uma visao filtrada de `FinanceEntry` para despesas, sem criar dominio separado.

### Arquivos alterados

- `app/(app)/contas-a-pagar/page.tsx`
- `app/(app)/contas-a-pagar/novo/page.tsx`
- `app/(app)/contas-a-pagar/controllers/index.tsx`
- `app/(app)/contas-a-pagar/schemas/index.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Listagem real em `/contas-a-pagar`

- A tela passou a consumir `GET /api/finance/entries`.
- O controller filtra os registros para exibir apenas `type = EXPENSE`.
- O mock principal da listagem foi removido.
- Foram adicionados estados de:
  - loading
  - erro amigavel
  - vazio sem registros
- A tabela passou a exibir:
  - valor
  - data
  - vencimento
  - categoria
  - status
  - descricao

#### 2. Formulario real em `/contas-a-pagar/novo`

- O submit local foi substituido por `POST /api/finance/entries`.
- A tela cria sempre despesa com `type = EXPENSE` fixo no controller.
- O formulario foi ajustado para os campos reais:
  - `amount`
  - `category`
  - `description`
  - `transactionDate`
  - `dueDate`
  - `status`
- Em caso de sucesso, a UI redireciona para `/contas-a-pagar`.

#### 3. Exclusao real

- A listagem passou a excluir despesas reais via `DELETE /api/finance/entries/[id]`.
- Foi adicionada confirmacao simples antes da exclusao.
- A lista e recarregada apos exclusao bem-sucedida.

#### 4. Estrutura local da tela

- O controller local passou a centralizar:
  - carregamento da lista
  - filtro de despesas
  - criacao de despesa
  - exclusao
- O schema local foi ajustado para refletir apenas os campos reais expostos ao usuario nesta visao.

### Fora do escopo (mantido)

- Sem edicao nesta fase
- Sem alteracao do backend do financeiro
- Sem alteracao de Prisma
- Sem alteracao em entradas-saidas
- Sem alteracao em controle-pagamentos

### Resultado

`/contas-a-pagar` passa a operar com dados reais de despesas do modulo financeiro, exibindo vencimento e status de forma clara e deixando de depender do mock principal da tela.

## 23 de marco de 2026 - Fase 4 do financeiro (integracao da tela de entradas e saidas)

### Objetivo

Integrar a tela de `Entradas e saídas` com a API real do financeiro, removendo a listagem mockada e substituindo o submit local por persistencia real com `FinanceEntry`.

### Arquivos alterados

- `app/(app)/entradas-saidas/page.tsx`
- `app/(app)/entradas-saidas/novo/page.tsx`
- `app/(app)/entradas-saidas/controllers/index.tsx`
- `app/(app)/entradas-saidas/schemas/index.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Listagem real em `/entradas-saidas`

- A tela passou a consumir `GET /api/finance/entries` ao carregar.
- O mock principal da tabela foi removido.
- Foram adicionados estados de:
  - loading
  - erro amigavel
  - vazio sem registros
- A tabela passou a exibir dados reais com formatacao em pt-BR para:
  - valor
  - data
  - vencimento
  - tipo
  - categoria
  - status

#### 2. Formulario real em `/entradas-saidas/novo`

- O submit local foi substituido por `POST /api/finance/entries`.
- O formulario foi corrigido para mapear corretamente:
  - `category`
  - `description`
  - `transactionDate`
  - `dueDate`
  - `type`
  - `amount`
- O fluxo agora mostra erro amigavel quando a API falha.
- Em caso de sucesso, mostra feedback e redireciona para `/entradas-saidas`.

#### 3. Exclusao real

- A listagem passou a excluir registros reais via `DELETE /api/finance/entries/[id]`.
- Foi adicionada confirmacao simples antes da exclusao.
- A lista e recarregada apos exclusao bem-sucedida.

#### 4. Estrutura local da UI

- Foi criado um controller simples na propria pasta para centralizar:
  - carregamento da lista
  - criacao de lancamentos
  - exclusao de lancamentos
- Foi criado schema local da tela para manter a validacao do formulario consistente com os campos usados pela API.

### Fora do escopo (mantido)

- Sem alteracao do backend do financeiro
- Sem alteracao de Prisma
- Sem integracao com contas-a-pagar
- Sem integracao com controle-pagamentos
- Edicao mantida fora do escopo desta fase

### Resultado

`/entradas-saidas` passa a operar com dados reais do modulo financeiro, incluindo listagem, criacao e exclusao, preservando o padrao visual existente e removendo o mock principal da tela.

## 23 de marco de 2026 - Fase 3 do financeiro (rota por id)

### Objetivo

Fechar o CRUD backend inicial do financeiro criando a rota por id com `PUT` e `DELETE`, mantendo o mesmo padrao de permissao, validacao e escopo por loja usado no restante do projeto.

### Arquivos alterados

- `app/api/finance/entries/[id]/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. PUT `/api/finance/entries/[id]`

- Usa `requireMembershipRole("ADMIN")`.
- Recebe `params.id`.
- Busca o registro por `id` e `storeId` da loja ativa.
- Retorna `notFound` quando o item nao pertence a loja ativa ou nao existe.
- Valida o payload com `FinanceEntryUpdateSchema.safeParse`.
- Atualiza apenas os campos permitidos pelo validator:
  - `type`
  - `amount`
  - `category`
  - `description`
  - `transactionDate`
  - `dueDate`
  - `status`
- Mantem compatibilidade com o campo monetario usando `Prisma.Decimal` em `amount`.
- Responde com `ok({ item })`.

#### 2. DELETE `/api/finance/entries/[id]`

- Usa `requireMembershipRole("ADMIN")`.
- Recebe `params.id`.
- Busca o registro por `id` e `storeId` da loja ativa.
- Retorna `notFound` quando o item nao pertence a loja ativa ou nao existe.
- Exclui o registro somente apos validar pertencimento.
- Responde com `ok({ success: true })`.

### Garantias de isolamento

- Nenhuma operacao usa apenas `id` como criterio de autorizacao.
- O pertencimento e sempre validado previamente com `id + storeId`.
- Nao ha atualizacao de `storeId` nem `createdById`.

### Fora do escopo (mantido)

- Sem alteracao de validator
- Sem alteracao do Prisma
- Sem integracao com frontend
- Sem novas rotas alem de `[id]`

### Resultado

O backend do financeiro passa a ter a rota por id para atualizar e excluir lancamentos com escopo multi-tenant protegido, completando o CRUD backend inicial da entidade `FinanceEntry`.

## 23 de marco de 2026 - Fase 2 do financeiro (validator e rota inicial)

### Objetivo

Criar a primeira camada funcional do backend do financeiro com validator Zod e rota inicial `GET/POST` para `FinanceEntry`, mantendo o padrao multi-tenant por `storeId` e o mesmo estilo ja usado em `services`.

### Arquivos alterados

- `src/lib/validators/finance-entry.ts`
- `app/api/finance/entries/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Validator do financeiro

Foi criado `src/lib/validators/finance-entry.ts` com:

- `FinanceEntryCreateSchema`
- `FinanceEntryUpdateSchema`

Regras aplicadas:

- `type`: `INCOME | EXPENSE`
- `amount`: coercao para numero positivo
- `category`: string com `trim`, minimo 2 e maximo 80
- `description`: opcional/nullable com limite de tamanho
- `transactionDate`: data obrigatoria com coercao
- `dueDate`: data opcional/nullable com coercao
- `status`: `PENDING | PAID | OVERDUE`, opcional

`FinanceEntryUpdateSchema` segue o mesmo padrao de `ServiceUpdateSchema`, usando `partial()` com `refine()` para exigir ao menos um campo informado.

#### 2. GET `/api/finance/entries`

- Usa `requireStoreId()`.
- Retorna `401` quando nao existe loja ativa na sessao.
- Lista apenas registros da loja atual.
- Ordena por `transactionDate desc` e depois `createdAt desc`.
- Responde com `ok({ items })`.

#### 3. POST `/api/finance/entries`

- Usa `requireMembershipRole("ADMIN")`.
- Valida o payload com `FinanceEntryCreateSchema.safeParse`.
- Retorna `badRequest` quando o payload e invalido.
- Cria `FinanceEntry` com `storeId` vindo exclusivamente do helper de permissao.
- Usa `createdById` com `guard.userId`.
- Aplica fallback de `status` para `PENDING`.
- Persiste `amount` como `Prisma.Decimal` para respeitar o campo monetario do schema.
- Responde com `created({ item })`.

### Fora do escopo (mantido)

- Sem `PUT`
- Sem `DELETE`
- Sem rota por `id`
- Sem integracao com frontend
- Sem alteracao do Prisma

### Resultado

O modulo financeiro passa a ter a primeira camada funcional de backend para listagem e criacao de lancamentos por loja, pronta para sustentar as proximas fases do CRUD.

## 23 de marco de 2026 - Fase 1 do financeiro (base Prisma)

### Objetivo

Criar a base de dominio do modulo financeiro no Prisma, sem integracao de telas, APIs ou CRUD completo, mantendo o padrao multi-tenant por `storeId`.

### Arquivos alterados

- `prisma/schema.prisma`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Enums financeiros

- `FinanceEntryType` com valores:
  - `INCOME`
  - `EXPENSE`
- `FinanceEntryStatus` com valores:
  - `PENDING`
  - `PAID`
  - `OVERDUE`

#### 2. Model central `FinanceEntry`

Foi criada a model central para sustentar as visoes de entradas/saidas, contas a pagar e controle de pagamentos com os campos:

- `id`
- `storeId`
- `createdById` (opcional)
- `type`
- `status`
- `amount` (`Decimal @db.Decimal(12, 2)`)
- `category`
- `description` (opcional)
- `transactionDate`
- `dueDate` (opcional)
- `paidAt` (opcional)
- `createdAt`
- `updatedAt`

#### 3. Relacoes e multi-tenant

- Relacao obrigatoria com `Store` via `storeId` com `onDelete: Cascade`.
- Relacao opcional com `User` via `createdById` com `onDelete: SetNull`.
- Lado inverso adicionado em:
  - `Store.financeEntries`
  - `User.financeEntriesCreated`

#### 4. Indices

Foram adicionados indices para cenarios iniciais de consulta:

- `@@index([storeId, transactionDate])`
- `@@index([storeId, dueDate])`
- `@@index([storeId, status])`
- `@@index([storeId, type])`
- `@@index([createdById])`

### Fora do escopo (mantido)

- Sem criacao de APIs
- Sem alteracao de pages/UI/controllers
- Sem alteracao de modulos de agendamento, WhatsApp, eventos ou servicos

### Resultado

O projeto passa a ter uma base Prisma consistente para evoluir o CRUD financeiro nas proximas fases, preservando o isolamento por loja e o padrao de modelagem existente.

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
## 29 de marco de 2026 - Fase 2 da pagina de agendamentos

### Objetivo

Evoluir a tela `/agendamentos` do painel para sair do input livre de data/hora e passar a usar um fluxo guiado por slots disponiveis, mantendo a mesma engine central de disponibilidade ja usada no WhatsApp e preservando a revalidacao final no `POST /api/appointments`.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/api/appointments/route.ts`
- `app/api/appointments/availability/route.ts`
- `src/lib/validators/appointment.ts`
- `src/lib/utils/maskPhone.ts`
- `src/lib/appointments/presentation.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Apresentacao amigavel na listagem

- Foi criado um helper de apresentacao para mapear `AppointmentStatus` para labels em PT-BR sem alterar enums do banco.
- A origem agora exibe:
  - `Criado por <nome>` quando o `metadata` manual traz o nome do criador
  - `Criado manualmente` quando a origem e `ADMIN` sem nome
  - `WhatsApp` para `WHATSAPP`
  - `Link de agendamento` para `WEB`
- A lista tambem passou a formatar telefone brasileiro quando existir.

#### 2. Telefone mascarado e payload limpo

- `src/lib/utils/maskPhone.ts` passou a expor:
  - `normalizePhone`
  - `maskPhone`
  - `formatPhone`
- O formulario da tela mascara o telefone enquanto o usuario digita.
- O backend agora normaliza o telefone para apenas digitos no validator de appointments, mantendo a validacao por 10 ou 11 digitos.

#### 3. Endpoint de disponibilidade do painel

- Foi criado `GET /api/appointments/availability`.
- A rota valida query com Zod e resolve a loja atual pelo mesmo guard do painel.
- O servico e buscado para obter `durationMin`.
- A resposta usa a engine central `listNextAvailableSlots` de `src/lib/appointments/availability.ts`.
- O payload devolve `startAt`, `endAt` e `label` em JSON padronizado.

#### 4. Regra de profissional / sem preferencia

- A consulta de disponibilidade segue a regra ja existente do projeto:
  - se houver um unico profissional elegivel para o servico, ele pode ser resolvido automaticamente
  - se houver mais de um, o painel exige a escolha do profissional antes de abrir o modal
- Nenhum algoritmo novo de distribuicao de agenda por "qualquer profissional" foi introduzido.

#### 5. Fluxo guiado por modal em `/agendamentos`

- O campo livre de `datetime-local` foi removido do formulario.
- A tela agora usa um bloco de horario com CTA `Escolher horario`.
- O modal consulta o backend e lista slots disponiveis retornados pela engine central.
- O slot escolhido volta para o formulario e o `POST /api/appointments` continua revalidando a disponibilidade antes de salvar.
- `Editar` e `Cancelar` permanecem visiveis na lista, ainda sem fluxo real nesta fase.

#### 6. Enriquecimento do metadata manual

- O create manual passou a salvar `createdByUserName` no `metadata` do appointment.
- Isso permite renderizar `Criado por <nome>` na UI sem alterar a origem persistida (`ADMIN`).

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx app/api/appointments/route.ts app/api/appointments/availability/route.ts src/lib/validators/appointment.ts src/lib/utils/maskPhone.ts src/lib/appointments/presentation.ts`

### Pendencias fora do escopo

- `yarn tsc --noEmit --pretty false --ignoreDeprecations 5.0` continua falhando por erros antigos em outras partes do projeto, incluindo:
  - `.next/dev/types/validator.ts`
  - `app/(app)/contas-a-pagar/novo/page.tsx`
  - `app/(app)/usuarios/controllers/index.tsx`
  - `src/components/ui/app-sidebar.tsx`
  - `src/lib/auth-options.ts`
  - `src/scripts/seed.ts`
- Nao foi implementado nesta fase:
  - edicao real
  - cancelamento real
  - link publico completo
  - agenda individual por profissional
  - refactor amplo do fluxo WhatsApp

### Resultado

`/agendamentos` passou a operar com selecao guiada de horario via modal, mantendo a disponibilidade centralizada no backend, melhorando a leitura de status/origem e padronizando o tratamento de telefone no painel.
## 29 de marco de 2026 - Correcao da listagem completa de slots no modal de agendamentos

### Objetivo

Corrigir o modal de `/agendamentos` para listar todos os horarios validos da data escolhida, em vez de usar um fluxo de "proximos slots" que truncava o expediente e podia herdar cortes indevidos do horario de busca.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/api/appointments/availability/route.ts`
- `src/lib/appointments/availability.ts`
- `src/lib/validators/appointment.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Helper central para slots do dia

- Foi adicionado um helper central em `src/lib/appointments/availability.ts` para listar slots disponiveis de uma data especifica.
- O helper reutiliza a mesma infraestrutura ja existente:
  - expediente configurado
  - duracao do servico
  - bloqueios
  - conflitos com appointments
  - profissional selecionado
  - step de agenda
- A regra do ultimo slot permanece correta: so entra na lista o horario que cabe integralmente dentro do intervalo do expediente.

#### 2. Endpoint do modal usando data inteira

- `GET /api/appointments/availability` deixou de usar a estrategia de "proximos N slots" para o modal.
- A rota agora aceita a data escolhida (`searchDate`) e monta a consulta da data inteira.
- O limite pequeno foi removido para esse caso de uso.
- Quando a data e hoje, a rota ainda corta apenas horarios ja passados; para datas futuras, a listagem cobre o dia inteiro.

#### 3. Modal desacoplado do horario anterior

- A UI deixou de enviar `searchStartAt` para montar a lista do modal.
- O modal agora consulta pelo dia selecionado e recarrega a lista ao mudar a data.
- A listagem nao depende mais do horario previamente escolhido no formulario.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx app/api/appointments/availability/route.ts src/lib/appointments/availability.ts src/lib/validators/appointment.ts`

### Resultado

O modal passa a representar corretamente a agenda disponivel do dia selecionado, indo ate o ultimo slot realmente valido conforme a duracao do servico e o expediente configurado.

## 30 de marco de 2026 - Fase A da agenda visual diaria em /agendamentos

### Objetivo

Trocar a listagem em cards de `/agendamentos` por uma agenda diaria visual, mais operacional, mantendo intacta toda a regra de negocio existente de criacao manual, disponibilidade e revalidacao final no backend.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Agenda diaria visual

- A listagem anterior em cards foi substituida por uma grade vertical por horario.
- Os appointments passaram a ser posicionados na timeline conforme `startAt` e `endAt`.
- O bloco visual respeita melhor a duracao real do agendamento, sem antecipar o fim do intervalo na agenda.

#### 2. Filtros operacionais no topo

- Foi adicionado filtro de data com default em hoje.
- Foi adicionado filtro de profissional com opcao `Todos` e itens vindos de `GET /api/team`.
- Appointments sem profissional continuam aparecendo em `Todos` e ficam fora da agenda quando um profissional especifico e filtrado.

#### 3. Percepcao de carregamento e carga inicial

- A agenda ganhou skeleton proprio, separado do estado do formulario.
- O carregamento de servicos passou a acontecer sob demanda ao abrir `Novo agendamento`.
- A equipe continua sendo carregada separadamente para sustentar o filtro operacional e o formulario sem travar a agenda.

#### 4. Formulario manual preservado

- A criacao manual continua na mesma pagina.
- O modal de horarios disponiveis foi mantido.
- A validacao de profissional elegivel continua no frontend apenas como guia de uso.
- A confirmacao real de disponibilidade continua centralizada no `POST /api/appointments`.

#### 5. Reaproveitamento da apresentacao existente

- A agenda continua usando:
  - `getAppointmentStatusLabel`
  - `getAppointmentSourceLabel`
  - `formatPhone`
- Nenhuma regra de disponibilidade foi movida para o frontend.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`
- Checagem rapida de TypeScript sem apontar erro novo em `app/(app)/agendamentos/page.tsx` dentro do projeto atual

### Fora do escopo (mantido)

- Sem visao semanal
- Sem drag and drop
- Sem edicao real
- Sem cancelamento real
- Sem agrupamento avancado por profissional em colunas
- Sem refactor amplo do backend

### Resultado

`/agendamentos` passa a operar como uma agenda diaria visual, com leitura mais rapida da operacao do dia, filtros objetivos e o mesmo backend ja existente como fonte de verdade.

## 30 de marco de 2026 - Fase B da agenda diaria em /agendamentos

### Objetivo

Refinar a experiencia da agenda diaria ja entregue na Fase A, melhorando a leitura dos blocos de agendamento, corrigindo a experiencia em telas pequenas e fortalecendo os estados visuais de loading sem alterar a regra de negocio existente.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Blocos da agenda mais legiveis

- Os appointments da timeline ganharam hierarquia visual mais clara para horario, cliente, servico e profissional.
- O status passou a aparecer como badge visual, com tratamento coerente por estado.
- O card agora adapta a densidade do conteudo conforme a altura disponivel do bloco, escondendo informacoes secundarias quando o slot esta muito compacto.

#### 2. Layout mobile especifico

- A timeline diaria foi mantida para desktop.
- Em telas pequenas, a agenda passa a usar uma lista do dia mais legivel e estavel visualmente.
- O mobile preserva filtros, CTA de novo agendamento e leitura operacional do dia sem espremimento horizontal da grade.

#### 3. Skeletons reais de UX

- Foi adicionado skeleton para a area superior da pagina no carregamento inicial.
- A agenda ganhou placeholders proprios para desktop e mobile.
- O formulario de criacao manual passou a usar skeleton mais contextual quando os servicos ainda estao carregando.
- O modal de horarios disponiveis passou a usar skeleton de slots em vez de texto seco.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`
- Checagem rapida de TypeScript sem erro novo apontado em `app/(app)/agendamentos/page.tsx`

### Fora do escopo (mantido)

- Sem visao semanal
- Sem drag and drop
- Sem edicao real
- Sem cancelamento real
- Sem agrupamento avancado por profissional
- Sem alteracao da regra de disponibilidade
- Sem refactor amplo de backend

### Resultado

`/agendamentos` passa a ter uma agenda diaria mais profissional, legivel e responsiva, preservando os filtros, a criacao manual e toda a logica de negocio ja validada nas fases anteriores.

## 30 de marco de 2026 - Refinamento desktop dos appointment cards em /agendamentos

### Objetivo

Melhorar especificamente a leitura da timeline desktop de `/agendamentos`, deixando os blocos dos appointments com cara mais clara de card operacional, sem alterar mobile, regra de negocio ou arquitetura da agenda diaria.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Cards desktop mais contidos

- Os blocks da timeline passaram a ocupar a coluna com mais respiro lateral.
- O arredondamento e a sombra foram ajustados para aproximar o visual de um card real de agenda, em vez de uma barra horizontal esticada.
- O acento lateral ganhou mais presenca visual para reforcar leitura rapida por bloco.

#### 2. Hierarquia interna mais forte

- O horario continua no topo como ponto de entrada visual.
- O nome do cliente ganhou prioridade tipografica.
- Servico e profissional passaram a aparecer como apoio em niveis secundarios.
- O status foi reduzido para um badge mais discreto, com menos dominancia visual.

#### 3. Densidade adaptativa no desktop

- Blocos muito curtos exibem apenas o essencial.
- Blocos intermediarios mantem horario, cliente, servico e status.
- Blocos altos liberam tambem profissional, origem e telefone quando houver espaco suficiente.
- O ajuste evita texto espremido e reduz a sensacao de corte visual dentro do card.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`

### Fora do escopo (mantido)

- Sem alteracao do mobile
- Sem alteracao de filtros
- Sem alteracao da criacao manual
- Sem alteracao do modal de horarios
- Sem alteracao da disponibilidade
- Sem alteracao de backend

### Resultado

A agenda desktop passa a ter appointments mais legiveis, compactos e operacionais, preservando toda a funcionalidade ja aprovada nas fases anteriores.

## 30 de marco de 2026 - Agenda desktop operacional em /agendamentos

### Objetivo

Transformar os blocos da timeline desktop de `/agendamentos` em itens operacionais reais, com abertura de detalhes, remarcacao e cancelamento, sem quebrar a agenda diaria ja aprovada nem deslocar a regra de negocio para o frontend.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/api/appointments/[id]/route.ts`
- `app/api/appointments/availability/route.ts`
- `src/lib/validators/appointment.ts`
- `src/lib/appointments/availability.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Cards desktop clicaveis

- Cada appointment da timeline desktop passou a ser um item clicavel.
- Hover, cursor e foco visual foram ajustados para deixar claro que o bloco agora e um ponto de acao.
- O card continua mostrando horario, cliente, servico, profissional e status antes do clique.

#### 2. Dialog de detalhes do appointment

- O clique no bloco agora abre um dialog com os dados completos do agendamento:
  - cliente
  - servico
  - profissional
  - inicio e fim
  - duracao
  - status em PT-BR
  - origem
  - telefone
  - e-mail
  - observacoes
- O dialog ganhou feedback visual de erro e sucesso para as acoes operacionais.

#### 3. Edicao / remarcacao real

- O botao `Editar / remarcar` do dialog reaproveita o formulario manual ja existente na propria pagina.
- O formulario entra em modo de edicao com os dados do appointment preenchidos.
- O save passa a usar `PUT /api/appointments/[id]`.
- A UI atualiza a agenda local sem refresh manual e preserva filtros e data selecionada.

#### 4. Cancelamento por status

- O cancelamento foi implementado como `PUT` com `status = CANCELED`.
- Nao ha exclusao fisica do registro.
- Depois do sucesso, o appointment e atualizado localmente e o dialog reflete o novo estado.

#### 5. Revalidacao de disponibilidade na remarcacao

- A engine central de disponibilidade foi estendida para ignorar o proprio appointment quando a remarcacao consulta slots ou revalida o novo horario.
- `GET /api/appointments/availability` agora aceita `excludeAppointmentId`.
- `PUT /api/appointments/[id]` valida:
  - loja da sessao
  - servico da loja
  - profissional elegivel
  - novo horario disponivel
  - `endAt` recalculado pela duracao do servico

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx app/api/appointments/route.ts app/api/appointments/[id]/route.ts app/api/appointments/availability/route.ts src/lib/validators/appointment.ts src/lib/appointments/availability.ts`
- Checagem rapida de TypeScript sem erro novo apontado nos arquivos desta entrega

### Fora do escopo (mantido)

- Sem visao semanal
- Sem drag and drop
- Sem retrabalho do mobile
- Sem cancelamento fisico
- Sem agrupamento avancado por profissional
- Sem mudanca da regra de disponibilidade
- Sem refactor amplo de backend

### Resultado

Os blocs da timeline desktop deixam de ser apenas preview visual e passam a funcionar como ponto principal de consulta e acao do agendamento, com detalhe, remarcacao real e cancelamento seguro via backend.

## 30 de marco de 2026 - Migracao da agenda desktop para grade semanal em /agendamentos

### Objetivo

Substituir a estrutura desktop baseada em timeline diaria por uma grade semanal de calendario, mais adequada para leitura, distribuicao visual dos agendamentos e evolucao futura da tela operacional.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Desktop com estrutura semanal

- A timeline desktop anterior foi removida.
- A pagina agora renderiza uma grade semanal com:
  - cabecalho por dia
  - linhas por horario
  - appointments posicionados na coluna correta do dia e no intervalo correto do horario
- A semana usa a data selecionada como ancora, sem alterar o fluxo atual de filtros nem a origem dos dados.

#### 2. Toolbar de calendario

- Foram adicionados controles de navegacao por semana:
  - `Semana anterior`
  - `Hoje`
  - `Proxima semana`
- O topo passou a exibir o titulo da semana atual.
- O filtro de data foi mantido como data de referencia da semana.
- O filtro por profissional e o botao `Novo agendamento` foram preservados.

#### 3. Mobile preservado

- A visualizacao mobile aprovada anteriormente foi mantida sem retrabalho estrutural.
- Apenas o desktop foi migrado para a nova base de calendario semanal.

#### 4. Reaproveitamento da estrutura existente

- A tela continua consumindo `GET /api/appointments`.
- A filtragem semanal foi mantida no frontend nesta fase.
- O dialog de detalhes do agendamento continua sendo aberto pelo clique no evento.
- A criacao manual, o modal de horarios disponiveis e os skeletons do formulario/modal foram preservados.

#### 5. Skeleton adaptado

- O loading desktop foi ajustado para refletir a nova grade semanal, com cabecalho por dias e placeholder do corpo do calendario.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`
- Checagem rapida de TypeScript sem erro novo apontado em `app/(app)/agendamentos/page.tsx`

### Fora do escopo (mantido)

- Sem drag and drop
- Sem resize de evento
- Sem visao mensal
- Sem mudanca do mobile
- Sem alteracao da regra de disponibilidade
- Sem refactor amplo de backend

### Resultado

O desktop de `/agendamentos` passa a ter uma estrutura semanal mais natural para operacao, com base visual de calendario, melhor leitura por dia e horario e mais espaco para evolucoes futuras da agenda.

## 30 de marco de 2026 - Ajuste fino de largura da grade semanal desktop em /agendamentos

### Objetivo

Reduzir a sensacao de grade larga na agenda semanal desktop, diminuindo o scroll horizontal desnecessario e deixando os cards dos agendamentos mais proporcionais ao espaco da coluna, sem alterar a estrutura semanal recem-entregue.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Grade semanal mais compacta

- A largura minima da grade desktop foi reduzida.
- A coluna de horarios foi levemente estreitada.
- As colunas dos dias passaram a usar um minimo menor, preservando legibilidade mas reduzindo a chance de scroll horizontal em larguras desktop comuns.

#### 2. Cards com densidade horizontal menor

- O card do appointment passou a usar margem lateral menor dentro da coluna.
- Chip de horario e badge de status foram reduzidos levemente.
- Os paddings internos foram ajustados para compactar a leitura sem esmagar o conteudo.

#### 3. Skeleton alinhado com a nova largura

- O skeleton desktop da agenda semanal foi ajustado para refletir a grade mais compacta, evitando discrepancia visual entre loading e estado real.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`

### Fora do escopo (mantido)

- Sem alteracao estrutural da agenda semanal
- Sem mudanca no mobile
- Sem mudanca nos endpoints
- Sem mudanca em disponibilidade
- Sem mudanca em backend

### Resultado

A agenda semanal desktop fica mais densa e proporcional, com menos espaco horizontal desperdicado e menor chance de scroll desnecessario, preservando a leitura e a estrutura atual da tela.

## 30 de marco de 2026 - Retorno do desktop de /agendamentos para agenda diaria operacional

### Objetivo

Abandonar a grade semanal como visualizacao principal do desktop e voltar para uma agenda diaria mais util para a operacao real, mantendo a base funcional ja pronta, o mobile aprovado e toda a regra de negocio existente.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Desktop voltou para o dia como foco principal

- A grade semanal deixou de ser a visualizacao principal do desktop.
- O desktop agora usa novamente uma agenda diaria com eixo vertical por horario.
- A data selecionada voltou a ser a ancora principal da tela.

#### 2. Agenda diaria por profissional

- A nova visualizacao desktop passou a usar colunas por profissional quando isso faz sentido para o dia filtrado.
- Quando o filtro esta em `Todos`, as colunas refletem os profissionais com agendamento no dia.
- Agendamentos sem profissional continuam aparecendo em uma coluna propria quando existirem.
- Quando um profissional especifico e filtrado, a tela reduz para uma coluna operacional daquele profissional.

#### 3. Cards maiores e mais legiveis

- Os appointments ficaram maiores e com mais espaco para horario, cliente, servico e profissional.
- Telefone e origem continuam aparecendo quando a altura do bloco permite.
- O clique no card continua abrindo o dialog de detalhes existente.

#### 4. Toolbar diaria

- O desktop passou a usar controles mais coerentes com a agenda do dia:
  - `Dia anterior`
  - `Hoje`
  - `Proximo dia`
- O filtro de data, o filtro por profissional e o botao `Novo agendamento` foram preservados.

#### 5. Skeleton adaptado

- O skeleton desktop foi ajustado para a nova agenda diaria com colunas por profissional.
- O mobile, o formulario e o modal de horarios permanecem com a mesma estrutura aprovada.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`
- Checagem rapida de TypeScript sem erro novo apontado em `app/(app)/agendamentos/page.tsx`

### Fora do escopo (mantido)

- Sem drag and drop
- Sem remarcacao por arrastar
- Sem visao mensal
- Sem retrabalho do mobile
- Sem alteracao de endpoints
- Sem alteracao da regra de disponibilidade

### Resultado

O desktop de `/agendamentos` volta a ter uma base visual mais adequada para a operacao do dia, com cards maiores, melhor aproveitamento do espaco e leitura mais natural para uso real.

## 02 de abril de 2026 - Confirmacao obrigatoria ao criar bloqueio com appointments conflitantes

### Objetivo

Melhorar o fluxo de criacao de bloqueios para que o sistema nao salve bloqueio silenciosamente sobre horarios com appointments ativos e permita uma decisao explicita entre manter ou cancelar os atendimentos conflitantes.

### Arquivos alterados

- `app/api/schedule/blocked/route.ts`
- `src/lib/validators/schedule.ts`
- `app/(app)/agendamentos/page.tsx`
- `app/(app)/horarios-de-atendimento/page.tsx`
- `app/(app)/horarios-de-atendimento/controllers/useBlockedScheduleFormController.ts`
- `app/(app)/horarios-de-atendimento/controllers/useBlockedScheduleListController.ts`
- `app/(app)/horarios-de-atendimento/types.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Deteccao real de conflito no backend antes de criar o bloqueio

- `POST /api/schedule/blocked` passou a montar a janela real do bloqueio com `date`, `startTime`, `endTime` e timezone da agenda.
- A consulta agora busca appointments ativos (`SCHEDULED` e `CONFIRMED`) que interceptam a janela pedida.
- O escopo do conflito respeita o bloqueio real:
  - bloqueio da loja inteira: considera appointments ativos da loja
  - bloqueio por profissional: considera apenas appointments ativos daquele profissional
- Appointments ja cancelados ou com status finais continuam fora do conflito.

#### 2. Contrato de confirmacao explicita

- O schema Zod de criacao de bloqueio passou a aceitar `conflictAction`.
- Quando ha appointments conflitantes e o payload ainda nao traz `conflictAction`, a API responde com `409` estruturado, `code = APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION`, quantidade e resumo dos appointments afetados.
- Isso evita erro generico e impede cancelamento silencioso.

#### 3. Persistencia da decisao no backend

- `KEEP_EXISTING_APPOINTMENTS`:
  - cria o bloqueio
  - nao altera appointments existentes
  - impede apenas novos encaixes no periodo
- `CANCEL_CONFLICTING_APPOINTMENTS`:
  - cria o bloqueio
  - cancela em lote os appointments conflitantes usando o status real `CANCELED`
  - libera a agenda para o bloqueio assumir o intervalo

#### 4. Fluxo seguro na UI sem redesenhar os modais

- O modal existente de bloqueio em `/agendamentos` foi preservado.
- Quando a API retorna conflito, a tela abre um `AlertDialog` curto com as duas escolhas obrigatorias:
  - manter atendimentos
  - cancelar atendimentos
- O modal de `/horarios-de-atendimento` recebeu o mesmo fluxo de confirmacao, tambem sem redesenho geral.

#### 5. Preservacao de escopo por loja e por profissional

- `/horarios-de-atendimento` passou a expor no proprio modal o alvo do bloqueio (`Loja inteira` ou profissional).
- A listagem de bloqueios nessa tela agora mostra o escopo do item.
- Os indicadores de bloqueio usados no expediente semanal passaram a considerar apenas o escopo relevante selecionado, evitando que bloqueio de um profissional polua a leitura da loja inteira ou de outro profissional.

### Validacao executada

- `yarn eslint app/api/schedule/blocked/route.ts src/lib/validators/schedule.ts app/(app)/agendamentos/page.tsx app/(app)/horarios-de-atendimento/page.tsx app/(app)/horarios-de-atendimento/controllers/useBlockedScheduleFormController.ts app/(app)/horarios-de-atendimento/controllers/useBlockedScheduleListController.ts app/(app)/horarios-de-atendimento/types.ts`
- `yarn tsc --noEmit --pretty false --incremental false --ignoreDeprecations 5.0` ainda falha por erros legados fora do escopo (`.next/dev/types/validator.ts`, `.next/types/validator.ts`, `contas-a-pagar/novo`, `usuarios/controllers`, `app-sidebar`, `auth-options`, `src/scripts/seed.ts`), sem apontar erro novo nos arquivos deste ajuste

### Fora do escopo (mantido)

- Sem redesenho da tela de `/agendamentos`
- Sem mudanca estrutural do modal de bloqueio fora do necessario
- Sem alteracao do fluxo atual quando nao ha conflito
- Sem mudanca no contrato de `storeId` vindo da sessao
- Sem introduzir status novo para cancelamento

### Resultado

Criar bloqueio sobre horarios com appointments ativos agora exige confirmacao explicita, permite escolher entre manter ou cancelar os atendimentos afetados e persiste a decisao de forma segura no backend, preservando o comportamento atual quando nao existe conflito.

## 02 de abril de 2026 - Ajuste fino do scroll no modal de bloqueio em /agendamentos

### Objetivo

Corrigir o corte dos CTAs no modal de bloqueio da agenda quando o conteudo interno cresce e o scroll passa a disputar espaco com o rodape.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- O `DialogContent` do modal de bloqueio em `/agendamentos` passou a usar layout em coluna com altura limitada.
- O formulario foi dividido entre:
  - area rolavel apenas para o corpo
  - `DialogFooter` fixo fora do scroll
- Isso preserva o layout atual e impede que os botoes `Cancelar` e `Salvar bloqueio` fiquem cortados.

### Validacao executada

- `yarn eslint app/(app)/agendamentos/page.tsx`

### Resultado

O modal continua com o mesmo visual, mas agora o scroll ocorre apenas no corpo e o rodape permanece sempre acessivel.

## 02 de abril de 2026 - Agenda publica por link da loja com disponibilidade real

### Objetivo

Criar um fluxo publico de agendamento online por link da loja, resolvendo a loja por `slug`, exibindo disponibilidade real e persistindo `Appointment` no banco sem depender de login.

### Arquivos alterados

- `src/lib/validators/appointment.ts`
- `src/lib/appointments/create.ts`
- `src/lib/public-booking.ts`
- `app/api/appointments/route.ts`
- `app/api/public/agenda/[slug]/route.ts`
- `app/api/public/agenda/[slug]/availability/route.ts`
- `app/api/public/agenda/[slug]/appointments/route.ts`
- `app/agenda/[slug]/page.tsx`
- `app/agenda/[slug]/public-booking-page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Resolucao publica da loja por slug

- Foi criado um helper central para agenda publica em `src/lib/public-booking.ts`.
- A loja publica agora e resolvida por `slug`, filtrando apenas loja ativa.
- O helper retorna os dados publicos reais da store, servicos ativos, profissionais com servicos ativos, timezone e `todayDate`.

#### 2. APIs publicas da agenda

- `GET /api/public/agenda/[slug]`
  - retorna os dados publicos reais da loja para a agenda online
- `GET /api/public/agenda/[slug]/availability`
  - recebe `serviceId`, `staffMembershipId` e `searchDate`
  - reutiliza `listAvailableSlotsForDate` da engine real
  - valida servico ativo, profissional elegivel, bloqueios, expediente, appointments e timezone
- `POST /api/public/agenda/[slug]/appointments`
  - recebe os dados do cliente e o slot escolhido
  - resolve a loja pelo `slug`
  - revalida o horario no backend antes de persistir
  - cria `Appointment` com `source: "WEB"`

#### 3. Helper compartilhado para criacao real de Appointment

- A logica de create foi centralizada em `src/lib/appointments/create.ts`.
- Esse helper reaproveita:
  - validacao de servico ativo da loja
  - elegibilidade do profissional para o servico
  - timezone da agenda
  - `checkAvailabilityForSlot` como validacao final do horario
- O `POST /api/appointments` do painel foi ajustado para usar o mesmo helper, evitando fluxo paralelo.

#### 4. Pagina publica `/agenda/[slug]`

- A rota publica foi criada fora do app autenticado, sem depender do middleware de login.
- A pagina mostra:
  - nome da loja
  - telefone / WhatsApp / endereco
  - observacoes publicas da loja
  - servicos ativos
  - profissionais elegiveis
  - horarios disponiveis reais
  - formulario do cliente com nome, telefone e e-mail opcional
- O cliente seleciona servico, profissional, data, horario e confirma o agendamento no mesmo fluxo.

#### 5. Revalidacao final de horario

- Mesmo depois de listar os slots, o `POST` final reexecuta a validacao de disponibilidade antes de gravar.
- Se o slot tiver sido ocupado no intervalo entre listagem e confirmacao, a API devolve erro legivel e o agendamento nao e criado.

### Validacao executada

- `yarn eslint src/lib/validators/appointment.ts src/lib/appointments/create.ts src/lib/public-booking.ts app/api/appointments/route.ts app/api/public/agenda/[slug]/route.ts app/api/public/agenda/[slug]/availability/route.ts app/api/public/agenda/[slug]/appointments/route.ts app/agenda/[slug]/page.tsx app/agenda/[slug]/public-booking-page.tsx`
- `yarn tsc --noEmit --pretty false --incremental false --ignoreDeprecations 5.0` ainda falha por erros legados fora do escopo (`.next/dev/types/validator.ts`, `.next/types/validator.ts`, `contas-a-pagar/novo`, `usuarios/controllers`, `app-sidebar`, `auth-options`, `src/scripts/seed.ts`), sem novo erro apontado nos arquivos desta feature

### Fora do escopo (mantido)

- Sem criar fluxo paralelo de disponibilidade
- Sem receber `storeId` pelo frontend
- Sem mock de horarios
- Sem alterar o fluxo WhatsApp existente
- Sem mexer no middleware do app autenticado

### Resultado

A loja agora pode compartilhar um link publico de agenda com disponibilidade real, selecao de servico e profissional e criacao final de `Appointment` com persistencia via Prisma, reaproveitando a mesma fonte de verdade de disponibilidade ja usada no sistema.

## 02 de abril de 2026 - Correcao preventiva de Route Handler dinamico para Next 16

### Objetivo

Corrigir o handler dinamico de `app/api/admin/[id]/route.ts` para o contrato exigido pelo Next 16 e fazer uma varredura preventiva por outros casos equivalentes que pudessem quebrar o build.

### Arquivos alterados

- `app/api/admin/[id]/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Handler dinamico alinhado ao Next 16

- O `PATCH` de `app/api/admin/[id]/route.ts` usava a assinatura antiga:
  - `({ params }: { params: { id: string } })`
- O arquivo foi ajustado para o padrao atual:
  - `context: { params: Promise<{ id: string }> }`
  - `const { id } = await params`
- A logica do endpoint foi preservada; so a assinatura e o acesso ao `id` foram atualizados.

#### 2. Varredura preventiva dos handlers dinamicos

- Foi feita busca nos `route.ts` dinamicos em `app/api`.
- No fonte atual, o unico caso confirmado com assinatura antiga era `app/api/admin/[id]/route.ts`.
- Os demais handlers dinamicos ja estavam no formato compativel com `params: Promise<...>`.

#### 3. Verificacao preventiva de rotas invalidas em `controllers/`

- Foi feita busca por `page.tsx` em pastas `controllers`, `helpers` e `hooks`.
- Nao ha `page.tsx` fonte ativo nesses diretorios no estado atual do workspace.
- O erro anterior de `.next/.../equipe/controllers/page` veio de tipos gerados antigos; depois de rodar `yarn build`, esse ponto deixou de ser o bloqueio atual.

#### 4. Novo proximo erro raiz confirmado

- Depois da correcao do handler de admin, o `yarn build` passou a falhar no proximo arquivo raiz:
  - `app/(app)/contas-a-pagar/novo/page.tsx:33`
- Erro atual:
  - `type: "EXPENSE"` nao existe em `FinanceExpenseCreatePayload`

### Validacao executada

- `yarn eslint app/api/admin/[id]/route.ts`
- `yarn build`

### Resultado

O erro de compatibilidade do Next 16 em `app/api/admin/[id]/route.ts` foi eliminado. O build agora avanca e revela o proximo problema real do projeto em `app/(app)/contas-a-pagar/novo/page.tsx:33`, o que reduz o risco de corrigir um erro por vez sem visibilidade do gargalo seguinte.

## 09 de abril de 2026 - Estabilizacao backend da WhatsAppConnection por loja

### Objetivo

Corrigir a base backend existente de `WhatsAppConnection` para o Prisma Client gerado atual, sem criar a rota `/api/store/current/whatsapp-connection`, sem criar a tela autenticada da loja e sem alterar o motor conversacional.

### Arquivos alterados

- `app/api/admin/stores/[id]/whatsapp-connection/route.ts`
- `app/admin/dashboard/stores/[id]/page.tsx`
- `src/scripts/debug-whatsapp-connection.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Auditoria do contrato real do Prisma Client

- Foi conferido o client gerado em `generated/prisma`.
- O contrato atual expoe a relacao da `Store` como `WhatsAppConnection`, e nao como `whatsappConnection`.
- A correcao foi feita no codigo para manter compatibilidade com o client ja gerado no workspace, sem mexer na model nem abrir migration nesta etapa.

#### 2. Correcao do uso da relacao no admin atual

- A rota `GET/PUT /api/admin/stores/[id]/whatsapp-connection` passou a usar `WhatsAppConnection` no `select` e na leitura do retorno de `prisma.store.findUnique`.
- A pagina admin existente de detalhe da loja foi ajustada apenas para consumir a mesma relacao real do client e deixar a base compilavel.
- A resposta JSON da API admin foi preservada no mesmo formato (`ok`, `data`, `error`, `details`).

#### 3. Persistencia compativel com os obrigatorios atuais da model

- O `upsert` passou a preencher `id` com `crypto.randomUUID()` no `create`.
- Tanto o `create` quanto o `update` agora preenchem `updatedAt` explicitamente com `new Date()`, como exigido hoje por `WhatsAppConnectionUncheckedCreateInput`.
- O script `src/scripts/debug-whatsapp-connection.ts` recebeu o mesmo ajuste para nao continuar falhando ao criar registros de teste.

#### 4. Fora do escopo mantido

- Sem criar `/api/store/current/whatsapp-connection`
- Sem criar a pagina de configuracao autenticada da loja
- Sem alterar o webhook alem do necessario para manter compatibilidade
- Sem mexer no motor conversacional do bot

### Validacao executada

- `yarn eslint app/api/admin/stores/[id]/whatsapp-connection/route.ts app/admin/dashboard/stores/[id]/page.tsx src/scripts/debug-whatsapp-connection.ts src/lib/whatsapp/admin-connection.ts`
- `.\node_modules\.bin\prisma.cmd generate`
- Busca por residuos de `store.whatsappConnection` na camada atual
- `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0` ainda falha por erros legados fora do escopo em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`, sem novo erro de relacao Prisma em `WhatsAppConnection`

### Resultado

A base backend atual de `WhatsAppConnection` ficou novamente alinhada ao Prisma Client gerado no workspace, com `create/upsert` compativeis com os obrigatorios atuais do schema e pronta para sustentar a proxima etapa store-scoped sem abrir mais superficie agora.

## 09 de abril de 2026 - Rota store-scoped para WhatsAppConnection da loja atual

### Objetivo

Criar a camada store-scoped para que a propria loja autenticada consiga ler e salvar sua `WhatsAppConnection` atual usando somente o `storeId` vindo da sessao, sem criar ainda a pagina autenticada de configuracao.

### Arquivos alterados

- `app/api/store/current/whatsapp-connection/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Nova rota store-scoped autenticada

- Foi criada a rota `GET/PATCH /api/store/current/whatsapp-connection`.
- A autenticacao e autorizacao usam `requireMembershipRole("ADMIN")`.
- Com isso, o `storeId` e resolvido apenas pela sessao ativa da loja, sem aceitar identificador vindo do frontend.

#### 2. GET com estrutura util para a UI futura

- O `GET` busca a `Store` atual pela sessao e inclui `Store.WhatsAppConnection`.
- Quando a conexao existe, a rota retorna os dados atuais da model.
- Quando a conexao ainda nao existe, a rota retorna:
  - `connection: null`
  - `state: "missing"`
  - `stateLabel`
  - `formValues` default gerado por `toWhatsAppConnectionFormValues()`

#### 3. PATCH com persistencia 1:1 por storeId

- O `PATCH` valida o payload com o schema Zod ja existente de `WhatsAppConnection`.
- O campo `storeId` e explicitamente rejeitado no body com erro legivel.
- A persistencia usa `prisma.whatsAppConnection.upsert({ where: { storeId } })`, mantendo a fonte unica 1:1 por loja.
- No `create`, a rota preenche:
  - `id: crypto.randomUUID()`
  - `storeId` da sessao
  - `updatedAt: new Date()`
- No `update`, a rota tambem atualiza `updatedAt`.

#### 4. Tratamento de erros legiveis

- Conflitos de unicidade `P2002` para `phoneNumberId` e `verifyToken` retornam mensagem legivel.
- O formato de resposta JSON foi mantido padronizado com `ok`, `data`, `error` e `details`.
- A rota admin existente nao foi alterada funcionalmente.

### Validacao executada

- `yarn eslint app/api/store/current/whatsapp-connection/route.ts src/lib/whatsapp/admin-connection.ts src/lib/guards/require-membership-role.ts`
- `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0` continua falhando por erros legados fora do escopo em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`

### Resultado

A loja autenticada agora tem uma rota propria para ler e salvar sua configuracao Meta/WhatsApp usando a `WhatsAppConnection` existente como fonte unica por `storeId`, sem depender de tela ainda e sem ampliar o escopo para webhook, outbound ou bot.

## 09 de abril de 2026 - Pagina autenticada da loja para configuracao WhatsApp Meta

### Objetivo

Criar a tela autenticada da propria loja para visualizar e editar a `WhatsAppConnection` atual consumindo a rota store-scoped ja existente, sem alterar o bot, webhook ou outbound.

### Arquivos alterados

- `app/(app)/configuracoes/whatsapp/page.tsx`
- `middleware.ts`
- `src/components/ui/app-sidebar.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Nova pagina autenticada da loja

- Foi criada a rota de tela `app/(app)/configuracoes/whatsapp/page.tsx`.
- A UX segue o padrao do app autenticado com `HeaderPage`, cards brancos, `toast` do `sonner` e fetch client-side.
- A tela tem loading inicial, resumo do estado atual, formulario tecnico e feedback visual de sucesso/erro.

#### 2. Consumo da rota store-scoped existente

- No carregamento, a pagina chama `GET /api/store/current/whatsapp-connection`.
- O retorno `formValues` alimenta o formulario da UI.
- A resposta tambem abastece:
  - `state`
  - `stateLabel`
  - `connection`
- Quando nao existe conexao ainda, a tela permanece pronta para o primeiro cadastro.

#### 3. Formulario tecnico completo

- A pagina reutiliza `whatsAppConnectionSchema`, enums e labels de `src/lib/whatsapp/admin-connection.ts`.
- O formulario permite editar:
  - `provider`
  - `businessAccountId`
  - `phoneNumberId`
  - `displayPhoneNumber`
  - `verifyToken`
  - `accessToken`
  - `status`
  - `isActive`
- O submit chama `PATCH /api/store/current/whatsapp-connection`, cobrindo criacao e atualizacao.
- Erros de validacao por campo retornados pela API sao aplicados no formulario.

#### 4. Acesso autenticado real e navegacao minima

- O `middleware.ts` passou a considerar `/configuracoes/:path*` como rota do app da loja.
- O sidebar ganhou o item `WhatsApp Meta`, permitindo acesso direto a tela pelo menu.
- Nenhum `storeId` e enviado pelo client.

#### 5. Fora do escopo mantido

- Sem OAuth da Meta
- Sem Embedded Signup
- Sem alterar webhook
- Sem alterar outbound
- Sem alterar o motor conversacional

### Validacao executada

- `yarn eslint app/(app)/configuracoes/whatsapp/page.tsx middleware.ts src/components/ui/app-sidebar.tsx src/lib/whatsapp/admin-connection.ts`
- `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0` continua falhando por erros legados fora do escopo em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`

### Resultado

A loja autenticada agora consegue abrir uma tela propria de configuracao Meta, carregar a `WhatsAppConnection` atual via `GET`, salvar via `PATCH` e operar tanto no primeiro cadastro quanto em edicoes posteriores, deixando a base pronta para a proxima etapa operacional.

## 09 de abril de 2026 - Validacao operacional da WhatsAppConnection da loja

### Objetivo

Adicionar uma classificacao operacional minima e confiavel para a `WhatsAppConnection` ja salva da loja, sem alterar o motor conversacional principal e sem refatorar webhook/outbound nesta etapa.

### Arquivos alterados

- `src/lib/whatsapp/operational-status.ts`
- `app/api/store/current/whatsapp-connection/route.ts`
- `app/(app)/configuracoes/whatsapp/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Helper unico de auditoria operacional

- Foi criado `src/lib/whatsapp/operational-status.ts`.
- Esse helper avalia a conexao salva e classifica em:
  - `missing`
  - `incomplete`
  - `inactive`
  - `ready`
- A auditoria cobre explicitamente:
  - `provider`
  - `businessAccountId`
  - `phoneNumberId`
  - `displayPhoneNumber`
  - `verifyToken`
  - `accessToken`
  - `status`
  - `isActive`

#### 2. Regra operacional mais aderente ao backend real

- `missing`: nao existe registro de `WhatsAppConnection`
- `inactive`: existe registro, mas `isActive !== true`
- `incomplete`: existe registro ativo, mas faltam campos minimos ou `status !== CONNECTED`
- `ready`: conexao ativa, com campos minimos e `status = CONNECTED`

- Essa regra foi escolhida porque o fluxo operacional atual de inbound/outbound ja depende semanticamente de conexao ativa e `status = CONNECTED`.

#### 3. Integracao na rota store-scoped existente

- A rota `GET/PATCH /api/store/current/whatsapp-connection` passou a retornar um bloco `operational` no payload.
- Esse bloco inclui:
  - `state`
  - `stateLabel`
  - `summary`
  - `isReady`
  - `checks`
  - `blockingIssues`
  - `completedChecks`
  - `totalChecks`
- Nao foi criado endpoint separado de `check`, porque a propria rota existente ja recalcula a auditoria operacional no `GET` e no retorno do `PATCH`.

#### 4. Integracao na UI autenticada da loja

- A pagina `/configuracoes/whatsapp` passou a exibir o estado operacional real no topo da tela.
- Foi adicionado um checklist visual com os oito checks minimos da conexao.
- A tela tambem mostra:
  - resumo operacional
  - contagem de checks concluidos
  - pendencias bloqueantes
  - distincao entre estado estrutural da conexao e estado operacional

#### 5. Fora do escopo mantido

- Sem OAuth da Meta
- Sem Embedded Signup
- Sem alterar webhook/outbound
- Sem mexer no fluxo de conversa/agendamento do bot

### Validacao executada

- `yarn eslint src/lib/whatsapp/operational-status.ts app/api/store/current/whatsapp-connection/route.ts app/(app)/configuracoes/whatsapp/page.tsx`
- `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0` continua falhando por erros legados fora do escopo em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`

### Resultado

A loja agora consegue ver com clareza se a sua conexao WhatsApp/Meta esta ausente, incompleta, inativa ou pronta, e a tela atual passou a refletir esse estado operacional com checklist e pendencias, deixando a base pronta para a proxima etapa de verificacao real com a Meta.

## 10 de abril de 2026 - Teste real da conexao Meta/WhatsApp da loja

### Objetivo

Permitir que a propria loja autenticada dispare uma verificacao real minima da conexao Meta atual, reutilizando a `WhatsAppConnection` ja salva, sem alterar o motor conversacional do bot e sem redesenhar o webhook completo nesta etapa.

### Arquivos alterados

- `src/lib/whatsapp/meta-connection-check.ts`
- `app/api/store/current/whatsapp-connection/check/route.ts`
- `app/(app)/configuracoes/whatsapp/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Service dedicado para o check real da Meta

- Foi criado `src/lib/whatsapp/meta-connection-check.ts`.
- O helper recebe a conexao atual da loja e a auditoria operacional ja calculada.
- Quando a auditoria estiver em `missing` ou `incomplete`, o helper bloqueia o teste antes de chamar a Meta e devolve resultado estruturado com:
  - `ok = false`
  - `status = blocked`
  - mensagem amigavel
  - motivos operacionais do bloqueio
- Quando a conexao pode ser testada, o helper executa uma chamada real na Graph API usando:
  - `accessToken`
  - `phoneNumberId`
- A chamada implementada foi um `GET /{phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status`.
- O retorno padroniza:
  - `ok`
  - `status`
  - `message`
  - `checkedAt`
  - `details` tecnicos controlados para debug
- O debug controlado inclui:
  - `metaStatusCode`
  - `metaRequestPath`
  - checks de autenticacao do token e acesso ao `phoneNumberId`
  - comparacao do numero retornado pela Meta com o `displayPhoneNumber` salvo quando possivel
  - `graphError`
  - `responsePreview`
- O token nao e exposto no payload.

#### 2. Endpoint store-scoped para a loja atual

- Foi criada a rota `POST /api/store/current/whatsapp-connection/check`.
- O `storeId` continua sendo resolvido exclusivamente pela sessao via `requireMembershipRole("ADMIN")`.
- Nenhum `storeId` vindo do client e aceito ou necessario.
- A rota carrega a `WhatsAppConnection` da loja atual, recalcula a auditoria operacional existente e delega o teste real ao novo helper.
- O retorno usa o mesmo envelope JSON padrao do projeto (`{ ok: true, data: ... }`), enquanto o resultado tecnico do teste vai em `data.ok`.
- Falhas de autenticacao/permissao/store inexistente continuam respondendo com erro HTTP apropriado; falhas tecnicas da Meta retornam payload legivel para a UI.

#### 3. Acao real na UI `/configuracoes/whatsapp`

- A pagina ganhou uma secao independente chamada `Teste real com Meta`.
- Foi adicionado o botao `Verificar conexao real`.
- Durante a requisicao, a UI mostra loading proprio desta acao.
- Apos a resposta, a tela exibe um card separado da auditoria operacional local com:
  - status visual de `Sucesso tecnico`, `Falha tecnica` ou `Teste bloqueado`
  - mensagem amigavel
  - horario da ultima execucao
  - checks tecnicos resumidos
  - numero retornado pela Meta quando disponivel
  - erro da Meta e preview controlado da resposta quando houver
- O resultado do teste e limpo ao recarregar a configuracao ou salvar a conexao, evitando mostrar diagnostico antigo para dados ja alterados.

#### 4. Fora do escopo mantido

- Sem alterar o motor conversacional
- Sem implementar Embedded Signup/OAuth
- Sem refatorar o fluxo completo de webhook
- Sem atualizar automaticamente o `status` persistido da `WhatsAppConnection`

### Validacao executada

- `yarn eslint src/lib/whatsapp/meta-connection-check.ts app/api/store/current/whatsapp-connection/check/route.ts app/(app)/configuracoes/whatsapp/page.tsx`
- `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0` continua falhando apenas por erros legados fora do escopo em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`

### Resultado

A loja autenticada agora consegue clicar e executar um teste real minimo da sua conexao Meta atual, diferenciando bloqueio local, sucesso tecnico e falha tecnica, com resposta store-scoped legivel e UI pronta para sustentar a proxima etapa de configuracao e validacao do webhook real.

## 22 de abril de 2026 - Correcao do check real da conexao Meta/WhatsApp

### Objetivo

Corrigir apenas o check real da conexao Meta/WhatsApp do Olyon para reconhecer um token e um `phoneNumberId` ja validados externamente na Graph API.

### Arquivos alterados

- `src/lib/whatsapp/meta-connection-check.ts`
- `app/api/store/current/whatsapp-connection/check/route.ts`
- `app/(app)/configuracoes/whatsapp/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Endpoint real alinhado ao teste externo

- O check deixou de chamar `v22.0` com `fields` extras.
- A chamada atual passou a ser `GET https://graph.facebook.com/v25.0/{phoneNumberId}`, igual ao teste externo validado.
- O `metaRequestPath` retornado no debug controlado agora reflete `/{phoneNumberId}`.

#### 2. Token lido do backend auditavel sem vazamento

- O check continua lendo `accessToken` da `WhatsAppConnection` selecionada pelo `storeId` da sessao.
- O resultado agora inclui `accessTokenRead` com:
  - origem `WhatsAppConnection.accessToken`
  - presenca do token
  - tamanho do token apos `trim`
  - prefixo SHA-256 do token
- O valor do token nao e retornado nem logado.

#### 3. Parser e comparacao reforcados

- O parser de sucesso agora exige `id` no retorno da Meta.
- O resumo tecnico passou a capturar `platform_type`.
- A comparacao de `displayPhoneNumber` aceita diferencas de espacos, pontuacao, `+` e prefixo de pais quando um lado contem o outro como sufixo nacional com pelo menos 10 digitos.

#### 4. Rota e UI ajustadas no mesmo escopo

- A rota `POST /api/store/current/whatsapp-connection/check` ficou com runtime Node explicito.
- A mensagem de 401 local agora diferencia sessao invalida do Olyon de falha de autenticacao da Meta.
- A UI do resultado passou a exibir `Token lido no backend` e `platform_type`.

### Fora do escopo mantido

- Sem alterar motor conversacional.
- Sem alterar webhook.
- Sem alterar outbound.
- Sem atualizar automaticamente o `status` da `WhatsAppConnection`.

### Validacao executada

- `yarn eslint src/lib/whatsapp/meta-connection-check.ts app/api/store/current/whatsapp-connection/check/route.ts app/(app)/configuracoes/whatsapp/page.tsx`
- `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0` continua falhando por erros legados fora do escopo em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`, sem erro novo nos arquivos do check.

### Resultado

O check real do Olyon agora usa o mesmo caminho da Graph API ja validado externamente e deve marcar sucesso tecnico quando a Meta retornar o `phoneNumberId` com o token salvo na `WhatsAppConnection` da loja atual.

## 22 de abril de 2026 - Correcao do Prisma Client no build da Vercel

### Objetivo

Corrigir apenas a falha de build relacionada a imports de `generated/prisma/client`, mantendo o motor conversacional e o webhook Meta fora do escopo.

### Arquivos alterados

- `package.json`
- `src/lib/prisma.ts`
- `prisma/seed.ts`
- Rotas e libs que importavam tipos/enums diretamente de `generated/prisma/client` ou `generated/prisma/enums`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- Confirmado que `prisma/schema.prisma` usa `generator client` com `provider = "prisma-client"` e `output = "../generated/prisma"`.
- O helper `src/lib/prisma.ts` passou a ser o ponto unico para `prisma`, `PrismaClient`, namespace `Prisma`, tipos e enums gerados.
- Imports relativos frageis para `../../../generated/prisma/client` e equivalentes foram trocados por `@/lib/prisma`.
- O seed passou a usar o mesmo helper central.
- O script `build` agora executa `prisma generate && next build`, garantindo que a pasta ignorada `generated/prisma` exista no ambiente da Vercel antes do bundle do Next.

### Fora do escopo mantido

- Sem alterar regras do motor conversacional.
- Sem alterar webhook Meta.
- Sem alterar fluxo de outbound WhatsApp.
- Sem corrigir erros TypeScript antigos fora do escopo desta etapa.

### Validacao executada

- `yarn prisma generate` passou e gerou o client em `generated/prisma`.
- `yarn build` deixou de falhar por `generated/prisma/client`: o bundle compilou e a execucao parou depois no TypeScript por erro fora do escopo em `app/(app)/agendamentos/page.tsx:2346`, onde `code` nao existe em `ApiError | AppointmentCreateConflictError`.

### Resultado

A falha recorrente de resolucao do Prisma Client no build da Vercel foi enderecada. O proximo bloqueio de build visivel agora e um erro TypeScript da tela de agendamentos, nao relacionado ao Prisma Client.

## 22 de abril de 2026 - Correcao do TypeScript no build de agendamentos

### Objetivo

Corrigir o bloqueio TypeScript em `app/(app)/agendamentos/page.tsx:2346`, preservando a regra atual de conflito manual de agendamento.

### Arquivos alterados

- `app/(app)/agendamentos/page.tsx`
- `app/api/appointments/[id]/route.ts`
- `app/api/appointments/availability/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- O acesso a `json.code` no retorno de create de agendamento foi protegido com `"code" in json`, permitindo o narrowing correto entre `ApiError` e `AppointmentCreateConflictError`.
- Apos esse ajuste, o build revelou callers de disponibilidade usando a chave `excludeAppointmentId` contra funcoes que esperam `ignoreAppointmentId`; apenas a chave interna passada para as funcoes foi alinhada, mantendo o mesmo valor e o mesmo contrato externo.

### Fora do escopo mantido

- Sem alterar Prisma.
- Sem alterar motor do bot/WhatsApp.
- Sem alterar webhook Meta.
- Sem alterar a regra de negocio de conflito/confirmacao de agendamento.

### Validacao executada

- `yarn build` concluiu com sucesso.
- O build ainda exibe apenas warnings antigos nao bloqueantes: lockfiles multiplos, convencao `middleware` depreciada e `baseline-browser-mapping` desatualizado.

### Resultado

O build deixou de falhar em `app/(app)/agendamentos/page.tsx:2346` e passou a concluir com sucesso.

## 22 de abril de 2026 - Conexao Meta e webhook validados no ambiente de testes

### Objetivo

Concluir a validacao real da conexao Meta/WhatsApp no ambiente publicado de testes e confirmar que o webhook configurado no painel da Meta aponta corretamente para o deploy da Vercel.

### Arquivos alterados

- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi validado

- Deploy de producao da Vercel publicado com Next `16.0.10`
- Endpoint `GET /api/webhooks/whatsapp` respondendo `200`
- Validacao manual com `hub.challenge` respondendo corretamente
- Conexao real com a Graph API validada com sucesso
- `phoneNumberId` acessivel
- `webhook_configuration.application` retornando `https://olyon-testes.vercel.app/api/webhooks/whatsapp`
- Checklist operacional da tela `/configuracoes/whatsapp` com `8/8 checks ok`
- Status tecnico final da conexao marcado como `CONNECTED`

### Resultado

- A configuracao minima da conexao WhatsApp ficou operacional no ambiente de testes publicado.
- O problema anterior nao estava no backend do webhook; a falha estava na configuracao/preenchimento no painel da Meta.

### Proximo passo sugerido

- Validar o fluxo ponta a ponta com evento real chegando no webhook e confirmar persistencia/processamento no sistema.

## 22 de abril de 2026 - Registro de avanço do fluxo real WhatsApp e refatoração do webhook inbound

### Objetivo

Registrar o estado atual da integração WhatsApp após validar resposta real do chatbot no cliente e consolidar o log da refatoração do webhook inbound.

### O que foi validado

- Fluxo real no WhatsApp respondeu corretamente ao cumprimento inicial
- Menu inicial do bot foi exibido corretamente
- Intenção de agendamento foi reconhecida
- Bot avançou para a pergunta de serviço
- O bloqueio atual para concluir o agendamento não é integração, e sim ausência de massa operacional mínima de serviços

### Refatoração registrada

- `app/api/webhooks/whatsapp/route.ts` refatorado para ler body como texto antes do parse
- Validação de assinatura Meta adicionada com `x-hub-signature-256`
- Payload de teste endurecido em produção
- `existingInbound`, `conversation.upsert`, criação do inbound e processamento do bot movidos para a mesma transação
- Lock por conversa com `SELECT ... FOR UPDATE`
- Tratamento defensivo para colisão de unique constraint
- Outbound mantido após commit
- `yarn build` passou após a mudança

### Resultado

- Integração técnica WhatsApp -> Olyon está funcional no fluxo real de entrada
- A base do webhook inbound ficou mais robusta para produção
- Próximo foco permanece na validação manual da refatoração em cenários críticos de retry e idempotência

## 27 de abril de 2026 - Base tecnica do Cadastro Incorporado WhatsApp/Meta

### Objetivo

Implementar a base tecnica do Embedded Signup no app autenticado do Olyon, reaproveitando a `WhatsAppConnection` da loja atual sem mover o webhook existente nem degradar o fluxo atual de inbound/outbound.

### Arquivos alterados

- `app/(app)/configuracoes/whatsapp/page.tsx`
- `app/api/whatsapp/embedded-signup/callback/route.ts`
- `.gitignore`
- `src/components/whatsapp/embedded-signup-button.tsx`
- `src/lib/validators/whatsapp-embedded-signup.ts`
- `src/lib/whatsapp/embedded-signup.ts`
- `.env.example`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- Card novo na tela autenticada `/configuracoes/whatsapp` para conexao via Cadastro Incorporado da Meta, exibindo status atual e CTA `Conectar com WhatsApp Business`.
- Componente client-side para carregar o Facebook SDK apenas no navegador, abrir o fluxo Embedded Signup, capturar `code`, `phoneNumberId`, `wabaId` e `businessId` quando retornados pela Meta e enviar tudo para a API interna.
- `POST /api/whatsapp/embedded-signup/callback` com validacao Zod, sessao store-scoped via membership atual e resposta JSON padronizada com `ok`, `data` e `error.message`/`error.code`.
- Helper server-side para trocar o `code` por token na Graph API, resolver dados minimos da conexao e persistir a `WhatsAppConnection` da loja atual sem expor token na resposta.
- Regra defensiva para nao sobrescrever uma conexao `CONNECTED` existente com um retorno incompleto do Embedded Signup.
- `.env.example` criado com os envs atuais do projeto e os novos envs necessarios para App ID, App Secret, Graph API e `config_id` do Embedded Signup.
- `.gitignore` ajustado com `!.env.example` para que o arquivo de exemplo possa ser versionado junto com a feature.

### Fora do escopo mantido

- Sem alterar `app/api/webhooks/whatsapp/route.ts`.
- Sem mover o webhook para o dominio da landing.
- Sem trocar o fluxo atual de inbound/outbound WhatsApp.
- Sem validar coexistencia ponta a ponta em ambiente Meta antes da aprovacao final do App Review e Access Verification.

### Validacao executada

- `yarn lint` passou com 2 warnings antigos fora do escopo em controllers de auth (`data` nao usada).
- `yarn build` passou com sucesso.
- `prisma generate` foi executado pelo proprio script de build e concluiu com sucesso.

### Resultado

A base tecnica do Cadastro Incorporado WhatsApp/Meta ficou implementada no backoffice autenticado do Olyon e pronta para integracao real assim que a aprovacao final da Meta liberar a validacao ponta a ponta de coexistencia.

## 27 de abril de 2026 - Refino da UX e do diagnostico tecnico em `/configuracoes/whatsapp`

### Objetivo

Separar a visao operacional da loja da visao tecnica da conexao Meta/WhatsApp, mantendo a `WhatsAppConnection` sempre vinculada a uma `Store` especifica da sessao atual e sem alterar o webhook existente.

### Arquivos alterados

- `app/(app)/configuracoes/whatsapp/page.tsx`
- `app/api/store/current/whatsapp-connection/route.ts`
- `src/components/whatsapp/embedded-signup-button.tsx`
- `src/lib/whatsapp/embedded-signup.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

- A cabeca da tela `/configuracoes/whatsapp` foi simplificada para a loja, com status amigavel (`Conectado`, `Nao conectado`, `Pendente`, `Erro na conexao`), CTA de conexao e textos curtos sobre permissao de administrador na Meta e dependencia da aprovacao final do app.
- Os blocos tecnicos de auditoria, checklist operacional, teste real com Meta, resumo tecnico e formulario manual passaram a ser renderizados apenas quando a sessao possui `globalRole = SUPER_ADMIN`.
- O texto tecnico agora deixa explicito que qualquer diagnostico continua restrito a uma `WhatsAppConnection` da `Store` atual da sessao, sem configuracao global unica para o sistema.
- O componente `EmbeddedSignupButton` manteve a logica validada do SDK/popup/callback, mas trocou mensagens cruas por mensagens amigaveis para a loja.
- A rota store-scoped `GET/PATCH /api/store/current/whatsapp-connection` deixou de devolver `accessToken` no payload do client, preservando o uso do token apenas no backend para avaliacao operacional.

### Fora do escopo mantido

- Sem alterar `app/api/webhooks/whatsapp/route.ts`.
- Sem mover o webhook para outro dominio.
- Sem alterar o fluxo atual de inbound/outbound WhatsApp.
- Sem mudar Prisma/schema/migrations.
- Sem separar o login em rotas diferentes.

### Validacao executada

- `yarn lint`
- `yarn build`

### Resultado

A tela `/configuracoes/whatsapp` passou a ter uma UX adequada para a loja, enquanto o diagnostico tecnico detalhado ficou protegido para `SUPER_ADMIN`. A configuracao continua multi-tenant e store-scoped, com persistencia e leitura vinculadas a `storeId` resolvido pela sessao/membership.

## 30 de abril de 2026 - Correcao da validacao GET do webhook WhatsApp/Meta

### Objetivo

Corrigir a verificacao `GET /api/webhooks/whatsapp` para usar o segredo publicado em `WHATSAPP_WEBHOOK_SECRET`, permitindo que a Meta valide o webhook por `hub.challenge` sem depender de lookup por token no banco.

### Arquivos alterados

- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi corrigido

- O `GET` do webhook deixou de usar `findActiveWhatsAppConnectionByVerifyToken(...)` para autenticar `hub.verify_token`.
- A validacao passou a ler `process.env.WHATSAPP_WEBHOOK_SECRET` diretamente e comparar com `req.nextUrl.searchParams.get("hub.verify_token")`.
- Quando `hub.mode=subscribe`, o token confere e `hub.challenge` existe, a resposta agora e somente o valor de `hub.challenge` com `Content-Type: text/plain`.
- Falhas de validacao passaram a responder `403` com `{ ok: false, error: "Invalid hub.verify_token" }`.
- O `POST` inbound do webhook nao foi alterado.
- `middleware.ts` foi auditado e nao intercepta `/api/webhooks/whatsapp`, porque o `matcher` atual nao inclui rotas `/api/*`.

### Validacao executada

- `yarn lint app/api/webhooks/whatsapp/route.ts middleware.ts`
- `yarn build`

### Resultado

- `yarn lint app/api/webhooks/whatsapp/route.ts middleware.ts` concluiu sem erros e manteve apenas 2 warnings legados fora do escopo em `app/(auth)/cadastro/controllers/index.tsx` e `app/(auth)/recuperar-senha/controllers/index.tsx`.
- `yarn build` concluiu com sucesso.
- O ajuste fica pronto para validacao na Meta assim que a Vercel receber novo deploy com o env `WHATSAPP_WEBHOOK_SECRET` ja configurado.

## 29 de junho de 2026 - Auditoria do Cadastro Incorporado WhatsApp

### Objetivo

Auditar e corrigir o fluxo iniciado em `/configuracoes/whatsapp`, garantindo que o launcher use a configuracao do app `Olyon agendamentos`, nao imponha um portfolio empresarial e persista o retorno somente na Store atual da sessao.

### Diagnostico

- Nao havia `business_id` hardcoded no repositorio.
- O App ID configurado localmente foi consultado na Graph API e corresponde ao app `Olyon agendamentos`.
- O frontend lia App ID e Configuration ID diretamente de envs `NEXT_PUBLIC_*`, enquanto o callback podia trocar o `code` usando outro App ID server-side.
- O `FB.login` nao enviava `extras.setup: {}` e mantinha `sessionInfoVersion: 3`, apesar de o fluxo atual ser definido pelo `config_id`.
- O listener reconhecia apenas `FINISH`; o fluxo de coexistencia retorna `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`, podendo descartar o `waba_id` antes do callback.
- O callback ja estava corretamente store-scoped: rejeita `storeId` no body, resolve `storeId` via `requireMembershipRole("ADMIN")` e faz `upsert` por esse valor.
- A leitura do banco antes da alteracao confirmou `Loja Principal` com conexao ativa `CONNECTED` e `Teste Meta` sem `WhatsAppConnection`.

### Arquivos alterados

- `app/(app)/configuracoes/whatsapp/page.tsx`
- `app/api/whatsapp/embedded-signup/config/route.ts`
- `app/api/whatsapp/embedded-signup/callback/route.ts`
- `src/components/whatsapp/embedded-signup-button.tsx`
- `src/lib/validators/whatsapp-embedded-signup.ts`
- `src/lib/whatsapp/embedded-signup.ts`
- `.env.example`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi corrigido

- Criado `GET /api/whatsapp/embedded-signup/config`, protegido por membership `ADMIN`, para entregar `appId`, `configId` e versao da Graph API ao launcher com `Cache-Control: no-store`.
- A configuracao server-side valida divergencia entre `META_APP_ID` e o fallback legado `NEXT_PUBLIC_META_APP_ID`.
- O env recomendado para a configuracao passou a ser `META_EMBEDDED_SIGNUP_CONFIG_ID`; `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` permanece apenas como fallback de compatibilidade.
- O launcher deixou de conter configuracao Meta compilada no bundle e passou a inicializar o SDK com o retorno da rota autenticada.
- `FB.login` agora envia `extras.setup: {}` e `featureType: "whatsapp_business_app_onboarding"`, sem `business_id` ou outro portfolio pre-preenchido.
- O `business_id` retornado pela Meta deixou de ser enviado ao backend, pois era inutilizado e nao faz parte do model `WhatsAppConnection`.
- Eventos de conclusao `FINISH_*` agora sao reconhecidos e o envio do `code` aguarda por ate 3 segundos os metadados `waba_id`/`phone_number_id`, eliminando a corrida entre `postMessage` e o callback do SDK.
- Os textos da tela deixaram de afirmar que o fluxo dependia de aprovacao futura do app e passaram a explicar que a elegibilidade dos portfolios e definida pela Meta.

### Restricao externa confirmada

O portfolio que possui o Developer App nao e elegivel para auto-onboarding pelo Embedded Signup de Tech Provider, e WABAs originalmente criadas pelo app tambem nao podem ser selecionadas nesse fluxo. Portanto, o bloqueio do portfolio `Olyon agendamentos` nao e causado por `business_id`, `storeId` ou `setup` no codigo. A `Teste Meta` precisa concluir o fluxo com um portfolio de cliente elegivel, separado do owner do app, ou usar outro caminho administrativo suportado pela Meta.

### Validacao executada

- `yarn eslint` concluiu sem erros e manteve 2 warnings legados fora do escopo em `app/(auth)/cadastro/controllers/index.tsx` e `app/(auth)/recuperar-senha/controllers/index.tsx`.
- `yarn tsc --noEmit --pretty false --incremental false` concluiu sem erros.

### Resultado

O launcher nao pre-seleciona `Loja Principal` nem qualquer outro portfolio, usa uma unica configuracao Meta validada pelo backend e o retorno permanece vinculado exclusivamente a Store atual da sessao. Nenhuma `WhatsAppConnection` existente foi modificada durante a auditoria.

## 03 de julho de 2026 - MVP de lembretes automaticos de agendamento por WhatsApp

### Objetivo

Implementar lembretes automaticos 1 hora e 15 minutos antes do agendamento, limitados a `Appointment.source = WHATSAPP`, com template aprovado da Meta, idempotencia persistente e endpoint de cron protegido.

### Arquivos alterados

- `prisma/schema.prisma`
- `prisma/migrations/20260703165408_add_appointment_reminders/migration.sql`
- `src/lib/appointments/reminders.ts`
- `src/lib/whatsapp/appointment-reminder.ts`
- `app/api/cron/appointment-reminders/route.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `.env.example`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

### O que foi implementado

#### 1. Outbox persistente

- Criados os enums `AppointmentReminderKind` (`ONE_HOUR`, `FIFTEEN_MINUTES`) e `AppointmentReminderStatus` (`PENDING`, `PROCESSING`, `SENT`, `FAILED`, `SKIPPED`).
- Criada a model `AppointmentReminder` ligada a `Store` e `Appointment`.
- A model registra snapshot de `appointmentStartAt`, `scheduledFor`, tentativas, lock, envio, identificador/status da Meta, motivo e erro.
- A constraint `@@unique([appointmentId, kind, appointmentStartAt])` impede duplicidade e diferencia uma nova data/hora do mesmo appointment.
- Foram adicionados indices para `status + scheduledFor`, `storeId` e `providerMessageId`.
- A migration `20260703165408_add_appointment_reminders` foi criada e aplicada com Prisma Migrate.

#### 2. Reconciliador e dispatcher

- O reconciliador busca apenas appointments `WHATSAPP`, `SCHEDULED` ou `CONFIRMED`, com inicio nas proximas 24 horas.
- Para cada appointment, calcula `scheduledFor` subtraindo 60 ou 15 minutos diretamente de `startAt`.
- `createMany({ skipDuplicates: true })` materializa os lembretes sem duplicar.
- Existe tolerancia de 5 minutos; janelas antigas ficam `SKIPPED` em vez de disparar lembrete atrasado.
- O dispatcher busca vencidos `PENDING` em lotes de ate 50.
- O claim usa update condicional por `id + status = PENDING`, incrementa `attempts` e muda para `PROCESSING`; chamadas concorrentes nao enviam a mesma linha.
- Antes da Meta, o appointment e recarregado e source, status, Store, telefone e snapshot de `startAt` sao revalidados.
- Cancelado, concluido, no-show, remarcado, telefone invalido ou fora da janela vira `SKIPPED`.
- Falha de template, conexao ou envio vira `FAILED`.

#### 3. Template Meta e inbox

- O helper de lembrete resolve a conexao por `findActiveWhatsAppConnectionByStoreId`.
- O envio reutiliza `sendMetaWhatsAppTemplate`; nenhum texto livre e enviado pelo cron.
- Sao usados dois nomes de template configuraveis, um para 1h e outro para 15min, ambos com idioma configuravel.
- Contrato do BODY: `{{1}}` recebe o nome do cliente e `{{2}}` recebe a data/hora formatada no timezone atual do bot.
- O token permanece somente no backend e nao e incluido em logs ou payloads persistidos.
- Envio aceito persiste `ConversationMessage OUT` com origem `appointment_reminder` e dados operacionais do template/provider.
- Falha apenas na persistencia do inbox nao muda um envio aceito para `FAILED`, evitando retry duplicado; o outbox registra `CONVERSATION_MESSAGE_PERSIST_FAILED`.

#### 4. Cron e callbacks

- Criado `GET /api/cron/appointment-reminders`.
- A rota exige `Authorization: Bearer ${CRON_SECRET}` e nao recebe `storeId`.
- A resposta segue o contrato `{ ok, data }` e inclui `created`, `claimed`, `sent`, `skipped` e `failed`.
- O callback de statuses da Meta preserva a atualizacao idempotente de `ConversationMessage.payload.statusEvents`.
- Quando o mesmo `providerMessageId` pertence a um `AppointmentReminder`, o callback tambem atualiza `providerStatus` e `statusReason`.

### Env e operacao

Foram documentados em `.env.example`:

- `CRON_SECRET`
- `WHATSAPP_APPOINTMENT_REMINDER_ONE_HOUR_TEMPLATE_NAME`
- `WHATSAPP_APPOINTMENT_REMINDER_FIFTEEN_MINUTES_TEMPLATE_NAME`
- `WHATSAPP_APPOINTMENT_REMINDER_TEMPLATE_LANGUAGE`

O scheduler de producao deve chamar a rota a cada minuto. O plano Vercel Hobby pode nao suportar essa frequencia; nesse caso sera necessario Vercel Pro ou scheduler externo. Os templates precisam estar aprovados na WABA da conexao usada.

WEB e ADMIN permanecem fora do MVP ate existir normalizacao confiavel do telefone e registro de consentimento para mensagens proativas.

### Validacao executada

- `yarn prisma migrate dev --name add_appointment_reminders`
- `yarn prisma generate`
- `yarn eslint`
- `yarn tsc --noEmit --pretty false --incremental false`
- `git diff --check`

O lint concluiu sem erros e manteve apenas 2 warnings legados fora do escopo em `app/(auth)/cadastro/controllers/index.tsx` e `app/(auth)/recuperar-senha/controllers/index.tsx`. O typecheck concluiu sem erros.

## 04 de julho de 2026 - MVP de financeiro das lojas e controle de assinatura

### Objetivo

Permitir que o `SUPER_ADMIN` controle manualmente a assinatura mensal de cada loja e que o owner consulte sua situacao, mantendo o status financeiro separado do bloqueio operacional.

### Modelagem

- Criados os enums `StoreBillingStatus` (`PAID`, `PENDING`, `OVERDUE`) e `StoreOperationalStatus` (`ACTIVE`, `SUSPENDED`).
- Criada `StoreBilling`, com uma configuracao por Store, valor mensal, dia de vencimento, proxima data calculada, periodo, ultimo pagamento e observacao.
- Criada `StoreBillingPayment`, com historico por Store, periodo, valor, data, observacao e `createdById`.
- `FinanceEntry` nao foi reutilizada porque representa o fluxo de caixa interno da loja.
- `Store.active` foi preservado e nao e sincronizado com a suspensao financeira.
- Criada a migration `20260704120000_add_store_billing`.

### SUPER_ADMIN

- Criada `/admin/dashboard/financeiro`, acessivel pelo dashboard administrativo.
- A tela lista todas as lojas e owners, permite busca e filtros por pago, pendente, atrasado e suspenso.
- O administrador pode configurar valor/vencimento/observacao, registrar pagamento, marcar pendencia/atraso e suspender/reativar.
- O registro de pagamento cria historico, atualiza periodo e ultimo pagamento e calcula o proximo vencimento quando existe `dueDay`.
- Uma loja suspensa pode ser reativada junto do registro do pagamento.
- Criadas APIs padronizadas em `/api/admin/billing/stores`, todas protegidas por `SUPER_ADMIN`.

### Loja

- Criada `/financeiro` com status financeiro e operacional, valor mensal, periodo, ultimo pagamento e proximo vencimento.
- Criada `GET /api/store/current/billing`, resolvendo a Store somente pela sessao/membership.
- Billing ainda nao configurado retorna `PENDING` e `ACTIVE` sem quebrar a tela.
- Adicionada `Minha assinatura` no menu lateral.
- Banners globais informam pendencia/atraso sem bloqueio e suspensao com aviso bloqueante.

### Bloqueio operacional

- A loja suspensa continua com acesso a login, dashboard, financeiro e logout.
- O middleware redireciona as demais paginas de gestao e devolve `403` nas APIs operacionais.
- `requireMembershipRole`, `requireStoreId` e `getCurrentStoreIdOrThrow` ganharam verificacao compartilhada de suspensao.
- A agenda publica nao retorna lojas suspensas.
- A resolucao das conexoes WhatsApp inbound/outbound ignora lojas suspensas, interrompendo bot, atendimento e envios automaticos.
- O `SUPER_ADMIN` e as APIs administrativas continuam acessiveis.

### Fora do MVP

- Pagamento online, gateway, Pix automatico, conciliacao bancaria e recorrencia.
- Atualizacao automatica de `PENDING` para `OVERDUE` por data.

### Validacao

- `yarn prisma generate`
- `yarn eslint`
- `yarn tsc --noEmit --pretty false --incremental false`
- `git diff --check`
- `yarn build`

A migration foi criada, mas deve ser aplicada separadamente no banco de cada ambiente antes do deploy.

### Ajuste de UX - proximo vencimento automatico

- O campo manual `nextDueAt` foi removido do payload e da modal de edicao da assinatura.
- O administrador informa somente `monthlyAmount`, `dueDay` e `notes`.
- O backend calcula `nextDueAt` usando `APP_TIMEZONE` e o helper de timezone existente, persistindo a data ao meio-dia local.
- Se o dia atual ainda nao passou do `dueDay`, o vencimento fica no mes atual; caso contrario, avanca para o proximo mes.
- `dueDay` continua limitado ao intervalo de 1 a 31.
- Quando o mes nao possui o dia configurado, o calculo usa seu ultimo dia valido.
- Quando `dueDay` e removido, `nextDueAt` tambem e limpo.
- Ao registrar pagamento, o proximo vencimento e calculado no ciclo seguinte ao periodo pago.
- A modal exibe a previa `Proximo vencimento calculado: DD/MM/AAAA`, mas o backend permanece como fonte de verdade.
- A tela `/financeiro` do owner continua mostrando o `nextDueAt` persistido, agora formatado no timezone de billing.

Como o projeto nao possui infraestrutura de testes automatizados, o helper foi validado isoladamente com estes casos:

- hoje 04/07/2026 e `dueDay = 5` resulta em 05/07/2026
- hoje 04/07/2026 e `dueDay = 3` resulta em 03/08/2026
- `dueDay = 31` em fevereiro de 2026 resulta em 28/02/2026
- `dueDay = 31` em fevereiro de 2028 resulta em 29/02/2028
- periodo pago `2026-07` com `dueDay = 5` resulta em 05/08/2026
- `dueDay = 32` e rejeitado
