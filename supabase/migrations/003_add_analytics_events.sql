-- Migration 003: Add Analytics Events telemetry table
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  event_name text not null,
  properties jsonb default '{}'::jsonb,
  page_url text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.analytics_events enable row level security;

-- Policies
create policy "Users can view own analytics events"
  on public.analytics_events for select
  using (auth.uid() = user_id);

create policy "Anyone can insert analytics events"
  on public.analytics_events for insert
  with check (true);

-- Indexes for efficient reporting and aggregation
create index if not exists idx_analytics_user_created 
  on public.analytics_events(user_id, created_at desc);

create index if not exists idx_analytics_event_created 
  on public.analytics_events(event_name, created_at desc);
