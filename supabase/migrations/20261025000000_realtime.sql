-- Realtime para a tela Hoje atualizar entre aparelhos. A RLS continua valendo para quem assina.
-- Idempotente: se a tabela já foi publicada (ex.: pelo painel), não falha.
do $$
declare t text;
begin
  foreach t in array array['items', 'item_completions'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
