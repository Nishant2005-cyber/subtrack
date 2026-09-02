'use client';

import { useState } from 'react';
import { Archive, CheckCircle2, Plus, Sparkles, XCircle } from 'lucide-react';
import { SubscriptionRow } from '@/components/subscription-row';
import { SubscriptionForm } from '@/components/subscription-form';
import type { Subscription } from '@/lib/types';

export function SubscriptionList({
  subscriptions,
  usedTodayIds,
}: {
  subscriptions: Subscription[];
  usedTodayIds: string[];
}) {
  const [tab, setTab] = useState<'active' | 'canceled'>('active');

  const usedTodaySet = new Set(usedTodayIds);
  const activeSubs = subscriptions.filter((s) => s.status !== 'canceled');
  const canceledSubs = subscriptions.filter((s) => s.status === 'canceled');

  const currentList = tab === 'active' ? activeSubs : canceledSubs;

  return (
    <div className="space-y-3">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-200/60 border border-stone-200">
          <button
            onClick={() => setTab('active')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              tab === 'active'
                ? 'bg-white text-ink shadow-sm'
                : 'text-stone-600 hover:text-ink'
            }`}
          >
            <Sparkles size={13} className={tab === 'active' ? 'text-violet' : ''} />
            Active ({activeSubs.length})
          </button>

          <button
            onClick={() => setTab('canceled')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              tab === 'canceled'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-stone-600 hover:text-ink'
            }`}
          >
            <Archive size={13} className={tab === 'canceled' ? 'text-rose-600' : ''} />
            Canceled ({canceledSubs.length})
          </button>
        </div>

        <span className="text-xs font-semibold text-stone-500">
          {tab === 'active' ? 'Sorted by renewal date' : 'Archived subscriptions'}
        </span>
      </div>

      {/* Main List Card */}
      <div className="card px-5 overflow-visible">
        {tab === 'canceled' && canceledSubs.length > 0 && (
          <div className="my-4 rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 text-xs text-rose-900 flex items-center gap-2.5">
            <XCircle size={16} className="shrink-0 text-rose-600" />
            <p>
              Canceled subscriptions do not generate renewal reminders or count towards your monthly spend. You can reactivate them anytime.
            </p>
          </div>
        )}

        {currentList.length > 0 ? (
          currentList.map((s) => (
            <SubscriptionRow
              key={s.id}
              subscription={s}
              usedToday={usedTodaySet.has(s.id)}
            />
          ))
        ) : tab === 'active' ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-lime/20 text-ink">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-serif text-xl">No active subscriptions</h3>
            <p className="mt-1 text-sm text-stone-500">
              Add your first subscription to start tracking renewals.
            </p>
            <div className="mt-4">
              <SubscriptionForm />
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
              <Archive size={24} />
            </div>
            <h3 className="font-serif text-xl">No canceled subscriptions</h3>
            <p className="mt-1 text-xs text-stone-500">
              When you cancel any active subscription, it will safely appear in this section.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
