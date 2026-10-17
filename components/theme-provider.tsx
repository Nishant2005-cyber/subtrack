'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  /** Toggle light↔dark with an optional ripple origin (page-relative px coordinates). */
  toggleTheme: (origin?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/** Apply or remove `dark` class instantly (used inside the VT callback). */
function applyDarkClass(dark: boolean) {
  const root = document.documentElement;
  if (dark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Read stored preference on mount (defaults to light if not explicitly set)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme') as Theme | null;
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        setThemeState(saved);
      } else {
        setThemeState('light');
      }
    } catch {
      // Ignore localStorage access issues
    }
    setMounted(true);
  }, []);

  // Apply class to documentElement whenever theme changes or system changes
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    function applyEffectiveTheme(effective: 'light' | 'dark') {
      setResolvedTheme(effective);
      applyDarkClass(effective === 'dark');
    }

    if (theme === 'light') {
      applyEffectiveTheme('light');
      return;
    }

    if (theme === 'dark') {
      applyEffectiveTheme('dark');
      return;
    }

    // theme === 'system' (Auto mode)
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleSystemChange = (e: MediaQueryListEvent | MediaQueryList) => {
        applyEffectiveTheme(e.matches ? 'dark' : 'light');
      };

      // Initial system check
      handleSystemChange(mediaQuery);

      try {
        mediaQuery.addEventListener('change', handleSystemChange);
        return () => mediaQuery.removeEventListener('change', handleSystemChange);
      } catch {
        try {
          mediaQuery.addListener(handleSystemChange);
          return () => mediaQuery.removeListener(handleSystemChange);
        } catch {
          // ignore
        }
      }
    } else {
      applyEffectiveTheme('light');
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
      document.cookie = `theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore storage errors
    }
  };

  /**
   * Toggle light ↔ dark with a circular ripple reveal:
   *   light → dark : new dark layer expands from the top-left corner across to bottom-right
   *   dark  → light : new light layer expands from the bottom-right corner across to top-left
   * Falls back to an instant switch when View Transitions are unsupported
   * or the user prefers reduced motion.
   */
  const toggleTheme = (_origin?: { x: number; y: number }) => {
    const nextResolved: 'light' | 'dark' = resolvedTheme === 'dark' ? 'light' : 'dark';
    const nextTheme: Theme = nextResolved; // always explicit, not 'system'

    // Persist immediately
    try {
      localStorage.setItem('theme', nextTheme);
      document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Instant fallback
    if (
      prefersReduced ||
      typeof document === 'undefined' ||
      !('startViewTransition' in document)
    ) {
      applyDarkClass(nextResolved === 'dark');
      setResolvedTheme(nextResolved);
      setThemeState(nextTheme);
      return;
    }

    const root = document.documentElement;
    const endRadius = Math.hypot(window.innerWidth, window.innerHeight);

    if (nextResolved === 'dark') {
      // light → dark: new dark layer expands FROM top-left
      root.style.setProperty('--vt-ripple-x', '0px');
      root.style.setProperty('--vt-ripple-y', '0px');
    } else {
      // dark → light: new light layer expands FROM bottom-right
      root.style.setProperty('--vt-ripple-x', `${window.innerWidth}px`);
      root.style.setProperty('--vt-ripple-y', `${window.innerHeight}px`);
    }
    root.style.setProperty('--vt-ripple-r', `${endRadius}px`);

    // Direction flag for CSS selectors
    root.setAttribute('data-vt', nextResolved === 'dark' ? 'to-dark' : 'to-light');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any)
      .startViewTransition(() => {
        applyDarkClass(nextResolved === 'dark');
        setResolvedTheme(nextResolved);
        setThemeState(nextTheme);
      })
      .finished.finally(() => {
        root.removeAttribute('data-vt');
      });
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Blocking inline script to execute before rendering to eliminate white flash (FOUC)
 * Defaults to light unless user explicitly saved 'dark' or 'system' with dark mode preferred.
 */
export const ThemeScript = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `
        (function() {
          try {
            var stored = localStorage.getItem('theme');
            var isDark = stored === 'dark' || (stored === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (isDark) {
              document.documentElement.classList.add('dark');
              document.documentElement.style.colorScheme = 'dark';
            } else {
              document.documentElement.classList.remove('dark');
              document.documentElement.style.colorScheme = 'light';
            }
          } catch (e) {}
        })();
      `,
    }}
  />
);
