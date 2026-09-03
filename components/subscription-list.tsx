'use client';

import { useMemo, useState } from 'react';
import { Archive, CheckCircle2, Filter, Sparkles, XCircle } from 'lucide-react';
import { SubscriptionRow } from '@/components/subscription-row';
import { SubscriptionForm } from '@/components/subscription-form';
import { categoryLabel } from '@/lib/format';
import type { Subscription } from '@/lib/types';

export function SubscriptionList({
  subscriptions,
  usedTodayIds,
}: {
  subscriptions: Subscription[];
  usedTodayIds: string[];
}) {
  const [tab, setTab] = useState<'active' | 'canceled'>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const usedTodaySet = new Set(usedTodayIds);
  const activeSubs = subscriptions.filter((s) => s.status !== 'canceled');
  const canceledSubs = subscriptions.filter((s) => s.status === 'canceled');

  const currentList = tab === 'active' ? activeSubs : canceledSubs;

  // Extract distinct categories available in the current tab
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    currentList.forEach((s) => {
      const cat = (s.category?.trim() || 'Other').toLowerCase();
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [currentList]);

  // Filter current list by selected category
  const filteredList = useMemo(() => {
    if (selectedCategory === 'all') return currentList;
    return currentList.filter(
      (s) => (s.category?.trim() || 'Other').toLowerCase() === selectedCategory
    );
  }, [currentList, selectedCategory]);

  return (
    <div className="space-y-3">
      {/* Header: Tabs & Sort Info */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-200/60 border border-stone-200">
          <button
            onClick={() => {
              setTab('active');
              setSelectedCategory('all');
            }}
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
            onClick={() => {
              setTab('canceled');
              setSelectedCategory('all');
            }}
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

      {/* Category Filter Pills (All, Streaming, Education, etc.) */}
      {currentList.length > 0 && categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {/* Default: "All" */}
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              selectedCategory === 'all'
                ? 'bg-ink text-white shadow-sm'
                : 'bg-white/80 border border-stone-200 text-stone-600 hover:bg-white hover:text-ink'
            }`}
          >
            <span>All</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                selectedCategory === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {currentList.length}
            </span>
          </button>

          {/* Individual Categories */}
          {categories.map(([cat, count]) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? 'all' : cat)}
                className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-lime text-ink shadow-sm border border-lime-400'
                    : 'bg-white/80 border border-stone-200 text-stone-600 hover:bg-white hover:text-ink'
                }`}
              >
                <span>{categoryLabel(cat)}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected
                      ? 'bg-ink/15 text-ink font-extrabold'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

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

        {filteredList.length > 0 ? (
          filteredList.map((s) => (
            <SubscriptionRow
              key={s.id}
              subscription={s}
              usedToday={usedTodaySet.has(s.id)}
            />
          ))
        ) : selectedCategory !== 'all' ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-stone-100 text-stone-400">
              <Filter size={20} />
            </div>
            <h3 className="font-serif text-lg font-bold">
              No {categoryLabel(selectedCategory)} subscriptions
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              You don’t have any active subscriptions under this category.
            </p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="mt-4 inline-block rounded-lg bg-stone-100 px-3.5 py-1.5 text-xs font-bold text-ink hover:bg-stone-200"
            >
              Show all subscriptions
            </button>
          </div>
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
