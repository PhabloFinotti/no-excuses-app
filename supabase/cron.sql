-- Rodar uma vez no SQL Editor (NÃO é migração: contém segredos). Troque os placeholders.
-- Antes: Database > Extensions > habilitar pg_cron e pg_net.
select cron.schedule(
  'tick-every-minute',
  '* * * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/tick',
       headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb
     ) $$
);
-- Para remover: select cron.unschedule('tick-every-minute');
