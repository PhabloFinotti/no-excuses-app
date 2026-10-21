-- Tolerância (min) após o horário de um item fixo antes de virar "atrasado".
alter table profiles add column fixed_grace_min int not null default 15 check (fixed_grace_min >= 0);
