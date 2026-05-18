-- Coffee Garden — Migratie 0002
-- Voegt birthday-velden toe + 'birthday' event-type
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

-- ============================================================
-- 1. Birthday-kolommen op customers
-- ============================================================

alter table public.customers
  add column if not exists birthday date,
  add column if not exists birthday_redeemed_year smallint;

-- ============================================================
-- 2. 'birthday' als geldig event-type
-- (drop bestaande CHECK constraint en zet 'm opnieuw met extra waarde)
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
  check (type in ('stamp', 'redeem', 'birthday'));

-- ============================================================
-- Verify
-- ============================================================
--   select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='customers';
-- → moet 'birthday' (date) en 'birthday_redeemed_year' (smallint) tonen.
