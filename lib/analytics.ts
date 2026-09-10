/**
 * SubTrack Analytics & Usage Telemetry Module
 *
 * Provides privacy-respecting client & server analytics tracking.
 * Captures pageviews, subscription life-cycle operations, and usage activity.
 */

import { addBreadcrumb } from './monitoring';

export type AnalyticsEventName =
  | 'page_view'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_deleted'
  | 'subscription_status_changed'
  | 'autopay_status_changed'
  | 'usage_logged'
  | 'user_login'
  | 'user_logout'
  | 'user_signup_otp_requested'
  | 'user_signup_completed'
  | 'notification_acknowledged';

export interface EventProperties {
  [key: string]: unknown;
}

/**
 * Track an analytics event from the client browser
 */
export function trackEvent(name: AnalyticsEventName, properties?: EventProperties) {
  if (typeof window === 'undefined') return;

  // Add a breadcrumb to monitoring so any subsequent error includes this user action
  addBreadcrumb({
    category: 'analytics',
    message: `Event: ${name}`,
    data: properties,
    level: 'info',
  });

  const payload = {
    event_name: name,
    properties: properties || {},
    page_url: window.location.pathname + window.location.search,
    user_agent: window.navigator.userAgent,
  };

  try {
    const json = JSON.stringify(payload);
    // Use navigator.sendBeacon if available for non-blocking transmission
    if (navigator.sendBeacon) {
      const blob = new Blob([json], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics', blob);
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Analytics failures must never break the user experience
  }
}

/**
 * Track an analytics event directly from Server Actions or Route Handlers
 */
export async function trackServerEvent(
  name: AnalyticsEventName,
  options: {
    userId?: string;
    properties?: EventProperties;
    pageUrl?: string;
    userAgent?: string;
  } = {}
) {
  addBreadcrumb({
    category: 'server_action',
    message: `Server event: ${name}`,
    data: options.properties,
    level: 'info',
  });

  try {
    const { createAdminClient } = await import('./supabase/admin');
    const admin = createAdminClient();

    await admin.from('analytics_events').insert({
      event_name: name,
      user_id: options.userId || null,
      properties: options.properties || {},
      page_url: options.pageUrl || null,
      user_agent: options.userAgent || 'server-action',
    });
  } catch (err) {
    // If the analytics_events table hasn't been migrated or DB is unreachable, log without failing
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Analytics:Server] Notice: Unable to persist server event:', name, err);
    }
  }
}
