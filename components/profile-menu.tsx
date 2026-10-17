'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/toast';
import { SubTrackIcon } from '@/components/app-logo';

/**
 * Profile icon + account popover (Microsoft-style).
 * Receives the user's email server-side via props so there's no loading flash.
 */
export function ProfileMenu({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Derive initials from email (first letter, uppercase)
  const initial = email ? email[0].toUpperCase() : '?';

  // ─── Close on Escape ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // ─── Close on outside click ───────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // ─── Focus trap: move focus into popover when opened ──────────────────
  useEffect(() => {
    if (open && panelRef.current) {
      // Focus the first focusable element inside the panel
      const first = panelRef.current.querySelector<HTMLElement>(
        'a, button:not([disabled])'
      );
      first?.focus();
    }
  }, [open]);

  // ─── Sign out (reuses the same Supabase signOut pattern) ──────────────
  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setOpen(false);
      router.replace('/login');
      router.refresh();
    } catch {
      setSigningOut(false);
      toast.error('Sign out failed. Please try again.');
    }
  }, [router, toast]);

  return (
    <div className="relative">
      {/* Profile icon button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-violet/90 text-white text-xs font-bold shadow-sm transition hover:bg-violet focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f3] dark:focus-visible:ring-offset-[#0f0f0e]"
      >
        {initial}
      </button>

      {/* Popover panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Account menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-900/10 dark:border-stone-800 dark:bg-[#1a1a18] dark:shadow-black/30"
        >
          {/* Header: SubTrack branding */}
          <div className="px-4 pt-3.5 pb-2">
            <span className="text-sm font-bold text-ink dark:text-stone-100">
              Sub<span className="text-stone-500 dark:text-stone-400">Track</span>
            </span>
          </div>

          {/* User info row */}
          <div className="mx-3 flex items-center gap-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-900/60">
            <SubTrackIcon size={36} />
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold text-ink dark:text-stone-100"
                title={email ?? undefined}
              >
                {email ?? 'Unknown'}
              </p>
              <a
                href="/settings"
                onClick={() => setOpen(false)}
                className="mt-0.5 inline-block text-xs font-medium text-violet hover:underline dark:text-violet-400"
              >
                View account
              </a>
            </div>
          </div>

          {/* Divider + Actions */}
          <div className="border-t border-stone-200 dark:border-stone-800 mx-3 my-2" />

          <div className="px-3 pb-3 space-y-0.5">
            {/* View account (settings) */}
            <a
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-ink dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-200 transition"
            >
              <Settings size={15} />
              <span>Account settings</span>
            </a>

            {/* Sign out */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-ink dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={15} />
              <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
