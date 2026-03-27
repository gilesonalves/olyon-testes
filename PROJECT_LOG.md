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
