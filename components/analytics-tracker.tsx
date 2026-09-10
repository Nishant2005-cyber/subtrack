'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

function TrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    
    // Avoid double logging the exact same path in React strict mode
    if (lastTrackedPath.current === fullPath) return;
    lastTrackedPath.current = fullPath;

    trackEvent('page_view', {
      path: fullPath,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      title: typeof document !== 'undefined' ? document.title : '',
    });
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerContent />
    </Suspense>
  );
}
