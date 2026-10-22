-- Valores que desligariam ou encheriam os alertas de ruído. `not valid`: vale para novas escritas, sem reprovar linhas antigas.
-- Duração acima de 24h empurra todos os prazos para o passado (tudo "atrasado" e 3 pushes por item por dia).
alter table items add constraint items_duration_max check (duration_min <= 1440) not valid;
-- Dormir antes de acordar: o tick considera sempre "fora da janela" e nunca avisa.
alter table profiles add constraint profiles_sleep_after_wake check (sleep_time > wake_time) not valid;
