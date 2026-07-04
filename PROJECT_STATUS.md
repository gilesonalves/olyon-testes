# PROJECT_STATUS.md

**Data de ultima atualizacao:** 1 de julho de 2026

## Status geral do projeto Olyon

### Estado atual

[x] CRUD de Clientes no codigo com UI, validacao e rotas dedicadas
[ ] Migracao Prisma de Clientes aplicada no banco de desenvolvimento
[x] CRUD de Usuarios  
[x] Login Credentials com diagnostico seguro e gerenciamento admin de dados/senha do owner atual
[x] CRUD de Servicos  
[x] CRUD de Equipe  
[x] Tela redundante `/eventos` removida com Servicos como fonte principal para combinacoes
[x] Horarios semanais e bloqueios de agenda  
[x] Fluxo WhatsApp de agendamento ate a criacao do `Appointment`  
[x] MVP de lembretes automaticos WhatsApp 1h/15min com outbox persistente, template Meta e cron protegido
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
[x] Expediente semanal consolidado com validacao de profissional dentro da loja e agenda sem heranca automatica
[x] `/agendamentos` com scroll vertical proprio em cada coluna e horario centralizado horizontalmente nas celulas
[x] Fase A da pagina `/agendamentos` com agenda diaria visual e filtros operacionais
[x] Fase B da pagina `/agendamentos` com refinamento visual, mobile adaptado e skeletons reais
[x] Refinamento desktop da agenda diaria com cards mais compactos e hierarquia operacional melhor
[x] Agenda desktop operacional com dialog de detalhes, remarcacao real e cancelamento por status
[x] `/agendamentos` com status real por badge, filtro e acoes rapidas usando `AppointmentStatus`
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
[x] Dashboard `/dashboard` com labels financeiros alinhados ao dominio real de Entradas/Saidas, Contas a Pagar e Controle de Pagamentos
[x] Dashboard `/dashboard` com proximos agendamentos reais da loja e acoes rapidas revisadas
[x] Dashboard `/dashboard` com card `Status da agenda` alimentado por slots reais da store atual
[x] `Entradas/Saidas > Novo` com autocomplete discreto de categorias por tipo e digitacao livre preservada
[x] Indicador flutuante de desenvolvimento do Next removido da interface para nao obstruir a sidebar
[x] Prisma Client padronizado em `src/lib/prisma`, com `prisma generate` antes do `next build` para Vercel resolver `generated/prisma/client`
[x] Build TypeScript liberado com narrowing seguro do conflito manual de agendamento e ajuste de `ignoreAppointmentId`
[x] `/horarios-de-atendimento` com selects revisados para mobile, usando dropdown mais controlado e confortavel
[x] `/agendamentos` com selects e filtros mobile alinhados ao painel discreto do campo de busca de cliente
[x] Dados publicos da `Store` com `/configuracoes/loja` como tela principal e `/agenda-online` como hub do link publico
[x] Agenda online publica com selects e data mobile ajustados para dropdown/calendario compactos
[x] Confirmacao da agenda publica com CTAs condicionais de mapa e WhatsApp usando dados da `Store`
[x] `/agendamentos` exibindo na grade apenas profissionais com expediente proprio configurado na data
[x] `/agendamentos` com loading da board separado do estado vazio real
[x] Estrutura do app autenticado: cabecalho interno padronizado nas paginas sem HeaderPage
[x] Padronizacao de listagens: 10 itens iniciais com CTA Carregar mais
[x] Diagnostico temporario do financeiro: helper Prisma sem reuso global em desenvolvimento
[x] Fluxo real de desmarcar/remarcar agendamento no WhatsApp
[x] Opcao 3 do WhatsApp com dados reais da `Store` quando cadastrados
[x] UI/admin minima para editar informacoes publicas da `Store`
[x] Infraestrutura base multi-tenant de conexao WhatsApp/Meta por `Store`
[x] Webhook Meta com verificacao `GET` e inbound real `POST`
[x] Roteamento inbound nativo por `phoneNumberId`
[x] Onboarding/admin minimo da `WhatsAppConnection` por `Store`
[x] Base tecnica do Cadastro Incorporado WhatsApp/Meta implementada na tela autenticada da loja
[x] `/configuracoes/whatsapp` refinada para visao simples da loja com status amigavel e CTA de conexao
[x] Diagnostico tecnico da `WhatsAppConnection` restrito a `SUPER_ADMIN`, sempre vinculado a uma `Store` da sessao atual
[ ] Validacao real de coexistencia via Embedded Signup pendente de aprovacao final da Meta
[x] Envio outbound real de texto via Meta Graph API usando a `WhatsAppConnection` da loja
[x] Teste real store-scoped da conexao Meta/WhatsApp atual da loja
[x] Check real da conexao Meta/WhatsApp alinhado ao endpoint `GET /v25.0/{phoneNumberId}` ja validado externamente
[x] Tela minima `/configuracoes/whatsapp/templates` criada para demonstrar templates WhatsApp no App Review da Meta
[x] Endpoints store-scoped para listar templates WhatsApp e enviar template de teste via Graph API `v25.0`
[x] Templates WhatsApp com placeholders nomeados (`{{customer_name}}`, `{{appointment_date}}`, `{{order_id}}`) suportados na UI e no envio para a Cloud API
[x] Aba oficial `/atendimento` criada no app autenticado para inbox humano WhatsApp
[x] Middleware protege `/atendimento` como rota autenticada do app da loja
[x] Inbox WhatsApp inicial lista conversas reais da loja atual e historico de `ConversationMessage`
[x] Envio manual de texto livre pela Cloud API usando `sendMetaTextMessage`, com persistencia `ConversationMessage OUT`
[x] Envio manual em `/atendimento` pausa automaticamente o bot com `state = PAUSED` e badge `HUMANO`
[x] Inicio de atendimento humano em `/atendimento` envia aviso automatico uma unica vez ao cliente quando a conversa ainda nao estava `PAUSED`
[x] Configuracoes do Bot por loja com `BotSettings`, API store-scoped e UI em `/configuracoes/bot`
[x] `/atendimento` exibe o ativo WhatsApp conectado sem expor `accessToken`
[x] `/atendimento` mostra aviso da janela de atendimento de 24h para mensagens livres
[x] Pausa operacional do chatbot WhatsApp por palavra-chave com estado `PAUSED`
[x] Matcher de pausa do chatbot WhatsApp ampliado para frases naturais de handoff humano
[x] Fluxo WhatsApp com timeout por inatividade, encerrar atendimento, voltar etapa e voltar ao menu
[x] Fluxo WhatsApp guiado por etapas com menu, servico, profissional, dia, horario e confirmacao
[x] Mensagens interativas oficiais da Meta no WhatsApp com fallback por texto livre e numero
[x] Conversas WhatsApp pausadas por handoff humano agora podem ser retomadas por endpoint store-scoped ou por comando do cliente
[x] Refino textual do fluxo WhatsApp com PT-BR revisado, datas sem "primeiro horario" e sem indicadores visuais de etapa
[x] Servicos com preco real persistido em `Decimal?`, CRUD de `/servicos` atualizado e migration segura sem backfill fake
[x] Menu inicial do WhatsApp com `Agendar horário`, `Meus agendamentos`, `Preços` e `Informações`
[x] Opção `Preços` no WhatsApp usando serviços ativos reais com preço em BRL e paginação simples
[x] Regressão do bot silencioso no WhatsApp corrigida com logs temporários de actions, normalização por `selectedOptionId` e fallback de outbound em branches vazias
[x] Embedded Signup agora assina automaticamente a WABA no app Meta via `/{businessAccountId}/subscribed_apps`
[x] Rota `POST /api/admin/stores/{storeId}/whatsapp/subscribe-webhook` criada para reassinar conexoes existentes com acesso restrito a `SUPER_ADMIN`
[x] Loja Teste Meta reassinada com sucesso; mensagens reais chegam ao webhook e o bot responde
[x] Webhook trata `smb_message_echoes` e pausa o bot quando a loja responde manualmente pelo WhatsApp Business ou dispositivo vinculado
[x] Echo com `providerMessageId` ja persistido pelo Olyon e ignorado para nao pausar o bot por mensagem propria
[x] Pausa por atendimento humano validada no painel Olyon, WhatsApp Business/celular e WhatsApp Web/Desktop
[x] Conversa `PAUSED` retoma automaticamente no proximo inbound apos 30 minutos sem movimentacao
[ ] Teste forcado pendente: envelhecer `lastMessageAt` de uma conversa de teste e confirmar retomada por inatividade

---

## 1. Resumo executivo

O projeto Olyon (Next.js App Router + TypeScript + Prisma + NextAuth + Zod) possui hoje:

- CRUD real de Clientes implementado em codigo, separado do dominio de Usuarios do sistema.
- CRUD real e multi-tenant de Usuarios, Servicos e Equipe.
- Tela redundante `/eventos` removida da navegacao e da API; combinacoes como `corte + barba` permanecem cobertas por `Servicos`.
- Base de dominio multi-tenant do financeiro em Prisma com `FinanceEntry` (fase 1, sem CRUD/API/UI).
- Dashboard `/dashboard` agora usa dados reais da loja para proximos agendamentos e resumo financeiro agregado no servidor, com acoes rapidas apontando para as telas corretas.
- O card `Resumo financeiro` do dashboard agora nomeia os indicadores conforme o dominio real: saldos liquidos por `transactionDate` em Entradas/Saidas e despesas nao pagas das areas Contas a Pagar / Controle de Pagamentos.
- O card `Status da agenda` do dashboard agora usa contagem real de slots livres e bloqueados de hoje, com base em slots de 15 min por profissional.
- O formulario `Entradas/Saidas > Novo` agora sugere categorias por tipo (`Entrada` ou `Saida`) com base local adaptada do Glaavo em um autocomplete discreto, sem fechar o campo nem restringir o backend.
- O indicador visual de desenvolvimento do Next foi desativado globalmente para nao sobrepor a sidebar e o botao de logout durante o uso local.
- A tela `/horarios-de-atendimento` agora usa selects com dropdown controlado para o escopo do expediente e o escopo de bloqueio, com largura e interacao melhores em mobile.
- Os selects de `/agendamentos` agora usam o mesmo padrao visual discreto do painel de busca de cliente, substituindo menus nativos pesados em filtros, formularios e bloqueios.
- O link publico de agendamento continua lendo apenas a `Store`, mas a manutencao principal dos dados institucionais agora acontece em `/configuracoes/loja`; `/agenda-online` virou um hub simples do canal publico.
- A agenda online publica deixou de depender de `select` e `input[type=date]` nativos no fluxo principal, usando dropdowns e calendario compactos para evitar overlays grandes no mobile.
- A confirmacao da agenda publica agora pode abrir o endereco da loja no mapa e iniciar conversa no WhatsApp, sempre de forma condicional e sem alterar o fluxo principal do agendamento.
- O CTA `Ver no mapa` da confirmacao publica agora reaproveita exatamente o endereco visivel da coluna institucional, com validacao minima de `address + city + state`, evitando divergencia entre o card da loja e a area de sucesso.
- A grade de `/agendamentos` agora mostra apenas profissionais com expediente proprio configurado na data selecionada, sem herdar automaticamente o expediente geral da loja.
- APIs de horarios semanais e bloqueios de agenda persistidas em Prisma.
- O backend de horarios semanais agora valida que todo expediente de profissional cabe integralmente dentro do expediente da loja no mesmo dia.
- Base de conversas WhatsApp com `Conversation`, `ConversationMessage`, `AppointmentDraft` e `Appointment`.
- Fluxo de bot via WhatsApp com menu inicial hibrido, selecao de servico, resolucao de profissional, sugestao ativa de horarios, escolha de horario por numero ou texto livre, confirmacao, cancelamento, remarcacao e resposta institucional da loja na opcao `3`.
- O fluxo WhatsApp agora tambem aceita handoff humano por palavra-chave, marca a conversa como `PAUSED`, envia uma unica mensagem de pausa e bloqueia novas automacoes enquanto o atendimento segue no app oficial do WhatsApp.
- O fluxo WhatsApp agora tambem permite retomar uma conversa `PAUSED` manualmente por endpoint store-scoped ou pelo proprio cliente com comandos como `menu`, `retomar bot` e `atendimento automatico`.
- O matcher de pausa do WhatsApp agora trabalha por intencao humana com normalizacao mais tolerante, cobrindo frases como `falar com atendente`, `quero atendimento humano` e `falar com alguem` sem depender de igualdade exata.
- O fluxo WhatsApp agora tambem encerra atendimentos ativos por inatividade de 5 minutos e reconhece comandos de `encerrar`, `menu` e `voltar`, sempre antes da automacao principal e sem criar inbox dentro do Olyon.
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
- O teste fake da Meta chega ao webhook global, mas a mensagem inbound real nao chegava porque a WABA conectada via Embedded Signup ainda precisava ser inscrita no app por `subscribed_apps`.
- O callback do Embedded Signup agora salva a conexao e assina a WABA com o `accessToken` da propria loja; falhas deixam o status tecnico como `ERROR` e retornam erro legivel.
- Uma rota administrativa permite reassinar conexoes existentes sem refazer o Embedded Signup e restaura o status tecnico para `CONNECTED` apos sucesso.
- O proximo teste manual e reassinar a loja Teste Meta, enviar uma mensagem real e confirmar o processamento no webhook, em `/atendimento` e no bot.
- Para WhatsApp Business em coexistencia, `smb_message_echoes` e o campo correto para detectar mensagens enviadas manualmente pelo app ou dispositivo vinculado; `message_echoes` comum nao atende esse fluxo.
- O webhook agora identifica o cliente pelo campo `to`, ignora echoes cujo `providerMessageId` pertence a um outbound ja salvo pelo Olyon e trata os demais como atendimento humano externo.
- A mensagem manual externa e persistida como `OUT` com origem `smb_message_echoes`, a conversa passa para `PAUSED` pela mesma helper usada pelo painel e o aviso configuravel `humanHandoffMessage` e enviado apenas na primeira pausa.
- A pausa automatica por resposta manual externa exige que o app Meta permaneça assinado no campo `smb_message_echoes`.
- Foram adicionados logs diagnosticos e persistencia leve de `statusEvents` para callbacks `statuses` da Meta quando a correlacao com a `OUT` e possivel.
- O criterio de conexao foi alinhado entre inbound e outbound, exigindo `status = CONNECTED` nos dois caminhos.
- A propria loja autenticada agora possui uma tela store-scoped (`/configuracoes/loja`) para editar telefone, endereco, horario resumido e observacoes, enquanto o admin existente segue disponivel para suporte de `SUPER_ADMIN`.
- A tela de detalhes da loja agora tambem permite cadastrar e manter a conexao tecnica `WhatsAppConnection` via API admin store-scoped.
- A propria loja autenticada agora tambem consegue disparar um teste real minimo da conexao Meta salva, com chamada `POST` store-scoped para a Graph API e feedback tecnico separado da auditoria local.
- O check real da conexao Meta/WhatsApp agora usa o mesmo endpoint validado fora do Olyon (`GET /v25.0/{phoneNumberId}`), sem campos extras, e devolve diagnostico seguro do token lido de `WhatsAppConnection.accessToken`.
- A propria loja autenticada agora possui uma tela minima de App Review em `/configuracoes/whatsapp/templates`, com listagem de templates da WABA, selecao, preenchimento de placeholders do BODY e envio de template de teste sem expor `accessToken` no frontend.
- Os endpoints `GET /api/store/current/whatsapp/templates` e `POST /api/store/current/whatsapp/templates/test-send` usam a `WhatsAppConnection` ativa da Store atual, sem aceitar `storeId` no payload, para atender a exigencia da Meta sobre `whatsapp_business_management`.
- A tela de templates agora reconhece placeholders numericos e nomeados no BODY, aproveitando `components[].example.body_text_named_params` para labels e exemplos, e o envio inclui `parameter_name` quando a Cloud API exige parametros nomeados.
- A aba oficial `/atendimento` agora permite listar conversas WhatsApp reais da loja, abrir historico, enviar mensagem livre manual pela Cloud API e retomar conversas `PAUSED` pelo endpoint store-scoped existente.
- O envio manual em `/atendimento` respeita a `WhatsAppConnection` ativa da loja atual, nunca recebe `storeId` do frontend e nao expoe `accessToken`; fora da janela de 24h retorna erro legivel orientando o uso de template aprovado.
- Ao enviar mensagem manual em `/atendimento`, a conversa passa imediatamente para `PAUSED`, a lista mostra badge `HUMANO` e o painel exibe o aviso de atendimento humano ativo com acao para `Retomar bot`.
- Quando o atendimento humano comeca pelo `/atendimento`, o cliente recebe uma mensagem automatica curta de handoff; conversas que ja estavam `PAUSED` nao recebem aviso duplicado.
- As mensagens principais do bot agora podem ser configuradas por loja em `/configuracoes/bot`, com persistencia em `BotSettings`, API store-scoped e defaults seguros quando a loja ainda nao salvou configuracao.
- Conversas em atendimento humano continuam pausadas antes de 30 minutos e retomam automaticamente no proximo inbound quando `lastMessageAt` completar 30 minutos de inatividade, sem job/cron.
- Tela `/agendamentos` com calendario mensal limpo, resumo por dia, sheet de detalhe, skeletons reais e criacao/edicao guiadas por disponibilidade real.
- Tela `/agendamentos` agora com agenda diaria operacional por profissional como experiencia principal, preservando criacao, detalhe, edicao e disponibilidade reais.
- Criacao manual e remarcacao em `/agendamentos` agora trafegam `date + time`, montam `startAt/endAt` de forma explicita no backend e mantem a mesma engine de disponibilidade como fonte de verdade.
- `GET /api/appointments` agora aceita filtro por `date` e retorna o dia inteiro com intervalo seguro no timezone da agenda, evitando parse ambiguo no frontend.
- A agenda de `/agendamentos` agora mostra apenas profissionais com expediente proprio configurado e usa o horario da loja como limite maximo, sem abrir agenda automaticamente por heranca.
- O formulario de novo agendamento saiu do topo da pagina e passou a abrir em modal com scroll interno, preservando o restante do layout.
- Quando o modal abre a partir da coluna de um profissional, ele trava esse profissional e mostra apenas os servicos ativos vinculados a ele.
- O modal de `/agendamentos` passou a ter uma opcao explicita para registrar atendimento ja realizado; sem marcar essa opcao, a trava de passado continua identica ao comportamento anterior.
- Quando essa excecao retroativa e marcada, o modal agora exibe campos manuais de data e hora e usa esse preenchimento no create sem depender do slot visual.
- `GET /api/appointments` passou a devolver todos os statuses do dia para a agenda operacional, enquanto disponibilidade e conflitos continuam considerando apenas `SCHEDULED` e `CONFIRMED` como ocupacao ativa.
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
- [x] Estado `PAUSED` para handoff humano sem automacao
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
- [x] `/agendamentos` exibindo `SCHEDULED`, `CONFIRMED`, `CANCELED`, `DONE` e `NO_SHOW` com labels PT-BR, badge e filtro por status
- [x] `PATCH /api/appointments/[id]/status` validando `status` com Zod e resolvendo `storeId` pela sessao
- [x] Disponibilidade, conflitos e leitura de slot continuam ignorando `CANCELED`, `DONE` e `NO_SHOW` como ocupacao ativa
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

### H) WhatsApp / Meta Multi-tenant - Fase 4

- [x] Endpoint store-scoped `POST /api/store/current/whatsapp-connection/check`
- [x] Bloqueio do teste real quando a auditoria operacional local estiver em `missing` ou `incomplete`
- [x] Verificacao real minima na Meta Graph API usando `accessToken` e `phoneNumberId` da `WhatsAppConnection` atual
- [x] Payload de retorno com `ok`, `status`, `message` e detalhes tecnicos controlados para debug
- [x] Acao "Verificar conexao real" na pagina `/configuracoes/whatsapp`
- [x] Feedback visual separado para loading, sucesso, falha tecnica e bloqueio do teste

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
- O create manual falhava para datas futuras porque a tela limpava o slot escolhido quando `selectedDate` ficava diferente da data buscada no modal; agora a selecao sincroniza a data da tela e o backend recebe `date + time`.
- A listagem operacional por data deixou de depender apenas de filtro client-side em `new Date(iso)` e passou a usar `GET /api/appointments?date=...` com intervalo diario seguro no timezone configurado.
- O card visual de bloqueios ativos do dia saiu da UI de `/agendamentos`, mas os bloqueios continuam sendo carregados para o dialog e a indisponibilidade continua sendo validada pela engine do backend.
- Foi adicionada modelagem minima para expediente por profissional e o banco local recebeu a migration aditiva correspondente via `prisma db execute`.
- `/horarios-de-atendimento` agora permite alternar entre o expediente da loja e o expediente de um profissional especifico sem trocar a base de rotas.
- O `POST /api/appointments` e o `GET /api/appointments/availability` continuam sendo a validacao final de elegibilidade do profissional para o servico, mesmo com o filtro aplicado no modal.
- A trava de passado continua centralizada no backend; a unica excecao nova e o campo explicito `allowPastScheduling` enviado pelo modal quando o usuario marca o registro retroativo.
- O refinamento do modal retroativo manteve o layout geral e moveu o CTA de salvar para fora da area rolavel, evitando corte visual em alturas menores.
- O cancelamento ja persistia `CANCELED`; a correcao desta etapa ficou em filtrar apenas statuses ativos na agenda e revalidar a lista do dia apos salvar/cancelar.
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

- O `tsc` continua falhando por erros antigos fora do escopo em `.next/dev/types/validator.ts`, `app/(app)/contas-a-pagar/novo/page.tsx`, `app/(app)/usuarios/controllers/index.tsx`, `src/components/ui/app-sidebar.tsx`, `src/lib/auth-options.ts` e `src/scripts/seed.ts`, mas nao apontou erro novo nos arquivos ajustados do fluxo de agendamentos.
- `yarn tsc --noEmit --ignoreDeprecations 5.0` continua falhando por erros antigos fora do escopo desta entrega (`.next/dev/types`, `usuarios/controllers`, `auth-options`, `seed`, etc.), mas os erros novos desta feature foram saneados antes do fechamento.
- A migration `20260310193000_add_whatsapp_connection` foi aplicada com sucesso em 10/03/2026.
- O checklist manual da Fase 2 no navegador ainda nao foi executado neste fechamento; a entrega foi validada por leitura de codigo e lint direcionado.
- O checklist manual da Fase 3 com envio real via Graph API segue em diagnostico neste fechamento; a entrega foi validada por leitura de codigo, observabilidade reforcada e lint direcionado.
- O checklist manual dos callbacks `statuses` da Meta ainda precisa ser repetido apos esta sessao para confirmar `sent`, `delivered`, `read` ou `failed` no payload da `OUT`.

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
- O build ainda emite warning de root inferido por haver `package-lock.json` no diretório pai e `yarn.lock` no projeto.
- O build ainda emite warning deprecando `middleware` em favor de `proxy`.

Proximo passo sugerido:

- Tratar os warnings nao bloqueantes do build, com prioridade para a migracao de `middleware` para `proxy` e para a configuracao explicita de `turbopack.root`.

## 5.5 Ajuste atual - status real de appointments na agenda operacional

- A tela `/agendamentos` passou a exibir todos os valores reais de `AppointmentStatus` na grade por profissional/dia, com badge visual e mapeamento PT-BR (`Agendado`, `Confirmado`, `Cancelado`, `Atendido`, `Nao compareceu`).
- Foi adicionado filtro por status com opcao `Todos`, sem remover o filtro existente por profissional.
- Cada card da agenda ganhou menu rapido para marcar `CONFIRMED`, `DONE`, `CANCELED` ou `NO_SHOW`.
- Cards em status final continuam visiveis na grade, mas disponibilidade e conflitos seguem tratando apenas `SCHEDULED` e `CONFIRMED` como ocupacao ativa.
- Foi criada a rota `PATCH /api/appointments/[id]/status`, validando payload com Zod, resolvendo `storeId` pela sessao e preservando metadata existente com historico simples da mudanca.
- `GET /api/appointments?date=...` agora devolve todos os statuses do dia para a UI filtrar, sem alterar a engine de disponibilidade usada no painel e no WhatsApp.

Arquivos alterados neste ajuste:

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

Validacao executada neste ajuste:

- [x] `yarn eslint app/api/appointments/route.ts app/api/appointments/[id]/status/route.ts src/lib/validators/appointment.ts src/lib/appointments/presentation.ts app/(app)/agendamentos/page.tsx app/(app)/agendamentos/components/appointment-status-menu.tsx app/(app)/agendamentos/components/appointment-card.tsx app/(app)/agendamentos/components/professional-schedule-board.tsx app/(app)/agendamentos/components/professional-schedule-column.tsx`

Proximo passo sugerido:

- Cobrir `PATCH /api/appointments/[id]/status` com teste de integracao para sucesso, `404` por `storeId` divergente e `400` para payload invalido.

## 5.6 Ajuste atual - estabilizacao backend de WhatsAppConnection

- A camada atual de `WhatsAppConnection` foi auditada contra o Prisma Client gerado no workspace, sem criar nova model, sem criar rota store-scoped da loja e sem abrir nova tela autenticada.
- O client Prisma atual expoe a relacao da `Store` como `WhatsAppConnection`, entao os pontos que ainda usavam `store.whatsappConnection` foram corrigidos para o nome real do client gerado.
- O `PUT /api/admin/stores/[id]/whatsapp-connection` passou a preencher `id` no `create` e `updatedAt` em `create/update`, respeitando os campos obrigatorios atuais do schema sem mover credenciais para `Store`.
- O script `src/scripts/debug-whatsapp-connection.ts` foi alinhado ao mesmo contrato de persistencia para nao continuar gerando inserts invalidos.
- O payload/resposta JSON da API admin existente foi preservado, assim como o webhook e o motor conversacional.

Arquivos alterados neste ajuste:

- `app/api/admin/stores/[id]/whatsapp-connection/route.ts`
- `app/admin/dashboard/stores/[id]/page.tsx`
- `src/scripts/debug-whatsapp-connection.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn eslint app/api/admin/stores/[id]/whatsapp-connection/route.ts app/admin/dashboard/stores/[id]/page.tsx src/scripts/debug-whatsapp-connection.ts src/lib/whatsapp/admin-connection.ts`
- [x] `.\node_modules\.bin\prisma.cmd generate`
- [x] Busca por residuos de `store.whatsappConnection` na camada atual
- [ ] `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0`

Observacoes remanescentes:

- O `tsc` completo ainda falha por erros legados fora do escopo desta etapa em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`.
- Nao houve novo erro de relacao Prisma para `WhatsAppConnection` durante a validacao.
- `prisma/schema.prisma` ja estava modificado no workspace antes desta sessao e nao foi alterado por este ajuste.

Proximo passo sugerido:

- Implementar a proxima etapa store-scoped da loja reaproveitando esta base backend estabilizada, sem mexer no bot nem ampliar o webhook alem do estritamente necessario.

## 5.7 Ajuste atual - rota store-scoped da WhatsAppConnection

- Foi criada a rota autenticada `app/api/store/current/whatsapp-connection/route.ts` para a propria loja ler e salvar sua conexao Meta atual sem depender do super admin.
- O `storeId` da persistencia agora e resolvido exclusivamente pela sessao ativa via `requireMembershipRole("ADMIN")`; o payload nao aceita `storeId`.
- `GET /api/store/current/whatsapp-connection` retorna a conexao atual da loja e, quando ela ainda nao existe, devolve uma estrutura util para a UI futura com `state`, `stateLabel` e `formValues` default.
- `PATCH /api/store/current/whatsapp-connection` reutiliza a model `WhatsAppConnection` como fonte unica 1:1 por `storeId`, com `id` no `create`, `updatedAt` em `create/update` e tratamento legivel de unicidade para `phoneNumberId` e `verifyToken`.
- A rota super-admin existente foi preservada sem mudanca funcional.

Arquivos alterados neste ajuste:

- `app/api/store/current/whatsapp-connection/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn eslint app/api/store/current/whatsapp-connection/route.ts src/lib/whatsapp/admin-connection.ts src/lib/guards/require-membership-role.ts`
- [ ] `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0`

Observacoes remanescentes:

- O `tsc` completo continua falhando apenas por erros legados fora do escopo em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`.
- A nova rota ainda nao tem pagina autenticada consumindo o endpoint; isso fica para a etapa 3.

Proximo passo sugerido:

- Implementar a pagina autenticada da loja para configuracao do WhatsApp consumindo esta rota store-scoped.

## 5.8 Ajuste atual - pagina autenticada da loja para WhatsApp Meta

- Foi criada a pagina autenticada `app/(app)/configuracoes/whatsapp/page.tsx` para a propria loja visualizar e editar sua configuracao tecnica Meta/WhatsApp.
- A tela consome `GET /api/store/current/whatsapp-connection` ao carregar, preenche o formulario com `formValues` e exibe `state`, `stateLabel` e o resumo da conexao atual.
- O formulario reutiliza os enums, labels e schema de `src/lib/whatsapp/admin-connection.ts`, permitindo editar `provider`, `businessAccountId`, `phoneNumberId`, `displayPhoneNumber`, `verifyToken`, `accessToken`, `status` e `isActive`.
- O salvamento usa `PATCH /api/store/current/whatsapp-connection`, cobre primeira criacao e edicao posterior e mostra feedback visual de loading, sucesso e erro.
- Para a tela existir como rota autenticada real da loja, o `middleware.ts` passou a incluir `/configuracoes/:path*` e o sidebar ganhou o item `WhatsApp Meta`.
- Nao houve alteracao de bot, webhook, outbound nem redesign da rota store-scoped.

Arquivos alterados neste ajuste:

- `app/(app)/configuracoes/whatsapp/page.tsx`
- `middleware.ts`
- `src/components/ui/app-sidebar.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn eslint app/(app)/configuracoes/whatsapp/page.tsx middleware.ts src/components/ui/app-sidebar.tsx src/lib/whatsapp/admin-connection.ts`
- [ ] `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0`

Observacoes remanescentes:

- O `tsc` completo continua falhando apenas por erros legados fora do escopo em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`.
- A tela desta etapa nao implementa OAuth/Embedded Signup da Meta; o preenchimento permanece manual.

Proximo passo sugerido:

- Ligar a tela a validacoes operacionais finais da conexao e ao ciclo real de verificacao/webhook, sem alterar ainda o motor conversacional.

## 5.9 Ajuste atual - validacao operacional da WhatsAppConnection

- Foi criada uma camada dedicada de avaliacao operacional da `WhatsAppConnection`, classificando a conexao da loja em `missing`, `incomplete`, `inactive` ou `ready`.
- A avaliacao cobre os campos operacionais minimos: `provider`, `businessAccountId`, `phoneNumberId`, `displayPhoneNumber`, `verifyToken`, `accessToken`, `status` e `isActive`.
- A regra de prontidao operacional ficou mais confiavel para o ciclo real atual:
  - `missing`: nao existe conexao
  - `inactive`: existe conexao, mas `isActive = false`
  - `incomplete`: existe conexao ativa, mas faltam campos operacionais ou `status !== CONNECTED`
  - `ready`: existe conexao ativa, com campos minimos e `status = CONNECTED`
- A rota `GET/PATCH /api/store/current/whatsapp-connection` passou a devolver a auditoria operacional recalculada no proprio payload, sem necessidade de endpoint separado de check nesta etapa.
- A pagina `/configuracoes/whatsapp` agora exibe:
  - badge de estado operacional
  - resumo de prontidao
  - contagem de checks concluidos
  - checklist detalhado por campo
  - lista de pendencias bloqueantes quando a conexao ainda nao esta pronta
- O motor conversacional, o webhook e o outbound permaneceram intocados.

Arquivos alterados neste ajuste:

- `src/lib/whatsapp/operational-status.ts`
- `app/api/store/current/whatsapp-connection/route.ts`
- `app/(app)/configuracoes/whatsapp/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn eslint src/lib/whatsapp/operational-status.ts app/api/store/current/whatsapp-connection/route.ts app/(app)/configuracoes/whatsapp/page.tsx`
- [ ] `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0`

Observacoes remanescentes:

- O `tsc` completo continua falhando apenas por erros legados fora do escopo em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`.
- Nao foi criado endpoint dedicado de `check` porque a rota store-scoped existente ja recalcula e devolve a auditoria operacional a cada leitura e salvamento.

Proximo passo sugerido:

- Conectar essa classificacao a uma verificacao real da Meta/webhook, preservando a separacao entre configuracao salva e estado validado externamente.

## 5.10 Ajuste atual - teste real da conexao Meta/WhatsApp da loja

- Foi criado o endpoint autenticado `POST /api/store/current/whatsapp-connection/check` para a propria loja disparar uma verificacao real da conexao Meta atual sem enviar `storeId` pelo client.
- O endpoint reutiliza a `WhatsAppConnection` ja salva da loja atual e bloqueia a execucao quando a auditoria operacional estiver em `missing` ou `incomplete`.
- Foi criado `src/lib/whatsapp/meta-connection-check.ts`, responsavel por:
  - montar a chamada `GET /{phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status`
  - autenticar com o `accessToken` salvo
  - validar se o `phoneNumberId` responde na Graph API
  - comparar o `display_phone_number` retornado com o `displayPhoneNumber` salvo quando a Meta o devolve
  - resumir `statusCode`, `graphError`, `responsePreview` e checks tecnicos sem expor o token
- A pagina `/configuracoes/whatsapp` agora tem uma secao dedicada de `Teste real com Meta`, com:
  - botao `Verificar conexao real`
  - estado de loading durante a chamada
  - resultado visual separado da auditoria operacional local
  - card de sucesso, falha tecnica ou bloqueio com detalhes tecnicos controlados
- Nao houve alteracao do motor conversacional, do webhook completo nem de Embedded Signup/OAuth nesta etapa.

Arquivos alterados neste ajuste:

- `src/lib/whatsapp/meta-connection-check.ts`
- `app/api/store/current/whatsapp-connection/check/route.ts`
- `app/(app)/configuracoes/whatsapp/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn eslint src/lib/whatsapp/meta-connection-check.ts app/api/store/current/whatsapp-connection/check/route.ts app/(app)/configuracoes/whatsapp/page.tsx`
- [ ] `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0`

Observacoes remanescentes:

- O `tsc` completo continua falhando apenas por erros legados fora do escopo em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`.
- O teste real desta etapa apenas verifica a conexao tecnica atual da loja na Graph API; nao altera `status` da `WhatsAppConnection` nem refatora o fluxo do bot/webhook.

Proximo passo sugerido:

- Usar o resultado do teste real como base para a etapa seguinte de configuracao e validacao do webhook real da loja.

## 5.11 Ajuste atual - correcao do check real Meta/WhatsApp

- O check real foi alinhado ao endpoint ja validado externamente: `GET https://graph.facebook.com/v25.0/{phoneNumberId}`.
- A chamada deixou de usar `v22.0` e deixou de pedir `fields` extras, evitando falha por diferenca entre o teste externo e o teste interno do Olyon.
- O parser de sucesso agora exige `id` no payload e captura `display_phone_number`, `verified_name` e `platform_type`.
- O resultado tecnico agora inclui `accessTokenRead`, com origem `WhatsAppConnection.accessToken`, presenca, tamanho aparado e prefixo SHA-256, sem expor o token.
- A comparacao de `displayPhoneNumber` ficou tolerante a pontuacao, espacos, `+` e prefixo de pais quando um lado contem o outro como sufixo nacional com pelo menos 10 digitos.
- A rota `POST /api/store/current/whatsapp-connection/check` ficou com runtime Node explicito e mensagem de 401 local diferenciada de erro de autenticacao da Meta.
- A UI de `/configuracoes/whatsapp` passou a mostrar o token lido no backend e `platform_type` no resultado do teste real.
- Motor conversacional e webhook permaneceram fora do escopo.

Arquivos alterados neste ajuste:

- `src/lib/whatsapp/meta-connection-check.ts`
- `app/api/store/current/whatsapp-connection/check/route.ts`
- `app/(app)/configuracoes/whatsapp/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn eslint src/lib/whatsapp/meta-connection-check.ts app/api/store/current/whatsapp-connection/check/route.ts app/(app)/configuracoes/whatsapp/page.tsx`
- [x] `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false --ignoreDeprecations 5.0` executado; continua falhando apenas por erros legados fora deste escopo em `app/(app)/agendamentos/page.tsx`, `app/api/appointments/[id]/route.ts` e `app/api/appointments/availability/route.ts`.

Observacoes remanescentes:

- A validacao real com a Meta precisa ser reexecutada manualmente pela UI, porque o ambiente local nao tem o token real disponivel nesta sessao.
- O check real nao altera automaticamente o `status` persistido da `WhatsAppConnection`.

Proximo passo sugerido:

- Reexecutar o botao `Verificar conexao real` na UI com a sessao da loja atual e conferir retorno `ok: true`, `tokenAuthenticated: true`, `phoneNumberAccessible: true`.

---

## 5.12 Ajuste atual - atendimento humano pausa bot no envio manual

- `ConversationState.PAUSED` ja existia no schema Prisma; nenhuma migration foi criada.
- O endpoint `POST /api/store/current/whatsapp/conversations/[id]/messages/send` continua validando sessao, loja atual, conversa WhatsApp e payload sem aceitar `storeId` no body.
- Apos envio pela Cloud API e persistencia da `ConversationMessage OUT`, a conversa e atualizada para `state = PAUSED` e `lastMessageAt` da mensagem criada.
- A resposta do envio manual agora inclui a conversa atualizada, permitindo que a UI reflita `PAUSED` imediatamente.
- A UI de `/atendimento` mostra `HUMANO` para conversas `PAUSED`, exibe o aviso "Atendimento humano ativo. O bot está pausado nesta conversa." e mantem a acao `Retomar bot`.
- O botao `Retomar bot` reaproveita o endpoint store-scoped existente e atualiza a conversa selecionada e a lista para `IDLE` antes do proximo polling.
- Webhook, templates WhatsApp e Embedded Signup permaneceram fora do escopo.

Arquivos alterados neste ajuste:

- `app/api/store/current/whatsapp/conversations/[id]/messages/send/route.ts`
- `app/(app)/atendimento/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn eslint` passou sem erros; permanecem 2 warnings antigos fora do escopo em `app/(auth)/cadastro/controllers/index.tsx` e `app/(auth)/recuperar-senha/controllers/index.tsx`.
- [x] `yarn tsc --noEmit --pretty false --incremental false` passou sem erros.

---

## 5.13 Ajuste atual - aviso automatico no inicio do atendimento humano

- `ConversationState.PAUSED` e o schema atual foram apenas auditados; nenhuma migration ou mudanca de schema foi criada.
- `POST /api/store/current/whatsapp/conversations/[id]/messages/send` agora guarda se a conversa ja estava `PAUSED` antes do envio manual.
- Quando a conversa ainda nao estava pausada, o endpoint envia a mensagem manual, persiste a `ConversationMessage OUT`, pausa a conversa e envia uma segunda mensagem automatica de handoff ao cliente.
- A mensagem automatica usa o helper existente `sendMetaTextMessage` e tambem e persistida como `ConversationMessage OUT`.
- Quando a conversa ja estava `PAUSED`, o endpoint envia somente a mensagem manual e nao repete o aviso automatico.
- Se a mensagem manual falhar, a conversa nao e pausada e o aviso nao e enviado.
- Se o aviso automatico falhar depois da mensagem manual, a tentativa e registrada com status `FAILED` e a UI recebe `handoffError`.
- A UI de `/atendimento` adiciona `handoffMessage` ao historico imediatamente quando retornada pela API e preserva o badge `HUMANO` e o aviso interno de bot pausado.
- Webhook, templates WhatsApp e Embedded Signup permaneceram fora do escopo.

Arquivos alterados neste ajuste:

- `app/api/store/current/whatsapp/conversations/[id]/messages/send/route.ts`
- `app/(app)/atendimento/page.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn eslint` passou sem erros; permanecem 2 warnings antigos fora do escopo em `app/(auth)/cadastro/controllers/index.tsx` e `app/(auth)/recuperar-senha/controllers/index.tsx`.
- [x] `yarn tsc --noEmit --pretty false --incremental false` passou sem erros.

---

## 5.14 Ajuste atual - configuracoes do bot por loja

- Foi criada a model `BotSettings`, vinculada 1:1 a `Store`, para mensagens e parametros do bot por loja.
- A migration `20260602221348_add_bot_settings` foi criada com `yarn prisma migrate dev --name add_bot_settings --create-only` e aplicada com `yarn prisma migrate dev --name add_bot_settings`.
- `src/lib/bot/settings.ts` centraliza defaults seguros e `getBotSettingsForStore(storeId)`, retornando configuracao completa mesmo sem registro salvo.
- `src/lib/validators/bot-settings.ts` valida o payload com Zod, incluindo mensagens de ate 1000 caracteres e `autoResumeAfterMinutes` entre 5 e 1440.
- `GET /api/store/current/bot-settings` retorna defaults ou configuracao salva para a loja atual da sessao.
- `PUT /api/store/current/bot-settings` exige `ADMIN`, rejeita `storeId` no body, faz upsert por `storeId` da sessao e retorna a configuracao salva.
- A pagina `/configuracoes/bot` permite editar mensagens, exibicao de menu, retorno automatico habilitado e minutos para retorno.
- O sidebar ganhou `Configuracoes do Bot` dentro de `Configuracoes`.
- O webhook usa `welcomeMessage` e `showMenuAfterWelcome` no menu inicial e `customerRequestedHumanMessage` quando o cliente pede atendente.
- O envio manual em `/atendimento` usa `humanHandoffMessage` configurada e envia/persiste o handoff antes da mensagem manual quando a conversa ainda nao estava `PAUSED`.
- Webhook estrutural, templates WhatsApp e Embedded Signup permaneceram fora do escopo.

Pendencia registrada:

- `autoResumeEnabled` e `autoResumeAfterMinutes` estao persistidos e editaveis, mas o retorno automatico ainda nao foi ativado tecnicamente porque o schema atual nao diferencia com seguranca pausa por cliente, pausa por operador e resposta humana posterior.

Arquivos criados neste ajuste:

- `prisma/migrations/20260602221348_add_bot_settings/migration.sql`
- `src/lib/validators/bot-settings.ts`
- `src/lib/bot/settings.ts`
- `app/api/store/current/bot-settings/route.ts`
- `app/(app)/configuracoes/bot/page.tsx`

Arquivos alterados neste ajuste:

- `prisma/schema.prisma`
- `src/components/ui/app-sidebar.tsx`
- `src/lib/bot/flow.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `app/api/store/current/whatsapp/conversations/[id]/messages/send/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `yarn prisma migrate dev --name add_bot_settings --create-only`
- [x] `yarn prisma migrate dev --name add_bot_settings`
- [x] `yarn prisma generate`
- [x] `yarn eslint` passou sem erros; permanecem 2 warnings antigos fora do escopo em `app/(auth)/cadastro/controllers/index.tsx` e `app/(auth)/recuperar-senha/controllers/index.tsx`.
- [x] `yarn tsc --noEmit --pretty false --incremental false` passou sem erros.

---

## 5.15 Ajuste atual - correcao de GET/PUT de BotSettings

- A model, migration, tabela `BotSettings`, indice unico de `storeId` e delegate `prisma.botSettings` foram auditados e estavam corretos.
- O erro real no terminal do Next era `Cannot read properties of undefined (reading 'findUnique')` no GET e `Cannot read properties of undefined (reading 'upsert')` no PUT, causado por processo `next dev` antigo com Prisma Client carregado antes do `BotSettings`.
- Apos `yarn prisma generate` e restart do `next dev`, a API passou a reconhecer `prisma.botSettings`.
- Tambem foi corrigida a exigencia excessiva de permissao no `GET /api/store/current/bot-settings`, que exigia `ADMIN` embora a tela precise carregar defaults/configuracao para qualquer membro autenticado da loja.
- O `GET` foi ajustado para exigir `STAFF` ou superior, mantendo escopo por `storeId` da sessao.
- O `PUT` permanece restrito a `ADMIN` ou superior, rejeitando `storeId` no body e fazendo upsert por `storeId` da sessao.
- Logs controlados foram ajustados para `bot settings load failed` e `bot settings save failed`, sem dados sensiveis.

Arquivos alterados neste ajuste:

- `app/api/store/current/bot-settings/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] Checagem direta com Prisma confirmou tabela `BotSettings`, indices `BotSettings_storeId_key`/`BotSettings_storeId_idx`, registro salvo e delegate `prisma.botSettings`.
- [x] `GET /api/store/current/bot-settings` autenticado como `STAFF` retornou 200 com defaults.
- [x] `PUT /api/store/current/bot-settings` autenticado como `OWNER` retornou 200 e salvou a configuracao.
- [x] `PUT /api/store/current/bot-settings` com `storeId` no body retornou 400.
- [x] `GET /api/store/current/bot-settings` apos salvar retornou 200 com os valores persistidos.
- [x] `yarn prisma generate`
- [x] `yarn eslint`
- [x] `yarn tsc --noEmit --pretty false --incremental false`

---

## 5.16 Ajuste atual - BotSettings no menu inicial do WhatsApp real

- O webhook real resolve a loja por `currentStoreId` da conexao WhatsApp inbound e carrega `getBotSettingsForStore(currentStoreId)` antes de processar o fluxo.
- Os pontos que exibem menu inicial no webhook usam `buildMainMenuMessage(botSettings)`, que envia `botSettings.welcomeMessage`.
- `showMenuAfterWelcome = true` envia `welcomeMessage` com lista de opcoes; `showMenuAfterWelcome = false` envia apenas `welcomeMessage`.
- O comando de cliente para atendimento humano usa `botSettings.customerRequestedHumanMessage`.
- Foi removido o helper legado `getWelcomeMenuText()` e a constante `WELCOME_MENU_TEXT` de `src/lib/bot/flow.ts`, que ainda carregavam o texto antigo `Olá! Como posso te ajudar?`.
- A retomada de conversa `PAUSED` agora envia apenas `Atendimento automático retomado.` e depois monta o menu por `buildMainMenuMessage(botSettings)`.
- O texto `Olá! Como posso te ajudar?` permanece somente em `DEFAULT_BOT_SETTINGS`, como fallback quando a loja ainda nao tem `BotSettings` salvo.
- Para o WhatsApp real, as configuracoes precisam estar salvas no banco do deploy publico `https://olyon-testes.vercel.app/api/webhooks/whatsapp`; testes em `localhost` podem ler outro banco.
- Confirmar que a migration `20260602221348_add_bot_settings` foi aplicada no banco da Vercel; se necessario, executar `yarn prisma migrate deploy` no ambiente de deploy.
- Embedded Signup, templates WhatsApp, schema Prisma e migrations ficaram fora do escopo.

Arquivos alterados neste ajuste:

- `src/lib/bot/flow.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] Busca por `Olá! Como posso te ajudar?`
- [x] Busca por `Atendimento automático retomado`
- [x] Busca por `Chat pausado`
- [x] Busca por `Como posso te ajudar`
- [x] `yarn eslint`
- [x] `yarn tsc --noEmit --pretty false --incremental false`

---

## 5.17 Ajuste atual - favicon oficial do Olyon

- Foi auditado que o projeto ja tinha `app/favicon.png`, um PNG quadrado de 1254x1254 com o icone do Olyon.
- Nao havia `public/` com assets adicionais nem `src/assets/`.
- Foi gerado `app/icon.png` em 512x512 a partir do PNG existente.
- `app/layout.tsx` teve a metadata atualizada com descricao do Olyon e `icons.icon`/`icons.apple` apontando para `/icon.png`.
- O App Router passa a ter um app icon especial reconhecido para a aba do navegador.
- Prisma, migrations, webhook, fluxo WhatsApp, `/atendimento` e `/configuracoes/bot` permaneceram fora do escopo.

Arquivos criados neste ajuste:

- `app/icon.png`

Arquivos alterados neste ajuste:

- `app/layout.tsx`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada neste ajuste:

- [x] `app/icon.png` gerado em 512x512.
- [x] Dev server serviu `/icon.png` com `Content-Type: image/png`.
- [x] `yarn eslint`
- [x] `yarn tsc --noEmit --pretty false --incremental false`

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
5. Cobrir create manual, remarcacao, listagem por data, bloqueio com conflito de appointments e agenda publica com testes automatizados de integracao.
6. Avaliar auto-retomada de conversas WhatsApp em `PAUSED` apos X horas sem atendimento humano, quando houver uma definicao clara de mensagem humana/atendimento manual.
7. Limpar warnings antigos fora do escopo da feature, como lockfiles multiplos, `middleware` depreciado e baseline-browser-mapping desatualizado.
8. Validar o fluxo real de App Review em `/atendimento`: inbound pelo WhatsApp nativo, conversa aparecendo no Olyon, envio manual dentro da janela de 24h e recebimento no WhatsApp nativo.

---

## 8. Ajuste webhook Meta GET

Objetivo desta correcao:

- alinhar a verificacao `GET /api/webhooks/whatsapp` com o token configurado em `WHATSAPP_WEBHOOK_SECRET`, sem alterar o fluxo `POST` inbound.

Resultado desta correcao:

- o `GET` deixou de consultar `WhatsAppConnection` por `verifyToken` no banco e passou a comparar `hub.verify_token` com `process.env.WHATSAPP_WEBHOOK_SECRET`
- quando `hub.mode=subscribe`, o token confere e `hub.challenge` existe, a rota responde somente o valor de `hub.challenge` com `Content-Type: text/plain`
- falhas de validacao agora retornam `403` com `{ ok: false, error: "Invalid hub.verify_token" }`
- `middleware.ts` foi auditado e nao bloqueia `/api/webhooks/whatsapp`, porque o `matcher` atual nao inclui `/api/*`

Arquivos alterados nesta correcao:

- `app/api/webhooks/whatsapp/route.ts`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada:

- `yarn lint app/api/webhooks/whatsapp/route.ts middleware.ts`
- `yarn build`

Resultado:

- a base publicada fica pronta para a validacao da Meta assim que a Vercel receber novo deploy com `WHATSAPP_WEBHOOK_SECRET=olyon_whatsapp_test_secret_2026`

---

## 9. Auditoria do Cadastro Incorporado WhatsApp por loja

Objetivo desta correcao:

- auditar o fluxo de `/configuracoes/whatsapp` ate a persistencia da `WhatsAppConnection`
- eliminar qualquer possibilidade de pre-selecao de portfolio empresarial pelo frontend
- manter a conexao funcional da `Loja Principal` sem alteracao e salvar novos cadastros somente na Store atual da sessao

Resultado desta correcao:

- o App ID configurado foi validado na Graph API como o app `Olyon agendamentos`
- `appId`, `configId` e versao da Graph API agora sao lidos no backend e entregues ao componente por `GET /api/whatsapp/embedded-signup/config`, sem valores hardcoded no client
- o ambiente recomendado passou a usar `META_APP_ID`, `META_APP_SECRET`, `META_EMBEDDED_SIGNUP_CONFIG_ID` e `META_GRAPH_API_VERSION`; os antigos envs `NEXT_PUBLIC_*` continuam apenas como fallback de compatibilidade
- `FB.login` usa o `config_id` retornado pelo backend e envia `extras.setup` vazio, sem `business_id`, WABA ou portfolio pre-preenchido
- o `business_id` retornado pela Meta deixou de ser propagado pelo client e pelo callback, pois nao participa da `WhatsAppConnection`
- o listener passou a aceitar todos os eventos de conclusao `FINISH_*`, incluindo `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`, e aguarda os metadados da sessao antes de enviar o `code`
- o callback continua rejeitando `storeId` no payload e resolve `authResult.storeId` exclusivamente pela sessao/membership antes do `upsert`
- leitura de verificacao confirmou `Loja Principal` conectada e `Teste Meta` sem conexao antes da correcao; nenhuma conexao existente foi alterada

Diagnostico do bloqueio de portfolio:

- nao existia `business_id` hardcoded no repositorio
- o portfolio exibido ou bloqueado no popup e decidido pela Meta, nao pelo `storeId` interno do Olyon
- a Meta nao permite que um Tech Provider use o Embedded Signup para auto-onboard de WABAs criadas pelo app ou pertencentes ao mesmo portfolio que hospeda o Developer App; esse bloqueio nao pode ser removido por parametro de frontend
- para a `Teste Meta`, o fluxo precisa usar um portfolio elegivel que nao seja o owner do Developer App, ou a WABA deve ser conectada por um caminho administrativo suportado pela Meta

Arquivos alterados nesta correcao:

- `app/(app)/configuracoes/whatsapp/page.tsx`
- `app/api/whatsapp/embedded-signup/config/route.ts`
- `app/api/whatsapp/embedded-signup/callback/route.ts`
- `src/components/whatsapp/embedded-signup-button.tsx`
- `src/lib/validators/whatsapp-embedded-signup.ts`
- `src/lib/whatsapp/embedded-signup.ts`
- `.env.example`
- `PROJECT_STATUS.md`
- `PROJECT_LOG.md`

Validacao executada:

- `yarn eslint` concluiu sem erros e manteve 2 warnings legados fora do escopo nos controllers de cadastro e recuperacao de senha
- `yarn tsc --noEmit --pretty false --incremental false` concluiu sem erros

---

## 9.1 Diagnostico e gerenciamento do owner criado pelo admin

Diagnostico confirmado para `jhonatan@olyon.com`:

- o `User` existe e possui senha nao vazia no formato bcrypt
- existe `Membership` com role `OWNER`
- a `Store` associada esta ativa
- portanto, a falha nao e causada por hash ausente, membership ausente, role invalida ou loja inativa
- com o e-mail exato, o unico bloqueio restante no `authorize()` e a senha informada nao conferir com o hash salvo; o codigo tambem nao normalizava espacos e maiusculas no e-mail antes da busca

Correcao aplicada:

- o `authorize()` normaliza e-mail com `trim().toLowerCase()`
- logs internos distinguem `user not found`, `missing password hash`, `invalid password`, `user without membership`, `inactive store` e `success`
- os logs incluem apenas identificadores operacionais e nunca senha, hash ou token
- a mensagem publica continua `Credenciais inválidas ou acesso negado.`
- o formulario admin ja possuia senha inicial validada por Zod, hash bcrypt com custo 10, criacao de Store ativa e `Membership OWNER`
- criacao de loja e troca de owner agora reutilizam um `User` existente por e-mail, preservam sua senha e criam ou promovem apenas o `Membership` da loja alvo
- o owner anterior so e rebaixado para `ADMIN` quando for um usuario diferente
- `/admin/dashboard/stores/[id]/owner` agora consulta o `Membership OWNER`: exibe o gerenciamento do proprietario atual ou preserva o formulario de criacao quando a loja nao possui owner
- o gerenciamento mostra nome, e-mail, `userId` e role sem selecionar ou expor `User.password`
- `PATCH /api/admin/stores/[id]/owner` edita nome/e-mail com Zod, bloqueia conflito com outro `User` e nao mescla contas
- `PATCH /api/admin/stores/[id]/owner/password` valida confirmacao, gera bcrypt com custo 10 e atualiza somente a senha do owner atual
- ambos os endpoints exigem `SUPER_ADMIN` e retornam o contrato `{ ok, data/error }`

Validacao:

- auditoria segura no banco confirmou a estrutura do usuario, membership e loja sem imprimir o hash
- teste transacional com rollback confirmou bcrypt valido para owner novo, `Membership OWNER` e preservacao da senha de usuario existente, sem deixar registros temporarios
- teste transacional do gerenciamento confirmou edicao de nome/e-mail e redefinicao bcrypt do owner da Brunela, com rollback limpo e sem imprimir credenciais
- `yarn eslint` concluiu sem erros e manteve 2 warnings legados nos controllers de cadastro e recuperacao de senha
- `yarn tsc --noEmit --pretty false --incremental false` concluiu sem erros
- o teste manual completo de redefinicao e login permanece pendente para ser executado pelo admin com uma nova senha controlada

---

## 9.2 MVP de lembretes automaticos de agendamento por WhatsApp

Escopo implementado:

- somente `Appointment.source = WHATSAPP`
- lembretes `ONE_HOUR` e `FIFTEEN_MINUTES`
- `Appointment.startAt` como fonte final, com `scheduledFor` calculado em tempo absoluto
- timezone usado apenas para formatar os parametros visiveis do template
- appointments `SCHEDULED` e `CONFIRMED` elegiveis; `CANCELED`, `DONE` e `NO_SHOW` ficam fora
- WEB e ADMIN permanecem fora do MVP ate existir normalizacao de telefone e consentimento

Persistencia e idempotencia:

- criada a model `AppointmentReminder` com status `PENDING`, `PROCESSING`, `SENT`, `FAILED` e `SKIPPED`
- migration `20260703165408_add_appointment_reminders` criada e aplicada
- a chave unica `appointmentId + kind + appointmentStartAt` impede duplicidade entre execucoes concorrentes e permite uma nova agenda de lembretes quando o horario muda
- o reconciliador busca appointments ativos nas proximas 24 horas, cria os dois lembretes com `createMany + skipDuplicates` e marca janelas ja perdidas como `SKIPPED`
- o dispatcher processa ate 50 vencidos por execucao e faz claim atomico por transicao condicional `PENDING -> PROCESSING`
- antes do envio, o dispatcher recarrega o appointment e revalida source, status, snapshot de `startAt`, escopo da Store e telefone
- cancelamento, remarcacao, source fora do MVP, telefone invalido e lembrete atrasado ficam registrados como `SKIPPED`
- falha de conexao, configuracao ou Meta fica registrada como `FAILED`, com incremento de `attempts` e erro resumido

Envio e rastreabilidade:

- o envio usa `sendMetaWhatsAppTemplate`; texto livre nao e usado para o lembrete
- a conexao tecnica e resolvida exclusivamente por `findActiveWhatsAppConnectionByStoreId`
- `Store.whatsappPhone` nao participa do envio
- os templates de 1h e 15min sao configurados separadamente por env e usam BODY posicional `{{1}} = nome do cliente` e `{{2}} = data/hora formatada`
- envs: `WHATSAPP_APPOINTMENT_REMINDER_ONE_HOUR_TEMPLATE_NAME`, `WHATSAPP_APPOINTMENT_REMINDER_FIFTEEN_MINUTES_TEMPLATE_NAME` e `WHATSAPP_APPOINTMENT_REMINDER_TEMPLATE_LANGUAGE`
- envio aceito pela Meta persiste `ConversationMessage OUT` com origem `appointment_reminder`, template, reminder, appointment e `providerMessageId`
- se a Meta aceitar o envio e apenas a persistencia da `ConversationMessage` falhar, o outbox continua `SENT` para nao reenviar uma mensagem possivelmente entregue; a falha local fica registrada
- callbacks `sent`, `delivered`, `read` e `failed` continuam atualizando o payload da `ConversationMessage` e agora tambem atualizam `AppointmentReminder.providerStatus/statusReason`
- nenhum log novo inclui `accessToken`

Cron:

- criado `GET /api/cron/appointment-reminders`
- exige `Authorization: Bearer <CRON_SECRET>`
- nao aceita `storeId` nem payload de escopo
- executa reconciliacao e dispatch e retorna `created`, `claimed`, `sent`, `skipped` e `failed`
- a infraestrutura de producao ainda precisa chamar a rota a cada minuto; Vercel Hobby pode nao atender essa frequencia e pode exigir Vercel Pro ou scheduler externo

Riscos operacionais registrados:

- ambos os templates precisam existir e estar aprovados em cada WABA usada
- o scheduler precisa ter frequencia por minuto e monitoramento de falhas
- o outbox nao faz retry automatico de `FAILED` ou `PROCESSING`, evitando duplicidade em resultados de rede incertos neste MVP
- WEB/ADMIN continuam explicitamente fora por telefone e consentimento

Validacao executada:

- `yarn prisma migrate dev --name add_appointment_reminders`
- `yarn prisma generate`
- `yarn eslint` sem erros; permanecem 2 warnings legados nos controllers de cadastro e recuperacao de senha
- `yarn tsc --noEmit --pretty false --incremental false`
- `git diff --check`

---

## 10. Historico resumido

| Data | Mudanca |
|------|---------|
| 03/07/2026 | WhatsApp: MVP de lembretes automaticos 1h/15min para Appointment WHATSAPP, com outbox persistente idempotente, template Meta, ConversationMessage OUT, cron protegido e callbacks de delivery |
| 01/07/2026 | Login e owner auditados: Jhonatan possui bcrypt, Membership OWNER e Store ativa; admin ganhou edicao de dados e redefinicao segura da senha do proprietario atual |
| 29/06/2026 | WhatsApp Embedded Signup auditado: configuracao Meta centralizada no backend, `extras.setup` sem portfolio, eventos `FINISH_*` suportados e persistencia confirmada como store-scoped |
| 02/06/2026 | Configuracoes do Bot por loja: criada model `BotSettings`, API `GET/PUT /api/store/current/bot-settings`, tela `/configuracoes/bot`, mensagens configuraveis no webhook/atendimento e preparo persistido de retorno automatico |
| 02/06/2026 | WhatsApp atendimento humano: primeira mensagem manual em conversa ainda nao pausada agora envia tambem um aviso automatico ao cliente, persiste essa `OUT` e nao repete o aviso enquanto a conversa ja estiver `PAUSED` |
| 02/06/2026 | WhatsApp atendimento humano: envio manual em `/atendimento` agora pausa automaticamente a conversa em `PAUSED`, mostra badge `HUMANO`, exibe aviso de bot pausado e permite retomar para `IDLE` pela UI |
| 01/06/2026 | WhatsApp atendimento humano: criada a aba oficial `/atendimento`, APIs store-scoped de conversas/mensagens/envio manual, persistencia `ConversationMessage OUT`, aviso de janela de 24h e item oficial no sidebar sem expor `accessToken` |
| 10/05/2026 | WhatsApp: conversas `PAUSED` ganharam retomada manual por `POST /api/store/current/whatsapp/conversations/[id]/resume` e retomada pelo cliente via comandos como `menu`, `retomar bot` e `atendimento automatico`, sem alterar o fluxo normal fora de `PAUSED` |
| 10/05/2026 | WhatsApp templates: suporte a placeholders nomeados no BODY, com leitura de `body_text_named_params`, preenchimento inicial por exemplos da Meta e envio de `parameter_name` na Cloud API mantendo compatibilidade com placeholders numericos |
| 10/05/2026 | WhatsApp templates App Review: criada tela minima `/configuracoes/whatsapp/templates`, endpoints store-scoped de listagem e envio de template via Graph API `v25.0`, com placeholders do BODY e sem expor `accessToken` no frontend |
| 30/04/2026 | Webhook WhatsApp/Meta: verificador `GET /api/webhooks/whatsapp` corrigido para comparar `hub.verify_token` com `process.env.WHATSAPP_WEBHOOK_SECRET`, retornar `hub.challenge` puro em sucesso e manter o `POST` inbound sem mudancas |
| 27/04/2026 | WhatsApp configuracoes refinadas: `/configuracoes/whatsapp` passou a priorizar a UX simples da loja, sem expor `accessToken` no payload store-scoped padrao e com diagnostico detalhado restrito a `SUPER_ADMIN`, sempre sobre a `WhatsAppConnection` da Store atual |
| 27/04/2026 | WhatsApp Embedded Signup: card autenticado em `/configuracoes/whatsapp`, SDK Meta no client, `POST /api/whatsapp/embedded-signup/callback` com troca store-scoped do `code` por token e persistencia segura na `WhatsAppConnection`, mantendo a validacao real de coexistencia dependente da aprovacao final da Meta |
| 24/04/2026 | WhatsApp: corrigida a regressão do bot silencioso após o patch do novo menu; o webhook agora loga estado/texto/`selectedOptionId`/actions/dispatch, usa `selectedOptionId` como fallback canônico para intents interativas e adiciona resposta de segurança quando um branch termina sem `appendBotReply` |
| 24/04/2026 | WhatsApp: menu inicial atualizado para `Agendar horário`, `Meus agendamentos`, `Preços` e `Informações`; `Meus agendamentos` passou a reaproveitar explicitamente a listagem real de futuros por telefone, e `Preços` agora lista serviços ativos reais com `price` preenchido em BRL, com navegação para mais preços, agendar ou voltar ao menu |
| 24/04/2026 | Servicos: adicionado `price Decimal? @db.Decimal(12, 2)` no Prisma, migration segura aplicada sem backfill fake, validators/API/UI do CRUD atualizados para exigir preco no create, aceitar no update e exibir valor em BRL |
| 24/04/2026 | Fluxo WhatsApp refinado em UX textual: menu e etapas sem indicadores visuais, lista de datas sem "primeiro horário", labels/títulos revisados em PT-BR e navegação preservada sem mexer na lógica real de `Appointment` |
| 24/04/2026 | WhatsApp UX guiada por etapas: webhook passou a aceitar replies interativas da Meta, outbound suporta reply buttons/list messages com fallback textual, e o fluxo real foi reorganizado em menu > servico > profissional > dia > horario > confirmacao sem quebrar create/remarcacao/cancelamento de `Appointment` |
| 22/04/2026 | Build TypeScript: corrigido narrowing de `json.code` no create de agendamento e alinhado `ignoreAppointmentId` nos callers de disponibilidade; `yarn build` voltou a concluir |
| 22/04/2026 | Build Vercel/Prisma: imports diretos para `generated/prisma/client` foram centralizados em `src/lib/prisma` e o script `build` passou a executar `prisma generate` antes do `next build` |
| 22/04/2026 | WhatsAppConnection check real: endpoint corrigido para `GET /v25.0/{phoneNumberId}` sem `fields`, parser reforcado, diagnostico seguro do token lido e comparacao de telefone tolerante a formatacao |
| 10/04/2026 | WhatsAppConnection teste real da loja: criado `POST /api/store/current/whatsapp-connection/check`, helper de validacao minima na Graph API e UI `/configuracoes/whatsapp` com loading/resultado separado da auditoria local |
| 09/04/2026 | WhatsAppConnection operacional: criada a classificacao `missing/incomplete/inactive/ready` e integrada na rota store-scoped e na UI `/configuracoes/whatsapp` |
| 09/04/2026 | WhatsAppConnection UI da loja: criada a pagina autenticada `/configuracoes/whatsapp`, consumindo a rota store-scoped com GET/PATCH e feedback completo de criacao/edicao |
| 09/04/2026 | WhatsAppConnection store-scoped: criada a rota `GET/PATCH /api/store/current/whatsapp-connection` usando apenas `storeId` da sessao da loja atual |
| 09/04/2026 | WhatsAppConnection backend base: correcoes do uso da relacao Prisma `Store.WhatsAppConnection`, ajuste de `upsert/create` com `id` e `updatedAt` e compatibilidade com o Prisma Client gerado atual |
| 02/04/2026 | Build: cadeia de correcoes em `contas-a-pagar/novo`, `usuarios/controllers`, `app-sidebar`, `auth-options`, `src/scripts/seed.ts`, `tsconfig.json` e `/login` fez o `yarn build` voltar a concluir com sucesso |
| 02/04/2026 | Build: `app/api/admin/[id]/route.ts` foi ajustado para o contrato de handler dinamico do Next 16 e o proximo erro raiz do build passou a ser `app/(app)/contas-a-pagar/novo/page.tsx:33` |
| 02/04/2026 | Agenda publica: rota `/agenda/[slug]` com dados reais da loja, servicos ativos, profissionais elegiveis, slots reais e criacao final de `Appointment` com `source = WEB` |
| 02/04/2026 | Agenda: criacao de bloqueio agora detecta appointments conflitantes, exige confirmacao explicita para manter ou cancelar atendimentos e persiste a decisao no backend |
| 01/04/2026 | Agenda: create manual passou a aceitar datas futuras com `date + time`, listagem por data foi movida para `GET /api/appointments?date=...` e a UI deixou de depender de parse local ambiguo |
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

- Conexao Meta/WhatsApp validada com sucesso no ambiente de testes publicado
- Webhook salvo e refletido no retorno tecnico da Meta em `webhook_configuration.application`
- Tela `/configuracoes/whatsapp` com auditoria operacional `8/8`
- Status tecnico da conexao atual: `CONNECTED`
- Proximo foco: validar evento real chegando no webhook e seguir para fluxo operacional ponta a ponta

- Fluxo real de entrada via WhatsApp validado com resposta correta do chatbot
- Menu inicial e intenção de agendamento funcionando no cliente
- Refatoração do webhook inbound registrada com foco em idempotência, assinatura Meta e transação única
- `app/api/webhooks/whatsapp/route.ts` endurecido para produção
- Próximo foco: validar manualmente duplicate inbound, retry da Meta, assinatura e concorrência básica por conversa
