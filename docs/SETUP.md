# SETUP (o que só você pode fazer)

1. **Supabase:** crie o projeto, depois `supabase login && supabase link --project-ref <ref> && supabase db push` (aplica as migrações).
   Authentication → desative "Allow new users to sign up"; em Users, crie o seu usuário (auto confirm).
2. **VAPID:** `npx web-push generate-vapid-keys` (guarde as duas chaves).
3. **Segredos das functions** (Supabase CLI logado e linkado: `supabase login && supabase link --project-ref <ref>`):
   ```
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:voce@exemplo.com CRON_SECRET=$(openssl rand -hex 24)
   ```
4. **Deploy das functions:** `supabase functions deploy tick --no-verify-jwt` e `supabase functions deploy push-test`.
5. **Cron:** habilite as extensões `pg_cron` e `pg_net`; rode `supabase/cron.sql` com `<PROJECT_REF>` e `<CRON_SECRET>` trocados.
6. **Vercel:** importe o repo (framework Vite). Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (a publishable, antiga `anon`; nunca a secret/`service_role`), `VITE_VAPID_PUBLIC_KEY`.
7. **S21+:** abra a URL no Chrome → Adicionar à tela inicial → entre → Ajustes → Ativar → Enviar teste.
   Bateria: Configurações → Aplicativos → No Excuses → Bateria → "Sem restrições".
8. **Medir atraso (M0.5):** deixe 24h com o app fechado e a tela bloqueada. Compare o horário de `notification_log.sent_at` com a hora em que a notificação apareceu. Anote em `adr/0001`.

## Rodar as Edge Functions localmente (F1.2)
Requer Docker e a CLI do Supabase.
```
supabase start                      # banco local + auth
supabase functions serve --env-file supabase/.env.local   # VAPID_*, CRON_SECRET, SUPABASE_*
curl -X POST localhost:54321/functions/v1/tick -H "x-cron-secret: $CRON_SECRET"
```
A lógica do `tick` está em `supabase/functions/_shared/runTick.ts` e é coberta por `npm test`; o I/O (banco, web-push) só se valida assim ou em produção.
