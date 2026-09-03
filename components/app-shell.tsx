'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLogo } from '@/components/app-logo';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/notifications', label: 'Inbox', icon: Bell },
  { href: '/spending', label: 'Spending', icon: ChartNoAxesCombined },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string | null;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore saved collapse state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('subtrack_sidebar_collapsed');
      if (saved !== null) {
        setCollapsed(saved === 'true');
      }
    } catch {
      // ignore in restricted contexts
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('subtrack_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const renderNavLinks = (isCompact: boolean) => (
    <nav className="grid gap-1.5">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = path === href;
        return (
          <Link
            onClick={() => setOpen(false)}
            key={href}
            href={href}
            title={label}
            className={`flex items-center rounded-xl text-sm font-semibold transition ${
              isCompact
                ? 'h-11 w-11 justify-center mx-auto'
                : 'gap-3 px-3 py-2.5'
            } ${
              isActive
                ? 'bg-white text-ink shadow-sm'
                : 'text-stone-500 hover:bg-white/60 hover:text-ink'
            }`}
          >
            <Icon size={19} className="shrink-0" />
            {!isCompact && <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const renderFooter = (isCompact: boolean) => (
    <div className="mt-auto border-t border-stone-200 pt-4">
      {!isCompact && (
        <div className="mb-3 truncate px-3 text-xs text-stone-500" title={email ?? ''}>
          {email}
        </div>
      )}
      <button
        onClick={async () => {
          await createClient().auth.signOut();
          router.replace('/login');
          router.refresh();
        }}
        title="Log out"
        className={`flex items-center rounded-xl text-sm font-semibold text-stone-500 hover:bg-white hover:text-ink transition ${
          isCompact ? 'h-11 w-11 justify-center mx-auto' : 'w-full gap-3 px-3 py-2.5'
        }`}
      >
        <LogOut size={18} className="shrink-0" />
        {!isCompact && <span>Log out</span>}
      </button>
    </div>
  );

  return (
    <div
      className={`min-h-screen transition-all duration-300 lg:grid ${
        collapsed ? 'lg:grid-cols-[76px_1fr]' : 'lg:grid-cols-[240px_1fr]'
      }`}
    >
      {/* Desktop Sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen flex-col border-r border-stone-200 bg-[#f1f2ed] transition-all duration-300 lg:flex ${
          collapsed ? 'w-[76px] p-3' : 'w-[240px] p-5'
        }`}
      >
        {/* Top Header: Logo + Toggle Button */}
        <div
          className={`mb-8 flex items-center transition-all ${
            collapsed
              ? 'flex-col gap-3 justify-center'
              : 'justify-between px-1'
          }`}
        >
          <AppLogo size={collapsed ? 'sm' : 'md'} showText={!collapsed} href="/dashboard" />
          
          <button
            type="button"
            onClick={toggleCollapsed}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/70 hover:text-ink transition shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Hide sidebar fields'}
            aria-label={collapsed ? 'Expand sidebar' : 'Hide sidebar fields'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Navigation Items */}
        {renderNavLinks(collapsed)}

        {/* Bottom Profile / Logout */}
        {renderFooter(collapsed)}
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-[#f7f7f3]/90 px-5 backdrop-blur lg:hidden">
        <AppLogo size="sm" href="/dashboard" />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-stone-700 hover:bg-stone-100"
        >
          <Menu size={21} />
        </button>
      </header>

      {/* Mobile Drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-72 flex-col bg-[#f1f2ed] p-5 shadow-2xl"
          >
            <div className="mb-8 flex items-center justify-between">
              <AppLogo size="md" href="/dashboard" />
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-200"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            {renderNavLinks(false)}
            {renderFooter(false)}
          </aside>
        </div>
      )}

      {/* Main Page Content */}
      <main className="min-w-0">{children}</main>
    </div>
  );
}
