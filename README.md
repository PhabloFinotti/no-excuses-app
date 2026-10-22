# No Excuses

Rastreador pessoal de **hábitos e tarefas** que responde a uma pergunta só:

> Qual é o último momento em que posso começar isto sem comprometer a minha hora de dormir?

Você diz a que horas acorda e a que horas dorme, cadastra o que precisa fazer e quanto tempo leva. O app soma tudo o que falta, **empilha os itens de trás para frente a partir da hora de dormir** e mostra, para cada um, o limite para começar. A lista muda de cor e treme conforme esse limite se aproxima, e notificações push avisam em níveis crescentes.

Exemplo: dorme às 23:00, "Leitura" de 30 min. Limite para começar: 22:30, e o primeiro aviso chega às 22:15. Com dois itens de 30 min, os limites viram 22:00 e 22:30.

É um app de **um usuário**, feito para o Android (testado no Samsung S21+) como PWA instalado.

## Funcionalidades

- **Hábitos** com duração, horário fixo opcional, dias da semana, prioridade essencial e limites de alerta próprios.
- **Tarefas avulsas** com data. O que não foi feito rola para o dia seguinte; depois de 3 dias parada, a tarefa sai do cálculo até você decidir (fazer hoje ou descartar).
- **Hoje**: itens agrupados em Agora, Mais tarde e Feitos, com barra de tempo que esvazia, timer, modo foco em tela cheia, adiar, pular e desfazer.
- **Modo de recuperação**: quando não cabe tudo antes de dormir, mostra o déficit e sugere quais itens não essenciais pular para voltar ao horário.
- **Notificações push** em níveis (atenção, urgente, atrasado), com ações "Feito" e "Adiar" na própria notificação, resumo da manhã e aviso antes de dormir.
- **Tempo real versus previsto**: concluir sem timer grava o previsto e avisa; o histórico usa só tempos medidos ou informados.
- **Categorias automáticas**: "Leitura", "Ler", "Ler livro tal" caem em Leitura; "Estudar Kubernetes" e "Estudar DSA" caem em Estudo. São dez categorias (Estudo, Leitura, Exercício, Saúde, Mente, Trabalho, Casa, Finanças, Social, Criação), com escolha manual possível.
- **Adição rápida** com duração no texto: `Ler por 60 minutos`, `Estudar 1h30`, `Correr 40 min`.
- **Histórico e estatísticas**: itens feitos por dia, tempo dedicado, média móvel, dias da semana, calendário, visão por hábito e por categoria, sequências, percentis P50/P80 do tempo real e sugestão de ajustar a duração.
- **Google Agenda** para tarefas, num calendário próprio "No Excuses" (escopo `calendar.app.created`: o app não enxerga os seus outros calendários).
- **Dados**: exportar CSV, backup e restauração em JSON, atualização em tempo real entre aparelhos.
- **Diagnóstico de push** em Ajustes: permissão, assinatura, último envio e último erro.
- Layout responsivo: barra inferior no celular, barra lateral no desktop.

## Como funciona

```
 Navegador (PWA Vue)                       Supabase
┌──────────────────────┐   REST/Realtime  ┌──────────────────────────────┐
│ calculateState()     │◄────────────────►│ Postgres + RLS               │
│ cores, tremor, barras│                  │ items · item_completions ... │
└──────────┬───────────┘                  │                              │
           │ push                         │ pg_cron (a cada minuto)      │
┌──────────┴───────────┐   Web Push       │   └─► Edge Function `tick`   │
│ Service worker       │◄─────────────────│        calculateState()      │
│ notificação + ações  │                  │        notification_log      │
└──────────────────────┘                  └──────────────────────────────┘
```

- **A mesma função pura** (`supabase/functions/_shared/calculateState.ts`) calcula o estado na tela e no servidor, então cor, tremor e push nunca divergem.
- **Agendador sem estado**: o `pg_cron` chama a função `tick` a cada minuto. A tabela `notification_log`, com chave única `(item, dia, nível)`, garante um envio por nível mesmo com execuções simultâneas; se a entrega falha, a reserva é liberada e o minuto seguinte tenta de novo.
- **Timer no banco**: o início e o acumulado ficam em `item_completions`, então sobrevivem ao app fechado.
- **RLS em todas as tabelas** (`user_id = auth.uid()`); o cadastro público fica desativado.

As decisões estão registradas em [`docs/adr/`](docs/adr).

## Stack

Vue 3 · TypeScript · Vite · `vite-plugin-pwa` (service worker próprio) · Supabase (Postgres, Auth, Realtime, Edge Functions em Deno, `pg_cron`, `pg_net`) · Web Push (VAPID) · Vitest · Vercel · GitHub Actions.

## Começando

Requisitos: Node 20+ e npm.

```bash
npm install
npm run dev:demo    # UI com dados falsos em memória, sem login nem .env
```

O modo demo é o jeito mais rápido de ver o app: gera itens urgentes, atrasados e um histórico relativos ao horário atual. Os dados somem ao recarregar.

### Com backend real

1. Copie `.env.example` para `.env` e preencha:
   ```
   VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   VITE_VAPID_PUBLIC_KEY=<chave pública VAPID>
   ```
2. Siga [`docs/SETUP.md`](docs/SETUP.md): projeto Supabase, `supabase db push`, chaves VAPID, segredos, deploy das funções, cron, Vercel e Google Agenda.
3. `npm run dev`.

Nunca use a chave `secret`/`service_role` no front.

### No celular

Abra a URL publicada no Chrome, **Adicionar à tela inicial**, entre, vá em Ajustes → Notificações → **Ativar** e **Enviar teste**. No Samsung, para o alerta chegar no horário: Configurações → Aplicativos → No Excuses → Bateria → "Sem restrições". Se o ícone ou o comportamento do app instalado ficar desatualizado depois de um deploy, desinstale e instale de novo.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run dev:demo` | Servidor com Supabase falso e dados de exemplo |
| `npm test` | Testes (Vitest) da lógica pura e dos utilitários |
| `npm run build` | Checagem de tipos e build de produção |
| `npm run preview` | Serve o build localmente |
| `node scripts/rls-check.mjs` | Confere o isolamento entre contas num projeto de teste (veja `docs/SETUP.md`) |

## Estrutura

```
src/
  App.vue, views/, components/   interface (Hoje, Itens, Histórico, Ajustes, Login)
  lib/                           store, estatísticas, categorias, quickAdd, backup, push, calendário, demo
sw/sw.ts                         service worker: precache, push e ações da notificação
supabase/
  functions/_shared/             lógica pura compartilhada entre a UI e o Deno
  functions/                     tick, push-test, gcal-connect, gcal-callback, gcal-sync
  migrations/, cron.sql, config.toml
docs/                            SPEC, PLAN, TASKS, ROADMAP, SETUP, PROJECT, adr/
```

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [`docs/PROJECT.md`](docs/PROJECT.md) | Visão completa do projeto, limites e áreas para novas ideias |
| [`docs/SPEC.md`](docs/SPEC.md) | Requisitos e regras de negócio |
| [`docs/PLAN.md`](docs/PLAN.md) | Arquitetura, modelo de dados e marcos |
| [`docs/TASKS.md`](docs/TASKS.md) | Checklist de tarefas e validações pendentes |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Backlog priorizado e o que foi adiado de propósito |
| [`docs/SETUP.md`](docs/SETUP.md) | Passo a passo do que só o dono do projeto pode configurar |
| [`docs/adr/`](docs/adr) | Decisões de arquitetura |

## Limitações conhecidas

- O Web Push depende do FCM e da política de bateria do Android; não há garantia de horário exato. Se o atraso for alto demais no aparelho real, o plano B é empacotar com Capacitor.
- O cálculo considera um único dia: dormir depois da meia-noite não é suportado.
- Uma única rotina de acordar e dormir, sem horários diferentes por dia da semana.
- Escrever exige rede; não há modo offline para gravação.
- O código está bem coberto por testes unitários, mas o fluxo completo (push na tela bloqueada, OAuth do Google, reinstalação do PWA) ainda precisa ser validado em aparelho real; veja as validações em `docs/TASKS.md`.

## Convenções

Identificadores de código em inglês; comentários em português, só quando explicam o porquê. O desenvolvimento segue SDD: a documentação em `docs/` e os checklists vêm antes do código, com um commit por checkpoint.
