import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ExternalLink, History, RefreshCw, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { DetailActions } from '@/components/detail-actions';
import { SubscriptionForm } from '@/components/subscription-form';
import { AutopayBadge } from '@/components/autopay-badge';
import { createClient } from '@/lib/supabase/server';
import { categoryLabel, currency, dateLabel, dueLabel, getTodayDateStr } from '@/lib/format';
import type { Subscription, UsageLog } from '@/lib/types';

export default async function SubscriptionDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: subscription }, { data: logs }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('id', params.id).single(),
    supabase.from('usage_logs').select('*').eq('subscription_id', params.id).order('logged_date', { ascending: false })
  ]);

  if (!subscription) notFound();
  const sub = subscription as Subscription;
  const usage = (logs ?? []) as UsageLog[];
  const today = getTodayDateStr();
  const autopay = sub.autopay_status ?? 'running';

  return (
    <AppShell email={user.email ?? null}>
      <div className="mx-auto max-w-4xl px-5 py-7 sm:px-8 lg:px-10">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-ink">
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        <header className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="pill bg-violet-100 text-violet-800 font-semibold">
                {categoryLabel(sub.category)}
              </span>
              <span className={`pill ${sub.status === 'active' ? 'bg-lime text-ink font-semibold' : sub.status === 'canceled' ? 'bg-rose-100 text-rose-700 font-semibold' : 'bg-stone-100 text-stone-600'}`}>
                {categoryLabel(sub.status)}
              </span>
              {sub.status !== 'canceled' && (
                <AutopayBadge
                  subscriptionId={sub.id}
                  currentStatus={autopay}
                  serviceName={sub.service_name}
                  size="md"
                />
              )}
            </div>
            <h1 className="font-serif text-4xl tracking-tight">{sub.service_name}</h1>
            <p className="mt-2 text-sm text-stone-500">
              {currency(Number(sub.cost), sub.currency)} / {sub.billing_cycle} · {dueLabel(sub.next_renewal_date)}
            </p>
          </div>

          <SubscriptionForm subscription={sub} />
        </header>

        {/* 3-Column Key Metrics */}
        <section className="card mt-7 grid gap-5 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold text-stone-500">Next renewal</p>
            <p className="mt-1 text-lg font-bold">{dateLabel(sub.next_renewal_date)}</p>
            <p className="mt-0.5 text-xs text-stone-400">{dueLabel(sub.next_renewal_date)}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-stone-500">Autopay Mandate</p>
            <p className={`mt-1 text-lg font-bold ${autopay === 'running' ? 'text-emerald-700' : autopay === 'paused' ? 'text-amber-700' : 'text-rose-700'}`}>
              {autopay === 'running' ? 'Running (Auto-renews)' : autopay === 'paused' ? 'Paused (Won’t renew)' : 'Deleted (Expires)'}
            </p>
            <p className="mt-0.5 text-xs text-stone-400">
              {autopay === 'running' ? 'Auto-advances on due date' : 'Manual action required'}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-stone-500">Usage logged</p>
            <p className="mt-1 text-lg font-bold">{usage.length} day{usage.length === 1 ? '' : 's'}</p>
            <p className="mt-0.5 text-xs text-stone-400">Activity tracked</p>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="mt-5">
          <DetailActions id={sub.id} status={sub.status} usedToday={usage.some((l) => l.logged_date === today)} />
        </section>

        {/* Links & Autopay Details */}
        <section className="mt-7 grid gap-5 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="panel-title">Renewal & cancellation</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              SubTrack never handles payment credentials. Manage official subscriptions through the links below.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {sub.renewal_url ? (
                <a href={sub.renewal_url} target="_blank" rel="noreferrer" className="action bg-ink text-white">
                  Renew on official site <ExternalLink size={13} />
                </a>
              ) : (
                <span className="subtle">No renewal link saved.</span>
              )}
              {sub.cancel_url && (
                <a href={sub.cancel_url} target="_blank" rel="noreferrer" className="action bg-stone-100 text-stone-700">
                  Cancellation page <ExternalLink size={13} />
                </a>
              )}
            </div>

            {sub.status === 'canceled' ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <p className="font-bold">Subscription is canceled</p>
                <p className="mt-0.5 text-rose-700">
                  Future renewal and usage reminders are stopped for this service. You can reactivate anytime above.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-stone-400">
                Cancel the subscription above or update your Autopay status to stay in control.
              </p>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-violet" />
              <h2 className="panel-title">How Autopay works in SubTrack</h2>
            </div>
            <div className="mt-3 space-y-2.5 text-xs text-stone-600 leading-relaxed">
              <p>
                <b className="text-emerald-700">🟢 Running:</b> If your renewal date passes without cancellation, SubTrack assumes autopay was charged and automatically rolls forward your renewal date to the next billing cycle.
              </p>
              <p>
                <b className="text-amber-700">⏸️ Paused:</b> SubTrack keeps the subscription past due until you make a payment or resume autopay.
              </p>
              <p>
                <b className="text-rose-700">🛑 Deleted:</b> SubTrack marks the subscription as expired when the renewal date passes.
              </p>
            </div>
          </div>
        </section>

        {/* Usage History */}
        <section className="card mt-7 overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <History size={17} />
              <h2 className="panel-title">Usage history</h2>
            </div>
            <span className="text-xs text-stone-500">One log per day</span>
          </div>

          {usage.length ? (
            <div className="divide-y">
              {usage.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-semibold">Used {dateLabel(log.logged_date)}</span>
                  <span className="text-xs text-stone-500">Self-reported</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-stone-500">
              No usage logged yet. Tap “Used today” after you use this service.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
