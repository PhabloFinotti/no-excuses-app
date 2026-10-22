-- category: null = automática (o app descobre pelo nome); 'none' = sem categoria; ou a chave de uma categoria do app.
-- archived_at: até quando um hábito arquivado conta como "agendado" no histórico (senão ele pareceria falhar para sempre).
alter table items
  add column category text check (category is null or length(category) between 1 and 32),
  add column archived_at timestamptz;

update items set archived_at = now() where archived and archived_at is null;
