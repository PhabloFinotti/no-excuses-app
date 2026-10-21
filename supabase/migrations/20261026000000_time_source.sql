-- De onde veio o tempo registrado: timer, ajuste manual ou o previsto (concluído sem timer).
-- Linhas antigas ficam null; com spent_min > 0 vieram do timer.
alter table item_completions add column time_source text check (time_source in ('timer', 'manual', 'planned'));
