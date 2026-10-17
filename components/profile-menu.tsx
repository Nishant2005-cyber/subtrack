'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/toast';

export interface ProfileMenuProps {
  email: string | null;
  name?: string | null;
  size?: 'sm' | 'md';
  align?: 'bottom' | 'top';
  className?: string;
}

/**
 * Profile icon + account popover (Microsoft-style).
 * Receives the user's email and optional name server-side via props so there's no loading flash.
 */
export function ProfileMenu({
  email,
  name,
  size = 'sm',
  align = 'bottom',
  className = '',
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Derive initial from name first, then email (first letter, uppercase)
  const initial = (
    name?.trim() ? name.trim()[0] : email?.trim() ? email.trim()[0] : '?'
  ).toUpperCase();
  const displayName = name?.trim() || (email ? email.split('@')[0] : 'Account');

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

  const sizeClasses =
    size === 'md'
      ? 'h-9 w-9 text-xs sm:text-sm shadow-xs'
      : 'h-8 w-8 text-xs shadow-xs';

  const placementClasses =
    align === 'top'
      ? 'bottom-full mb-2.5 right-0 origin-bottom-right'
      : 'top-full mt-2.5 right-0 origin-top-right';

  return (
    <div className="relative inline-flex items-center">
      {/* Profile icon button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
        title={name ? `${name} (${email ?? ''})` : email ?? 'Account menu'}
        className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-full bg-violet text-white font-bold transition-all duration-150 hover:bg-violet-600 hover:scale-[1.03] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f3] dark:bg-violet-600 dark:hover:bg-violet-500 dark:focus-visible:ring-offset-[#0f0f0e] select-none ${className}`}
      >
        {initial}
      </button>

      {/* Popover panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Account menu"
          className={`absolute ${placementClasses} z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-stone-200/90 bg-white/95 p-1 text-ink shadow-2xl shadow-stone-900/10 backdrop-blur-md dark:border-stone-800 dark:bg-[#181816]/95 dark:text-stone-100 dark:shadow-black/40 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header: SubTrack branding */}
          <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-stone-100 dark:border-stone-800/80 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Account
            </span>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Sub<span className="font-bold text-ink dark:text-stone-200">Track</span>
            </span>
          </div>

          {/* User info row */}
          <div className="mx-2 flex items-center gap-3 rounded-xl bg-stone-100/70 p-3 dark:bg-stone-900/70 border border-stone-200/60 dark:border-stone-800/60">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet text-white text-base font-bold shadow-xs">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-bold text-ink dark:text-stone-100"
                title={displayName}
              >
                {displayName}
              </p>
              {email && (
                <p
                  className="truncate text-xs text-stone-500 dark:text-stone-400"
                  title={email}
                >
                  {email}
                </p>
              )}
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-violet hover:underline dark:text-violet-400"
              >
                Manage profile →
              </Link>
            </div>
          </div>

          {/* Actions */}
          <div className="px-2 pt-2 pb-1 space-y-0.5">
            {/* View account (settings) */}
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-ink dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-200 transition"
            >
              <Settings size={15} />
              <span>Settings</span>
            </Link>

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
