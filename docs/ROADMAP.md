# ROADMAP

Backlog priorizado a partir do brainstorming pós-MVP. Itens viram tarefas em `TASKS.md` ao entrar numa fase.
Legenda: **S** pequeno (<1h), **M** médio, **L** grande. `[?]` = decisão em aberto antes de implementar.

## Fase 0: validar o que existe (gate para o resto)
Já listado em `TASKS.md` (V1 a V7). Acrescento:
- [ ] F0.1 Usar o app 2 a 3 dias reais e anotar atritos em `docs/NOTES.md`. Pronto: lista de problemas reais priorizada.
- [ ] F0.2 Se o atraso do push (V4) for > ~2 min no S21+, antecipar a Fase 4 (Capacitor) e repriorizar.

## Fase 1: correções e robustez (S/M)
- [ ] F1.1 **Teste da `tick`**: extrair a lógica por usuário para uma função pura (`runTick(profile, items, completions, log, now)` → lista de pushes) e testar com Vitest com relógio simulado. Pronto: testes cobrem 3 níveis, sem repetição, fora da janela acordado, tarefa rolada.
- [ ] F1.2 **Rodar as Edge Functions localmente** (Deno + `supabase functions serve`) e documentar em `SETUP.md`.
- [ ] F1.3 **CI**: GitHub Actions com `npm test` e `npm run build` a cada push/PR.
- [ ] F1.4 **Ícone do PWA** definitivo (192, 512 e maskable) e `theme_color` revisado.
- [ ] F1.5 **Fuso**: botão "usar o fuso do aparelho" em Ajustes (`Intl.DateTimeFormat().resolvedOptions().timeZone`). Validar que o IANA digitado existe antes de salvar.
- [ ] F1.6 **Hábito fixo que já passou**: tolerância configurável (ex.: 15 min) antes de virar "atrasado" e ação "perdi, pular hoje" em destaque. [?] valor padrão da tolerância.
- [ ] F1.7 **Tarefa rolada há muitos dias**: após N dias (padrão 3) mostrar aviso "reagendar ou descartar?" e parar de pesar no déficit. [?] N e se continua entrando no déficit.
- [ ] F1.8 **Realtime**: assinar `items` e `item_completions` para a tela Hoje atualizar entre aparelhos sem recarregar.
- [ ] F1.9 **Onboarding** (tela de primeiro uso): passos de permissão de notificação, bateria "Sem restrições" e instalar o PWA, com verificação do que dá para detectar.
- [ ] F1.10 **Limpeza de `notification_log`**: apagar linhas com mais de 30 dias (job do pg_cron semanal).
- [ ] F1.11 **Tratamento de erro visível** nas ações (concluir, timer): hoje falha silenciosa. Toast simples + retry.

## Fase 2: uso diário (M)
- [ ] F2.1 **Adiar (snooze)**: botão "Adiar 10 min" no card. Coluna `snoozed_until timestamptz` em `item_completions`; `tick` ignora item adiado até o horário. Migração nova.
- [ ] F2.2 **Ações na notificação** ("Feito", "Adiar 10 min"). [?] como o service worker autentica: (a) abrir o app com `?action=done&item=ID` (simples, abre a tela) ou (b) endpoint da Edge Function com token por subscription (sem abrir o app, mais código e superfície de ataque). Recomendação: começar por (a).
- [ ] F2.3 **Resumo da manhã**: push ao horário de acordar com nº de itens e tempo total do dia. Estender o `check` de `notification_log.level` para `summary`. Opção para desligar em Ajustes.
- [ ] F2.4 **Aviso do fim do dia**: ao entrar nos últimos X min antes de dormir, push com o que ficou pendente.
- [ ] F2.5 **Lista agrupada**: seções "Agora" (atenção/urgente/atrasado), "Mais tarde" e "Feitos".
- [ ] F2.6 **Adicionar rápido**: campo único "Nome 30" no topo de Itens (nome + duração), hábito diário por padrão ou tarefa de hoje.
- [ ] F2.7 **Quiet days**: desligar alertas de um hábito/dia específico sem arquivar (opcional, só se F0.1 mostrar necessidade).

## Fase 3: funcionalidades maiores (M/L)
- [ ] F3.1 **Estimativa vs real**: comparar `duration_min` com a média do timer e sugerir ajustar. Reusa `stats.ts`.
- [ ] F3.2 **Recorrência mensal** ("dia 1 de cada mês") e **meta semanal** ("3x por semana, dia livre"). Exige nova regra em `isPending` e no esquema (`recurrence jsonb`?). [?] só se F0.1 pedir; é mexer no coração do modelo.
- [ ] F3.3 **Exportar CSV** (itens e conclusões).
- [ ] F3.4 **Modo foco**: timer em tela cheia com wake lock (`navigator.wakeLock`).
- [ ] F3.5 **Subtarefas e etiquetas** (lado Todoist). Adiar até haver uso real; custo alto de UI.
- [ ] F3.6 **Importar de um backup JSON** (par do export).

## Fase 4: contingência
- [ ] F4.1 **Capacitor** (Vue + `@capacitor/local-notifications`), caso o Web Push seja pouco confiável. Alarmes locais exatos; o `tick` vira só fallback. Acionada por F0.2.

## Ordem sugerida
F0 → F1.1, F1.3, F1.11 → F2.1, F2.2, F2.3 → F1.4 a F1.10 conforme incomodar → F2.5, F2.6 → F3 sob demanda.
Motivo: primeiro garantir que o núcleo (alerta) é testável e confiável, depois o que mais muda o uso diário.

## Riscos transversais
- Cada nova coluna ou nível de alerta exige migração e atualização de `calculateState`/`tick` juntos, para UI e push não divergirem (ADR 0002).
- Mais tipos de push aumentam a chance de notificação demais; manter opção de desligar cada tipo em Ajustes.
