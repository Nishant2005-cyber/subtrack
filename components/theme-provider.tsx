'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
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
      if (effective === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
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

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
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
