import { subDays } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import type { Notification, Subscription, UsageLog, UserSettings } from '@/lib/types';

export async function getAppData() {
  const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, settings: null as UserSettings | null, subscriptions: [] as Subscription[], usage: [] as UsageLog[], notifications: [] as Notification[] };
  const sevenDaysAgo = subDays(new Date(), 6).toISOString().slice(0, 10);
  const [profileRes, subscriptions, usage, notifications] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('*').order('next_renewal_date'),
    supabase.from('usage_logs').select('*').gte('logged_date', sevenDaysAgo),
    supabase.from('notifications').select('*').eq('acknowledged', false).order('sent_at', { ascending: false }).limit(10)
  ]);

  let profile = profileRes.data;
  if (!profile && !profileRes.error) {
    // If profile row doesn't exist yet, create default profile row
    const { data: created } = await supabase.from('users').insert({ id: user.id, email: user.email }).select('*').maybeSingle();
    profile = created;
  }

  const firstError = profileRes.error || subscriptions.error || usage.error || notifications.error;
  if (firstError) {
    if (firstError.message?.toLowerCase().includes('jwt') || firstError.code === 'PGRST301') {
      // Clock skew or invalid/stale JWT token: gracefully return unauthenticated state so pages redirect to /login
      return { user: null, settings: null as UserSettings | null, subscriptions: [] as Subscription[], usage: [] as UsageLog[], notifications: [] as Notification[] };
    }
    console.error('Supabase getAppData Error Details:', {
      user: profileRes.error,
      subscriptions: subscriptions.error,
      usage: usage.error,
      notifications: notifications.error,
    });
    throw new Error(`Database error: ${firstError.message ?? 'Could not load subscription data'}. (Make sure you have run supabase/migrations/001_initial.sql in Supabase SQL editor)`);
  }

  return { user, settings: profile as UserSettings, subscriptions: (subscriptions.data ?? []) as Subscription[], usage: (usage.data ?? []) as UsageLog[], notifications: (notifications.data ?? []) as Notification[] };
}

export async function getAllNotifications() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, notifications: [] as (Notification & { subscription?: Subscription })[] };

  const [{ data: notifications }, { data: subscriptions }] = await Promise.all([
    supabase.from('notifications').select('*').order('sent_at', { ascending: false }),
    supabase.from('subscriptions').select('*')
  ]);

  const subMap = new Map(((subscriptions ?? []) as Subscription[]).map(s => [s.id, s]));
  const list = ((notifications ?? []) as Notification[]).map(n => ({
    ...n,
    subscription: subMap.get(n.subscription_id),
  }));

  return { user, notifications: list };
}
