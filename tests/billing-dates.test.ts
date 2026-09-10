import { describe, expect, it } from 'vitest';
import { addMonths, addYears, format, parseISO, subDays } from 'date-fns';
import { advanceRenewalDate } from '@/lib/data';

function calculateBillingDates(startStr: string, cycle: 'monthly' | 'yearly'): {
  nextBillingDate: string;
  cycleEndDate: string;
} {
  const sDate = parseISO(startStr);
  const nextDate = cycle === 'yearly' ? addYears(sDate, 1) : addMonths(sDate, 1);
  const endDate = subDays(nextDate, 1);
  return {
    nextBillingDate: format(nextDate, 'yyyy-MM-dd'),
    cycleEndDate: format(endDate, 'yyyy-MM-dd'),
  };
}

describe('Subscription Billing Dates Calculation', () => {
  it('correctly calculates monthly billing cycle (start: 08-08-2026 -> end: 07-09-2026 -> next: 08-09-2026)', () => {
    const dates = calculateBillingDates('2026-08-08', 'monthly');
    expect(dates.nextBillingDate).toBe('2026-09-08');
    expect(dates.cycleEndDate).toBe('2026-09-07');
  });

  it('correctly calculates yearly billing cycle (start: 08-08-2026 -> end: 07-08-2027 -> next: 08-08-2027)', () => {
    const dates = calculateBillingDates('2026-08-08', 'yearly');
    expect(dates.nextBillingDate).toBe('2027-08-08');
    expect(dates.cycleEndDate).toBe('2027-08-07');
  });

  it('handles month-end boundaries properly for months with fewer days', () => {
    // January 31 -> February 28 (non-leap year 2027)
    const dates = calculateBillingDates('2027-01-31', 'monthly');
    expect(dates.nextBillingDate).toBe('2027-02-28');
    expect(dates.cycleEndDate).toBe('2027-02-27');
  });

  it('advances passed renewal dates to the future cycle', () => {
    // Past renewal date in 2020 should advance past today
    const advanced = advanceRenewalDate('2020-01-15', 'monthly');
    const advancedDate = parseISO(advanced);
    expect(advancedDate.getTime()).toBeGreaterThan(Date.now());
    expect(advanced.endsWith('-15')).toBe(true);
  });
});
