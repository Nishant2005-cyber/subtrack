'use client';

import { useEffect, useState } from 'react';
import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/components/theme-provider';

export function ThemeToggle({
  variant = 'compact',
  className = '',
}: {
  variant?: 'compact' | 'segmented';
  className?: string;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-8 w-8 rounded-lg bg-stone-200/50 dark:bg-stone-800 animate-pulse ${className}`} />
    );
  }

  // Segmented control (Full mode for Settings / Drawers)
  if (variant === 'segmented') {
    const options: { id: Theme; label: string; icon: typeof Sun }[] = [
      { id: 'light', label: 'Light', icon: Sun },
      { id: 'dark', label: 'Dark', icon: Moon },
      { id: 'system', label: 'Auto', icon: Laptop },
    ];

    return (
      <div
        className={`inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-100/80 p-1 dark:border-stone-800 dark:bg-stone-900 ${className}`}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-ink shadow-sm dark:bg-stone-800 dark:text-stone-100'
                  : 'text-stone-500 hover:text-ink dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-violet dark:text-violet-400' : ''} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact toggle for Sidebar / Mobile: strictly switches between Light and Dark only!
  const toggleLightDark = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleLightDark}
      title={label}
      aria-label={label}
      className={`relative flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300/80 bg-white/80 text-stone-600 shadow-sm transition hover:bg-white hover:text-ink dark:border-stone-700/80 dark:bg-stone-800/80 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-white ${className}`}
    >
      {isDark ? (
        <Moon size={15} className="text-violet-400" />
      ) : (
        <Sun size={15} className="text-amber-500" />
      )}
    </button>
  );
}
