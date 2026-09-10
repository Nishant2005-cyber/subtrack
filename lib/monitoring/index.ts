/**
 * SubTrack Monitoring & Error Tracking Module (Sentry Compatible)
 *
 * Provides centralized error capturing, breadcrumbs, and exception reporting.
 * If SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN is configured in environment,
 * events are transmitted to Sentry. Otherwise, events are captured cleanly
 * in structured application logs with breadcrumbs and stack traces.
 */

export interface Breadcrumb {
  message: string;
  category?: string;
  level?: 'info' | 'warning' | 'error' | 'debug';
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface ErrorContext {
  user?: { id?: string; email?: string | null };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
}

const recentBreadcrumbs: Breadcrumb[] = [];
const MAX_BREADCRUMBS = 30;

/**
 * Record a breadcrumb representing a user action or system event leading up to an error
 */
export function addBreadcrumb(breadcrumb: Breadcrumb) {
  const item: Breadcrumb = {
    ...breadcrumb,
    level: breadcrumb.level || 'info',
    timestamp: breadcrumb.timestamp || Date.now(),
  };

  recentBreadcrumbs.push(item);
  if (recentBreadcrumbs.length > MAX_BREADCRUMBS) {
    recentBreadcrumbs.shift();
  }
}

/**
 * Get current list of recorded breadcrumbs
 */
export function getBreadcrumbs(): Breadcrumb[] {
  return [...recentBreadcrumbs];
}

/**
 * Send event payload to Sentry if DSN is configured
 */
async function sendToSentry(payload: Record<string, unknown>) {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    const url = new URL(dsn);
    const key = url.username;
    const projectId = url.pathname.replace(/^\//, '');
    const endpoint = `${url.protocol}//${url.host}/api/${projectId}/store/?sentry_key=${key}&sentry_version=7`;

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[Monitoring] Failed to dispatch error to Sentry endpoint:', err);
  }
}

/**
 * Capture an exception with stack trace, metadata, and breadcrumbs
 */
export function captureException(error: unknown, context?: ErrorContext): string {
  const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : undefined;

  const payload = {
    event_id: errorId,
    timestamp: new Date().toISOString(),
    level: 'error',
    message: errorMessage,
    exception: {
      values: [
        {
          type: error instanceof Error ? error.name : 'UnhandledException',
          value: errorMessage,
          stacktrace: stackTrace ? { frames: [{ filename: stackTrace }] } : undefined,
        },
      ],
    },
    user: context?.user,
    tags: {
      platform: 'next.js',
      environment: process.env.NODE_ENV || 'development',
      ...context?.tags,
    },
    extra: {
      ...context?.extra,
      breadcrumbs: getBreadcrumbs(),
    },
  };

  // Structured log output
  if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    console.error(`[Monitoring:Exception] [${errorId}] ${errorMessage}`, {
      stack: stackTrace,
      context,
      breadcrumbsCount: recentBreadcrumbs.length,
    });
  }

  sendToSentry(payload).catch(() => {});

  return errorId;
}

/**
 * Capture an informational or warning message
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ErrorContext
): string {
  const eventId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

  const payload = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    level,
    message,
    user: context?.user,
    tags: context?.tags,
    extra: {
      ...context?.extra,
      breadcrumbs: getBreadcrumbs(),
    },
  };

  console.log(`[Monitoring:${level.toUpperCase()}] [${eventId}] ${message}`, context);
  sendToSentry(payload).catch(() => {});

  return eventId;
}
