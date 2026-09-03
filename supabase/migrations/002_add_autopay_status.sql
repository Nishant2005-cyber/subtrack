-- Migration 002: Add Autopay tracking to subscriptions
alter table public.subscriptions 
add column if not exists autopay_status text not null default 'running' 
check (autopay_status in ('running', 'paused', 'deleted'));

-- Set default for existing records
update public.subscriptions set autopay_status = 'running' where autopay_status is null;
