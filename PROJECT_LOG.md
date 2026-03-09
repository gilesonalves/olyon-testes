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
