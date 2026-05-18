-- Coffee Garden — Migratie 0003
-- Push notification subscriptions per klant.
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

create table if not exists public.push_subscriptions (
  id bigserial primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count int not null default 0
);

create index if not exists idx_push_subs_customer
  on public.push_subscriptions(customer_id);

create index if not exists idx_push_subs_active
  on public.push_subscriptions(customer_id)
  where failure_count < 5;

-- RLS — alleen service_role kan lezen/schrijven (zoals andere tabellen)
alter table public.push_subscriptions enable row level security;

-- Verify:
--   select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='push_subscriptions';
