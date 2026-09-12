'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Sparkles,
  X,
} from 'lucide-react';
import type { Subscription } from '@/lib/types';
import { categoryLabel, currency } from '@/lib/format';

interface CalendarViewProps {
  subscriptions: Subscription[];
}

/**
 * Returns all active subscriptions that renew on a given calendar day.
 * - Exact matches with sub.next_renewal_date
 * - Future monthly subscriptions projected on their recurring billing day of the month (e.g. 8th of every month)
 * - Future yearly subscriptions projected on their anniversary month and day (e.g. 8th of August each year)
 */
function getRenewalsForDay(day: Date, subscriptions: Subscription[]): Subscription[] {
  const dayStr = format(day, 'yyyy-MM-dd');
  const dayDate = day.getDate();
  const dayMonth = day.getMonth(); // 0-11
  const dayYear = day.getFullYear();
  const daysInMonth = new Date(dayYear, dayMonth + 1, 0).getDate();

  return subscriptions.filter((sub) => {
    if (sub.status !== 'active') return false;

    // 1. Exact match with next_renewal_date
    if (sub.next_renewal_date === dayStr) return true;

    // 2. Projection for recurring cycles
    const renewalDate = parseISO(sub.next_renewal_date);
    if (isNaN(renewalDate.getTime())) return false;

    // Do not project before the recorded upcoming renewal date
    if (day < renewalDate) return false;

    const renDay = renewalDate.getDate();
    const renMonth = renewalDate.getMonth();

    if (sub.billing_cycle === 'monthly') {
      // Renews on the same day of each month (e.g. purchased 8th -> renews on the 8th)
      const targetDay = Math.min(renDay, daysInMonth);
      return dayDate === targetDay;
    }

    if (sub.billing_cycle === 'yearly') {
      // Renews on the same month and day each year (e.g. purchased Aug 8 -> renews on Aug 8)
      if (dayMonth !== renMonth) return false;
      const targetDay = Math.min(renDay, daysInMonth);
      return dayDate === targetDay;
    }

    return false;
  });
}



export function CalendarView({ subscriptions }: CalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Keyboard navigation: Left/Right arrows to switch months
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        setCurrentMonth((prev) => subMonths(prev, 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentMonth((prev) => addMonths(prev, 1));
      } else if (e.key === 'Escape') {
        setSelectedDay(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Month navigation handlers
  const prevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const nextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const goToToday = () => setCurrentMonth(startOfMonth(today));

  const isCurrentMonth = isSameMonth(currentMonth, today);

  // Month & Year Selector options
  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth(); // 0-11
  const years = useMemo(() => {
    const startY = today.getFullYear() - 2;
    return Array.from({ length: 9 }, (_, i) => startY + i);
  }, [today]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleMonthChange = (newMonthIndex: number) => {
    setCurrentMonth(new Date(currentYear, newMonthIndex, 1));
  };

  const handleYearChange = (newYear: number) => {
    setCurrentMonth(new Date(newYear, currentMonthIndex, 1));
  };

  // Calendar Grid calculation (Sunday to Saturday)
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const first = subDays(start, getDay(start));
    const end = endOfMonth(currentMonth);
    const last = addDays(end, 6 - getDay(end));
    const totalDays = differenceInCalendarDays(last, first) + 1;
    // Always render 35 or 42 cells for visual balance
    const gridCount = totalDays <= 35 ? 35 : 42;
    return Array.from({ length: gridCount }, (_, i) => addDays(first, i));
  }, [currentMonth]);

  // Active month renewal statistics
  const { monthRenewalCount, monthTotalSpend, primaryCurrency } = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysInCurrentMonth = end.getDate();
    let count = 0;
    let total = 0;
    let curr = 'INR';

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
      const subs = getRenewalsForDay(date, subscriptions);
      count += subs.length;
      for (const s of subs) {
        total += Number(s.cost);
        if (s.currency) curr = s.currency;
      }
    }

    return {
      monthRenewalCount: count,
      monthTotalSpend: total,
      primaryCurrency: curr,
    };
  }, [currentMonth, subscriptions]);

  // Subscriptions for the selected day modal
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return getRenewalsForDay(selectedDay, subscriptions);
  }, [selectedDay, subscriptions]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
      {/* Top Header */}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">Plan before payments hit</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl text-ink dark:text-stone-100">
            Renewal calendar
          </h1>
        </div>

        {/* Month Summary Stats Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-white px-4 py-2.5 shadow-xs dark:border-stone-800 dark:bg-[#181816]">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-50 text-violet dark:bg-violet-950/60 dark:text-violet-300">
              <CreditCard size={17} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-400">
                {format(currentMonth, 'MMMM')} Spending
              </p>
              <p className="text-base font-extrabold text-ink dark:text-stone-100">
                {currency(monthTotalSpend, primaryCurrency)}
                <span className="ml-1.5 text-xs font-normal text-stone-500 dark:text-stone-400">
                  ({monthRenewalCount} renewal{monthRenewalCount === 1 ? '' : 's'})
                </span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Calendar Card */}
      <section className="card overflow-hidden border border-stone-200/80 bg-white shadow-xs rounded-2xl dark:border-stone-800 dark:bg-[#181816]">
        {/* Navigation & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 px-5 py-4 bg-stone-50/50 dark:border-stone-800 dark:bg-[#141412]">
          {/* Month Switcher Controls */}
          <div className="flex items-center gap-2">
            {/* Backward Button */}
            <button
              type="button"
              onClick={prevMonth}
              title="Previous Month (Arrow Left)"
              className="grid h-9 w-9 place-items-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-xs transition hover:bg-stone-100 hover:text-ink active:scale-95 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Forward Button */}
            <button
              type="button"
              onClick={nextMonth}
              title="Next Month (Arrow Right)"
              className="grid h-9 w-9 place-items-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-xs transition hover:bg-stone-100 hover:text-ink active:scale-95 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-white"
            >
              <ChevronRight size={18} />
            </button>

            {/* Quick-Jump to "Today" Button */}
            <button
              type="button"
              onClick={goToToday}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                isCurrentMonth
                  ? 'border border-stone-200 bg-white text-stone-400 cursor-default dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-500'
                  : 'border border-violet-200 bg-violet-50 text-violet hover:bg-violet-100 active:scale-95 dark:border-violet-800/80 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60'
              }`}
            >
              Today
            </button>

            {/* Month & Year Selectors */}
            <div className="ml-2 flex items-center gap-1.5">
              <select
                value={currentMonthIndex}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-ink shadow-xs outline-none transition hover:border-stone-300 focus:border-violet focus:ring-2 focus:ring-violet/10 cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:hover:border-stone-600"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-ink shadow-xs outline-none transition hover:border-stone-300 focus:border-violet focus:ring-2 focus:ring-violet/10 cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:hover:border-stone-600"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Status */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {subscriptions.filter((s) => s.status === 'active').length} active subscriptions
            </span>
          </div>
        </div>

        {/* Days of the Week Header */}
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/70 dark:border-stone-800 dark:bg-[#161614]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-400"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-stone-100 dark:divide-stone-800/80">
          {days.map((day) => {
            const inMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);
            const key = format(day, 'yyyy-MM-dd');
            const events = getRenewalsForDay(day, subscriptions);
            const hasEvents = events.length > 0;

            return (
              <div
                key={key}
                onClick={() => hasEvents && setSelectedDay(day)}
                className={`min-h-[90px] border-b border-stone-200/80 dark:border-stone-800/80 p-2 transition sm:min-h-[120px] sm:p-2.5 flex flex-col justify-between ${
                  !inMonth
                    ? 'bg-stone-50/60 text-stone-300 dark:bg-[#121210]/60 dark:text-stone-600'
                    : hasEvents
                    ? 'bg-white hover:bg-violet-50/30 cursor-pointer dark:bg-[#181816] dark:hover:bg-violet-950/20'
                    : 'bg-white hover:bg-stone-50/40 dark:bg-[#181816] dark:hover:bg-stone-850/40'
                }`}
              >
                {/* Date Number Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold transition ${
                      isToday
                        ? 'bg-ink text-white shadow-xs scale-105 dark:bg-stone-100 dark:text-stone-900'
                        : inMonth
                        ? 'text-stone-700 dark:text-stone-200'
                        : 'text-stone-300 dark:text-stone-600'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Dot indicator if events present */}
                  {hasEvents && (
                    <span className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-violet" />
                  )}
                </div>

                {/* Subscriptions Pill List */}
                <div className="mt-1.5 space-y-1 overflow-hidden">
                  {events.slice(0, 2).map((s) => (
                    <Link
                      href={`/subscriptions/${s.id}`}
                      key={s.id}
                      onClick={(e) => e.stopPropagation()}
                      title={`${s.service_name} · ${currency(Number(s.cost), s.currency)} (${s.billing_cycle})`}
                      className="group flex items-center justify-between truncate rounded-lg border border-violet-200/70 bg-violet-50/90 px-1.5 py-1 text-[10px] font-bold text-violet-900 shadow-2xs transition hover:bg-violet-100 hover:border-violet-300 active:scale-98 dark:border-violet-900/60 dark:bg-violet-950/70 dark:text-violet-200 dark:hover:bg-violet-900/80"
                    >
                      <span className="truncate">{s.service_name}</span>
                      <span className="ml-1 shrink-0 font-extrabold opacity-90 text-[9px] sm:text-[10px]">
                        {currency(Number(s.cost), s.currency)}
                      </span>
                    </Link>
                  ))}

                  {/* If more than 2 renewals on this day */}
                  {events.length > 2 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDay(day);
                      }}
                      className="w-full text-left rounded-md bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-[9px] font-extrabold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
                    >
                      +{events.length - 2} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Helpful Context Footer */}
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
        <p className="leading-5">
          Calendar dates reflect recorded renewals and automatically forecast recurring monthly and yearly payments.
        </p>
        <p className="font-semibold text-stone-400 dark:text-stone-400">
          Tip: Use <kbd className="rounded border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 px-1.5 py-0.5 text-[10px] font-mono">←</kbd> and{' '}
          <kbd className="rounded border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 px-1.5 py-0.5 text-[10px] font-mono">→</kbd> keys to switch months.
        </p>
      </footer>

      {/* ======================================================== */}
      {/* DAY DETAIL MODAL                                         */}
      {/* ======================================================== */}
      {selectedDay && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#181816] text-stone-900 dark:text-stone-100 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet dark:text-violet-400 uppercase tracking-wider">
                  <CalendarDays size={14} /> Renewals on this day
                </span>
                <h3 className="font-serif text-2xl font-bold text-ink dark:text-stone-100 mt-0.5">
                  {format(selectedDay, 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-ink dark:hover:bg-stone-800 dark:hover:text-stone-200 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* List of Subscriptions Due on this Date */}
            <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedDayEvents.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-400">
                  No active renewals on this date.
                </p>
              ) : (
                selectedDayEvents.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-xl border border-stone-200/80 bg-stone-50/60 p-3.5 transition hover:border-violet-200 hover:bg-white dark:border-stone-800 dark:bg-stone-900/50 dark:hover:border-violet-900/60 dark:hover:bg-stone-900"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-ink dark:text-stone-100">{sub.service_name}</h4>
                        <span className="rounded-md bg-stone-200/70 dark:bg-stone-800 px-1.5 py-0.5 text-[10px] font-bold text-stone-600 dark:text-stone-300 capitalize">
                          {categoryLabel(sub.category)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 capitalize">
                        {sub.billing_cycle} plan
                        {sub.autopay_status && (
                          <span className="ml-2 font-semibold text-stone-400">
                            • Autopay: {sub.autopay_status}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-base font-extrabold text-ink dark:text-stone-100">
                        {currency(Number(sub.cost), sub.currency)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {sub.renewal_url && (
                          <a
                            href={sub.renewal_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 transition shadow-2xs"
                          >
                            Pay <ExternalLink size={11} />
                          </a>
                        )}
                        <Link
                          href={`/subscriptions/${sub.id}`}
                          className="rounded-lg bg-ink px-2.5 py-1 text-[11px] font-bold text-white hover:bg-black dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white transition shadow-2xs"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer Summary */}
            {selectedDayEvents.length > 0 && (
              <div className="mt-5 flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-4 text-xs font-bold text-stone-600 dark:text-stone-400">
                <span>Total Due on this day:</span>
                <span className="text-base font-extrabold text-ink dark:text-stone-100">
                  {currency(
                    selectedDayEvents.reduce((sum, s) => sum + Number(s.cost), 0),
                    selectedDayEvents[0]?.currency || 'INR'
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
