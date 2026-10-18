import React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLogoForHour,
  getMsUntilNextHour,
  LOGO_EVEN,
  LOGO_ODD,
  SubTrackIcon,
  useHourlyLogo,
} from '@/components/app-logo';

describe('Hourly Logo: Mapping & Calculation', () => {
  it('maps even hours to Logo 1 (Neon Cycle Track)', () => {
    const evenHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
    for (const h of evenHours) {
      const result = getLogoForHour(h);
      expect(result.src).toBe('/logo-1.png');
      expect(result.name).toBe('Neon Cycle Track');
      expect(result.style).toBe('object-cover');
    }
  });

  it('maps odd hours to Logo 2 (Geometric Ribbon S)', () => {
    const oddHours = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
    for (const h of oddHours) {
      const result = getLogoForHour(h);
      expect(result.src).toBe('/logo-2.png');
      expect(result.name).toBe('Geometric Ribbon S');
      expect(result.style).toBe('object-contain p-1');
    }
  });

  it('correctly maps using Date objects', () => {
    const dateAt16 = new Date(2026, 9, 18, 16, 45, 0);
    const dateAt17 = new Date(2026, 9, 18, 17, 15, 0);
    expect(getLogoForHour(dateAt16)).toEqual(LOGO_EVEN);
    expect(getLogoForHour(dateAt17)).toEqual(LOGO_ODD);
  });

  it('calculates exact milliseconds remaining until next hour boundary', () => {
    // Exactly 1 second before 17:00:00
    const now1 = new Date(2026, 9, 18, 16, 59, 59, 0);
    expect(getMsUntilNextHour(now1)).toBe(1000);

    // Exactly at top of hour 16:00:00 -> 1 hour (3,600,000 ms) until 17:00:00
    const now2 = new Date(2026, 9, 18, 16, 0, 0, 0);
    expect(getMsUntilNextHour(now2)).toBe(3600000);

    // 1 second before midnight rollover (23:59:59 -> 00:00:00)
    const now3 = new Date(2026, 9, 18, 23, 59, 59, 0);
    expect(getMsUntilNextHour(now3)).toBe(1000);
  });
});

describe('Hourly Logo: Live Auto-Switching & Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('switches live from Logo 1 to Logo 2 at exactly 17:00:00 when time advances 1 second from 16:59:59', () => {
    // Set time to 16:59:59
    const initialTime = new Date(2026, 9, 18, 16, 59, 59, 0);
    vi.setSystemTime(initialTime);

    const { result } = renderHook(() => useHourlyLogo());

    // Initially at 16:59:59 -> even hour -> Logo 1
    expect(result.current.src).toBe(LOGO_EVEN.src);
    expect(result.current.name).toBe('Neon Cycle Track');

    // Advance 1 second to 17:00:00
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Logo must switch automatically to Logo 2 without reload
    expect(result.current.src).toBe(LOGO_ODD.src);
    expect(result.current.name).toBe('Geometric Ribbon S');

    // Advance 1 full hour to 18:00:00
    act(() => {
      vi.advanceTimersByTime(3600000);
    });

    // Switches back to Logo 1 (even hour)
    expect(result.current.src).toBe(LOGO_EVEN.src);
  });

  it('corrects a stale logo when tab becomes visible after sleeping/background throttling', () => {
    // Start at 16:15:00
    vi.setSystemTime(new Date(2026, 9, 18, 16, 15, 0, 0));

    const { result } = renderHook(() => useHourlyLogo());
    expect(result.current.src).toBe(LOGO_EVEN.src);

    // Simulate tab slept/backgrounded while time jumped ahead to 17:30:00
    vi.setSystemTime(new Date(2026, 9, 18, 17, 30, 0, 0));

    // Tab woke up / gained visibility
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Hook immediately reconciles to current hour 17 (Logo 2)
    expect(result.current.src).toBe(LOGO_ODD.src);

    // And reschedules for the upcoming 18:00:00 boundary (30 minutes = 1,800,000 ms)
    act(() => {
      vi.advanceTimersByTime(1800000);
    });

    expect(result.current.src).toBe(LOGO_EVEN.src);
  });
});

describe('SubTrackIcon Component Rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders both variants stacked for smooth cross-fade with proper opacity and motion-reduce', () => {
    vi.setSystemTime(new Date(2026, 9, 18, 16, 59, 59, 0));

    const { container } = render(<SubTrackIcon size={36} />);
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(2);

    const evenImg = container.querySelector(`img[src="${LOGO_EVEN.src}"]`);
    const oddImg = container.querySelector(`img[src="${LOGO_ODD.src}"]`);

    expect(evenImg).toBeTruthy();
    expect(oddImg).toBeTruthy();

    // At 16:59:59 (even): evenImg is visible, oddImg is invisible
    expect(evenImg?.className).toContain('opacity-100');
    expect(oddImg?.className).toContain('opacity-0');
    expect(evenImg?.className).toContain('duration-300');
    expect(evenImg?.className).toContain('motion-reduce:transition-none');

    // Advance 1 second to 17:00:00
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // At 17:00:00 (odd): oddImg is visible, evenImg is invisible
    expect(evenImg?.className).toContain('opacity-0');
    expect(oddImg?.className).toContain('opacity-100');
  });
});
