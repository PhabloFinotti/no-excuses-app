# PLAN

## Stack
Vue 3 + TS + Vite + Pinia + `vite-plugin-pwa`; Supabase (Postgres, Auth, Edge Functions, pg_cron); Cloudflare Pages/Netlify (HTTPS obrigatório); Vitest.

## Arquitetura
- `src/lib/calcularEstado.ts`: função pura `calcularEstado(habitos, agora, config)`. Usada pela UI e pela Edge Function (importada em Deno, sem dependências de Vue).
- `pg_cron` a cada minuto → Edge Function `tick`: carrega hábitos pendentes do dia, chama `calcularEstado`, envia Web Push (`urgency: high`) quando um nível foi cruzado e ainda não está em `notification_log`.
- Service worker recebe o push e mostra a notificação; a UI recalcula ao abrir.
- Plano B se o push atrasar demais no M0: Vue + Capacitor (`@capacitor/local-notifications`).

## Modelo de dados (todas com `user_id`, RLS `user_id = auth.uid()`)
- `profiles`: wake_time, sleep_time, tz, warn_min, urgent_min
- `items` (hábitos e tarefas): kind (`habit`|`task`), name, duration_min, fixed_time?, weekdays int[] (habit), due_date (task), priority, warn_min?, urgent_min?, archived
- `item_completions`: item_id, day, done, spent_min, timer_started_at?, timer_accum_s (task: uma linha só, ao concluir)
- Tarefa pendente com `due_date` < hoje entra na lista de hoje como "atrasada de ontem"; `calcularEstado` não muda.
- `push_subscriptions`: endpoint, keys
- `notification_log`: habit_id, day, level (unique)

## Marcos
M0 spike push no S21+ → M1 CRUD + lista + concluir → M2 cron + escalonamento + timer + déficit → M3 histórico e estatísticas.
