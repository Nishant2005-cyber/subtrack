'use client';

import { useState, useTransition } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Gauge,
  Sliders,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import { updateBudgetCaps } from '@/app/actions';
import { useToast } from '@/components/toast';
import { currency as formatCurrency } from '@/lib/format';

export function BudgetMeter({
  monthlySpent,
  currencyCode = 'INR',
  monthlyCap,
  annualCap,
}: {
  monthlySpent: number;
  currencyCode?: string;
  monthlyCap?: number | null;
  annualCap?: number | null;
}) {
  const [activeTab, setActiveTab] = useState<'monthly' | 'annual'>('monthly');
  const [editOpen, setEditOpen] = useState(false);
  const [monthlyInput, setMonthlyInput] = useState(monthlyCap ? String(monthlyCap) : '');
  const [annualInput, setAnnualInput] = useState(annualCap ? String(annualCap) : '');
  const [pending, startTransition] = useTransition();
  const { success: toastSuccess, error: toastError } = useToast();

  const annualSpent = monthlySpent * 12;
  const currentCap = activeTab === 'monthly' ? monthlyCap : annualCap;
  const currentSpent = activeTab === 'monthly' ? monthlySpent : annualSpent;

  const hasCap = typeof currentCap === 'number' && currentCap > 0;
  const percentage = hasCap ? Math.round((currentSpent / currentCap) * 100) : 0;
  const remaining = hasCap ? currentCap - currentSpent : 0;
  const isOver = hasCap && currentSpent > currentCap;
  const isWarning = hasCap && percentage >= 80 && !isOver;

  const handleSaveCaps = (e: React.FormEvent) => {
    e.preventDefault();
    const m = monthlyInput.trim() ? Number(monthlyInput) : null;
    const a = annualInput.trim() ? Number(annualInput) : null;

    startTransition(async () => {
      try {
        await updateBudgetCaps(m, a);
        setEditOpen(false);
        toastSuccess('Budget limits updated successfully!');
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to update budget.');
      }
    });
  };

  return (
    <div className="card p-5 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Gauge size={16} />
          </div>
          <div>
            <h2 className="panel-title flex items-center gap-2">
              Budget Cap & Spending Limit
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Track monthly & annual limits to avoid overspending
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Pill */}
          <div className="inline-flex rounded-lg border border-stone-200 dark:border-stone-800 p-0.5 bg-stone-50 dark:bg-stone-900 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('monthly')}
              className={`rounded-md px-2.5 py-1 transition-all ${
                activeTab === 'monthly'
                  ? 'bg-white dark:bg-stone-800 text-ink dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('annual')}
              className={`rounded-md px-2.5 py-1 transition-all ${
                activeTab === 'annual'
                  ? 'bg-white dark:bg-stone-800 text-ink dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Annual
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMonthlyInput(monthlyCap ? String(monthlyCap) : '');
              setAnnualInput(annualCap ? String(annualCap) : '');
              setEditOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-800 px-2.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
          >
            <Sliders size={13} />
            {hasCap ? 'Adjust' : 'Set Cap'}
          </button>
        </div>
      </div>

      {/* Main Meter Area */}
      <div className="mt-4">
        {hasCap ? (
          <div className="space-y-3">
            {/* Value comparison */}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold tracking-tight font-mono text-stone-900 dark:text-stone-100">
                  {formatCurrency(currentSpent, currencyCode)}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400 ml-1.5">
                  of {formatCurrency(currentCap, currencyCode)} {activeTab} cap
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`font-mono text-sm font-bold ${
                    isOver
                      ? 'text-rose-600 dark:text-rose-400'
                      : isWarning
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {percentage}%
                </span>
                <span className="block text-[11px] text-stone-400">
                  {isOver
                    ? `${formatCurrency(Math.abs(remaining), currencyCode)} over limit`
                    : `${formatCurrency(remaining, currencyCode)} left`}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
              <div
                style={{ width: `${Math.min(percentage, 100)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  isOver
                    ? 'bg-rose-500'
                    : isWarning
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>

            {/* Alert banner if nearing or over cap */}
            {isOver ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/30 p-2.5 text-xs text-rose-800 dark:text-rose-300">
                <XCircle size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
                <span>
                  <b>Budget Exceeded!</b> You are {formatCurrency(Math.abs(remaining), currencyCode)} over your {activeTab} budget limit. Consider pausing or canceling unneeded subscriptions.
                </span>
              </div>
            ) : isWarning ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <b>Approaching Limit:</b> You have utilized {percentage}% of your {activeTab} budget limit. Only {formatCurrency(remaining, currencyCode)} remaining.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Spending is safely within your {activeTab} budget limit.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 p-4 text-center">
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              No {activeTab} budget limit set
            </p>
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 max-w-md mx-auto">
              Setting a budget cap helps you visualize progress and get alerted before accidental renewals tip your finances over.
            </p>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ink dark:bg-stone-100 px-3 py-1.5 text-xs font-bold text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white transition"
            >
              <Sliders size={13} /> Set {activeTab === 'monthly' ? 'Monthly' : 'Annual'} Limit
            </button>
          </div>
        )}
      </div>

      {/* Edit Budget Caps Dialog */}
      {editOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveCaps}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#181816] text-stone-900 dark:text-stone-100 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-serif text-xl font-bold">Configure Spending Limits</h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Monthly Spending Cap ({currencyCode})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 2500"
                  value={monthlyInput}
                  onChange={(e) => setMonthlyInput(e.target.value)}
                  className="field font-mono"
                />
                <p className="mt-1 text-[11px] text-stone-400">
                  Current monthly spend: <b>{formatCurrency(monthlySpent, currencyCode)}</b>. Leave blank to disable.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Annual Spending Cap ({currencyCode})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 30000"
                  value={annualInput}
                  onChange={(e) => setAnnualInput(e.target.value)}
                  className="field font-mono"
                />
                <p className="mt-1 text-[11px] text-stone-400">
                  Current annual commitment: <b>{formatCurrency(annualSpent, currencyCode)}</b>. Leave blank to disable.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setMonthlyInput('');
                  setAnnualInput('');
                }}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
              >
                Clear all caps
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="action bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="action bg-ink text-white hover:bg-black dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white disabled:opacity-50"
                >
                  {pending ? 'Saving…' : 'Save Limits'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
