# PROJECT_STATUS.md

**Data de ultima atualizacao:** 02 de abril de 2026

## Status geral do projeto Olyon

### Estado atual

[x] CRUD de Clientes no codigo com UI, validacao e rotas dedicadas
[ ] Migracao Prisma de Clientes aplicada no banco de desenvolvimento
[x] CRUD de Usuarios  
[x] CRUD de Servicos  
[x] CRUD de Equipe  
[x] Tela redundante `/eventos` removida com Servicos como fonte principal para combinacoes
[x] Horarios semanais e bloqueios de agenda  
[x] Fluxo WhatsApp de agendamento ate a criacao do `Appointment`  
[x] Selecao de profissional no fluxo WhatsApp  
[x] Entrada conversacional com boas-vindas e menu inicial hibrido
[x] Sugestao ativa de horarios com escolha por numero no WhatsApp
[x] Massa minima real de seed para teste do fluxo WhatsApp
[x] Fase 2 da pagina `/agendamentos` com modal de slots, telefone mascarado e labels amigaveis
[x] Correcao do create manual em `/agendamentos` para datas futuras com payload seguro `date + time`
[x] Listagem de agendamentos por data em `/api/appointments?date=YYYY-MM-DD` com intervalo diario seguro
[x] Formulario de novo agendamento em `/agendamentos` simplificado sem campos visiveis de telefone e e-mail
[x] Scroll horizontal de multiplos profissionais isolado no container da agenda em `/agendamentos`
[x] Shell autenticado ajustado com `min-w-0` e `overflow-x-hidden` para manter filtros fixos e scroll so nas colunas da agenda
[x] Card visual de bloqueios ativos removido de `/agendamentos` sem alterar a regra de indisponibilidade
[x] `/agendamentos` com novo agendamento em modal com scroll interno e pre-preenchimento por slot/profissional
[x] Modal de novo agendamento em `/agendamentos` abre com profissional travado e servicos filtrados quando o slot vem da coluna dele
[x] Modal de `/agendamentos` com excecao explicita para registro retroativo sem liberar passado por padrao
[x] Modal retroativo de `/agendamentos` agora revela campos manuais de data/hora e mantem o CTA de salvar fixo fora da area rolavel
[x] Cancelamento em `/agendamentos` libera o slot corretamente e deixa de contar/renderizar appointments inativos na agenda
[x] `/agendamentos` com expediente individual por profissional, fallback seguro da loja e bloqueio por profissional
[x] `/agendamentos` com scroll vertical proprio em cada coluna e horario centralizado horizontalmente nas celulas
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
[x] `/agendamentos` refatorado para calendario mensal limpo com resumo por dia e sheet de detalhe
[x] `/agendamentos` refatorado novamente para agenda diaria operacional por profissional
[x] Regua visual de `/agendamentos` refinada para marcacoes principais de 15 minutos com cards posicionados por minuto real
[x] Cards de `/agendamentos` encaixados na malha da coluna com grid por linhas de 15 minutos
[x] Cards de `/agendamentos` mantidos sempre visiveis acima da malha e header da coluna simplificado com menu funcional
[x] Cards de `/agendamentos` reintegrados como itens diretos da grid da coluna, sem camada absoluta sobreposta
[x] Formulario de novo agendamento refinado com busca de clientes existentes, cadastro rapido inline e desbloqueio explicito de bloqueios ativos
[x] Mobile de `/agendamentos` refinado com grade mensal responsiva sem espremimento de 7 colunas
[x] Mobile de `/agendamentos` com 1 coluna abaixo de 420px e CTA para ver so dias com agendamento
[x] Modal de edicao de `/agendamentos` ajustado para telas pequenas e grade mensal ampla adiada para telas maiores
[x] Loading visual de `/agendamentos` e `/horarios-de-atendimento` com skeletons de rota e estados iniciais sem tela em branco
[x] Loading padronizado nas paginas principais com skeleton + texto curto em `/agendamentos`, `/horarios-de-atendimento`, `/usuarios` e `/equipe`
[x] Rota `/clientes` criada com base visual inicial e menu lateral ajustado com `Home -> /dashboard`
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

- CRUD real de Clientes implementado em codigo, separado do dominio de Usuarios do sistema.
- CRUD real e multi-tenant de Usuarios, Servicos e Equipe.
- Tela redundante `/eventos` removida da navegacao e da API; combinacoes como `corte + barba` permanecem cobertas por `Servicos`.
- Base de dominio multi-tenant do financeiro em Prisma com `FinanceEntry` (fase 1, sem CRUD/API/UI).
- APIs de horarios semanais e bloqueios de agenda persistidas em Prisma.
- Base de conversas WhatsApp com `Conversation`, `ConversationMessage`, `AppointmentDraft` e `Appointment`.
- Fluxo de bot via WhatsApp com menu inicial hibrido, selecao de servico, resolucao de profissional, sugestao ativa de horarios, escolha de horario por numero ou texto livre, confirmacao e criacao final do agendamento.
- Tela `/agendamentos` com calendario mensal limpo, resumo por dia, sheet de detalhe, skeletons reais e criacao/edicao guiadas por disponibilidade real.
- Tela `/agendamentos` agora com agenda diaria operacional por profissional como experiencia principal, preservando criacao, detalhe, edicao e disponibilidade reais.
- Criacao manual e remarcacao em `/agendamentos` agora trafegam `date + time`, montam `startAt/endAt` de forma explicita no backend e mantem a mesma engine de disponibilidade como fonte de verdade.
- `GET /api/appointments` agora aceita filtro por `date` e retorna o dia inteiro com intervalo seguro no timezone da agenda, evitando parse ambiguo no frontend.
- A agenda de `/agendamentos` agora respeita o expediente configurado de cada profissional, com fallback para o horario geral da loja quando nao houver configuracao individual.
- O formulario de novo agendamento saiu do topo da pagina e passou a abrir em modal com scroll interno, preservando o restante do layout.
- Quando o modal abre a partir da coluna de um profissional, ele trava esse profissional e mostra apenas os servicos ativos vinculados a ele.
- O modal de `/agendamentos` passou a ter uma opcao explicita para registrar atendimento ja realizado; sem marcar essa opcao, a trava de passado continua identica ao comportamento anterior.
- Quando essa excecao retroativa e marcada, o modal agora exibe campos manuais de data e hora e usa esse preenchimento no create sem depender do slot visual.
- `GET /api/appointments` e a montagem da agenda operacional passaram a considerar apenas statuses ativos, liberando o slot imediatamente apos cancelamento.
- A disponibilidade passou a considerar bloqueios globais da loja e bloqueios especificos do profissional na mesma engine central.
- Laboratorio `/agendamentos-lab` com FullCalendar Standard usando dados mockados para validar layout e renderizacao em isolamento.
- Respostas JSON consistentes, validacoes no servidor e escopo por loja.
- Seed oficial com massa minima idempotente para validar agenda, bloqueios, conflitos e equipe no canal WhatsApp.
- A aplicacao da migracao Prisma de `Client` no banco atual ficou pendente porque o ambiente de desenvolvimento ja estava com drift em relacao ao historico local de migrations.

---

## 2. Entregas concluidas

### A) CRUDs principais

- [x] Clientes com pagina real, formulario de novo/edicao e CRUD em `/api/clients`
- [x] Usuarios
- [x] Servicos
- [x] Equipe
- [x] Servicos permanecem como fonte unica para combinacoes operacionais

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
- [x] `GET /api/appointments?date=YYYY-MM-DD` lista corretamente os agendamentos do dia selecionado
- [x] Criacao manual com revalidacao final da disponibilidade no `POST /api/appointments`
- [x] Criacao manual e remarcacao trafegam `date + time` e montam `startAt/endAt` com parse explicito no backend
- [x] `GET /api/appointments/availability` usando a mesma engine central do WhatsApp
- [x] Agenda visual por profissional respeitando expediente individual quando configurado
- [x] Colunas com scroll vertical proprio e board horizontal preservado
- [x] Novo agendamento abrindo em modal com scroll interno no lugar do formulario inline
- [x] Novo agendamento abrindo pela coluna de um profissional com esse profissional pre-selecionado e travado no modal
- [x] Lista de servicos do modal filtrada pelos servicos reais do profissional quando o fluxo parte da coluna dele
- [x] Create e update de appointments aceitando `allowPastScheduling` apenas como excecao explicita
- [x] Modo retroativo do modal revelando `date + time` manual e permitindo submit sem depender de slot escolhido
- [x] Agenda, contadores e cards de `/agendamentos` ignorando `CANCELED`, `DONE` e `NO_SHOW` como ocupacao ativa
- [x] Bloqueio por loja e bloqueio por profissional coexistindo na mesma validacao final do slot
- [x] Modal de horarios disponiveis com selecao guiada de slot
- [x] Modal de horarios listando todos os slots validos da data escolhida
- [x] Respostas de slots e appointments incluem `date`, `startTime` e `endTime` para reduzir dependencia de parse local ambiguo
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
- [x] Desktop e mobile de `/agendamentos` unificados em calendario mensal limpo com selecao de dia
- [x] Dias do calendario com contador, resumo curto e destaque de hoje/selecionado/fora do mes
- [x] Sheet lateral com lista cronologica dos agendamentos do dia e empty state consistente
- [x] Mobile do calendario mensal adaptado para cards de dias em 2 colunas no mes atual
- [x] Mobile do calendario mensal ajustado para 1 coluna em telas muito estreitas e filtro rapido de dias com agendamento
- [x] Modal de detalhes/edicao com rodape empilhado no mobile e calendario em cards ate telas intermediarias
- [x] `loading.tsx` em `/agendamentos` com skeleton visual da navegacao e do calendario mensal
- [x] `loading.tsx` em `/horarios-de-atendimento` com skeleton visual da semana e da listagem de bloqueios
- [x] `/horarios-de-atendimento` usando skeleton interno no carregamento inicial dos controllers
- [x] Skeletons de `/agendamentos` e `/horarios-de-atendimento` com texto curto de carregamento embutido
- [x] `/usuarios` e `/equipe` com skeleton interno no primeiro carregamento client-side
- [x] `loading.tsx` complementar criado para `/usuarios` e `/equipe`
- [x] Componente reutilizavel de skeleton para paginas de listagem administrativas
- [x] Sidebar com grupo `Home` apontando para `/dashboard`
- [x] Item `Clientes` corrigido para `/clientes` sem desvio para dashboard
- [x] `/clientes` criada com estrutura visual inicial consistente baseada na organizacao de `/usuarios`
- [x] `/agendamentos` voltou a priorizar a leitura operacional do dia com colunas por profissional e eixo de horarios
- [x] Clique em bloco da agenda abre o detalhe existente e clique em area vazia preenche novo agendamento com data, horario e profissional
- [x] Blocos da grade diaria ampliados para exibir mais informacoes e ocupar visualmente a faixa horaria como agenda operacional classica
- [x] Estrutura visual de `/agendamentos` corrigida para varias mini agendas independentes, uma por profissional, sem regua global compartilhada
- [x] `/clientes` evoluida para listagem real, loading padronizado e fluxo de novo/edicao exclusivo do dominio de clientes
- [x] `ClientForm` reutilizavel com mascara de CPF/telefone, genero, observacoes e status ativo
- [x] `GET/POST/PUT/DELETE` de clientes com `storeId` protegido no backend e validacao por Zod
- [ ] Migracao Prisma do model `Client` aplicada no banco de desenvolvimento atual

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
- O create manual falhava para datas futuras porque a tela limpava o slot escolhido quando `selectedDate` ficava diferente da data buscada no modal; agora a selecao sincroniza a data da tela e o backend recebe `date + time`.
- A listagem operacional por data deixou de depender apenas de filtro client-side em `new Date(iso)` e passou a usar `GET /api/appointments?date=...` com intervalo diario seguro no timezone configurado.
- O card visual de bloqueios ativos do dia saiu da UI de `/agendamentos`, mas os bloqueios continuam sendo carregados para o dialog e a indisponibilidade continua sendo validada pela engine do backend.
- Foi adicionada modelagem minima para expediente por profissional e o banco local recebeu a migration aditiva correspondente via `prisma db execute`.
- `/horarios-de-atendimento` agora permite alternar entre o expediente da loja e o expediente de um profissional especifico sem trocar a base de rotas.
- O `POST /api/appointments` e o `GET /api/appointments/availability` continuam sendo a validacao final de elegibilidade do profissional para o servico, mesmo com o filtro aplicado no modal.
- A trava de passado continua centralizada no backend; a unica excecao nova e o campo explicito `allowPastScheduling` enviado pelo modal quando o usuario marca o registro retroativo.
- O refinamento do modal retroativo manteve o layout geral e moveu o CTA de salvar para fora da area rolavel, evitando corte visual em alturas menores.
- O cancelamento ja persistia `CANCELED`; a correcao desta etapa ficou em filtrar apenas statuses ativos na agenda e revalidar a lista do dia apos salvar/cancelar.

---

## 5. Verificacoes realizadas

- [x] `yarn eslint app/api/webhooks/whatsapp/route.ts src/lib/appointments/availability.ts src/lib/bot/flow.ts src/lib/bot/types.ts prisma/seed.ts`
- [x] `yarn eslint app/api/appointments/route.ts app/api/appointments/[id]/route.ts app/api/appointments/availability/route.ts src/lib/validators/appointment.ts app/(app)/agendamentos/page.tsx app/(app)/agendamentos/components/professional-schedule-board.tsx app/(app)/agendamentos/components/professional-schedule-column.tsx app/(app)/agendamentos/components/appointment-card.tsx`
- [x] `yarn tsc --noEmit --pretty false --incremental false --ignoreDeprecations 5.0`
- [x] `yarn prisma generate`
- [x] `yarn prisma db execute --file prisma/migrations/20260401143000_add_professional_schedule_and_blocks/migration.sql`
- [x] `yarn eslint app/(app)/agendamentos/page.tsx app/(app)/agendamentos/components/professional-schedule-board.tsx app/(app)/agendamentos/components/professional-schedule-column.tsx app/(app)/horarios-de-atendimento/page.tsx app/(app)/horarios-de-atendimento/controllers/useWeekScheduleFormController.ts app/api/team/route.ts app/api/schedule/weekly/route.ts app/api/schedule/blocked/route.ts app/api/schedule/blocked/[id]/route.ts src/lib/appointments/availability.ts src/lib/validators/schedule.ts`
- [x] `yarn eslint app/(app)/agendamentos/page.tsx`
- [x] `yarn eslint app/(app)/agendamentos/page.tsx app/api/appointments/route.ts app/api/appointments/[id]/route.ts src/lib/validators/appointment.ts`
- [x] `yarn eslint app/(app)/agendamentos/page.tsx`
- [x] `yarn eslint app/api/appointments/route.ts app/(app)/agendamentos/page.tsx`
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

- O `tsc` continua falhando por erros antigos fora do escopo em `.next/dev/types/validator.ts`, `app/(app)/contas-a-pagar/novo/page.tsx`, `app/(app)/usuarios/controllers/index.tsx`, `src/components/ui/app-sidebar.tsx`, `src/lib/auth-options.ts` e `src/scripts/seed.ts`, mas nao apontou erro novo nos arquivos ajustados do fluxo de agendamentos.
- `yarn tsc --noEmit --ignoreDeprecations 5.0` continua falhando por erros antigos fora do escopo desta entrega (`.next/dev/types`, `usuarios/controllers`, `auth-options`, `seed`, etc.), mas nao apontou erros novos nos arquivos desta feature.

## 5.1 Ajuste atual - confirmacao de bloqueio com appointments conflitantes

- `POST /api/schedule/blocked` agora detecta appointments ativos no intervalo antes de criar o bloqueio, respeitando `storeId` da sessao, escopo global da loja e escopo por profissional.
- Quando ha conflito e o payload ainda nao traz decisao, a API responde com `409`, `code = APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION`, contagem e resumo dos appointments afetados para a UI pedir confirmacao explicita.
- O payload de criacao passou a aceitar `conflictAction` com `KEEP_EXISTING_APPOINTMENTS` ou `CANCEL_CONFLICTING_APPOINTMENTS`.
- Com `KEEP_EXISTING_APPOINTMENTS`, o bloqueio e criado sem cancelar appointments existentes; com `CANCEL_CONFLICTING_APPOINTMENTS`, o bloqueio e criado e os appointments conflitantes sao cancelados em lote com o status real `CANCELED`.
- O modal de bloqueio de `/agendamentos` foi mantido e ganhou apenas um `AlertDialog` de confirmacao para o caso de conflito, sem redesenho da tela.
- O modal de bloqueio de `/agendamentos` teve o container ajustado para deixar o rodape fixo fora da area rolavel, evitando corte dos CTAs em alturas menores.
- O modal de bloqueio de `/horarios-de-atendimento` recebeu o mesmo fluxo seguro de confirmacao e passou a expor explicitamente o escopo do bloqueio para preservar criacao/edicao por loja ou por profissional.

Arquivos alterados neste ajuste:

- `app/api/schedule/blocked/route.ts`
- `src/lib/validators/schedule.ts`
- `app/(app)/agendamentos/page.tsx`
- `app/(app)/horarios-de-atendimento/page.tsx`
- `app/(app)/horarios-de-atendimento/controllers/useBlockedScheduleFormController.ts`
- `app/(app)/horarios-de-atendimento/controllers/useBlockedScheduleListController.ts`
- `app/(app)/horarios-de-atendimento/types.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn eslint app/api/schedule/blocked/route.ts src/lib/validators/schedule.ts app/(app)/agendamentos/page.tsx app/(app)/horarios-de-atendimento/page.tsx app/(app)/horarios-de-atendimento/controllers/useBlockedScheduleFormController.ts app/(app)/horarios-de-atendimento/controllers/useBlockedScheduleListController.ts app/(app)/horarios-de-atendimento/types.ts`
- [x] `yarn tsc --noEmit --pretty false --incremental false --ignoreDeprecations 5.0` continua falhando por erros antigos fora do escopo em `.next/dev/types/validator.ts`, `.next/types/validator.ts`, `app/(app)/contas-a-pagar/novo/page.tsx`, `app/(app)/usuarios/controllers/index.tsx`, `src/components/ui/app-sidebar.tsx`, `src/lib/auth-options.ts` e `src/scripts/seed.ts`, sem novo erro apontado nos arquivos deste ajuste

Proximo passo sugerido:

- Cobrir o `POST /api/schedule/blocked` com teste de integracao para os cenarios sem conflito, com `KEEP_EXISTING_APPOINTMENTS` e com `CANCEL_CONFLICTING_APPOINTMENTS`.

## 5.2 Ajuste atual - agenda publica por link da loja

- A rota publica `/agenda/[slug]` foi criada para agendamento online sem login, resolvendo a loja ativa pelo `slug`.
- A pagina publica mostra dados reais da loja, servicos ativos e profissionais com servicos ativos vinculados.
- Foram criadas APIs publicas para:
  - carregar dados da agenda publica da loja por `slug`
  - consultar horarios reais disponiveis por `serviceId`, `staffMembershipId` e data
  - concluir o agendamento final via `POST` sem receber `storeId` no payload
- A disponibilidade publica reaproveita a mesma engine central de `src/lib/appointments/availability.ts`, considerando expediente, bloqueios, duracao do servico, conflitos com appointments, profissional e timezone.
- A criacao final do agendamento agora usa o helper compartilhado `src/lib/appointments/create.ts`, reaproveitado tambem pelo `POST /api/appointments` do painel.
- O `POST` final da agenda publica revalida o slot antes de persistir e retorna erro legivel se o horario tiver sido ocupado entre a listagem e a confirmacao.
- O `Appointment` publico e persistido com `source: "WEB"` e metadata de origem do link publico.

Arquivos alterados neste ajuste:

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

Validacao executada neste ajuste:

- [x] `yarn eslint src/lib/validators/appointment.ts src/lib/appointments/create.ts src/lib/public-booking.ts app/api/appointments/route.ts app/api/public/agenda/[slug]/route.ts app/api/public/agenda/[slug]/availability/route.ts app/api/public/agenda/[slug]/appointments/route.ts app/agenda/[slug]/page.tsx app/agenda/[slug]/public-booking-page.tsx`
- [x] `yarn tsc --noEmit --pretty false --incremental false --ignoreDeprecations 5.0` continua falhando por erros antigos fora do escopo em `.next/dev/types/validator.ts`, `.next/types/validator.ts`, `app/(app)/contas-a-pagar/novo/page.tsx`, `app/(app)/usuarios/controllers/index.tsx`, `src/components/ui/app-sidebar.tsx`, `src/lib/auth-options.ts` e `src/scripts/seed.ts`, sem novo erro apontado nos arquivos desta feature

Proximo passo sugerido:

- Cobrir a agenda publica com teste de integracao para `GET` de disponibilidade e `POST` final em slot valido e slot ja ocupado.

## 5.3 Ajuste atual - compatibilidade Next 16 em handler dinamico de admin

- `app/api/admin/[id]/route.ts` foi alinhado ao contrato de `Route Handler` esperado pelo Next 16, trocando `context.params` sincrono por `params: Promise<{ id: string }>` com `await params`.
- Foi feita varredura nos `route.ts` dinamicos em `app/api` para localizar assinaturas antigas semelhantes; o unico caso confirmado no fonte atual era `app/api/admin/[id]/route.ts`.
- Foi feita varredura preventiva por `page.tsx` em pastas de `controllers`, `helpers` e `hooks`; nao ha `page.tsx` fonte ativo nesses diretórios neste momento.
- O erro antigo de `.next/.../equipe/controllers/page` nao corresponde mais a um arquivo fonte real e deixou de bloquear o build apos a nova compilacao.
- Depois da correcao do handler dinamico, `yarn build` passou a falhar no proximo erro raiz real em `app/(app)/contas-a-pagar/novo/page.tsx:33`, fora do escopo desta correção.

Arquivos alterados neste ajuste:

- `app/api/admin/[id]/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn eslint app/api/admin/[id]/route.ts`
- [x] `yarn build` agora avanca alem do erro de `app/api/admin/[id]/route.ts` e falha no proximo erro raiz em `app/(app)/contas-a-pagar/novo/page.tsx:33`

Proximo passo sugerido:

- Corrigir o payload tipado em `app/(app)/contas-a-pagar/novo/page.tsx`, onde `type: "EXPENSE"` nao existe em `FinanceExpenseCreatePayload`.

## 5.4 Ajuste atual - saneamento em cadeia do build ate `yarn build` concluir

- O erro tipado de `app/(app)/contas-a-pagar/novo/page.tsx` foi corrigido removendo `type: "EXPENSE"` do payload de `createEntry`, porque `FinanceExpenseCreatePayload` real ja injeta esse tipo no controller.
- No mesmo arquivo, o campo `dueDate` passou a normalizar `null` para `""` antes de chegar ao `<Input type="date" />`, evitando quebra de build por `value` invalido.
- `app/(app)/usuarios/controllers/index.tsx` foi alinhado ao schema real de usuarios, trocando o import antigo de `formSchema` por `userFormCreateSchema` e ajustando `contacts` para `NonNullable<...>[number]`.
- `src/components/ui/app-sidebar.tsx` recebeu tipagem explicita para os itens da navegacao, preservando o uso de `isActive` sem erro de inferencia.
- `src/lib/auth-options.ts` parou de propagar `globalRole: null` no retorno de `authorize`, alinhando o tipo local ao `User` declarado em `types/next-auth.d.ts`.
- `src/scripts/seed.ts` foi atualizado para criar `User` com `password` hashado, compatibilizando o script com o model Prisma atual.
- `tsconfig.json` voltou a usar `ignoreDeprecations: "5.0"`, valor suportado pelo TypeScript 5.9 do projeto; antes disso o `next build` ja falhava por configuracao invalida.
- `app/(auth)/login/page.tsx` passou a encapsular a leitura de `useSearchParams()` em `Suspense`, eliminando o erro de prerender do App Router em `/login`.
- Depois dessa cadeia de correcao, `yarn build` conclui com sucesso na branch atual.

Arquivos alterados neste ajuste:

- `app/(app)/contas-a-pagar/novo/page.tsx`
- `app/(app)/usuarios/controllers/index.tsx`
- `src/components/ui/app-sidebar.tsx`
- `src/lib/auth-options.ts`
- `src/scripts/seed.ts`
- `app/(auth)/login/page.tsx`
- `tsconfig.json`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn eslint app/(app)/contas-a-pagar/novo/page.tsx`
- [x] `yarn eslint app/(app)/usuarios/controllers/index.tsx`
- [x] `yarn eslint src/components/ui/app-sidebar.tsx`
- [x] `yarn eslint src/lib/auth-options.ts`
- [x] `yarn eslint src/scripts/seed.ts`
- [x] `yarn eslint app/(auth)/login/page.tsx`
- [x] `yarn build`

Observacoes remanescentes:

- O build ainda emite warnings nao bloqueantes sobre `baseline-browser-mapping` desatualizado.
- O build ainda emite warning de root inferido por haver `package-lock.json` no diretÃ³rio pai e `yarn.lock` no projeto.
- O build ainda emite warning deprecando `middleware` em favor de `proxy`.

Proximo passo sugerido:

- Tratar os warnings nao bloqueantes do build, com prioridade para a migracao de `middleware` para `proxy` e para a configuracao explicita de `turbopack.root`.

---

## 6. Arquivos principais desta etapa

- `app/api/webhooks/whatsapp/route.ts`
- `app/api/appointments/route.ts`
- `app/api/appointments/[id]/route.ts`
- `app/api/appointments/availability/route.ts`
- `app/api/appointments/route.ts`
- `app/api/appointments/[id]/route.ts`
- `app/api/schedule/weekly/route.ts`
- `app/api/schedule/blocked/route.ts`
- `app/api/schedule/blocked/[id]/route.ts`
- `app/api/team/route.ts`
- `src/lib/validators/appointment.ts`
- `src/lib/validators/schedule.ts`
- `app/(app)/agendamentos/page.tsx`
- `app/(app)/agendamentos/components/professional-schedule-board.tsx`
- `app/(app)/agendamentos/components/professional-schedule-column.tsx`
- `app/(app)/agendamentos/components/appointment-card.tsx`
- `app/(app)/horarios-de-atendimento/page.tsx`
- `app/(app)/horarios-de-atendimento/controllers/useWeekScheduleFormController.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260401143000_add_professional_schedule_and_blocks/migration.sql`
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
5. Cobrir create manual, remarcacao, listagem por data, bloqueio com conflito de appointments e agenda publica com testes automatizados de integracao.
6. Limpar type errors e warnings antigos fora do escopo da feature, com prioridade para os erros que ainda travam `yarn build`.

---

## 8. Historico resumido

| Data | Mudanca |
|------|---------|
| 02/04/2026 | Build: cadeia de correcoes em `contas-a-pagar/novo`, `usuarios/controllers`, `app-sidebar`, `auth-options`, `src/scripts/seed.ts`, `tsconfig.json` e `/login` fez o `yarn build` voltar a concluir com sucesso |
| 02/04/2026 | Build: `app/api/admin/[id]/route.ts` foi ajustado para o contrato de handler dinamico do Next 16 e o proximo erro raiz do build passou a ser `app/(app)/contas-a-pagar/novo/page.tsx:33` |
| 02/04/2026 | Agenda publica: rota `/agenda/[slug]` com dados reais da loja, servicos ativos, profissionais elegiveis, slots reais e criacao final de `Appointment` com `source = WEB` |
| 02/04/2026 | Agenda: criacao de bloqueio agora detecta appointments conflitantes, exige confirmacao explicita para manter ou cancelar atendimentos e persiste a decisao no backend |
| 01/04/2026 | Agenda: create manual passou a aceitar datas futuras com `date + time`, listagem por data foi movida para `GET /api/appointments?date=...` e a UI deixou de depender de parse local ambiguo |
| 09/03/2026 | WhatsApp: sugestao ativa de horarios com escolha por numero em `CHOOSING_TIME` e seed minima real para teste fim a fim |
| 09/03/2026 | WhatsApp: entrada conversacional com boas-vindas, menu inicial hibrido e atalhos diretos em `IDLE` |
| 09/03/2026 | WhatsApp: selecao de profissional com auto-selecao, escolha por numero/nome e conflito de agenda por profissional |
| 09/03/2026 | WhatsApp: fluxo completo de agendamento com parse de data/hora, disponibilidade real, confirmacao e criacao de `Appointment` |
| 25/02/2026 | Eventos: CRUD real com servicos e melhoria no admin para senha inicial do owner |
| 20/02/2026 | Ajustes finais no CRUD de Usuarios |
| 19/02/2026 | CRUD de Usuarios com Perfil e Contatos |
