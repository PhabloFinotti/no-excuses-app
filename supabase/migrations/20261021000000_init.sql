-- Hábitos e tarefas avulsas na mesma tabela (ADR 0004). Tudo com RLS por user_id (ADR 0003).
create table profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  wake_time time not null default '07:00',
  sleep_time time not null default '23:00',
  tz text not null default 'America/Sao_Paulo',
  warn_min int not null default 30 check (warn_min >= 0),
  urgent_min int not null default 10 check (urgent_min >= 0)
);

create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('habit', 'task')),
  name text not null check (length(trim(name)) > 0),
  duration_min int not null check (duration_min > 0),
  fixed_time time,
  weekdays smallint[] not null default '{}', -- 0 = domingo
  due_date date,
  essential boolean not null default false,
  warn_min int check (warn_min >= 0),
  urgent_min int check (urgent_min >= 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (kind = 'habit' and cardinality(weekdays) > 0 and due_date is null)
    or (kind = 'task' and due_date is not null)
  )
);

-- Hábito: uma linha por dia. Tarefa: uma linha só, com day = due_date.
create table item_completions (
  item_id uuid not null references items on delete cascade,
  day date not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  done boolean not null default false,
  skipped boolean not null default false,
  spent_min int not null default 0,
  timer_started_at timestamptz,
  timer_accum_s int not null default 0,
  primary key (item_id, day)
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Só a Edge Function (service role) escreve aqui; sem policy, o cliente não acessa.
create table notification_log (
  item_id uuid not null references items on delete cascade,
  day date not null,
  level text not null check (level in ('attention', 'urgent', 'overdue')),
  sent_at timestamptz not null default now(),
  primary key (item_id, day, level)
);

alter table profiles enable row level security;
alter table items enable row level security;
alter table item_completions enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_log enable row level security;

create policy own_profiles on profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_items on items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_push on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_completions on item_completions for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from items i where i.id = item_id and i.user_id = auth.uid())
  );

create index items_user_idx on items (user_id) where not archived;
create index completions_day_idx on item_completions (user_id, day);
