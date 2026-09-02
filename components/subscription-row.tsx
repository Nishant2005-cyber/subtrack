'use client';

import Link from 'next/link';
import { ExternalLink, MoreHorizontal, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { useState, useTransition } from 'react';
import { deleteSubscription, logUsage, setSubscriptionStatus } from '@/app/actions';
import { useToast } from '@/components/toast';
import { categoryLabel, currency, dateLabel, dueLabel } from '@/lib/format';
import type { Subscription } from '@/lib/types';

const color: Record<string, string> = {
  streaming: 'bg-red-100 text-red-700',
  software: 'bg-violet-100 text-violet-700',
  gym: 'bg-orange-100 text-orange-700',
  cloud: 'bg-sky-100 text-sky-700',
  news: 'bg-amber-100 text-amber-700',
  other: 'bg-stone-100 text-stone-700',
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
  const inactive = subscription.status !== 'active';

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
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b py-4 last:border-0 md:grid-cols-[auto_1fr_auto_auto] ${
        inactive ? 'opacity-60' : ''
      }`}
    >
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-bold ${
          color[subscription.category] || 'bg-teal-100 text-teal-800'
        }`}
      >
        {subscription.service_name.slice(0, 1).toUpperCase()}
      </div>

      <Link href={`/subscriptions/${subscription.id}`} className="min-w-0">
        <div className="truncate font-bold">{subscription.service_name}</div>
        <div className="mt-0.5 text-xs text-stone-500">
          {categoryLabel(subscription.category)} · {currency(subscription.cost, subscription.currency)} /{' '}
          {subscription.billing_cycle === 'monthly' ? 'mo' : 'yr'}
        </div>
      </Link>

      <div className="hidden text-right md:block">
        <div
          className={`text-xs font-bold ${
            subscription.status === 'active' && dueLabel(subscription.next_renewal_date).includes('2')
              ? 'text-red-600'
              : ''
          }`}
        >
          {inactive ? categoryLabel(subscription.status) : dueLabel(subscription.next_renewal_date)}
        </div>
        <div className="mt-0.5 text-[11px] text-stone-500">{dateLabel(subscription.next_renewal_date)}</div>
      </div>

      <div className="relative flex items-center gap-1">
        {subscription.status === 'active' && (
          <button
            disabled={pending}
            onClick={() => {
              if (confirm(`Cancel subscription for ${subscription.service_name}? Future reminders will be stopped.`))
                run(
                  () => setSubscriptionStatus(subscription.id, 'canceled'),
                  `${subscription.service_name} canceled. Reminders stopped.`
                );
            }}
            className="hidden rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 lg:block"
            title="Cancel subscription and stop future reminders"
          >
            Cancel
          </button>
        )}

        <button
          disabled={pending || inactive || usedToday}
          onClick={() =>
            run(() => logUsage(subscription.id), `Activity logged for ${subscription.service_name}!`)
          }
          className={`hidden rounded-lg px-2.5 py-2 text-xs font-bold sm:block ${
            usedToday
              ? 'bg-lime text-ink'
              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          } disabled:cursor-default`}
        >
          {usedToday ? 'Logged today' : 'Used today'}
        </button>

        <button
          onClick={() => setMenu(!menu)}
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
        >
          <MoreHorizontal size={18} />
        </button>

        {menu && (
          <div className="absolute right-0 top-10 z-10 w-44 rounded-xl border bg-white p-1.5 shadow-lg">
            <Link
              onClick={() => setMenu(false)}
              href={`/subscriptions/${subscription.id}`}
              className="block rounded-lg px-3 py-2 text-xs font-semibold hover:bg-stone-50"
            >
              View details
            </Link>

            {subscription.renewal_url && (
              <a
                href={subscription.renewal_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-stone-50"
              >
                Renew on site <ExternalLink size={12} />
              </a>
            )}

            {subscription.status !== 'canceled' && (
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
                className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-stone-50"
              >
                {subscription.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
            )}

            <button
              onClick={() => {
                setMenu(false);
                if (subscription.status === 'canceled') {
                  run(
                    () => setSubscriptionStatus(subscription.id, 'active'),
                    `${subscription.service_name} reactivated!`
                  );
                } else {
                  if (
                    confirm(
                      `Cancel subscription for ${subscription.service_name}? Future reminders will be stopped.`
                    )
                  )
                    run(
                      () => setSubscriptionStatus(subscription.id, 'canceled'),
                      `${subscription.service_name} canceled.`
                    );
                }
              }}
              className={`flex w-full items-center gap-1 rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                subscription.status === 'canceled'
                  ? 'text-emerald-700 hover:bg-emerald-50'
                  : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              {subscription.status === 'canceled' ? (
                <>
                  <RotateCcw size={12} />
                  Reactivate
                </>
              ) : (
                <>
                  <XCircle size={12} />
                  Cancel subscription
                </>
              )}
            </button>

            <button
              onClick={() => {
                setMenu(false);
                if (confirm(`Remove ${subscription.service_name}? This cannot be undone.`))
                  run(
                    () => deleteSubscription(subscription.id),
                    `${subscription.service_name} deleted.`
                  );
              }}
              className="flex w-full items-center gap-1 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
