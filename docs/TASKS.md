# TASKS

## Parei aqui
Código dos marcos M0–M3 escrito, com testes unitários (16) e build passando. Falta tudo que depende de infraestrutura real: siga `docs/SETUP.md`, depois valide os itens da seção "Validação pendente".
Nada disso foi executado contra um Supabase real nem num aparelho.

## M0: spike de push
- [x] M0.1 Projeto Vite+Vue+TS+PWA criado.
- [x] M0.3 Subscription VAPID salva em `push_subscriptions` (`src/lib/push.ts`, botão em Ajustes).
- [x] M0.4 Edge Function `push-test` (botão "Enviar teste").
- [x] M0.6 Passos de bateria Samsung (texto em Ajustes e `SETUP.md`).

## M1: núcleo
- [x] M1.1 `calculateState` + testes.
- [x] M1.2 Schema SQL + RLS (`supabase/migrations/20261021000000_init.sql`; validado com PGlite, RLS não testada).
- [x] M1.3 Login e-mail+senha.
- [x] M1.4 Config global (acordar/dormir, fuso, limites).
- [x] M1.5 CRUD de itens (hábito/tarefa, duração, fixo, dias, essencial, limites).
- [x] M1.5b Rolagem de tarefas vencidas ("atrasada de ontem") + descartar.
- [x] M1.6 Lista do dia com cor por nível e tremor em urgente (respeita reduced-motion).
- [x] M1.7 Concluir, pular, desfazer.

## M2: alertas e timer
- [x] M2.1 Edge Function `tick` + `notification_log`.
- [x] M2.2 `supabase/cron.sql` (por minuto).
- [x] M2.3 Timer persistido (`timer_started_at` + acumulado).
- [x] M2.4 Banner de déficit + sugestão de pular.
- [x] M2.5 Instruções de bateria/permissões em Ajustes (sem tela de onboarding dedicada).

## M3: histórico
- [x] M3.1 Gravar `item_completions` por dia.
- [x] M3.2 Calendário de 30 dias.
- [x] M3.3 Estatísticas (% conclusão, tempo médio, sequência).

## Validação pendente (precisa de você)
- [ ] V1 Publicar na Vercel e instalar no S21+ (M0.1 completo).
- [ ] V2 Supabase criado, migração aplicada, signup desativado, usuário criado (M0.2).
- [ ] V3 Push de teste chega com o app fechado (M0.4).
- [ ] V4 Medir atraso por 24h e registrar em `adr/0001` (M0.5). Decide PWA vs Capacitor.
- [ ] V5 Os 3 níveis chegam num dia real (M2.2) e não repetem.
- [ ] V6 RLS: segundo usuário não lê dados do primeiro.
- [ ] V7 Tarefa de ontem não feita aparece hoje e entra no déficit (M1.5b).
