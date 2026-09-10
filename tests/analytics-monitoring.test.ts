import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addBreadcrumb,
  getBreadcrumbs,
  captureException,
  captureMessage,
} from '@/lib/monitoring';
import { trackEvent } from '@/lib/analytics';

describe('Monitoring & Sentry Fallback Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('records and returns breadcrumbs correctly', () => {
    addBreadcrumb({
      category: 'ui',
      message: 'User clicked renewal button',
      level: 'info',
    });

    const crumbs = getBreadcrumbs();
    expect(crumbs.length).toBeGreaterThanOrEqual(1);
    const lastCrumb = crumbs[crumbs.length - 1];
    expect(lastCrumb.message).toBe('User clicked renewal button');
    expect(lastCrumb.category).toBe('ui');
    expect(lastCrumb.level).toBe('info');
    expect(typeof lastCrumb.timestamp).toBe('number');
  });

  it('captures an exception safely and generates a unique error ID', () => {
    const testError = new Error('Test payment provider timeout');
    const errorId = captureException(testError, {
      tags: { service: 'billing' },
      extra: { attempt: 3 },
    });

    expect(typeof errorId).toBe('string');
    expect(errorId.startsWith('err_')).toBe(true);
  });

  it('captures non-Error throws gracefully', () => {
    const stringErrorId = captureException('Database locked');
    expect(typeof stringErrorId).toBe('string');
    expect(stringErrorId.startsWith('err_')).toBe(true);
  });

  it('captures informational and warning messages', () => {
    const msgId = captureMessage('High memory consumption detected', 'warning', {
      tags: { host: 'worker-1' },
    });

    expect(typeof msgId).toBe('string');
    expect(msgId.startsWith('msg_')).toBe(true);
  });
});

describe('Analytics Telemetry Engine', () => {
  it('dispatches client events and records corresponding breadcrumbs', () => {
    // In jsdom environment, window is defined
    trackEvent('subscription_created', {
      service_name: 'Spotify',
      cost: 9.99,
      currency: 'USD',
    });

    const crumbs = getBreadcrumbs();
    const analyticsCrumb = crumbs.find((c) => c.message === 'Event: subscription_created');
    expect(analyticsCrumb).toBeDefined();
    expect(analyticsCrumb?.category).toBe('analytics');
    expect(analyticsCrumb?.data).toEqual({
      service_name: 'Spotify',
      cost: 9.99,
      currency: 'USD',
    });
  });
});
