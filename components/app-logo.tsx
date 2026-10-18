'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export interface LogoVariant {
  src: string;
  name: string;
  style: string;
}

export const LOGO_EVEN: LogoVariant = {
  src: '/logo-1.png',
  name: 'Neon Cycle Track',
  style: 'object-cover',
};

export const LOGO_ODD: LogoVariant = {
  src: '/logo-2.png',
  name: 'Geometric Ribbon S',
  style: 'object-contain p-1',
};

/**
 * Returns the logo variant corresponding to the provided date or hour.
 * Even hours (12 AM, 2 AM, 4 AM...) -> Logo 1 (Neon Cycle Track, Prompt 2)
 * Odd hours (1 AM, 3 AM, 5 AM...) -> Logo 2 (Geometric Ribbon S, Prompt 1)
 */
export function getLogoForHour(dateOrHour: Date | number = new Date()): LogoVariant {
  const hour = typeof dateOrHour === 'number' ? dateOrHour : dateOrHour.getHours();
  const isEvenHour = hour % 2 === 0;
  return isEvenHour ? LOGO_EVEN : LOGO_ODD;
}

/**
 * Backward-compatible alias for getLogoForHour.
 */
export const getActiveLogo = getLogoForHour;

/**
 * Calculates milliseconds remaining until the top of the next hour boundary.
 */
export function getMsUntilNextHour(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  const diff = next.getTime() - now.getTime();
  return diff > 0 ? diff : 3600000;
}

function updateFavicon(src: string) {
  if (typeof document === 'undefined') return;
  const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
  if (link && !link.href.includes(src)) {
    link.href = src;
  }
}

/**
 * Hook that tracks the current hourly logo and automatically schedules
 * switches at every hour boundary without polling or page reloads.
 */
export function useHourlyLogo(): LogoVariant {
  // Hydration safety: initialize with fixed LOGO_EVEN so server SSR and
  // initial client render match identically without hydration warning.
  const [logo, setLogo] = useState<LogoVariant>(LOGO_EVEN);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      const now = new Date();
      const current = getLogoForHour(now);
      setLogo(current);
      updateFavicon(current.src);

      const delay = getMsUntilNextHour(now);
      timerId = setTimeout(() => {
        scheduleNext();
      }, delay);
    };

    // Synchronize immediately upon client mount
    scheduleNext();

    // Reconcile and reschedule if tab wakes up or gains focus after throttling
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        if (timerId !== undefined) {
          clearTimeout(timerId);
        }
        scheduleNext();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  return logo;
}

export function SubTrackIcon({
  size = 32,
  className = '',
  title = 'Back to dashboard',
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  const logo = useHourlyLogo();
  const isEven = logo.src === LOGO_EVEN.src;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden rounded-xl bg-[#171913] border border-white/10 shadow-sm transition-all duration-500 ${className}`}
      title={title}
    >
      <img
        src={LOGO_EVEN.src}
        alt={isEven ? 'SubTrack' : ''}
        aria-hidden={!isEven}
        width={size}
        height={size}
        className={`absolute inset-0 h-full w-full rounded-xl transition-opacity duration-300 motion-reduce:transition-none ${LOGO_EVEN.style} ${
          isEven ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />
      <img
        src={LOGO_ODD.src}
        alt={!isEven ? 'SubTrack' : ''}
        aria-hidden={isEven}
        width={size}
        height={size}
        className={`absolute inset-0 h-full w-full rounded-xl transition-opacity duration-300 motion-reduce:transition-none ${LOGO_ODD.style} ${
          !isEven ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />
    </div>
  );
}

export function AppLogo({
  size = 'md',
  showText = true,
  href = '/dashboard',
  className = '',
  title = 'Back to dashboard',
}: {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  href?: string;
  className?: string;
  title?: string;
}) {
  const pixelSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const textClasses =
    size === 'sm'
      ? 'text-lg font-bold tracking-tight'
      : size === 'lg'
      ? 'text-2xl font-bold tracking-tight'
      : 'text-xl font-bold tracking-tight';

  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`} title={title}>
      <SubTrackIcon size={pixelSize} title={title} />
      {showText && (
        <span className={`font-sans text-ink dark:text-stone-100 ${textClasses}`}>
          Sub<span className="text-stone-500 dark:text-stone-400">Track</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} title={title} className="inline-flex items-center transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
