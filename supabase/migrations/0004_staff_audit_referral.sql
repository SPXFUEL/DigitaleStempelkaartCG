-- Coffee Garden — Migratie 0004
-- Per-barista accounts, audit-log, e-mail verificatie, referral + extra customer-kolommen.
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

-- ============================================================
-- 1. customers: extra kolommen voor email-verificatie + referral
-- ============================================================

alter table public.customers
  add column if not exists email_verified boolean not null default false,
  add column if not exists referred_by uuid references public.customers(id) on delete set null,
  add column if not exists referrals_count int not null default 0;

create index if not exists idx_customers_referred_by
  on public.customers(referred_by)
  where referred_by is not null;

-- ============================================================
-- 2. stamp_events: 'welcome' en 'referral' event-types, staff-id + reversed-flag
-- ============================================================

do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.stamp_events'::regclass and contype = 'c'
  loop
    execute format('alter table public.stamp_events drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.stamp_events
  add constraint stamp_events_type_check
  check (type in ('stamp', 'redeem', 'birthday', 'welcome', 'referral'));

alter table public.stamp_events
  add column if not exists staff_user_id uuid,
  add column if not exists reversed boolean not null default false;

-- ============================================================
-- 3. staff_users: per-barista accounts
-- ============================================================

create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  role text not null check (role in ('barista', 'admin')) default 'barista',
  pin_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  deactivated_at timestamptz
);

create index if not exists idx_staff_users_active
  on public.staff_users(id)
  where deactivated_at is null;

alter table public.staff_users enable row level security;

-- FK voor stamp_events → staff_users (alleen voor nieuwe rijen)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stamp_events_staff_user_id_fkey'
  ) then
    alter table public.stamp_events
      add constraint stamp_events_staff_user_id_fkey
      foreign key (staff_user_id) references public.staff_users(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- 4. audit_log: alle staff-acties + customer-mutaties
-- ============================================================

create table if not exists public.audit_log (
  id bigserial primary key,
  action text not null,
  customer_id uuid references public.customers(id) on delete set null,
  staff_user_id uuid references public.staff_users(id) on delete set null,
  ip text,
  user_agent text,
  meta jsonb,
  at timestamptz not null default now()
);

create index if not exists idx_audit_at on public.audit_log(at desc);
create index if not exists idx_audit_customer on public.audit_log(customer_id, at desc);
create index if not exists idx_audit_staff on public.audit_log(staff_user_id, at desc);
create index if not exists idx_audit_action on public.audit_log(action, at desc);

alter table public.audit_log enable row level security;

-- ============================================================
-- 5. email_tokens: double opt-in verificatie
-- ============================================================

create table if not exists public.email_tokens (
  token text primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  email text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_tokens_customer
  on public.email_tokens(customer_id, created_at desc);

alter table public.email_tokens enable row level security;

-- ============================================================
-- 6. updated_at trigger op staff_users
-- ============================================================

-- (geen update_at op staff_users — last_login_at is goed genoeg)

-- ============================================================
-- 7. Index voor de bewaartermijn-cleanup cron
-- ============================================================

create index if not exists idx_customers_updated_at_asc
  on public.customers(updated_at asc);

-- ============================================================
-- Verify:
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='customers';
--   → moet email_verified, referred_by, referrals_count tonen
--   select count(*) from public.staff_users;        -- 0 (nog te seeden)
--   select count(*) from public.audit_log;          -- 0
--   select count(*) from public.email_tokens;       -- 0
-- ============================================================
