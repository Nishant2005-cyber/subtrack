-- Migration 004: Shared Plans, Budget Caps, and Price-Hike History
-- Non-breaking migration adding optional capability columns

alter table public.subscriptions
  add column if not exists is_shared boolean not null default false,
  add column if not exists split_count int default 1,
  add column if not exists my_share numeric(10,2) default null,
  add column if not exists shared_members jsonb default '[]'::jsonb,
  add column if not exists price_history jsonb default '[]'::jsonb;

alter table public.users
  add column if not exists monthly_budget_cap numeric(10,2) default null,
  add column if not exists annual_budget_cap numeric(10,2) default null;
