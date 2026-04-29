-- 6726.Bet — Schema Supabase
-- Rode isto uma vez no SQL Editor do seu projeto Supabase.
-- É idempotente (use IF NOT EXISTS / CREATE OR REPLACE onde possível).

-- =========================
-- Tabelas
-- =========================

-- users: uma linha por usuário
create table if not exists public.users (
  username      text primary key,
  nickname      text,
  email         text,
  password_hash text not null,          -- sha-256 (hex) calculado no cliente
  balance       numeric(14,2) not null default 0,
  total_bet     numeric(14,2) not null default 0,
  total_won     numeric(14,2) not null default 0,
  total_deposited  numeric(14,2) not null default 0,
  total_withdrawn  numeric(14,2) not null default 0,
  vip_points    integer not null default 0,
  banned        boolean not null default false,
  bonus_claimed_signup boolean not null default false,
  last_login    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- config: linha única (id=1)
create table if not exists public.config (
  id            integer primary key default 1,
  data          jsonb not null,
  updated_at    timestamptz not null default now(),
  constraint single_row check (id = 1)
);

-- transactions: histórico global
create table if not exists public.transactions (
  id          bigserial primary key,
  username    text not null references public.users(username) on delete cascade,
  type        text not null,  -- deposit | withdraw | bet | win | bonus
  amount      numeric(14,2) not null,
  label       text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_tx_username   on public.transactions(username);
create index if not exists idx_tx_created_at on public.transactions(created_at desc);

-- chats: threads (DEPOSITO-<user>, SAQUE-<user>, etc.)
create table if not exists public.chats (
  id          text primary key,
  username    text not null references public.users(username) on delete cascade,
  type        text not null,   -- DEPOSITO | SAQUE | SUPORTE
  last_ts     timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- chat_messages
create table if not exists public.chat_messages (
  id          bigserial primary key,
  thread_id   text not null references public.chats(id) on delete cascade,
  from_role   text not null,   -- user | admin | system
  text        text not null,
  read_user   boolean not null default false,
  read_admin  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_msg_thread on public.chat_messages(thread_id, created_at);

-- notificações
create table if not exists public.notifications (
  id          bigserial primary key,
  username    text not null,  -- ou "__admin__"
  title       text,
  body        text,
  kind        text default 'info',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications(username, read, created_at desc);

-- bonus claims por usuário (objeto simples)
create table if not exists public.bonus_claims (
  username    text primary key references public.users(username) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- histórico de jogadas
create table if not exists public.game_history (
  id          bigserial primary key,
  username    text not null references public.users(username) on delete cascade,
  game_id     text not null,
  bet         numeric(14,2) not null,
  win         numeric(14,2) not null default 0,
  reels       jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_hist_user on public.game_history(username, created_at desc);

-- modo vitória por usuário (admin tool)
create table if not exists public.winning_mode (
  username    text primary key references public.users(username) on delete cascade,
  mode        jsonb,            -- null | "always" | "never" | { boost: 0.3 }
  updated_at  timestamptz not null default now()
);

-- =========================
-- Trigger para updated_at
-- =========================
create or replace function public.tg_touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists users_touch on public.users;
create trigger users_touch before update on public.users
for each row execute procedure public.tg_touch_updated_at();

-- =========================
-- RLS (Row Level Security)
-- =========================
-- Estratégia: como o projeto não usa Supabase Auth (usamos login custom
-- via hash de senha na tabela users), o acesso ao banco é feito com a
-- chave ANON do frontend. RLS fica em modo "aberto" nas tabelas de dados
-- (leitura/escrita permitida para anon) — a consistência de quem pode
-- fazer o quê é enforçada no cliente (DB.js).
--
-- Se no futuro migrar para Supabase Auth, trocar estas policies para
-- restringir por auth.uid(). Aqui deixo as policies abertas para anon
-- explicitamente, pra ficar intencional e documentado.

alter table public.users            enable row level security;
alter table public.config           enable row level security;
alter table public.transactions     enable row level security;
alter table public.chats            enable row level security;
alter table public.chat_messages    enable row level security;
alter table public.notifications    enable row level security;
alter table public.bonus_claims     enable row level security;
alter table public.game_history     enable row level security;
alter table public.winning_mode     enable row level security;

-- Helper: recria policy (drop + create)
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'users','config','transactions','chats','chat_messages',
    'notifications','bonus_claims','game_history','winning_mode'
  ]) loop
    execute format('drop policy if exists "anon_all_%s" on public.%I;', t, t);
    execute format(
      'create policy "anon_all_%s" on public.%I for all to anon using (true) with check (true);',
      t, t
    );
  end loop;
end $$;

-- =========================
-- Realtime
-- =========================
-- Habilite Realtime no painel (Database → Replication) para as tabelas
-- users, transactions, chat_messages, notifications, bonus_claims,
-- game_history. Ou use os comandos abaixo:
-- alter publication supabase_realtime add table public.users;
-- alter publication supabase_realtime add table public.transactions;
-- alter publication supabase_realtime add table public.chat_messages;
-- alter publication supabase_realtime add table public.notifications;
