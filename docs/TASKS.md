# TASKS

## Parei aqui
M0.1 código pronto (build ok); falta você publicar na Vercel e instalar no S21+. M1.1 feito (`calculateState`, 6 testes). Próxima: M0.2 (Supabase, precisa de você) ou M1.2 (schema SQL).

## M0: spike de push (valida o risco principal)
- [~] M0.1 Projeto Vite+Vue+TS+PWA criado (feito) e publicado em HTTPS (pendente: Vercel, framework Vite, `npm run build`, saída `dist`). Pronto: instala no S21+ pelo Chrome ("Adicionar à tela inicial").
- [ ] M0.2 Projeto Supabase criado; signup público desativado; usuário próprio criado.
- [ ] M0.3 Subscription VAPID salva em `push_subscriptions`. Pronto: linha no banco após permitir notificações.
- [ ] M0.4 Edge Function envia push de teste. Pronto: notificação chega com app fechado.
- [ ] M0.5 Medir atraso: `pg_cron` a cada minuto por 24h, com app fechado e tela bloqueada. Registrar resultado em `adr/0001`. Decisão: seguir PWA ou ir para Capacitor.
- [ ] M0.6 Anotar passos de bateria Samsung (sem restrições) para a tela de onboarding.

## M1: núcleo
- [x] M1.1 `calculateState` + testes Vitest: 1 hábito → alerta 22:15 (margem 15); 2 hábitos → limites 22:00/22:30; fixo; déficit.
- [ ] M1.2 Schema SQL + RLS + migrações versionadas. Pronto: usuário B não lê dados do A.
- [ ] M1.3 Login e-mail+senha.
- [ ] M1.4 Config global (acordar/dormir, limites).
- [ ] M1.5 CRUD de itens: hábito (dias da semana) ou tarefa avulsa (data), com duração, fixo, prioridade, limites opcionais.
- [ ] M1.5b Rolagem de tarefas vencidas para hoje ("atrasada de ontem") + descartar. Pronto: tarefa de ontem não feita aparece hoje e entra no cálculo de déficit.
- [ ] M1.6 Lista central do dia com cor por nível e tremor em urgente.
- [ ] M1.7 Concluir com um toque.

## M2: alertas e timer
- [ ] M2.1 Edge Function `tick` com `calculateState` + `notification_log` (sem duplicados).
- [ ] M2.2 `pg_cron` por minuto. Pronto: três níveis chegam no S21+ num dia real.
- [ ] M2.3 Timer persistido (`timer_started_at` + acumulado); sobrevive a app fechado.
- [ ] M2.4 Alerta de déficit + sugestão de pular hábito não essencial.
- [ ] M2.5 Onboarding de bateria/permissões.

## M3: histórico
- [ ] M3.1 Gravar `item_completions` por dia (feito + tempo gasto).
- [ ] M3.2 Tela de histórico (calendário).
- [ ] M3.3 Estatísticas (% conclusão, tempo médio, streak).
