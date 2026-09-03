'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Flame,
  Lightbulb,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { currency, daysUntil, monthlyCost } from '@/lib/format';
import type { Subscription, UsageLog } from '@/lib/types';

type InsightItem = {
  id: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  actionText?: string;
  actionHref?: string;
};

export function SmartInsights({
  subscriptions,
  usage,
}: {
  subscriptions: Subscription[];
  usage: UsageLog[];
}) {
  const active = subscriptions.filter((s) => s.status === 'active');
  const [index, setIndex] = useState(0);

  // Map usage counts per subscription
  const usageCountMap = new Map<string, number>();
  usage.forEach((log) => {
    usageCountMap.set(log.subscription_id, (usageCountMap.get(log.subscription_id) ?? 0) + 1);
  });

  const insights: InsightItem[] = [];

  // 1. High Value Champion (used 3+ times this week)
  const mostUsedSub = [...active].sort(
    (a, b) => (usageCountMap.get(b.id) ?? 0) - (usageCountMap.get(a.id) ?? 0)
  )[0];
  const mostUsedCount = mostUsedSub ? (usageCountMap.get(mostUsedSub.id) ?? 0) : 0;

  if (mostUsedSub && mostUsedCount >= 3) {
    const cost = Number(mostUsedSub.cost);
    const costPerUse = Math.round((cost / 4) / Math.max(mostUsedCount, 1));
    insights.push({
      id: 'high-value',
      badge: 'Best Value',
      badgeColor: 'bg-lime/20 text-lime border-lime/30',
      icon: <Flame size={18} className="text-lime" />,
      title: `${mostUsedSub.service_name} is earning its place!`,
      description: `You logged ${mostUsedCount} uses this week. At roughly ${currency(costPerUse, mostUsedSub.currency)} per use, you’re getting exceptional value from this subscription.`,
      metricLabel: 'Usage rate',
      metricValue: `${mostUsedCount} days / week`,
      actionText: 'View details',
      actionHref: `/subscriptions/${mostUsedSub.id}`,
    });
  }

  // 2. Imminent Renewal Alert (renews in <= 2 days)
  const urgentSub = active.find((s) => {
    const days = daysUntil(s.next_renewal_date);
    return days >= 0 && days <= 2;
  });

  if (urgentSub) {
    const days = daysUntil(urgentSub.next_renewal_date);
    const isToday = days === 0;
    const isTomorrow = days === 1;
    const timeText = isToday ? 'today' : isTomorrow ? 'tomorrow' : `in ${days} days`;

    insights.push({
      id: 'urgent-renewal',
      badge: 'Renewal Alert',
      badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
      icon: <AlertTriangle size={18} className="text-amber-300" />,
      title: `${urgentSub.service_name} renews ${timeText}`,
      description: `Billed as ${currency(Number(urgentSub.cost), urgentSub.currency)} / ${urgentSub.billing_cycle}. ${
        urgentSub.autopay_status === 'paused'
          ? 'Autopay is paused; you must pay manually.'
          : urgentSub.autopay_status === 'deleted'
          ? 'Autopay was deleted; subscription will expire.'
          : 'Autopay is running and will auto-deduct.'
      }`,
      metricLabel: 'Renewal cost',
      metricValue: currency(Number(urgentSub.cost), urgentSub.currency),
      actionText: 'Review renewal',
      actionHref: `/subscriptions/${urgentSub.id}`,
    });
  }

  // 3. Idle / Underused Subscription (0 uses this week)
  const idleSub = active.find(
    (s) => (usageCountMap.get(s.id) ?? 0) === 0 && Number(s.cost) > 0
  );

  if (idleSub) {
    insights.push({
      id: 'idle-sub',
      badge: 'Savings Opportunity',
      badgeColor: 'bg-rose-400/20 text-rose-300 border-rose-400/30',
      icon: <TrendingDown size={18} className="text-rose-300" />,
      title: `Haven’t used ${idleSub.service_name} recently?`,
      description: `You haven’t logged any activity on ${idleSub.service_name} this week. If you’re taking a break, consider pausing autopay to save ${currency(Number(idleSub.cost), idleSub.currency)}.`,
      metricLabel: 'Potential savings',
      metricValue: `${currency(Number(idleSub.cost), idleSub.currency)} / ${idleSub.billing_cycle === 'yearly' ? 'yr' : 'mo'}`,
      actionText: 'Manage autopay',
      actionHref: `/subscriptions/${idleSub.id}`,
    });
  }

  // 4. Budget & Category Insight
  if (active.length >= 2) {
    const totalMonthly = active.reduce(
      (sum, s) => sum + monthlyCost(Number(s.cost), s.billing_cycle),
      0
    );
    const topExpense = [...active].sort(
      (a, b) => monthlyCost(Number(b.cost), b.billing_cycle) - monthlyCost(Number(a.cost), a.billing_cycle)
    )[0];

    if (topExpense) {
      const topMonthlyCost = monthlyCost(Number(topExpense.cost), topExpense.billing_cycle);
      const percent = Math.round((topMonthlyCost / Math.max(totalMonthly, 1)) * 100);

      insights.push({
        id: 'budget-breakdown',
        badge: 'Spend Insight',
        badgeColor: 'bg-violet-400/20 text-violet-200 border-violet-400/30',
        icon: <CircleDollarSign size={18} className="text-violet-300" />,
        title: `${topExpense.service_name} is your largest expense`,
        description: `It accounts for ${percent}% of your monthly subscription spend (${currency(topMonthlyCost)} of ${currency(totalMonthly)}). Check if you are maximizing its features.`,
        metricLabel: 'Share of spend',
        metricValue: `${percent}% of budget`,
        actionText: 'View in spending',
        actionHref: '/spending',
      });
    }
  }

  if (insights.length === 0) return null;

  const current = insights[index % insights.length];

  return (
    <section className="mt-7 relative overflow-hidden rounded-2xl bg-[#181a14] border border-white/10 p-5 text-white shadow-xl">
      {/* Subtle background ambient glow */}
      <div className="absolute right-0 top-0 h-48 w-48 -mr-16 -mt-16 rounded-full bg-lime/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Icon + Content */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 border border-white/15">
            {current.icon}
          </div>

          <div className="min-w-0 flex-1">
            {/* Header: Badge + Pagination */}
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${current.badgeColor}`}
              >
                {current.badge}
              </span>
              <span className="text-[11px] font-semibold text-stone-400">
                Insight {((index % insights.length) + 1)} of {insights.length}
              </span>
            </div>

            <h2 className="text-base font-bold text-white tracking-tight">{current.title}</h2>
            <p className="mt-1 text-xs leading-5 text-stone-300 max-w-2xl">{current.description}</p>
          </div>
        </div>

        {/* Right: Key Metric Chip + Actions */}
        <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end sm:gap-2 shrink-0">
          {/* Metric Highlight Box */}
          <div className="hidden sm:block text-right px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
              {current.metricLabel}
            </p>
            <p className="text-sm font-extrabold text-lime">{current.metricValue}</p>
          </div>

          {/* Action Button & Carousel Controls */}
          <div className="flex items-center gap-2">
            {insights.length > 1 && (
              <div className="flex items-center rounded-lg bg-white/10 p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev === 0 ? insights.length - 1 : prev - 1))}
                  className="p-1 text-stone-300 hover:text-white rounded hover:bg-white/10 transition"
                  title="Previous insight"
                  aria-label="Previous insight"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev + 1) % insights.length)}
                  className="p-1 text-stone-300 hover:text-white rounded hover:bg-white/10 transition"
                  title="Next insight"
                  aria-label="Next insight"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {current.actionHref && (
              <Link
                href={current.actionHref}
                className="inline-flex items-center gap-1 rounded-lg bg-lime px-3.5 py-1.5 text-xs font-bold text-ink shadow-sm hover:bg-[#cbf150] transition"
              >
                <span>{current.actionText ?? 'Review'}</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
