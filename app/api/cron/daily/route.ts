import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import twilio from 'twilio';
import { createAdminClient } from '@/lib/supabase/admin';
import { upcomingTitlesForService } from '@/lib/tmdb';

type Profile = { id: string; email: string | null; phone: string | null; notify_email: boolean; notify_sms: boolean; reminder_days_before: number; quiet_hours_start: string | null; quiet_hours_end: string | null };
type Row = { id: string; service_name: string; next_renewal_date: string; status: string; cost: number; currency: string; user_id: string; users: Profile | Profile[] | null };
type NotificationType = 'renewal_reminder' | 'unused_reminder' | 'content_suggestion';
const today = () => new Date().toISOString().slice(0,10);

function inQuietHours(profile: Profile) {
  if (!profile.quiet_hours_start || !profile.quiet_hours_end) return false;
  const now = new Date(); const mins = now.getUTCHours()*60+now.getUTCMinutes(); const toMins = (time: string) => { const [h,m] = time.slice(0,5).split(':').map(Number); return h*60+m; }; const start=toMins(profile.quiet_hours_start);const end=toMins(profile.quiet_hours_end);
  return start <= end ? mins >= start && mins < end : mins >= start || mins < end;
}

async function deliver(profile: Profile, title: string, message: string) {
  if (inQuietHours(profile)) return [] as ('email'|'sms')[];
  const channels: ('email'|'sms')[] = [];
  if (profile.notify_email && profile.email && process.env.RESEND_API_KEY) {
    const email = new Resend(process.env.RESEND_API_KEY);
    const result = await email.emails.send({ from: process.env.RESEND_FROM_EMAIL || 'SubTrack <onboarding@resend.dev>', to: profile.email, subject: title, html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>${title}</h2><p>${message}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard">Open SubTrack</a></p></div>` });
    if (!result.error) channels.push('email');
  }
  if (profile.notify_sms && profile.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    try { await client.messages.create({ to: profile.phone, from: process.env.TWILIO_FROM_NUMBER, body: `${title}: ${message}` }); channels.push('sms'); } catch { /* Keep the in-app notification; a carrier failure must not break the entire run. */ }
  }
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `🔔 *${title}*\n\n${message}\n\n[Open SubTrack](${appUrl}/dashboard)`,
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      console.error('Telegram notification failed:', err);
    }
  }
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🔔 **${title}**\n\n${message}\n\n${appUrl}/dashboard`,
        }),
      });
    } catch (err) {
      console.error('Discord webhook notification failed:', err);
    }
  }
  return channels;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const admin = createAdminClient(); const { data, error } = await admin.from('subscriptions').select('id,service_name,next_renewal_date,status,cost,currency,user_id,users(*)').eq('status','active');
    if (error) throw error; const subscriptions = (data ?? []) as unknown as Row[]; const ids=subscriptions.map(s=>s.id); const start=today(); const cutoff=subDays(new Date(),4).toISOString().slice(0,10);
    const [{data: logs},{data: existing},{data: acknowledged}] = await Promise.all([
      ids.length ? admin.from('usage_logs').select('subscription_id').in('subscription_id',ids).gte('logged_date',cutoff) : Promise.resolve({data:[]}),
      ids.length ? admin.from('notifications').select('subscription_id,type,channel').in('subscription_id',ids).gte('sent_at',`${start}T00:00:00.000Z`) : Promise.resolve({data:[]}),
      ids.length ? admin.from('notifications').select('subscription_id,type').in('subscription_id',ids).eq('acknowledged',true) : Promise.resolve({data:[]})
    ]);
    const activeRecently = new Set((logs??[]).map(x=>x.subscription_id)); const sentToday = new Set((existing??[]).map(x=>`${x.subscription_id}:${x.type}:${x.channel}`)); const resolved = new Set((acknowledged??[]).map(x=>`${x.subscription_id}:${x.type}`)); let created=0; let delivered=0;
    const notify = async (sub: Row, profile: Profile, type: NotificationType, title: string, message: string, metadata: Record<string,unknown> = {}) => {
      if (resolved.has(`${sub.id}:${type}`) || sentToday.has(`${sub.id}:${type}:in_app`)) return;
      const channels = await deliver(profile,title,message); const records = [{ subscription_id: sub.id, type, channel:'in_app', metadata:{ message,...metadata } }, ...channels.map(channel=>({subscription_id:sub.id,type,channel,metadata:{message,...metadata}}))];
      const {error: insertError}=await admin.from('notifications').insert(records);if(insertError)throw insertError;created+=records.length;delivered+=channels.length;
    };
    for (const sub of subscriptions) {
      const profile = Array.isArray(sub.users) ? sub.users[0] : sub.users; if (!profile) continue; const days=differenceInCalendarDays(parseISO(sub.next_renewal_date),new Date());
      if (days >= 0 && days <= profile.reminder_days_before) {
        const titles = days <= 7 ? await upcomingTitlesForService(sub.service_name) : []; const extra=titles.length ? ` Possible upcoming titles (regional availability may vary): ${titles.join(', ')}.` : '';
        await notify(sub,profile,'renewal_reminder',`${sub.service_name} renews ${days === 0 ? 'today' : `in ${days} day${days===1?'':'s'}`}`,`Your ${sub.currency} ${sub.cost} renewal is approaching. Open SubTrack to review, renew on the official site, or pause it.${extra}`,{days_until_renewal:days,titles});
      }
      if (!activeRecently.has(sub.id)) await notify(sub,profile,'unused_reminder',`No recent activity on ${sub.service_name}`,`You have not logged usage in the last 5 days. Use it, pause it, or review it before the next billing date.`,{days_without_usage:5});
    }
    return NextResponse.json({ ok:true, subscriptions_checked: subscriptions.length, notifications_created: created, deliveries_sent: delivered });
  } catch (error) { console.error('Daily subscription cron failed',error); return NextResponse.json({ error: 'Daily job failed' }, { status: 500 }); }
}
