'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppLogo } from '@/components/app-logo';

type SidebarMode = 'expanded' | 'collapsed' | 'hover';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/notifications', label: 'Inbox', icon: Bell },
  { href: '/spending', label: 'Spending', icon: ChartNoAxesCombined },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function SidebarPanelIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <rect x="1.5" y="2" width="13" height="12" rx="2.5" />
      <line x1="5.5" y1="2" x2="5.5" y2="14" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

function SidebarControlDropdown({
  mode,
  onSelectMode,
  isOpen,
  onToggle,
  onClose,
  isCompact,
}: {
  mode: SidebarMode;
  onSelectMode: (m: SidebarMode) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  isCompact: boolean;
}) {
  const modeLabels: Record<SidebarMode, string> = {
    expanded: 'Expanded',
    collapsed: 'Collapsed',
    hover: 'Expand on hover',
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300/80 bg-white/80 text-stone-600 shadow-sm transition hover:bg-white hover:text-ink hover:border-stone-400"
        title="Sidebar control"
        aria-label="Sidebar control"
      >
        <SidebarPanelIcon className="text-stone-600" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-full mb-2 left-0 w-44 rounded-2xl border border-stone-200 bg-white p-1.5 text-ink shadow-xl shadow-stone-900/10 z-50 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 mb-1">
              Sidebar control
            </div>
            <div className="space-y-0.5">
              {[
                { id: 'expanded', label: 'Expanded' },
                { id: 'collapsed', label: 'Collapsed' },
                { id: 'hover', label: 'Expand on hover' },
              ].map((item) => {
                const isSelected = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectMode(item.id as SidebarMode)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-left transition ${
                      isSelected
                        ? 'bg-stone-100 text-ink'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-ink'
                    }`}
                  >
                    <span className="grid w-3 place-items-center">
                      {isSelected ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                      ) : null}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string | null;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Sidebar modes: 'expanded' | 'collapsed' | 'hover'
  const [mode, setMode] = useState<SidebarMode>('expanded');
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Restore saved sidebar mode from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('subtrack_sidebar_mode') as SidebarMode | null;
      if (saved && ['expanded', 'collapsed', 'hover'].includes(saved)) {
        setMode(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSelectMode = (newMode: SidebarMode) => {
    setMode(newMode);
    setMenuOpen(false);
    try {
      localStorage.setItem('subtrack_sidebar_mode', newMode);
    } catch {
      // ignore
    }
  };

  const isHoverMode = mode === 'hover';
  const isCollapsedMode = mode === 'collapsed';
  const isCompact = isCollapsedMode || (isHoverMode && !isHovered);

  const renderNavLinks = (compact: boolean) => (
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
              compact
                ? 'h-11 w-11 justify-center mx-auto'
                : 'gap-3 px-3 py-2.5'
            } ${
              isActive
                ? 'bg-white text-ink shadow-sm'
                : 'text-stone-500 hover:bg-white/60 hover:text-ink'
            }`}
          >
            <Icon size={19} className="shrink-0" />
            {!compact && <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const renderFooter = (compact: boolean) => (
    <div className="mt-auto border-t border-stone-200 pt-4">
      <SidebarControlDropdown
        mode={mode}
        onSelectMode={handleSelectMode}
        isOpen={menuOpen}
        onToggle={() => setMenuOpen(!menuOpen)}
        onClose={() => setMenuOpen(false)}
        isCompact={compact}
      />
    </div>
  );

  return (
    <div
      className={`min-h-screen transition-all duration-300 lg:grid ${
        mode === 'expanded' ? 'lg:grid-cols-[240px_1fr]' : 'lg:grid-cols-[76px_1fr]'
      }`}
    >
      {/* Desktop Sidebar */}
      <aside
        onMouseEnter={() => {
          if (isHoverMode) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (isHoverMode) setIsHovered(false);
        }}
        className={`sticky top-0 hidden h-screen flex-col border-r border-stone-200 bg-[#f1f2ed] transition-all duration-300 lg:flex ${
          isHoverMode && isHovered
            ? 'absolute left-0 top-0 z-30 w-[240px] p-5 shadow-2xl border-r-stone-300'
            : isCompact
            ? 'w-[76px] p-3'
            : 'w-[240px] p-5'
        }`}
      >
        {/* Top Header: Clean SubTrack Logo */}
        <div
          className={`mb-8 flex items-center transition-all ${
            isCompact ? 'justify-center' : 'px-1'
          }`}
        >
          <AppLogo size={isCompact ? 'sm' : 'md'} showText={!isCompact} href="/dashboard" />
        </div>

        {/* Navigation Items */}
        {renderNavLinks(isCompact)}

        {/* Bottom: Sidebar Control Dropdown (Replaced Logout & Email) */}
        {renderFooter(isCompact)}
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
            <div className="mt-auto border-t border-stone-200 pt-4">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-stone-600 bg-white/70"
              >
                <span>Settings & Account</span>
                <span className="text-[10px] text-stone-400 truncate max-w-[120px]">{email}</span>
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main Page Content */}
      <main className="min-w-0">{children}</main>
    </div>
  );
}
