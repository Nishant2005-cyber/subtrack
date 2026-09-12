import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { format, parseISO, subDays, subMonths, subYears } from 'date-fns';
import { ArrowLeft, ExternalLink, History, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { DetailActions } from '@/components/detail-actions';
import { SubscriptionForm } from '@/components/subscription-form';
import { AutopayBadge } from '@/components/autopay-badge';
import { SharedMembersCard } from '@/components/shared-members-card';
import { PriceHistoryCard } from '@/components/price-history-card';
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

  const renewalDateObj = parseISO(sub.next_renewal_date);
  const cycleEndStr = format(subDays(renewalDateObj, 1), 'dd-MM-yyyy');
  const cycleStartStr = format(
    sub.billing_cycle === 'yearly' ? subYears(renewalDateObj, 1) : subMonths(renewalDateObj, 1),
    'dd-MM-yyyy'
  );

  const latestPriceChange = sub.price_history && sub.price_history.length > 0
    ? sub.price_history[0]
    : null;


  return (
    <AppShell email={user.email ?? null}>
      <div className="mx-auto max-w-4xl px-5 py-7 sm:px-8 lg:px-10">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-stone-100">
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        <header className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="pill bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 font-semibold">
                {categoryLabel(sub.category)}
              </span>
              <span className={`pill ${sub.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/40 font-semibold' : sub.status === 'canceled' ? 'bg-rose-100 text-rose-700 font-semibold dark:bg-rose-950/60 dark:text-rose-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'}`}>
                {categoryLabel(sub.status)}
              </span>
              {sub.is_shared && (
                <span className="pill bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 font-semibold flex items-center gap-1">
                  <Users size={12} /> Shared ({sub.split_count || 2} ways)
                </span>
              )}
              {latestPriceChange && latestPriceChange.percentage > 0 && (
                <span className="pill bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold flex items-center gap-1">
                  <TrendingUp size={12} /> +{latestPriceChange.percentage}% Hike
                </span>
              )}
              {sub.status !== 'canceled' && (
                <AutopayBadge
                  subscriptionId={sub.id}
                  currentStatus={autopay}
                  serviceName={sub.service_name}
                  size="md"
                />
              )}
            </div>
            <h1 className="font-serif text-4xl tracking-tight text-ink dark:text-stone-100">{sub.service_name}</h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              {currency(Number(sub.cost), sub.currency)} / {sub.billing_cycle} · {dueLabel(sub.next_renewal_date)}
              {sub.is_shared && sub.my_share ? (
                <span className="ml-1.5 font-bold text-violet dark:text-violet-400">
                  (Your share: {currency(Number(sub.my_share), sub.currency)})
                </span>
              ) : null}
            </p>
          </div>

          <SubscriptionForm subscription={sub} />
        </header>

        {/* 3-Column Key Metrics */}
        <section className="card mt-7 grid gap-5 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Next renewal</p>
            <p className="mt-1 text-lg font-bold text-stone-900 dark:text-stone-100">{dateLabel(sub.next_renewal_date)}</p>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 font-semibold">{dueLabel(sub.next_renewal_date)}</p>
            <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500 font-mono">
              Cycle: {cycleStartStr} → {cycleEndStr}
            </p>
          </div>


          <div>
            <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Autopay Mandate</p>
            <p className={`mt-1 text-lg font-bold ${autopay === 'running' ? 'text-emerald-700 dark:text-emerald-400' : autopay === 'paused' ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {autopay === 'running' ? 'Running (Auto-renews)' : autopay === 'paused' ? 'Paused (Won’t renew)' : 'Deleted (Expires)'}
            </p>
            <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
              {autopay === 'running' ? 'Auto-advances on due date' : 'Manual action required'}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Usage logged</p>
            <p className="mt-1 text-lg font-bold text-stone-900 dark:text-stone-100">{usage.length} day{usage.length === 1 ? '' : 's'}</p>
            <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">Activity tracked</p>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="mt-5">
          <DetailActions id={sub.id} status={sub.status} usedToday={usage.some((l) => l.logged_date === today)} />
        </section>

        {/* Shared Plan Multi-User Split Section */}
        {sub.is_shared && (
          <section className="mt-7">
            <SharedMembersCard
              subscriptionId={sub.id}
              cost={Number(sub.cost)}
              currency={sub.currency}
              splitCount={sub.split_count || 2}
              myShare={Number(sub.my_share ?? (sub.cost / (sub.split_count || 1)))}
              members={sub.shared_members ?? []}
            />
          </section>
        )}

        {/* Price-Hike History Section */}
        <section className="mt-7">
          <PriceHistoryCard
            currentCost={Number(sub.cost)}
            currency={sub.currency}
            priceHistory={sub.price_history}
          />
        </section>

        {/* Links & Autopay Details */}
        <section className="mt-7 grid gap-5 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="panel-title">Renewal & cancellation</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
              SubTrack never handles payment credentials. Manage official subscriptions through the links below.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {sub.renewal_url ? (
                <a href={sub.renewal_url} target="_blank" rel="noreferrer" className="action bg-ink text-white hover:bg-black dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white">
                  Renew on official site <ExternalLink size={13} />
                </a>
              ) : (
                <span className="subtle">No renewal link saved.</span>
              )}
              {sub.cancel_url && (
                <a href={sub.cancel_url} target="_blank" rel="noreferrer" className="action bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700">
                  Cancellation page <ExternalLink size={13} />
                </a>
              )}
            </div>

            {sub.status === 'canceled' ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                <p className="font-bold">Subscription is canceled</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">
                  Future renewal and usage reminders are stopped for this service. You can reactivate anytime above.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
                Cancel the subscription above or update your Autopay status to stay in control.
              </p>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-violet dark:text-violet-400" />
              <h2 className="panel-title">How Autopay works in SubTrack</h2>
            </div>
            <div className="mt-3 space-y-2.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              <p>
                <b className="text-emerald-700 dark:text-emerald-400">🟢 Running:</b> If your renewal date passes without cancellation, SubTrack assumes autopay was charged and automatically rolls forward your renewal date to the next billing cycle.
              </p>
              <p>
                <b className="text-amber-700 dark:text-amber-400">⏸️ Paused:</b> SubTrack keeps the subscription past due until you make a payment or resume autopay.
              </p>
              <p>
                <b className="text-rose-700 dark:text-rose-400">🛑 Deleted:</b> SubTrack marks the subscription as expired when the renewal date passes.
              </p>
            </div>
          </div>
        </section>

        {/* Usage History */}
        <section className="card mt-7 overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-5 py-4">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
              <History size={17} />
              <h2 className="panel-title">Usage history</h2>
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400">One log per day</span>
          </div>

          {usage.length ? (
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {usage.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">Used {dateLabel(log.logged_date)}</span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">Self-reported</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-stone-500 dark:text-stone-400">
              No usage logged yet. Tap “Used today” after you use this service.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
