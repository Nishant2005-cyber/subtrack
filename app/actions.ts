'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Category, Cycle, Status } from '@/lib/types';

const validCategories: Category[] = ['streaming', 'software', 'gym', 'cloud', 'news', 'other'];
const validCycles: Cycle[] = ['monthly', 'yearly'];
const validStatuses: Status[] = ['active', 'paused', 'canceled'];
function string(data: FormData, key: string) { return String(data.get(key) ?? '').trim(); }
function safeUrl(value: string) { if (!value) return null; try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null; } catch { return null; } }
async function currentUser() { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/login'); return { supabase, user }; }
function refreshAll(subscriptionId?: string) { ['/dashboard', '/spending', '/calendar', '/settings', '/notifications'].forEach(path => revalidatePath(path)); if (subscriptionId) revalidatePath(`/subscriptions/${subscriptionId}`); }

export async function saveSubscription(formData: FormData) {
  const { supabase, user } = await currentUser();
  const id = string(formData, 'id'); const service_name = string(formData, 'service_name');
  let category = string(formData, 'category').toLowerCase() as Category;
  const custom_category = string(formData, 'custom_category').toLowerCase();
  if (category === 'other' && custom_category) {
    category = custom_category as Category;
  }
  const billing_cycle = string(formData, 'billing_cycle') as Cycle;
  const cost = Number(string(formData, 'cost')); const currency = string(formData, 'currency').toUpperCase(); const next_renewal_date = string(formData, 'next_renewal_date');
  if (!service_name || !category || category.length > 50 || !validCycles.includes(billing_cycle) || !Number.isFinite(cost) || cost < 0 || !/^[A-Z]{3}$/.test(currency) || !/^\d{4}-\d{2}-\d{2}$/.test(next_renewal_date)) throw new Error('Please provide valid subscription details.');
  const payload = { service_name, category, cost, currency, billing_cycle, next_renewal_date, renewal_url: safeUrl(string(formData, 'renewal_url')), cancel_url: safeUrl(string(formData, 'cancel_url')) };
  const result = id ? await supabase.from('subscriptions').update(payload).eq('id', id).eq('user_id', user.id) : await supabase.from('subscriptions').insert({ ...payload, user_id: user.id });
  if (result.error) throw new Error(result.error.message); refreshAll(id || undefined);
}

export async function logUsage(subscriptionId: string) {
  const { supabase } = await currentUser();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('usage_logs').upsert({ subscription_id: subscriptionId, logged_date: today }, { onConflict: 'subscription_id,logged_date', ignoreDuplicates: true });
  if (error) throw new Error(error.message); refreshAll(subscriptionId);
}

export async function setSubscriptionStatus(subscriptionId: string, status: Status) {
  if (!validStatuses.includes(status)) throw new Error('Invalid subscription status.');
  const { supabase } = await currentUser(); const { error } = await supabase.from('subscriptions').update({ status }).eq('id', subscriptionId);
  if (error) throw new Error(error.message);
  if (status === 'canceled') {
    await supabase.from('notifications').update({ acknowledged: true }).eq('subscription_id', subscriptionId).eq('acknowledged', false);
  }
  refreshAll(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
  return setSubscriptionStatus(subscriptionId, 'canceled');
}

export async function deleteSubscription(subscriptionId: string) {
  const { supabase } = await currentUser(); const { error } = await supabase.from('subscriptions').delete().eq('id', subscriptionId);
  if (error) throw new Error(error.message); refreshAll(subscriptionId);
}

export async function acknowledgeNotification(notificationId: string) {
  const { supabase } = await currentUser(); const { data, error: readError } = await supabase.from('notifications').select('subscription_id,type').eq('id', notificationId).single();
  if (readError || !data) throw new Error('Notification not found.');
  const { error } = await supabase.from('notifications').update({ acknowledged: true }).eq('subscription_id', data.subscription_id).eq('type', data.type);
  if (error) throw new Error(error.message); refreshAll();
}

export async function toggleNotificationRead(notificationId: string, acknowledged: boolean) {
  const { supabase } = await currentUser();
  const { error } = await supabase.from('notifications').update({ acknowledged }).eq('id', notificationId);
  if (error) throw new Error(error.message);
  refreshAll();
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await currentUser();
  const { data: userSubs, error: subError } = await supabase.from('subscriptions').select('id').eq('user_id', user.id);
  if (subError) throw new Error(subError.message);
  const subIds = (userSubs ?? []).map(s => s.id);
  if (subIds.length > 0) {
    const { error } = await supabase.from('notifications').update({ acknowledged: true }).in('subscription_id', subIds).eq('acknowledged', false);
    if (error) throw new Error(error.message);
  }
  refreshAll();
}

export async function saveSettings(formData: FormData) {
  const { supabase, user } = await currentUser(); const reminder_days_before = Number(string(formData, 'reminder_days_before'));
  if (![1,2,3,7].includes(reminder_days_before)) throw new Error('Choose a valid reminder window.');
  const phone = string(formData, 'phone') || null;
  const { error } = await supabase.from('users').update({ phone, notify_email: formData.get('notify_email') === 'on', notify_sms: formData.get('notify_sms') === 'on', reminder_days_before, quiet_hours_start: string(formData, 'quiet_hours_start') || null, quiet_hours_end: string(formData, 'quiet_hours_end') || null }).eq('id', user.id);
  if (error) throw new Error(error.message); revalidatePath('/settings'); revalidatePath('/dashboard');
}
