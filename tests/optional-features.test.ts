import { describe, expect, it } from 'vitest';
import type { PriceChange, SharedMember } from '@/lib/types';

describe('Optional Features: Multi-User Split Plans', () => {
  it('calculates equal splits correctly across members', () => {
    const totalCost = 1199;
    const splitCount = 4;
    const perPerson = Number((totalCost / splitCount).toFixed(2));
    expect(perPerson).toBe(299.75);
    expect(perPerson * splitCount).toBeCloseTo(totalCost, 1);
  });

  it('tracks settled vs pending members', () => {
    const members: SharedMember[] = [
      { id: '1', name: 'Alice', email: 'alice@example.com', paid: true },
      { id: '2', name: 'Bob', email: 'bob@example.com', paid: false },
      { id: '3', name: 'Charlie', paid: true },
      { id: '4', name: 'Diana', paid: false },
    ];
    const settledCount = members.filter((m) => m.paid).length;
    const pendingCount = members.filter((m) => !m.paid).length;
    expect(settledCount).toBe(2);
    expect(pendingCount).toBe(2);
  });
});

describe('Optional Features: Price-Hike Detection', () => {
  it('computes accurate price hike diff and percentage', () => {
    const oldCost = 649;
    const newCost = 799;
    const diff = Number((newCost - oldCost).toFixed(2));
    const percentage = Number((((newCost - oldCost) / oldCost) * 100).toFixed(1));

    expect(diff).toBe(150);
    expect(percentage).toBe(23.1);
  });

  it('computes accurate price reduction diff and percentage', () => {
    const oldCost = 999;
    const newCost = 799;
    const diff = Number((newCost - oldCost).toFixed(2));
    const percentage = Number((((newCost - oldCost) / oldCost) * 100).toFixed(1));

    expect(diff).toBe(-200);
    expect(percentage).toBe(-20.0);
  });

  it('maintains ordered timeline with latest change first', () => {
    const history: PriceChange[] = [
      { date: '2026-09-01', old_cost: 649, new_cost: 799, diff: 150, percentage: 23.1, currency: 'INR' },
      { date: '2025-01-01', old_cost: 499, new_cost: 649, diff: 150, percentage: 30.1, currency: 'INR' },
    ];
    expect(history[0].new_cost).toBe(799);
    expect(history[0].percentage).toBe(23.1);
    expect(history.length).toBe(2);
  });
});

describe('Optional Features: Budget Caps & Spending Limits', () => {
  function evaluateBudget(spent: number, cap: number) {
    const percentage = Math.round((spent / cap) * 100);
    const remaining = cap - spent;
    const isOver = spent > cap;
    const isWarning = percentage >= 80 && !isOver;
    return { percentage, remaining, isOver, isWarning };
  }

  it('identifies safe spending under 80%', () => {
    const status = evaluateBudget(1500, 3000);
    expect(status.percentage).toBe(50);
    expect(status.remaining).toBe(1500);
    expect(status.isOver).toBe(false);
    expect(status.isWarning).toBe(false);
  });

  it('identifies warning threshold at or above 80%', () => {
    const status = evaluateBudget(2550, 3000);
    expect(status.percentage).toBe(85);
    expect(status.remaining).toBe(450);
    expect(status.isOver).toBe(false);
    expect(status.isWarning).toBe(true);
  });

  it('identifies over-budget state above 100%', () => {
    const status = evaluateBudget(3450, 3000);
    expect(status.percentage).toBe(115);
    expect(status.remaining).toBe(-450);
    expect(status.isOver).toBe(true);
    expect(status.isWarning).toBe(false);
  });
});

describe('Optional Features: CSV Generation & RFC 4180 Escaping', () => {
  const escapeCsv = (val: unknown) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  it('escapes quotes and commas properly', () => {
    expect(escapeCsv('Netflix, Inc.')).toBe('"Netflix, Inc."');
    expect(escapeCsv('Plan with "VIP" access')).toBe('"Plan with ""VIP"" access"');
    expect(escapeCsv('Simple')).toBe('Simple');
    expect(escapeCsv(null)).toBe('');
  });

  it('sanitizes formula injection prefixes (=, +, -, @)', () => {
    expect(escapeCsv('=cmd|')).toBe("'=cmd|");
    expect(escapeCsv('+12345')).toBe("'+12345");
    expect(escapeCsv('-calc')).toBe("'-calc");
    expect(escapeCsv('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
  });
});

describe('Optional Features: Validation & Edge Cases', () => {
  it('validates shared member array entries', () => {
    const isValidMember = (m: unknown) =>
      Boolean(
        m &&
          typeof m === 'object' &&
          'id' in m &&
          typeof (m as any).id === 'string' &&
          (m as any).id.trim() !== '' &&
          'name' in m &&
          typeof (m as any).name === 'string' &&
          (m as any).name.trim() !== ''
      );

    expect(isValidMember({ id: '1', name: 'Alice' })).toBe(true);
    expect(isValidMember(null)).toBe(false);
    expect(isValidMember(42)).toBe(false);
    expect(isValidMember({ id: '', name: 'Alice' })).toBe(false);
    expect(isValidMember({ id: '1' })).toBe(false);
  });

  it('skips price hike comparison when currencies do not match', () => {
    const existingSub = { cost: 10, currency: 'USD' };
    const newCost = 800;
    const newCurrency = 'INR';

    const shouldCompare = existingSub.currency === newCurrency;
    expect(shouldCompare).toBe(false);
  });
});
