'use client';

import Link from 'next/link';
import {
  ExternalLink,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { useState, useTransition } from 'react';
import { deleteSubscription, logUsage, setSubscriptionStatus } from '@/app/actions';
import { useToast } from '@/components/toast';
import { AutopayBadge } from '@/components/autopay-badge';
import { categoryLabel, currency, dateLabel, dueLabel } from '@/lib/format';
import type { Subscription } from '@/lib/types';

const color: Record<string, string> = {
  streaming: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
  software: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  gym: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  cloud: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  news: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  other: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
};

export function SubscriptionRow({
  subscription,
  usedToday,
}: {
  subscription: Subscription;
  usedToday: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const [pending, startTransition] = useTransition();
  const { success: toastSuccess, error: toastError } = useToast();
  const isCanceled = subscription.status === 'canceled';
  const isPaused = subscription.status === 'paused';

  const latestPriceChange = subscription.price_history && subscription.price_history.length > 0
    ? subscription.price_history[0]
    : null;

  const run = (fn: () => Promise<void>, message: string) =>
    startTransition(async () => {
      try {
        await fn();
        toastSuccess(message);
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Action failed.');
      }
    });

  return (
    <article
      className={`relative grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-stone-200 dark:border-stone-800 py-4 last:border-0 md:grid-cols-[auto_1fr_auto_auto] ${
        isCanceled ? 'opacity-80' : isPaused ? 'opacity-70' : ''
      }`}
    >
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${
          color[subscription.category] || 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
        }`}
      >
        {subscription.service_name.slice(0, 1).toUpperCase()}
      </div>

      <Link href={`/subscriptions/${subscription.id}`} className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-bold text-ink dark:text-stone-100 hover:underline">{subscription.service_name}</span>
          {isCanceled ? (
            <span className="rounded-md bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
              Canceled
            </span>
          ) : isPaused ? (
            <span className="rounded-md bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
              Paused
            </span>
          ) : null}

          {/* Shared Plan Badge */}
          {subscription.is_shared && (
            <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 dark:bg-violet-950/60 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
              <Users size={10} /> Shared ({subscription.split_count || 2} ways)
            </span>
          )}

          {/* Price Hike / Change Badge */}
          {latestPriceChange && latestPriceChange.percentage > 0 && (
            <span
              title={`Hiked by +${latestPriceChange.percentage}% on ${latestPriceChange.date || latestPriceChange.changed_at || 'recent'} (was ${currency(latestPriceChange.old_cost ?? latestPriceChange.previous_cost ?? 0, latestPriceChange.currency)})`}
              className="inline-flex items-center gap-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300"
            >
              <TrendingUp size={10} /> +{latestPriceChange.percentage}% Hike
            </span>
          )}
          {latestPriceChange && latestPriceChange.percentage < 0 && (
            <span
              title={`Reduced by ${latestPriceChange.percentage}% on ${latestPriceChange.date || latestPriceChange.changed_at || 'recent'}`}
              className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"
            >
              <TrendingDown size={10} /> {latestPriceChange.percentage}%
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-stone-500 dark:text-stone-400">
            {categoryLabel(subscription.category)} · {currency(subscription.cost, subscription.currency)} /{' '}
            {subscription.billing_cycle === 'monthly' ? 'mo' : 'yr'}
            {subscription.is_shared && subscription.my_share ? (
              <span className="ml-1 text-violet dark:text-violet-400 font-semibold">
                (My share: {currency(subscription.my_share, subscription.currency)})
              </span>
            ) : null}
          </span>
          {!isCanceled && (
            <AutopayBadge
              subscriptionId={subscription.id}
              currentStatus={subscription.autopay_status ?? 'running'}
              serviceName={subscription.service_name}
            />
          )}
        </div>
      </Link>

      <div className="hidden text-right md:block">
        <div
          className={`text-xs font-bold ${
            subscription.status === 'active' && dueLabel(subscription.next_renewal_date).includes('2')
              ? 'text-red-600 dark:text-red-400'
              : isCanceled
              ? 'text-stone-400'
              : subscription.autopay_status === 'paused' && dueLabel(subscription.next_renewal_date).includes('Past')
              ? 'text-amber-700 dark:text-amber-400'
              : subscription.autopay_status === 'deleted' && dueLabel(subscription.next_renewal_date).includes('Past')
              ? 'text-rose-700 dark:text-rose-400'
              : 'text-stone-800 dark:text-stone-200'
          }`}
        >
          {isCanceled
            ? 'Not renewing'
            : isPaused
            ? 'Paused'
            : subscription.autopay_status === 'paused' && dueLabel(subscription.next_renewal_date).includes('Past')
            ? 'Autopay paused'
            : subscription.autopay_status === 'deleted' && dueLabel(subscription.next_renewal_date).includes('Past')
            ? 'Expired'
            : dueLabel(subscription.next_renewal_date)}
        </div>
        <div className="mt-0.5 text-[11px] text-stone-400">
          {isCanceled
            ? `Ended ${dateLabel(subscription.next_renewal_date)}`
            : subscription.autopay_status === 'deleted' && dueLabel(subscription.next_renewal_date).includes('Past')
            ? `Ended ${dateLabel(subscription.next_renewal_date)}`
            : dateLabel(subscription.next_renewal_date)}
        </div>
      </div>

      <div className="relative flex items-center gap-2">
        {/* If Canceled: Show direct Reactivate button */}
        {isCanceled ? (
          <button
            disabled={pending}
            onClick={() =>
              run(
                () => setSubscriptionStatus(subscription.id, 'active'),
                `${subscription.service_name} reactivated!`
              )
            }
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            title="Reactivate this subscription"
          >
            <RotateCcw size={13} />
            Reactivate
          </button>
        ) : (
          <>
            {/* If Active: Show Cancel and Log Usage buttons */}
            <button
              disabled={pending}
              onClick={() => {
                if (
                  confirm(
                    `Cancel subscription for ${subscription.service_name}? It will move to the Canceled section and stop future reminders.`
                  )
                )
                  run(
                    () => setSubscriptionStatus(subscription.id, 'canceled'),
                    `${subscription.service_name} moved to Canceled.`
                  );
              }}
              className="hidden rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 disabled:opacity-50 lg:block"
              title="Cancel subscription and stop future reminders"
            >
              Cancel
            </button>

              <button
                disabled={pending || isPaused || usedToday}
                onClick={() =>
                  run(() => logUsage(subscription.id), `Activity logged for ${subscription.service_name}!`)
                }
                className={`hidden rounded-lg px-2.5 py-2 text-xs font-bold sm:block ${
                  usedToday
                    ? 'bg-lime text-ink dark:bg-lime/20 dark:text-lime-300'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                } disabled:cursor-default`}
              >
                {usedToday ? 'Logged today' : 'Used today'}
              </button>
          </>
        )}

        <button
          onClick={() => setMenu(!menu)}
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          aria-label="More actions"
        >
          <MoreHorizontal size={18} />
        </button>

        {/* Dropdown Menu */}
        {menu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-stone-200 bg-white p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 dark:border-stone-800 dark:bg-[#1c1c19] text-stone-800 dark:text-stone-200">
              <Link
                onClick={() => setMenu(false)}
                href={`/subscriptions/${subscription.id}`}
                className="block rounded-lg px-3 py-2 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                View details
              </Link>

              {subscription.renewal_url && (
                <a
                  href={subscription.renewal_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Renew on site <ExternalLink size={12} />
                </a>
              )}

              {!isCanceled && (
                <button
                  onClick={() => {
                    setMenu(false);
                    run(
                      () =>
                        setSubscriptionStatus(
                          subscription.id,
                          subscription.status === 'paused' ? 'active' : 'paused'
                        ),
                      subscription.status === 'paused'
                        ? `${subscription.service_name} resumed!`
                        : `${subscription.service_name} paused.`
                    );
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  {subscription.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
              )}

              <button
                onClick={() => {
                  setMenu(false);
                  if (isCanceled) {
                    run(
                      () => setSubscriptionStatus(subscription.id, 'active'),
                      `${subscription.service_name} reactivated!`
                    );
                  } else {
                    if (
                      confirm(
                        `Cancel subscription for ${subscription.service_name}? It will move to the Canceled section.`
                      )
                    )
                      run(
                        () => setSubscriptionStatus(subscription.id, 'canceled'),
                        `${subscription.service_name} moved to Canceled.`
                      );
                  }
                }}
                className={`flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                  isCanceled
                    ? 'text-emerald-700 hover:bg-emerald-50'
                    : 'text-rose-600 hover:bg-rose-50'
                }`}
              >
                {isCanceled ? (
                  <>
                    <RotateCcw size={13} />
                    Reactivate
                  </>
                ) : (
                  <>
                    <XCircle size={13} />
                    Cancel subscription
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setMenu(false);
                  if (confirm(`Permanently remove ${subscription.service_name}? This cannot be undone.`))
                    run(
                      () => deleteSubscription(subscription.id),
                      `${subscription.service_name} deleted.`
                    );
                }}
                className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 border-t mt-1 pt-1"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
