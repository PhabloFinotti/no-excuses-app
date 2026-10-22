-- Passa a valer também para as linhas antigas (as constraints da 20261028 eram `not valid`).
-- Se falhar, corrija as linhas apontadas (duração > 1440 ou dormir <= acordar) e rode de novo.
alter table items validate constraint items_duration_max;
alter table profiles validate constraint profiles_sleep_after_wake;
