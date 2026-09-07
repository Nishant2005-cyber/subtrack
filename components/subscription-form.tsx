'use client';

import { useMemo, useState, useTransition } from 'react';
import { addMonths, addYears, format, parseISO, subDays } from 'date-fns';
import { CalendarDays, Pencil, Plus, RefreshCw, Sparkles, Tag, X } from 'lucide-react';
import { saveSubscription } from '@/app/actions';
import { useToast } from '@/components/toast';
import { categoryLabel, getTodayDateStr } from '@/lib/format';
import type { Subscription } from '@/lib/types';

const standardCategories = ['streaming', 'software', 'gym', 'cloud', 'news'];
const categories = ['streaming', 'software', 'gym', 'cloud', 'news', 'other'];

/**
 * Calculates next billing date and current cycle end date.
 * E.g. Start date: 08-08-2026 -> Cycle ends: 07-09-2026 -> Next billing: 08-09-2026
 * E.g. Yearly: 08-08-2026 -> Cycle ends: 07-08-2027 -> Next billing: 08-08-2027
 */
function calculateBillingDates(startStr: string, cycle: 'monthly' | 'yearly'): {
  nextBillingDate: string;
  cycleEndDate: string;
} {
  try {
    const sDate = parseISO(startStr);
    if (isNaN(sDate.getTime())) {
      return { nextBillingDate: '', cycleEndDate: '' };
    }
    const nextDate = cycle === 'yearly' ? addYears(sDate, 1) : addMonths(sDate, 1);
    const endDate = subDays(nextDate, 1);
    return {
      nextBillingDate: format(nextDate, 'yyyy-MM-dd'),
      cycleEndDate: format(endDate, 'yyyy-MM-dd'),
    };
  } catch {
    return { nextBillingDate: '', cycleEndDate: '' };
  }
}

function toDisplayDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    return isNaN(d.getTime()) ? '—' : format(d, 'dd-MM-yyyy');
  } catch {
    return '—';
  }
}

export function SubscriptionForm({ subscription }: { subscription?: Subscription }) {
  const isCustom = subscription?.category ? !standardCategories.includes(subscription.category.toLowerCase()) : false;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [category, setCategory] = useState<string>(isCustom ? 'other' : (subscription?.category ?? 'streaming'));
  const [customCategory, setCustomCategory] = useState<string>(isCustom ? subscription!.category : '');

  const initialPDate = subscription?.created_at
    ? format(parseISO(subscription.created_at), 'yyyy-MM-dd')
    : getTodayDateStr();
  const initialCycle = (subscription?.billing_cycle ?? 'monthly') as 'monthly' | 'yearly';
  const initialDates = calculateBillingDates(initialPDate, initialCycle);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(initialCycle);
  const [purchaseDate, setPurchaseDate] = useState<string>(initialPDate);
  const [nextRenewalDate, setNextRenewalDate] = useState<string>(
    subscription?.next_renewal_date ?? initialDates.nextBillingDate
  );

  const cycleEndDate = useMemo(() => {
    if (!nextRenewalDate) return '';
    try {
      const renDate = parseISO(nextRenewalDate);
      if (isNaN(renDate.getTime())) return '';
      return format(subDays(renDate, 1), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  }, [nextRenewalDate]);

  const { success: toastSuccess, error: toastError } = useToast();

  const handleOpen = () => {
    const custom = subscription?.category ? !standardCategories.includes(subscription.category.toLowerCase()) : false;
    setCategory(custom ? 'other' : (subscription?.category ?? 'streaming'));
    setCustomCategory(custom ? (subscription?.category ?? '') : '');
    const currentPDate = subscription?.created_at
      ? format(parseISO(subscription.created_at), 'yyyy-MM-dd')
      : getTodayDateStr();
    const currentCycle = (subscription?.billing_cycle ?? 'monthly') as 'monthly' | 'yearly';
    const computed = calculateBillingDates(currentPDate, currentCycle);
    setBillingCycle(currentCycle);
    setPurchaseDate(currentPDate);
    setNextRenewalDate(
      subscription?.next_renewal_date ?? computed.nextBillingDate
    );
    setError('');
    setOpen(true);
  };


  const submit = (formData: FormData) => startTransition(async () => {
    try {
      await saveSubscription(formData);
      setOpen(false);
      setError('');
      toastSuccess(subscription ? 'Subscription updated successfully!' : 'Subscription added successfully!');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save subscription.';
      setError(msg);
      toastError(msg);
    }
  });

  const button = subscription ? (
    <button className="action border bg-white text-stone-700 hover:bg-stone-50">
      <Pencil size={14} />Edit
    </button>
  ) : (
    <button className="action bg-ink text-white hover:bg-black">
      <Plus size={15} />Add subscription
    </button>
  );

  return (
    <>
      <span onClick={handleOpen}>{button}</span>
      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true">
          <form action={submit} className="relative max-h-[92vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-lg p-2 text-stone-500 hover:bg-stone-100">
              <X size={18} />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime">
                <CalendarDays size={19} />
              </span>
              <div>
                <h2 className="font-serif text-2xl">{subscription ? 'Edit subscription' : 'Add a subscription'}</h2>
                <p className="text-xs text-stone-500">We’ll remind you before the next renewal.</p>
              </div>
            </div>

            <input type="hidden" name="id" value={subscription?.id ?? ''} />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold sm:col-span-2">
                Service name
                <input name="service_name" required defaultValue={subscription?.service_name} placeholder="e.g. Netflix" className="field mt-1" />
              </label>

              <label className="text-xs font-bold">
                Category
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="field mt-1"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-bold">
                Billing cycle
                <select
                  name="billing_cycle"
                  value={billingCycle}
                  onChange={(e) => {
                    const newCycle = e.target.value as 'monthly' | 'yearly';
                    setBillingCycle(newCycle);
                    const computed = calculateBillingDates(purchaseDate, newCycle);
                    if (computed.nextBillingDate) setNextRenewalDate(computed.nextBillingDate);
                  }}
                  className="field mt-1 font-semibold"
                >
                  <option value="monthly">Monthly billing</option>
                  <option value="yearly">Yearly billing</option>
                </select>
              </label>

              {/* Dynamic Custom Category Input Box */}
              {category === 'other' && (
                <div className="sm:col-span-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 transition-all">
                  <label className="block text-xs font-bold text-violet-950">
                    <span className="flex items-center gap-1.5">
                      <Tag size={13} className="text-violet" />
                      Specify category name <span className="text-rose-500">*</span>
                    </span>
                    <input
                      name="custom_category"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Gaming, Fitness, Education, Music"
                      className="field mt-1.5 bg-white"
                      autoFocus
                    />
                  </label>
                  <p className="mt-1.5 text-[11px] text-stone-500">
                    This custom category will be displayed on your dashboard, badges, and spending breakdown.
                  </p>
                </div>
              )}

              <label className="text-xs font-bold">
                Cost
                <input name="cost" type="number" min="0" step="0.01" required defaultValue={subscription?.cost} placeholder="649" className="field mt-1" />
              </label>

              <label className="text-xs font-bold">
                Currency
                <input name="currency" required maxLength={3} defaultValue={subscription?.currency ?? 'INR'} className="field mt-1 uppercase" />
              </label>

              {/* Start Date / Purchase Date */}
              <label className="text-xs font-bold">
                Start date (Purchase)
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => {
                    const newP = e.target.value;
                    setPurchaseDate(newP);
                    const computed = calculateBillingDates(newP, billingCycle);
                    if (computed.nextBillingDate) setNextRenewalDate(computed.nextBillingDate);
                  }}
                  className="field mt-1"
                />
              </label>

              {/* Next Billing Date (Auto-calculated) */}
              <label className="text-xs font-bold">
                <div className="flex items-center justify-between">
                  <span>Next billing date</span>
                  <button
                    type="button"
                    onClick={() => {
                      const computed = calculateBillingDates(purchaseDate, billingCycle);
                      if (computed.nextBillingDate) setNextRenewalDate(computed.nextBillingDate);
                    }}
                    className="text-[10px] font-bold text-violet hover:underline inline-flex items-center gap-1"
                    title="Recalculate next billing date from start date"
                  >
                    <RefreshCw size={10} /> Auto-calc
                  </button>
                </div>
                <input
                  name="next_renewal_date"
                  type="date"
                  required
                  value={nextRenewalDate}
                  onChange={(e) => setNextRenewalDate(e.target.value)}
                  className="field mt-1 font-semibold"
                />
              </label>

              {/* Billing Period & Renewal Schedule Preview Card */}
              <div className="sm:col-span-2 rounded-2xl border border-violet-200/80 bg-violet-50/60 p-3.5 text-xs text-ink shadow-2xs">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="flex items-center gap-1.5 font-bold text-violet-900 text-xs">
                    <CalendarDays size={14} className="text-violet shrink-0" />
                    Billing Period & Renewal Schedule
                  </span>
                  <span className="rounded-full bg-violet-200/70 px-2.5 py-0.5 text-[10px] font-extrabold text-violet-900 uppercase tracking-wide">
                    {billingCycle === 'monthly' ? 'Monthly Cycle' : 'Yearly Cycle'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white p-2 border border-violet-100/90 shadow-2xs">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Start Date</p>
                    <p className="mt-0.5 font-mono font-extrabold text-stone-800 text-xs">
                      {toDisplayDate(purchaseDate)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 p-2 border border-amber-200/80 shadow-2xs">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">End Date</p>
                    <p className="mt-0.5 font-mono font-extrabold text-amber-900 text-xs">
                      {toDisplayDate(cycleEndDate)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 p-2 border border-emerald-200/80 shadow-2xs">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Next Billing Date</p>
                    <p className="mt-0.5 font-mono font-extrabold text-emerald-950 text-xs">
                      {toDisplayDate(nextRenewalDate)}
                    </p>
                  </div>
                </div>

                <p className="mt-2.5 text-[11px] text-stone-600 text-center leading-relaxed">
                  Active cycle: <b className="text-stone-800 font-mono">{toDisplayDate(purchaseDate)}</b> to{' '}
                  <b className="text-amber-800 font-mono">{toDisplayDate(cycleEndDate)}</b> · Next renewal charge:{' '}
                  <b className="text-emerald-800 font-mono">{toDisplayDate(nextRenewalDate)}</b>
                </p>
              </div>



              <div className="sm:col-span-2">
                <label className="text-xs font-bold block mb-1.5">
                  Autopay Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="relative flex cursor-pointer flex-col rounded-xl border border-stone-200 p-2.5 text-center transition hover:bg-stone-50 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/50 has-[:checked]:ring-1 has-[:checked]:ring-emerald-500">
                    <input
                      type="radio"
                      name="autopay_status"
                      value="running"
                      defaultChecked={!subscription || subscription.autopay_status === 'running'}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Running
                    </span>
                    <span className="mt-0.5 text-[10px] text-stone-500">Auto-renews</span>
                  </label>

                  <label className="relative flex cursor-pointer flex-col rounded-xl border border-stone-200 p-2.5 text-center transition hover:bg-stone-50 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/50 has-[:checked]:ring-1 has-[:checked]:ring-amber-500">
                    <input
                      type="radio"
                      name="autopay_status"
                      value="paused"
                      defaultChecked={subscription?.autopay_status === 'paused'}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold text-amber-800 flex items-center justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Paused
                    </span>
                    <span className="mt-0.5 text-[10px] text-stone-500">Won’t renew</span>
                  </label>

                  <label className="relative flex cursor-pointer flex-col rounded-xl border border-stone-200 p-2.5 text-center transition hover:bg-stone-50 has-[:checked]:border-rose-500 has-[:checked]:bg-rose-50/50 has-[:checked]:ring-1 has-[:checked]:ring-rose-500">
                    <input
                      type="radio"
                      name="autopay_status"
                      value="deleted"
                      defaultChecked={subscription?.autopay_status === 'deleted'}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold text-rose-800 flex items-center justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Deleted
                    </span>
                    <span className="mt-0.5 text-[10px] text-stone-500">Expires</span>
                  </label>
                </div>
                <p className="mt-1.5 text-[11px] text-stone-500">
                  Select whether your bank/UPI autopay is active, paused, or deleted.
                </p>
              </div>

              <label className="text-xs font-bold sm:col-span-2">
                Renewal link <span className="font-normal text-stone-400">(optional)</span>
                <input name="renewal_url" type="url" defaultValue={subscription?.renewal_url ?? ''} placeholder="https://service.com/account" className="field mt-1" />
              </label>

              <label className="text-xs font-bold sm:col-span-2">
                Cancellation link <span className="font-normal text-stone-400">(optional)</span>
                <input name="cancel_url" type="url" defaultValue={subscription?.cancel_url ?? ''} placeholder="https://service.com/cancel" className="field mt-1" />
              </label>
            </div>

            {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="action bg-stone-100 text-stone-700" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button disabled={pending} className="action bg-ink text-white disabled:opacity-50">
                {pending ? 'Saving…' : 'Save subscription'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
