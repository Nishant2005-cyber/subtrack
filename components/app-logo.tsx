'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// Alternates automatically every 1 hour based on current local hour
function getActiveLogo() {
  const hour = new Date().getHours();
  // Even hours (12 AM, 2 AM, 4 AM...) -> Logo 1 (Neon Cycle Track, Prompt 2)
  // Odd hours (1 AM, 3 AM, 5 AM...) -> Logo 2 (Geometric Ribbon S, Prompt 1)
  const isEvenHour = hour % 2 === 0;
  return isEvenHour
    ? {
        src: '/logo-1.png',
        name: 'Neon Cycle Track',
        style: 'object-cover',
      }
    : {
        src: '/logo-2.png',
        name: 'Geometric Ribbon S',
        style: 'object-contain p-1',
      };
}

export function SubTrackIcon({
  size = 32,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const [logo, setLogo] = useState(getActiveLogo);

  useEffect(() => {
    // Check every minute to rotate when the hour changes
    const update = () => {
      const current = getActiveLogo();
      setLogo(current);

      // Also update browser tab icon dynamically
      const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link && !link.href.includes(current.src)) {
        link.href = current.src;
      }
    };

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden rounded-xl bg-[#171913] border border-white/10 shadow-sm transition-all duration-500 ${className}`}
      title={`Current logo: ${logo.name} (Rotates automatically every 1 hour)`}
    >
      <img
        src={logo.src}
        alt="SubTrack"
        width={size}
        height={size}
        className={`h-full w-full rounded-[10px] transition-opacity duration-300 ${logo.style}`}
      />
    </div>
  );
}

export function AppLogo({
  size = 'md',
  showText = true,
  href = '/dashboard',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  href?: string;
  className?: string;
}) {
  const pixelSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const textClasses =
    size === 'sm'
      ? 'text-lg font-bold tracking-tight'
      : size === 'lg'
      ? 'text-2xl font-bold tracking-tight'
      : 'text-xl font-bold tracking-tight';

  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <SubTrackIcon size={pixelSize} />
      {showText && (
        <span className={`font-sans text-ink ${textClasses}`}>
          Sub<span className="text-stone-500">Track</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
