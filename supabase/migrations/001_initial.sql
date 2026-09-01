-- Profiles mirror Supabase Auth users. Keep user-created data in public tables.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  notify_email boolean not null default true,
  notify_sms boolean not null default false,
  reminder_days_before integer not null default 2 check (reminder_days_before in (1, 2, 3, 7)),
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  service_name text not null check (char_length(service_name) between 1 and 100),
  category text not null check (category in ('streaming', 'software', 'gym', 'cloud', 'news', 'other')),
  cost numeric(12,2) not null check (cost >= 0),
  currency text not null default 'INR' check (char_length(currency) = 3),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  next_renewal_date date not null,
  status text not null default 'active' check (status in ('active', 'paused', 'canceled')),
  renewal_url text,
  cancel_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  logged_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique(subscription_id, logged_date)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  type text not null check (type in ('renewal_reminder', 'unused_reminder', 'content_suggestion')),
  channel text not null check (channel in ('email', 'sms', 'in_app')),
  sent_at timestamptz not null default now(),
  acknowledged boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists subscriptions_user_renewal_idx on public.subscriptions (user_id, next_renewal_date);
create index if not exists usage_logs_subscription_date_idx on public.usage_logs (subscription_id, logged_date desc);
create index if not exists notifications_subscription_type_idx on public.notifications (subscription_id, type, sent_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute procedure public.touch_updated_at();

alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_logs enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "users read own profile" on public.users;
create policy "users read own profile" on public.users for select using (auth.uid() = id);

drop policy if exists "users update own profile" on public.users;
create policy "users update own profile" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "users insert own profile" on public.users;
create policy "users insert own profile" on public.users for insert with check (auth.uid() = id);

drop policy if exists "users manage own subscriptions" on public.subscriptions;
create policy "users manage own subscriptions" on public.subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users manage own usage" on public.usage_logs;
create policy "users manage own usage" on public.usage_logs for all using (
  exists (select 1 from public.subscriptions s where s.id = subscription_id and s.user_id = auth.uid())
) with check (
  exists (select 1 from public.subscriptions s where s.id = subscription_id and s.user_id = auth.uid())
);

drop policy if exists "users read and acknowledge own notifications" on public.notifications;
create policy "users read and acknowledge own notifications" on public.notifications for select using (
  exists (select 1 from public.subscriptions s where s.id = subscription_id and s.user_id = auth.uid())
);

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications for update using (
  exists (select 1 from public.subscriptions s where s.id = subscription_id and s.user_id = auth.uid())
) with check (
  exists (select 1 from public.subscriptions s where s.id = subscription_id and s.user_id = auth.uid())
);
