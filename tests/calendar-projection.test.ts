import { describe, expect, it } from 'vitest';
import { format, parseISO } from 'date-fns';
import type { Subscription } from '@/lib/types';

function getRenewalsForDay(day: Date, subscriptions: Subscription[]): Subscription[] {
  const dayStr = format(day, 'yyyy-MM-dd');
  const dayDate = day.getDate();
  const dayMonth = day.getMonth();
  const dayYear = day.getFullYear();
  const daysInMonth = new Date(dayYear, dayMonth + 1, 0).getDate();

  return subscriptions.filter((sub) => {
    if (sub.status !== 'active') return false;
    if (sub.next_renewal_date === dayStr) return true;

    const renewalDate = parseISO(sub.next_renewal_date);
    if (isNaN(renewalDate.getTime())) return false;
    if (day < renewalDate) return false;

    const renDay = renewalDate.getDate();
    const renMonth = renewalDate.getMonth();

    if (sub.billing_cycle === 'monthly') {
      const targetDay = Math.min(renDay, daysInMonth);
      return dayDate === targetDay;
    }

    if (sub.billing_cycle === 'yearly') {
      if (dayMonth !== renMonth) return false;
      const targetDay = Math.min(renDay, daysInMonth);
      return dayDate === targetDay;
    }

    return false;
  });
}

describe('Calendar Renewal Forecasting Engine', () => {
  const mockSubscriptions: Subscription[] = [
    {
      id: 'sub-1',
      user_id: 'user-1',
      service_name: 'Netflix',
      category: 'streaming',
      cost: 649,
      currency: 'INR',
      billing_cycle: 'monthly',
      next_renewal_date: '2026-09-08',
      status: 'active',
      renewal_url: null,
      cancel_url: null,
      created_at: '2026-08-08',
    },
    {
      id: 'sub-2',
      user_id: 'user-1',
      service_name: 'Amazon Prime',
      category: 'streaming',
      cost: 1499,
      currency: 'INR',
      billing_cycle: 'yearly',
      next_renewal_date: '2026-11-15',
      status: 'active',
      renewal_url: null,
      cancel_url: null,
      created_at: '2025-11-15',
    },
    {
      id: 'sub-3',
      user_id: 'user-1',
      service_name: 'Gym',
      category: 'gym',
      cost: 1500,
      currency: 'INR',
      billing_cycle: 'monthly',
      next_renewal_date: '2026-09-10',
      status: 'canceled', // Canceled
      renewal_url: null,
      cancel_url: null,
      created_at: '2026-08-10',
    },
  ];

  it('matches exact next_renewal_date for active subscription', () => {
    const results = getRenewalsForDay(new Date(2026, 8, 8), mockSubscriptions); // Sept 8, 2026
    expect(results).toHaveLength(1);
    expect(results[0].service_name).toBe('Netflix');
  });

  it('forecasts active monthly subscription in future months on the recurring billing day', () => {
    // October 8, 2026
    const oct8 = getRenewalsForDay(new Date(2026, 9, 8), mockSubscriptions);
    expect(oct8).toHaveLength(1);
    expect(oct8[0].service_name).toBe('Netflix');

    // December 8, 2026
    const dec8 = getRenewalsForDay(new Date(2026, 11, 8), mockSubscriptions);
    expect(dec8).toHaveLength(1);
    expect(dec8[0].service_name).toBe('Netflix');
  });

  it('does NOT forecast monthly renewals before the recorded initial renewal date', () => {
    // August 8, 2026 (prior to initial recorded renewal 2026-09-08)
    const aug8 = getRenewalsForDay(new Date(2026, 7, 8), mockSubscriptions);
    expect(aug8).toHaveLength(0);
  });

  it('forecasts yearly subscription on its anniversary date in future years', () => {
    // November 15, 2026
    const nov2026 = getRenewalsForDay(new Date(2026, 10, 15), mockSubscriptions);
    expect(nov2026).toHaveLength(1);
    expect(nov2026[0].service_name).toBe('Amazon Prime');

    // November 15, 2027
    const nov2027 = getRenewalsForDay(new Date(2027, 10, 15), mockSubscriptions);
    expect(nov2027).toHaveLength(1);
    expect(nov2027[0].service_name).toBe('Amazon Prime');

    // Other months should NOT match yearly
    const oct2027 = getRenewalsForDay(new Date(2027, 9, 15), mockSubscriptions);
    expect(oct2027).toHaveLength(0);
  });

  it('ignores canceled subscriptions', () => {
    // Sept 10 (Gym renewal date, but status is canceled)
    const results = getRenewalsForDay(new Date(2026, 8, 10), mockSubscriptions);
    expect(results).toHaveLength(0);
  });
});
