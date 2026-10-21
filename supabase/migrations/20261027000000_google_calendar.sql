-- Integração com o Google Agenda: só o service role lê o refresh token (sem policy = cliente sem acesso).
create table google_calendar_links (
  user_id uuid primary key references auth.users on delete cascade,
  refresh_token text not null,
  calendar_id text not null, -- calendário secundário "No Excuses", criado pelo app
  connected_at timestamptz not null default now()
);
alter table google_calendar_links enable row level security;

-- Tarefa -> evento no Google. Também só o servidor escreve.
create table calendar_events (
  item_id uuid primary key references items on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  event_id text not null
);
alter table calendar_events enable row level security;

-- O cliente só precisa saber se está conectado (o token nunca sai do servidor).
alter table profiles add column calendar_connected boolean not null default false;
