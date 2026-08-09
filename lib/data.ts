import { subDays } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import type { Notification, Subscription, UsageLog, UserSettings } from '@/lib/types';

export async function getAppData() {
  const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, settings: null as UserSettings | null, subscriptions: [] as Subscription[], usage: [] as UsageLog[], notifications: [] as Notification[] };
  const sevenDaysAgo = subDays(new Date(), 6).toISOString().slice(0, 10);
  const [profile, subscriptions, usage, notifications] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').order('next_renewal_date'),
    supabase.from('usage_logs').select('*').gte('logged_date', sevenDaysAgo),
    supabase.from('notifications').select('*').eq('acknowledged', false).order('sent_at', { ascending: false }).limit(10)
  ]);
  if (profile.error || subscriptions.error || usage.error || notifications.error) throw new Error('Could not load your subscription data.');
  return { user, settings: profile.data as UserSettings, subscriptions: subscriptions.data as Subscription[], usage: usage.data as UsageLog[], notifications: notifications.data as Notification[] };
}
