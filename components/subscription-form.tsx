'use client';

import { useMemo, useState, useTransition } from 'react';
import { addMonths, addYears, format, parseISO, subDays } from 'date-fns';
import {
  CalendarDays,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { saveSubscription } from '@/app/actions';
import { useToast } from '@/components/toast';
import { categoryLabel, getTodayDateStr } from '@/lib/format';
import type { SharedMember, Subscription } from '@/lib/types';

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

  // Shared plan state
  const [isShared, setIsShared] = useState<boolean>(subscription?.is_shared ?? false);
  const [splitCount, setSplitCount] = useState<number>(subscription?.split_count ?? 2);
  const [members, setMembers] = useState<SharedMember[]>(subscription?.shared_members ?? []);
  const [costInput, setCostInput] = useState<string>(subscription?.cost !== undefined ? String(subscription.cost) : '');
  const [myShareInput, setMyShareInput] = useState<string>(
    subscription?.my_share !== undefined ? String(subscription.my_share) : ''
  );
  const [currencyInput, setCurrencyInput] = useState<string>(subscription?.currency ?? 'INR');

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

  const numericCost = Number(costInput) || 0;
  const calculatedAutoShare = isShared && splitCount > 0 ? Number((numericCost / splitCount).toFixed(2)) : numericCost;
  const currentMyShare = myShareInput ? Number(myShareInput) : calculatedAutoShare;

  const priceDiff = subscription && Number.isFinite(subscription.cost)
    ? Number((numericCost - subscription.cost).toFixed(2))
    : 0;
  const pricePct = subscription && subscription.cost > 0
    ? Number((((numericCost - subscription.cost) / subscription.cost) * 100).toFixed(1))
    : 0;

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
    setIsShared(subscription?.is_shared ?? false);
    setSplitCount(subscription?.split_count ?? 2);
    setMembers(subscription?.shared_members ?? []);
    setCostInput(subscription?.cost !== undefined ? String(subscription.cost) : '');
    setMyShareInput(subscription?.my_share !== undefined ? String(subscription.my_share) : '');
    setCurrencyInput(subscription?.currency ?? 'INR');
    setError('');
    setOpen(true);
  };

  const addMember = () => {
    setMembers((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: '',
        email: '',
        paid: false,
      },
    ]);
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMember = (id: string, updates: Partial<SharedMember>) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
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
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 backdrop-blur-xs p-4" role="dialog" aria-modal="true">
          <form action={submit} className="relative max-h-[92vh] w-full max-w-xl overflow-auto rounded-2xl bg-white dark:bg-[#181816] text-stone-900 dark:text-stone-100 p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800">
              <X size={18} />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime dark:bg-lime/20 text-lime-950 dark:text-lime-400">
                <CalendarDays size={19} />
              </span>
              <div>
                <h2 className="font-serif text-2xl">{subscription ? 'Edit subscription' : 'Add a subscription'}</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">We’ll remind you before the next renewal.</p>
              </div>
            </div>

            <input type="hidden" name="id" value={subscription?.id ?? ''} />
            <input type="hidden" name="is_shared" value={isShared ? 'true' : 'false'} />
            <input type="hidden" name="split_count" value={splitCount} />
            <input type="hidden" name="my_share" value={currentMyShare} />
            <input type="hidden" name="shared_members" value={JSON.stringify(members)} />

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
                <div className="sm:col-span-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 transition-all dark:border-violet-900/60 dark:bg-violet-950/20">
                  <label className="block text-xs font-bold text-violet-950 dark:text-violet-200">
                    <span className="flex items-center gap-1.5">
                      <Tag size={13} className="text-violet dark:text-violet-400" />
                      Specify category name <span className="text-rose-500">*</span>
                    </span>
                    <input
                      name="custom_category"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Gaming, Fitness, Education, Music"
                      className="field mt-1.5 bg-white dark:bg-[#121210]"
                      autoFocus
                    />
                  </label>
                  <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    This custom category will be displayed on your dashboard, badges, and spending breakdown.
                  </p>
                </div>
              )}

              <label className="text-xs font-bold">
                Cost
                <input
                  name="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                  placeholder="649"
                  className="field mt-1"
                />
              </label>

              <label className="text-xs font-bold">
                Currency
                <input
                  name="currency"
                  required
                  maxLength={3}
                  value={currencyInput}
                  onChange={(e) => setCurrencyInput(e.target.value.toUpperCase())}
                  className="field mt-1 uppercase"
                />
              </label>

              {/* Price Change Detection Alert Preview */}
              {subscription && Number.isFinite(subscription.cost) && subscription.cost > 0 && numericCost > 0 && Math.abs(priceDiff) >= 0.01 && (
                <div
                  className={`sm:col-span-2 rounded-xl p-3 text-xs flex items-center gap-2.5 ${
                    priceDiff > 0
                      ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                  }`}
                >
                  <TrendingUp size={16} className={`shrink-0 ${priceDiff > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                  <div>
                    {priceDiff > 0 ? (
                      <span>
                        <b>Price Hike Detected:</b> Cost increased from {subscription.currency} {subscription.cost} to {currencyInput} {numericCost} (<b>+{pricePct}%</b> / +{priceDiff} {currencyInput}). This will be automatically recorded in price history.
                      </span>
                    ) : (
                      <span>
                        <b>Price Decrease:</b> Cost reduced from {subscription.currency} {subscription.cost} to {currencyInput} {numericCost} (<b>{pricePct}%</b> / {priceDiff} {currencyInput}).
                      </span>
                    )}
                  </div>
                </div>
              )}

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
                    className="text-[10px] font-bold text-violet dark:text-violet-400 hover:underline inline-flex items-center gap-1"
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
              <div className="sm:col-span-2 rounded-2xl border border-violet-200/80 bg-violet-50/60 dark:border-violet-900/50 dark:bg-violet-950/20 p-3.5 text-xs text-ink dark:text-stone-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="flex items-center gap-1.5 font-bold text-violet-900 dark:text-violet-300 text-xs">
                    <CalendarDays size={14} className="text-violet dark:text-violet-400 shrink-0" />
                    Billing Period & Renewal Schedule
                  </span>
                  <span className="rounded-full bg-violet-200/70 dark:bg-violet-900/60 px-2.5 py-0.5 text-[10px] font-extrabold text-violet-900 dark:text-violet-200 uppercase tracking-wide">
                    {billingCycle === 'monthly' ? 'Monthly Cycle' : 'Yearly Cycle'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white dark:bg-[#1b1b18] p-2 border border-violet-100/90 dark:border-violet-900/30 shadow-2xs">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Start Date</p>
                    <p className="mt-0.5 font-mono font-extrabold text-stone-800 dark:text-stone-200 text-xs">
                      {toDisplayDate(purchaseDate)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 p-2 border border-amber-200/80 dark:border-amber-900/40 shadow-2xs">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">End Date</p>
                    <p className="mt-0.5 font-mono font-extrabold text-amber-900 dark:text-amber-200 text-xs">
                      {toDisplayDate(cycleEndDate)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 p-2 border border-emerald-200/80 dark:border-emerald-900/40 shadow-2xs">
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Next Billing Date</p>
                    <p className="mt-0.5 font-mono font-extrabold text-emerald-950 dark:text-emerald-200 text-xs">
                      {toDisplayDate(nextRenewalDate)}
                    </p>
                  </div>
                </div>

                <p className="mt-2.5 text-[11px] text-stone-600 dark:text-stone-400 text-center leading-relaxed">
                  Active cycle: <b className="text-stone-800 dark:text-stone-200 font-mono">{toDisplayDate(purchaseDate)}</b> to{' '}
                  <b className="text-amber-800 dark:text-amber-300 font-mono">{toDisplayDate(cycleEndDate)}</b> · Next renewal charge:{' '}
                  <b className="text-emerald-800 dark:text-emerald-300 font-mono">{toDisplayDate(nextRenewalDate)}</b>
                </p>
              </div>

              {/* Shared Plan & Multi-User Split Billing Card */}
              <div className="sm:col-span-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet/10 text-violet dark:bg-violet/20 dark:text-violet-300">
                      <Users size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100">Shared Plan & Split Billing</p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">Split cost with family, friends, or roommates</p>
                    </div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={isShared}
                      onChange={(e) => setIsShared(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-stone-300 dark:bg-stone-700 peer-checked:bg-violet after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>

                {isShared && (
                  <div className="mt-4 space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          Number of people splitting
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={splitCount}
                          onChange={(e) => setSplitCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="field text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          My personal share ({currencyInput})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={myShareInput || calculatedAutoShare}
                          onChange={(e) => setMyShareInput(e.target.value)}
                          placeholder={String(calculatedAutoShare)}
                          className="field font-bold text-violet dark:text-violet-400"
                        />
                      </div>
                    </div>

                    {/* Share preview summary */}
                    <div className="rounded-xl bg-violet-50/80 dark:bg-violet-950/30 p-2.5 text-center text-xs text-violet-900 dark:text-violet-200 border border-violet-100 dark:border-violet-900/40">
                      Total plan: <b>{currencyInput} {numericCost}</b> ÷ {splitCount} {splitCount === 1 ? 'person' : 'people'} = <b>{currencyInput} {calculatedAutoShare}</b> per person
                    </div>

                    {/* Members checklist */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                          Members ({members.length})
                        </span>
                        <button
                          type="button"
                          onClick={addMember}
                          className="inline-flex items-center gap-1 text-xs font-bold text-violet dark:text-violet-400 hover:underline"
                        >
                          <UserPlus size={13} /> Add member
                        </button>
                      </div>

                      {members.map((member) => (
                        <div key={member.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Name (e.g. Sarah)"
                            value={member.name}
                            onChange={(e) => updateMember(member.id, { name: e.target.value })}
                            className="field py-1.5 text-xs flex-1"
                          />
                          <input
                            type="email"
                            placeholder="Email (optional)"
                            value={member.email || ''}
                            onChange={(e) => updateMember(member.id, { email: e.target.value })}
                            className="field py-1.5 text-xs flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeMember(member.id)}
                            className="rounded-lg p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            title="Remove member"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold block mb-1.5">
                  Autopay Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="relative flex cursor-pointer flex-col rounded-xl border border-stone-200 dark:border-stone-800 p-2.5 text-center transition hover:bg-stone-50 dark:hover:bg-stone-800/60 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/50 dark:has-[:checked]:bg-emerald-950/30 has-[:checked]:ring-1 has-[:checked]:ring-emerald-500">
                    <input
                      type="radio"
                      name="autopay_status"
                      value="running"
                      defaultChecked={!subscription || subscription.autopay_status === 'running'}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Running
                    </span>
                    <span className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400">Auto-renews</span>
                  </label>

                  <label className="relative flex cursor-pointer flex-col rounded-xl border border-stone-200 dark:border-stone-800 p-2.5 text-center transition hover:bg-stone-50 dark:hover:bg-stone-800/60 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/50 dark:has-[:checked]:bg-amber-950/30 has-[:checked]:ring-1 has-[:checked]:ring-amber-500">
                    <input
                      type="radio"
                      name="autopay_status"
                      value="paused"
                      defaultChecked={subscription?.autopay_status === 'paused'}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Paused
                    </span>
                    <span className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400">Won’t renew</span>
                  </label>

                  <label className="relative flex cursor-pointer flex-col rounded-xl border border-stone-200 dark:border-stone-800 p-2.5 text-center transition hover:bg-stone-50 dark:hover:bg-stone-800/60 has-[:checked]:border-rose-500 has-[:checked]:bg-rose-50/50 dark:has-[:checked]:bg-rose-950/30 has-[:checked]:ring-1 has-[:checked]:ring-rose-500">
                    <input
                      type="radio"
                      name="autopay_status"
                      value="deleted"
                      defaultChecked={subscription?.autopay_status === 'deleted'}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Deleted
                    </span>
                    <span className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400">Expires</span>
                  </label>
                </div>
                <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
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

            {error && <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="action bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button disabled={pending} className="action bg-ink text-white hover:bg-black dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white disabled:opacity-50">
                {pending ? 'Saving…' : 'Save subscription'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
