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

## Modo demo (UI sem backend)
`npm run dev:demo` sobe o app com um Supabase falso em memória (`src/lib/demo.ts`), com dados relativos ao horário atual (itens urgentes, atrasados, histórico). Não precisa de login nem de `.env`. Os dados somem ao recarregar.

## Google Agenda (sincronização das tarefas)
O app cria um calendário próprio "No Excuses" e só mexe nele (escopo `calendar.app.created`); não enxerga seus outros calendários.

1. **Google Cloud Console** → crie um projeto → *APIs e serviços* → ative a **Google Calendar API**.
2. **Tela de consentimento OAuth**: tipo *Externo*, nome "No Excuses", seu e-mail como contato. Em *Escopos*, adicione `.../auth/calendar.app.created`.
   - Em *Usuários de teste*, adicione o seu e-mail. **Atenção:** enquanto o app estiver em "Teste", o Google expira o refresh token em 7 dias e você terá que reconectar. Para uso contínuo, clique em *Publicar app* (aparecerá o aviso "app não verificado" só para você; a necessidade de verificação para esse escopo não foi confirmada, veja a tela de consentimento).
3. **Credenciais** → *Criar credenciais* → *ID do cliente OAuth* → tipo *Aplicativo da Web*. Em *URIs de redirecionamento autorizados* coloque exatamente:
   `https://<PROJECT_REF>.supabase.co/functions/v1/gcal-callback`
   Guarde o **Client ID** e o **Client secret**.
4. **Segredos e deploy** (Supabase CLI linkada):
   ```
   supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... GCAL_STATE_SECRET=$(openssl rand -hex 24) APP_URL=https://<seu-app>.vercel.app
   supabase db push
   supabase functions deploy gcal-connect
   supabase functions deploy gcal-sync
   supabase functions deploy gcal-callback --no-verify-jwt
   ```
5. No app: **Ajustes → Google Agenda → Conectar**. Aprove no Google; você volta ao app já conectado. Use "Enviar tarefas pendentes" para as que já existiam.
