import { describe, expect, it } from 'vitest';
import {
  categoryLabel,
  currency,
  dateLabel,
  dueLabel,
  getTodayDateStr,
  monthlyCost,
} from '@/lib/format';

describe('Formatting Utilities', () => {
  it('formats currency correctly in INR and other currencies', () => {
    const formattedInr = currency(1200, 'INR');
    expect(formattedInr).toContain('1,200');

    const formattedUsd = currency(15, 'USD');
    expect(formattedUsd).toContain('15');
  });

  it('capitalizes category labels properly', () => {
    expect(categoryLabel('streaming')).toBe('Streaming');
    expect(categoryLabel('cloud')).toBe('Cloud');
    expect(categoryLabel('custom category')).toBe('Custom Category');
  });

  it('calculates monthly cost for yearly and monthly cycles', () => {
    expect(monthlyCost(1200, 'yearly')).toBe(100);
    expect(monthlyCost(649, 'monthly')).toBe(649);
  });

  it('formats date labels cleanly', () => {
    expect(dateLabel('2026-09-08')).toBe('8 Sep');
    expect(dateLabel('2026-12-25')).toBe('25 Dec');
  });

  it('generates accurate due labels', () => {
    const todayStr = getTodayDateStr();
    expect(dueLabel(todayStr)).toBe('Due today');
  });
});

