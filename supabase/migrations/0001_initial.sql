-- Coffee Garden — Digitale Stempelkaart
-- Initial schema: customers + stamp_events
-- Run this in Supabase Dashboard → SQL Editor → New query → paste → Run

create extension if not exists "pgcrypto";

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  email text,
  stamps int not null default 0 check (stamps >= 0),
  total_drinks int not null default 0 check (total_drinks >= 0),
  total_rewards int not null default 0 check (total_rewards >= 0),
  reward_available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stamp_events (
  id bigserial primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('stamp', 'redeem')),
  at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_stamp_events_customer
  on public.stamp_events(customer_id, at desc);

create index if not exists idx_customers_updated
  on public.customers(updated_at desc);

create index if not exists idx_customers_email
  on public.customers(email)
  where email is not null;

-- ============================================================
-- updated_at trigger
-- ============================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.touch_updated_at();

-- ============================================================
-- RLS — strict deny by default
-- All app traffic goes through Next.js API routes that use the
-- service_role key (which bypasses RLS). No anon/auth access needed.
-- ============================================================

alter table public.customers enable row level security;
alter table public.stamp_events enable row level security;

-- No policies = nothing allowed for anon/authenticated.
-- service_role bypasses RLS by design.

-- ============================================================
-- Verify
-- ============================================================
-- After running this, in SQL Editor:
--   select * from public.customers;   -- should return 0 rows, no error
--   select * from public.stamp_events; -- idem
