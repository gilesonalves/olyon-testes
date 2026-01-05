# Olyon

Painel administrativo web para gestao de servicos, agenda, equipe e financeiro.

## Visao geral

- App Router com paginas para agendamentos, servicos, eventos, equipe, usuarios e financeiro.
- Layout principal com sidebar e componentes reutilizaveis.
- Formularios com React Hook Form + Zod e notificacoes com Sonner.
- UI com Tailwind CSS + shadcn/ui (Radix) e icones Lucide.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui + Radix UI
- React Hook Form + Zod
- Sonner

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

## Estrutura

```
app/                rotas do App Router
  agendamentos/
  cadastro/
  contas-a-pagar/
  controle-pagamentos/
  dashboard/
  entradas-saidas/
  equipe/
  eventos/
  horarios-de-atendimento/
  login/
  recuperar-senha/
  servicos/
  usuarios/
src/
  components/       layout e componentes compartilhados
  hooks/
  lib/
public/
```

## Configuracoes

- Alias de import: `@/*` aponta para `src/*`.
- Sem variaveis de ambiente obrigatorias no momento.
