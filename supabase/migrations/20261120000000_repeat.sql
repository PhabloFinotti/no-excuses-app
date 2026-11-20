-- Item repetido no dia (ex.: colírio 5x, a cada 2h): hábito com meta de vezes, intervalo e horário do primeiro aviso.
-- times_per_day null = hábito comum (uma vez). repeat_from null = primeiro aviso na hora de acordar.
alter table items
  add column times_per_day smallint check (times_per_day between 2 and 24),
  add column interval_min smallint check (interval_min between 15 and 720),
  add column repeat_from time,
  add column emoji text check (emoji is null or length(emoji) between 1 and 16), -- null = emoji da categoria
  add column ends_on date, -- último dia do hábito (inclusive); depois some do Hoje e para de avisar
  add constraint items_repeat_habit check (times_per_day is null or (kind = 'habit' and interval_min is not null));

-- Horário de cada vez registrada no dia, na mesma linha do dia (done vira true ao bater a meta).
alter table item_completions add column done_times timestamptz[] not null default '{}';

-- Um aviso por vez registrada: dose-1, dose-2... (os níveis de prazo continuam iguais).
alter table notification_log drop constraint notification_log_level_check;
alter table notification_log add constraint notification_log_level_check
  check (level in ('attention', 'urgent', 'overdue') or level ~ '^dose-[0-9]{1,2}$');
