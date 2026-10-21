-- Resumos diários por push (manhã e fim do dia), com opção de desligar.
alter table profiles
  add column morning_summary boolean not null default true,
  add column evening_summary boolean not null default true,
  add column evening_min int not null default 60 check (evening_min >= 0); -- minutos antes de dormir

-- Só o service role escreve (sem policy = cliente sem acesso). Um resumo de cada tipo por dia.
create table summary_log (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  kind text not null check (kind in ('morning', 'evening')),
  primary key (user_id, day, kind)
);
alter table summary_log enable row level security;
