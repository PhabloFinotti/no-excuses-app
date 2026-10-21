-- Realtime para a tela Hoje atualizar entre aparelhos. A RLS continua valendo para quem assina.
alter publication supabase_realtime add table items, item_completions;
