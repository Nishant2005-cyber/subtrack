'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOtpEmail } from '@/lib/email';
import { getTodayDateStr } from '@/lib/format';
import { trackServerEvent } from '@/lib/analytics';
import type { AutopayStatus, Category, Cycle, Status } from '@/lib/types';


const validCategories: Category[] = ['streaming', 'software', 'gym', 'cloud', 'news', 'other'];
const validCycles: Cycle[] = ['monthly', 'yearly'];
const validStatuses: Status[] = ['active', 'paused', 'canceled'];
const validAutopayStatuses: AutopayStatus[] = ['running', 'paused', 'deleted'];
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
  const autopay_status = (string(formData, 'autopay_status') || 'running') as AutopayStatus;
  if (!service_name || !category || category.length > 50 || !validCycles.includes(billing_cycle) || !Number.isFinite(cost) || cost < 0 || !/^[A-Z]{3}$/.test(currency) || !/^\d{4}-\d{2}-\d{2}$/.test(next_renewal_date)) throw new Error('Please provide valid subscription details.');
  
  const payload: Record<string, unknown> = {
    service_name,
    category,
    cost,
    currency,
    billing_cycle,
    next_renewal_date,
    autopay_status: validAutopayStatuses.includes(autopay_status) ? autopay_status : 'running',
    renewal_url: safeUrl(string(formData, 'renewal_url')),
    cancel_url: safeUrl(string(formData, 'cancel_url'))
  };

  let result = id 
    ? await supabase.from('subscriptions').update(payload).eq('id', id).eq('user_id', user.id) 
    : await supabase.from('subscriptions').insert({ ...payload, user_id: user.id });

  if (result.error && result.error.message.includes('autopay_status')) {
    delete payload.autopay_status;
    result = id 
      ? await supabase.from('subscriptions').update(payload).eq('id', id).eq('user_id', user.id) 
      : await supabase.from('subscriptions').insert({ ...payload, user_id: user.id });
  }

  if (result.error) throw new Error(result.error.message); 

  trackServerEvent(id ? 'subscription_updated' : 'subscription_created', {
    userId: user.id,
    properties: { subscription_id: id || undefined, service_name, category, cost, currency, billing_cycle },
  }).catch(() => {});

  refreshAll(id || undefined);
}

export async function updateAutopayStatus(subscriptionId: string, autopay_status: AutopayStatus) {
  if (!validAutopayStatuses.includes(autopay_status)) throw new Error('Invalid autopay status.');
  const { supabase, user } = await currentUser();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('next_renewal_date, billing_cycle, status')
    .eq('id', subscriptionId)
    .single();

  const updateData: Record<string, unknown> = { autopay_status };

  // If set to running and the renewal date has passed, advance it to the next cycle!
  if (sub && autopay_status === 'running') {
    const todayStr = getTodayDateStr();
    if (sub.next_renewal_date <= todayStr && sub.status === 'active') {
      const { advanceRenewalDate } = await import('@/lib/data');
      updateData.next_renewal_date = advanceRenewalDate(sub.next_renewal_date, sub.billing_cycle);
    }
  }

  const { error } = await supabase.from('subscriptions').update(updateData).eq('id', subscriptionId);
  if (error) {
    if (error.message.includes('autopay_status')) {
      throw new Error(
        'Please run supabase/migrations/002_add_autopay_status.sql in your Supabase SQL Editor to enable Autopay tracking!'
      );
    }
    throw new Error(error.message);
  }

  trackServerEvent('autopay_status_changed', {
    userId: user.id,
    properties: { subscription_id: subscriptionId, autopay_status },
  }).catch(() => {});

  refreshAll(subscriptionId);
}

export async function logUsage(subscriptionId: string) {
  const { supabase, user } = await currentUser();
  const today = getTodayDateStr();
  const { error } = await supabase.from('usage_logs').upsert({ subscription_id: subscriptionId, logged_date: today }, { onConflict: 'subscription_id,logged_date', ignoreDuplicates: true });
  if (error) throw new Error(error.message); 

  trackServerEvent('usage_logged', {
    userId: user.id,
    properties: { subscription_id: subscriptionId, logged_date: today },
  }).catch(() => {});

  refreshAll(subscriptionId);
}

export async function setSubscriptionStatus(subscriptionId: string, status: Status) {
  if (!validStatuses.includes(status)) throw new Error('Invalid subscription status.');
  const { supabase, user } = await currentUser(); const { error } = await supabase.from('subscriptions').update({ status }).eq('id', subscriptionId);
  if (error) throw new Error(error.message);
  if (status === 'canceled') {
    await supabase.from('notifications').update({ acknowledged: true }).eq('subscription_id', subscriptionId).eq('acknowledged', false);
  }

  trackServerEvent('subscription_status_changed', {
    userId: user.id,
    properties: { subscription_id: subscriptionId, status },
  }).catch(() => {});

  refreshAll(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
  return setSubscriptionStatus(subscriptionId, 'canceled');
}

export async function deleteSubscription(subscriptionId: string) {
  const { supabase, user } = await currentUser(); const { error } = await supabase.from('subscriptions').delete().eq('id', subscriptionId);
  if (error) throw new Error(error.message); 

  trackServerEvent('subscription_deleted', {
    userId: user.id,
    properties: { subscription_id: subscriptionId },
  }).catch(() => {});

  refreshAll(subscriptionId);
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

export async function updateUserProfile(formData: FormData) {
  const { supabase, user } = await currentUser();
  const fullName = string(formData, 'full_name');
  const phone = string(formData, 'phone') || null;

  // Update Supabase Auth user metadata
  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });
  if (authError) throw new Error(authError.message);

  // Update public users profile table
  const { error: dbError } = await supabase.from('users').update({ phone }).eq('id', user.id);
  if (dbError) throw new Error(dbError.message);

  refreshAll();
}

export async function updateUserPassword(formData: FormData) {
  const { supabase, user } = await currentUser();
  const currentPassword = string(formData, 'current_password');
  const newPassword = string(formData, 'new_password');
  const confirmPassword = string(formData, 'confirm_password');

  if (!currentPassword) {
    throw new Error('Please enter your current password.');
  }
  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }
  if (newPassword !== confirmPassword) {
    throw new Error('New passwords do not match. Please re-enter.');
  }
  if (currentPassword === newPassword) {
    throw new Error('New password must be different from your current password.');
  }

  // 1. Verify current/old password
  if (!user.email) {
    throw new Error('User email not found.');
  }
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    throw new Error('Current password is incorrect. Please check and try again.');
  }

  // 2. Apply new password
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function saveSettings(formData: FormData) {
  const { supabase, user } = await currentUser(); const reminder_days_before = Number(string(formData, 'reminder_days_before'));
  if (![1,2,3,7].includes(reminder_days_before)) throw new Error('Choose a valid reminder window.');
  const phone = string(formData, 'phone') || null;
  const { error } = await supabase.from('users').update({ phone, notify_email: formData.get('notify_email') === 'on', notify_sms: formData.get('notify_sms') === 'on', reminder_days_before, quiet_hours_start: string(formData, 'quiet_hours_start') || null, quiet_hours_end: string(formData, 'quiet_hours_end') || null }).eq('id', user.id);
  if (error) throw new Error(error.message); revalidatePath('/settings'); revalidatePath('/dashboard');
}

// -------------------------------------------------------------
// Sign Up Email OTP Verification Flow
// -------------------------------------------------------------
const AUTH_SECRET = process.env.CRON_SECRET || 'subtrack-otp-secret-key-2026';

interface PendingSignup {
  fullName: string;
  email: string;
  password: string;
  code: string;
  expiresAt: number;
}

function signToken(payload: PendingSignup): string {
  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(base64).digest('hex');
  return `${base64}.${signature}`;
}

function verifyToken(token: string): PendingSignup | null {
  try {
    const [base64, signature] = token.split('.');
    if (!base64 || !signature) return null;
    const expected = crypto.createHmac('sha256', AUTH_SECRET).update(base64).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    const json = Buffer.from(base64, 'base64url').toString('utf8');
    return JSON.parse(json) as PendingSignup;
  } catch {
    return null;
  }
}

export async function sendSignupOtp(formData: FormData) {
  const fullName = string(formData, 'fullName');
  const email = string(formData, 'email').toLowerCase();
  const password = string(formData, 'password');

  if (!fullName || fullName.length < 2) {
    throw new Error('Please enter your full name (at least 2 characters).');
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(email) || email.includes('..')) {
    throw new Error('Please enter a valid email address in the correct format (e.g. name@example.com).');
  }

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const admin = createAdminClient();
  const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = userList?.users?.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    throw new Error('An account with this email address already exists. Please log in instead.');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  const token = signToken({
    fullName,
    email,
    password,
    code,
    expiresAt,
  });

  const emailResult = await sendOtpEmail({
    to: email,
    fullName,
    otpCode: code,
  });

  return {
    success: true,
    token,
    expiresAt,
    // Only provide devCode if email delivery was blocked or failed during development
    devCode: !emailResult.success ? code : undefined,
    emailSent: emailResult.success,
    emailError: emailResult.error,
  };
}


export async function verifySignupOtp({ token, code }: { token: string; code: string }) {
  const data = verifyToken(token);
  if (!data) {
    throw new Error('Verification session is invalid or has expired. Please enter your details again.');
  }

  if (Date.now() > data.expiresAt) {
    throw new Error('The verification code has expired. Please click "Resend code" to receive a new one.');
  }

  if (data.code.trim() !== code.trim()) {
    throw new Error('enter the code correctly');
  }

  const admin = createAdminClient();
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName },
  });

  if (createError) {
    throw new Error(createError.message);
  }

  if (newUser?.user) {
    await admin.from('users').upsert(
      {
        id: newUser.user.id,
        reminder_days_before: 2,
        notify_email: true,
        notify_sms: false,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  }

  return { success: true };
}

export async function resendSignupOtp({ token }: { token: string }) {
  const data = verifyToken(token);
  if (!data) {
    throw new Error('Verification session is invalid or expired. Please enter your details again.');
  }

  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  const newExpiresAt = Date.now() + 10 * 60 * 1000;

  const newToken = signToken({
    ...data,
    code: newCode,
    expiresAt: newExpiresAt,
  });

  const emailResult = await sendOtpEmail({
    to: data.email,
    fullName: data.fullName,
    otpCode: newCode,
  });

  return {
    success: true,
    token: newToken,
    expiresAt: newExpiresAt,
    devCode: !emailResult.success ? newCode : undefined,
    emailSent: emailResult.success,
    emailError: emailResult.error,
  };
}


