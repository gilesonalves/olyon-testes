# PROJECT_STATUS.md

**Data de ultima atualizacao:** 30 de marco de 2026

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
[x] Fase 2 da pagina `/agendamentos` com modal de slots, telefone mascarado e labels amigaveis
[x] Fase A da pagina `/agendamentos` com agenda diaria visual e filtros operacionais
[x] Fase B da pagina `/agendamentos` com refinamento visual, mobile adaptado e skeletons reais
[x] Refinamento desktop da agenda diaria com cards mais compactos e hierarquia operacional melhor
[x] Agenda desktop operacional com dialog de detalhes, remarcacao real e cancelamento por status
[x] Migracao desktop de `/agendamentos` para grade semanal de calendario
[x] Ajuste fino da grade semanal desktop com menos scroll horizontal e cards mais compactos
[x] Desktop de `/agendamentos` voltou para agenda diaria operacional com colunas por profissional
[x] POC desktop de `/agendamentos` com FullCalendar Standard usando apenas recursos gratuitos
[x] Cards de eventos do FullCalendar em `/agendamentos` refinados para leitura operacional real
[x] Visual do FullCalendar em `/agendamentos` aproximado do estilo classico do print de referencia
[x] Visualizacao mensal classica do FullCalendar adicionada em `/agendamentos`
[x] Visao mensal do FullCalendar refinada com celulas fixas e menos densidade visual
[x] Eventos do FullCalendar com tipografia maior, profissional visivel e sem borda externa duplicada
[x] Vista desktop de `/agendamentos` com opcao de grade em 3 dias e eventos com fundo mais leve
[x] Vista desktop de `/agendamentos` definida com `3 dias` como modo padrao
[x] Bloco textual acima da grade removido e eventos com contraste refinado em `/agendamentos`
[x] Container externo da agenda sem borda duplicada em `/agendamentos`
[x] Wrapper desktop da agenda sem padding lateral competindo com o radius do calendario
[x] Modal do agendamento com abas, remarcacao por slots e cancelamento logico em `/agendamentos`
[x] Laboratorio isolado `/agendamentos-lab` com FullCalendar Standard para validar layout sem acoplar ao fluxo real
[x] Fase 1 do financeiro: base de dominio Prisma com `FinanceEntry`
[x] Fase 2 do financeiro: validator e rota inicial GET/POST de lancamentos
[x] Fase 3 do financeiro: rota por id com PUT e DELETE
[x] Fase 4 do financeiro: tela de entradas-saidas integrada com API real
[x] Fase 5 do financeiro: contas-a-pagar integrada como visao real de despesas
[x] Fase 6 do financeiro: controle-pagamentos integrado como visao operacional de baixa
[x] Fase 6.1 do financeiro: backend de update ajustado para persistir `paidAt`
[x] Fase 7 do financeiro: edicao real de lancamentos em entradas-saidas
[x] Fase 8 do financeiro: resumo gerencial basico em entradas-saidas
[x] Fase 8.1 do financeiro: filtro por tipo e status visual coerente em entradas-saidas
[x] Fase 8.2 do financeiro: exclusao sem popup nativo e vencimento condicional em entradas-saidas
[x] Fase 8.3 do financeiro: status visual vencido por data em entradas-saidas
[x] Fase 8.4 do financeiro: cards pendentes e vencidas alinhados com vencimento por data
[x] Fase 8.5 do financeiro: modal de edicao com vencimento condicional
[x] Fase 8.6 do financeiro: responsivo mobile refinado na listagem de entradas-saidas
[x] Fase 6.2 do financeiro: filtros por status e periodo em controle-pagamentos
[x] Fase 9 do financeiro: card de resumo do dashboard integrado com dados reais
[x] Estrutura do app autenticado: cabecalho interno padronizado nas paginas sem HeaderPage
[x] Padronizacao de listagens: 10 itens iniciais com CTA Carregar mais
[x] Diagnostico temporario do financeiro: helper Prisma sem reuso global em desenvolvimento

---

## 1. Resumo executivo

O projeto Olyon (Next.js App Router + TypeScript + Prisma + NextAuth + Zod) possui hoje:

- CRUD real e multi-tenant de Usuarios, Servicos, Equipe e Eventos.
- Base de dominio multi-tenant do financeiro em Prisma com `FinanceEntry` (fase 1, sem CRUD/API/UI).
- APIs de horarios semanais e bloqueios de agenda persistidas em Prisma.
- Base de conversas WhatsApp com `Conversation`, `ConversationMessage`, `AppointmentDraft` e `Appointment`.
- Fluxo de bot via WhatsApp com menu inicial hibrido, selecao de servico, resolucao de profissional, sugestao ativa de horarios, escolha de horario por numero ou texto livre, confirmacao e criacao final do agendamento.
- Tela `/agendamentos` com POC desktop em FullCalendar Standard, visualizacao simplificada no mobile, skeletons reais e criacao/edicao guiadas por disponibilidade real.
- Laboratorio `/agendamentos-lab` com FullCalendar Standard usando dados mockados para validar layout e renderizacao em isolamento.
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

### C) WhatsApp / Agendamento

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
- [x] Idempotencia de inbound por `providerMessageId`
- [x] Sugestao de horarios proximos quando o slot pedido nao estiver disponivel
- [x] Seed oficial (`prisma/seed.ts`) com loja, servico, profissionais, agenda, bloqueio e appointment existente

### C.1) Painel / Agendamentos

- [x] `/agendamentos` com listagem real via `GET /api/appointments`
- [x] Criacao manual com revalidacao final da disponibilidade no `POST /api/appointments`
- [x] `GET /api/appointments/availability` usando a mesma engine central do WhatsApp
- [x] Modal de horarios disponiveis com selecao guiada de slot
- [x] Modal de horarios listando todos os slots validos da data escolhida
- [x] Status em PT-BR, origem amigavel e telefone formatado na interface
- [x] Agenda diaria visual com eixo de horarios e appointments posicionados por intervalo
- [x] Filtros de data e profissional na operacao do dia
- [x] Carregamento da agenda separado do carregamento tardio de servicos no formulario
- [x] Visual dos blocos refinado com melhor hierarquia, badge de status e densidade adaptativa
- [x] Layout mobile especifico por lista do dia para evitar quebra da timeline
- [x] Skeletons da pagina, agenda, formulario e modal de horarios
- [x] Cards desktop com largura mais contida, acento lateral mais forte e prioridade visual para horario/cliente
- [x] Blocos desktop clicaveis com dialog de detalhes do agendamento
- [x] `PUT /api/appointments/[id]` para editar, remarcar e cancelar por `status = CANCELED`
- [x] Remarcacao revalida disponibilidade ignorando o proprio appointment no conflito
- [x] Desktop migrado de timeline diaria para grade semanal inspirada em calendario
- [x] Navegacao semanal com `Semana anterior`, `Hoje` e `Proxima semana`
- [x] Cabecalho semanal com dias clicaveis para ancorar a data ativa da tela
- [x] Grade desktop com largura minima reduzida para diminuir scroll horizontal
- [x] Cards desktop com chip de horario, badge e paddings levemente mais compactos
- [x] Desktop voltou a usar agenda diaria como visao principal
- [x] Agenda diaria com colunas por profissional para leitura operacional do dia
- [x] Navegacao principal do desktop voltou para `Dia anterior`, `Hoje` e `Proximo dia`
- [x] POC desktop com FullCalendar Standard isolada em componente proprio e sem plugins premium
- [x] Toolbar do Olyon integrada a visualizacao `timeGridDay` e `timeGridWeek` da POC
- [x] Cards do FullCalendar refinados para nao quebrar em duracoes curtas e manter leitura de cliente, servico e status
- [x] Eventos do FullCalendar ajustados para um visual mais classico, com barras azuis simples e leitura direta
- [x] Modo `Mes` adicionado ao desktop de `/agendamentos` com grade classica por dias
- [x] Modo `Mes` refinado com menos texto por evento, altura estavel de celulas e visual mais neutro
- [x] Eventos da agenda com fonte ampliada, nome do profissional e remocao da borda duplicada do container
- [x] Modo `3 dias` adicionado ao desktop com navegacao por blocos de 3 dias e menor saturacao visual dos eventos
- [x] Modo `3 dias` assumido como visualizacao padrao do desktop em `/agendamentos`
- [x] Texto explicativo acima da grade removido e blocos da agenda com fundo mais suave e texto mais destacado
- [x] Moldura externa da agenda removida para evitar dupla borda com a grade do FullCalendar
- [x] Wrapper desktop sem `p-4`, preservando o radius do calendario sem criar faixa branca ao redor
- [x] Modal de detalhes com abas, remarcacao por slots validados e cancelamento logico por status
- [x] `/agendamentos-lab` com FullCalendar Standard em ambiente isolado e eventos mockados

### D) Financeiro (fase 1 - base Prisma)

- [x] Enum `FinanceEntryType` (`INCOME`, `EXPENSE`)
- [x] Enum `FinanceEntryStatus` (`PENDING`, `PAID`, `OVERDUE`)
- [x] Model central `FinanceEntry` com escopo obrigatorio por `storeId`
- [x] Relacao obrigatoria com `Store` e opcional com `User` (`createdById`)
- [x] Indices iniciais para consultas por loja, tipo, status e datas

### E) Financeiro (fase 2 - backend inicial)

- [x] Validator `FinanceEntryCreateSchema`
- [x] Validator `FinanceEntryUpdateSchema`
- [x] `GET /api/finance/entries` com escopo por loja ativa
- [x] `POST /api/finance/entries` com permissao minima `ADMIN`
- [x] Persistencia real de `FinanceEntry` com `storeId` protegido pelo backend

### F) Financeiro (fase 3 - rota por id)

- [x] `PUT /api/finance/entries/[id]` com permissao minima `ADMIN`
- [x] `DELETE /api/finance/entries/[id]` com permissao minima `ADMIN`
- [x] Validacao de pertencimento por `id + storeId`
- [x] Atualizacao parcial reutilizando `FinanceEntryUpdateSchema`
- [x] Exclusao protegida contra acesso cross-tenant

### G) Financeiro (fase 4 - entradas e saidas)

- [x] `/entradas-saidas` com listagem real via `GET /api/finance/entries`
- [x] `/entradas-saidas/novo` com criacao real via `POST /api/finance/entries`
- [x] Exclusao real na listagem via `DELETE /api/finance/entries/[id]`
- [x] Estados de loading, erro e vazio na tela
- [x] Remocao do mock principal da tela de entradas e saidas

### H) Financeiro (fase 5 - contas a pagar)

- [x] `/contas-a-pagar` com listagem real filtrada para `FinanceEntry.type = EXPENSE`
- [x] `/contas-a-pagar/novo` com criacao real de despesa via `POST /api/finance/entries`
- [x] Exibicao de vencimento e status na listagem
- [x] Exclusao real na listagem via `DELETE /api/finance/entries/[id]`
- [x] Estados de loading, erro e vazio na tela

### I) Financeiro (fase 6 - controle de pagamentos)

- [x] `/controle-pagamentos` com listagem real filtrada para `FinanceEntry.type = EXPENSE`
- [x] Exibicao operacional de vencimento, status e pago em
- [x] Acao `Marcar como pago` via `PUT /api/finance/entries/[id]`
- [x] Estados de loading, erro e vazio na tela
- [x] Remocao do mock principal da tela de controle de pagamentos

### J) Financeiro (fase 6.1 - backend da baixa)

- [x] `FinanceEntryUpdateSchema` aceita `paidAt`
- [x] `PUT /api/finance/entries/[id]` persiste `paidAt` quando enviado
- [x] Fluxo de baixa fica compativel com a UI ja entregue em `controle-pagamentos`
- [x] Isolamento por `id + storeId` mantido sem alteracoes estruturais

### J.1) Financeiro (fase 6.2 - filtros em controle de pagamentos)

- [x] `/controle-pagamentos` passa a ter filtro visual por status com `Todos`, `Pago` e `Nao pago`
- [x] `/controle-pagamentos` passa a ter filtro por `Data inicial` e `Data final`
- [x] Filtros sao combinados em memoria sobre a lista ja carregada
- [x] Comparacao de periodo usa normalizacao de data para reduzir ruido de timezone
- [x] Botao `Limpar periodo` restaura o intervalo sem alterar outras regras da tela

### K) Financeiro (fase 7 - edicao em entradas e saidas)

- [x] Acao `Editar` adicionada na listagem de `/entradas-saidas`
- [x] Fluxo simples de edicao em dialogo na propria tela
- [x] Reaproveitamento do schema local ja existente da UI
- [x] Integracao real com `PUT /api/finance/entries/[id]`
- [x] Criacao e exclusao mantidas funcionando sem regressao

### L) Financeiro (fase 8 - resumo em entradas e saidas)

- [x] Resumo financeiro basico calculado no frontend a partir de `GET /api/finance/entries`
- [x] Cards de entradas, saidas, saldo, pendentes e vencidas
- [x] Agregacao centralizada no controller local da tela
- [x] Reaproveitamento da carga ja existente sem endpoint novo

### L.1) Financeiro (fase 8.1 - filtro e apresentacao em entradas e saidas)

- [x] Filtro visual por tipo com opcoes `Todos`, `Entradas` e `Saídas`
- [x] Exibicao de `Receita` para itens `INCOME` sem alterar o valor persistido de `status`
- [x] Manutencao dos badges operacionais para despesas (`Pendente`, `Pago`, `Vencido`)
- [x] Tabela e cards de resumo refletindo o conjunto filtrado
- [x] Logica de filtro centralizada no controller local da tela

### L.2) Financeiro (fase 8.2 - UX de exclusao e vencimento condicional)

- [x] Exclusao em `/entradas-saidas` sem uso de `window.confirm`
- [x] Botao de exclusao manteve loading, disable e recarga da listagem
- [x] Campo `Vencimento` em `/entradas-saidas/novo` exibido apenas para `Saída`
- [x] Entradas seguem podendo ser salvas sem `dueDate`
- [x] Payload de criacao evita enviar `dueDate` para `Entrada`

### L.3) Financeiro (fase 8.3 - status visual vencido por data)

- [x] Tabela de `/entradas-saidas` passa a exibir `Vencido` para despesas nao pagas com `dueDate` anterior a hoje
- [x] Entradas continuam exibindo `Receita`
- [x] Despesas pagas continuam exibindo `Pago`
- [x] Despesas sem vencimento ou com vencimento futuro continuam exibindo `Pendente`
- [x] Mudanca restrita a apresentacao da UI, sem alteracao de persistencia

### L.4) Financeiro (fase 8.4 - cards alinhados com vencimento por data)

- [x] Card `Vencidas` passa a somar despesas nao pagas com `dueDate` anterior a hoje
- [x] Card `Pendentes` deixa de contar despesas que ja estao vencidas pela regra visual da tabela
- [x] Cards `Entradas`, `Saídas` e `Saldo` permanecem inalterados
- [x] Ajuste mantido no controller local, sem alteracao de backend ou persistencia

### L.5) Financeiro (fase 8.5 - modal de edicao com vencimento condicional)

- [x] Modal de edicao de `/entradas-saidas` exibe `Vencimento` apenas para `Saída`
- [x] Modal oculta `Vencimento` para `Entrada`
- [x] `dueDate` e limpo ao trocar o tipo para `Entrada`
- [x] Submit do modal evita enviar `dueDate` para `Entrada`
- [x] Fluxo de edicao permanece funcionando sem alteracao de backend

### L.6) Financeiro (fase 8.6 - responsivo mobile da listagem)

- [x] Listagem de `/entradas-saidas` fica organizada como cards em telas pequenas
- [x] Pares `label / valor` mantidos legiveis no mobile
- [x] Area de acoes passa a ocupar bloco proprio no final do item no mobile
- [x] Desktop preserva a tabela atual sem regressao visual
- [x] Ajuste restrito a classes responsivas e layout da listagem

### N) Financeiro (fase 9 - resumo real no dashboard)

- [x] Card `Resumo financeiro` do dashboard deixa de usar mock local
- [x] Componente consome `GET /api/finance/entries` respeitando a loja ativa
- [x] `Total do dia` calculado no frontend a partir de `transactionDate`
- [x] `Total do mes` calculado no frontend a partir de `transactionDate`
- [x] `Pagamentos pendentes` calculado no frontend para despesas com `status != PAID`
- [x] Estados de loading, erro e vazio tratados sem quebrar o layout do card

### M) Financeiro (diagnostico temporario do Prisma em runtime)

- [x] Helper central do Prisma mantido no client gerado em `generated/prisma/client`
- [x] Reuso de `globalThis.prisma` removido em desenvolvimento para diagnosticar instância stale
- [x] Adapter PostgreSQL e logs atuais preservados

### N) Padronizacao de listagens no frontend

- [x] Páginas de listagem passam a exibir inicialmente 10 itens
- [x] CTA `Carregar mais` adicionada quando existem mais registros locais já carregados
- [x] Filtros de telas já filtráveis resetam a quantidade visível para 10 ao mudar o critério
- [x] Empty states existentes foram preservados
- [x] Implementação mantida no frontend sem paginação por URL ou backend
- [x] Comportamento em producao mantido com cache global apenas quando necessario

### O) Estrutura de header nas paginas autenticadas

- [x] Páginas internas sem `HeaderPage` foram alinhadas ao padrão visual do app autenticado
- [x] O menu/navegação do sidebar volta a ficar acessível nessas telas via `SidebarTrigger`
- [x] Correção feita sem alterar autenticação, Prisma ou API
- [x] Listagens continuam com o padrão de 10 itens iniciais e `Carregar mais`

---

## 3. Regras de comportamento implementadas

- [x] Saudacao simples em `IDLE` abre com boas-vindas + menu
- [x] Intencao clara de agendar ignora o menu e vai direto para `CHOOSING_SERVICE`
- [x] Intencao de desmarcar/remarcar responde com fallback honesto
- [x] Intencao de informacoes responde com fallback seguro e objetivo
- [x] `conversation.context.mainMenuShown` evita repetir o menu completo em toda mensagem
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
- As opcoes 2 e 3 do menu ainda usam fallback honesto, porque desmarcar/remarcar e informacoes detalhadas de atendimento nao estao implementados neste canal.
- As sugestoes numeradas sao sempre revalidadas antes de salvar ou confirmar o slot, para evitar confirmar horario que ficou indisponivel.
- O seed oficial foi ajustado para nao deixar appointment antigo sem profissional bloqueando a loja inteira durante os testes.

---

## 5. Verificacoes realizadas

- [x] `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/appointments/availability.ts src/lib/bot/flow.ts src/lib/bot/types.ts prisma/seed.ts`
- [x] Smoke test local do flow com:
  - [x] `oi`
  - [x] `1`
  - [x] `2`
  - [x] `3`
  - [x] `quero agendar cabelo`
  - [x] fallback generico com `mainMenuShown = true`
  - [x] `CHOOSING_TIME` com escolha por numero
  - [x] `CHOOSING_TIME` com texto livre
  - [x] `CONFIRMING` com retorno para sugestoes via `NAO`

Observacao:

- `yarn tsc --noEmit --ignoreDeprecations 5.0` continua falhando por erros antigos fora do escopo desta entrega (`.next/dev/types`, `usuarios/controllers`, `auth-options`, `seed`, etc.), mas nao apontou erros novos nos arquivos desta feature.

---

## 6. Arquivos principais desta etapa

- `app/api/webhooks/whatsapp/route.ts`
- `src/lib/appointments/availability.ts`
- `src/lib/bot/flow.ts`
- `src/lib/bot/types.ts`
- `prisma/seed.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

---

## 7. Proximos passos

1. Implementar desmarcacao/remarcacao real no canal WhatsApp.
2. Disponibilizar dados reais de atendimento no menu de informacoes quando o produto tiver esses campos.
3. Coletar nome do cliente no fluxo WhatsApp antes da confirmacao final.
4. Evoluir disponibilidade por profissional para agendas individuais quando o produto suportar agenda propria por staff.
5. Limpar type errors e warnings antigos fora do escopo da feature.

---

## 8. Historico resumido

| Data | Mudanca |
|------|---------|
| 09/03/2026 | WhatsApp: sugestao ativa de horarios com escolha por numero em `CHOOSING_TIME` e seed minima real para teste fim a fim |
| 09/03/2026 | WhatsApp: entrada conversacional com boas-vindas, menu inicial hibrido e atalhos diretos em `IDLE` |
| 09/03/2026 | WhatsApp: selecao de profissional com auto-selecao, escolha por numero/nome e conflito de agenda por profissional |
| 09/03/2026 | WhatsApp: fluxo completo de agendamento com parse de data/hora, disponibilidade real, confirmacao e criacao de `Appointment` |
| 25/02/2026 | Eventos: CRUD real com servicos e melhoria no admin para senha inicial do owner |
| 20/02/2026 | Ajustes finais no CRUD de Usuarios |
| 19/02/2026 | CRUD de Usuarios com Perfil e Contatos |
