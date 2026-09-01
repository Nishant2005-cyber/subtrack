'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CalendarDays, ChartNoAxesCombined, LayoutDashboard, LogOut, Menu, Settings, X } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/notifications', label: 'Inbox', icon: Bell },
  { href: '/spending', label: 'Spending', icon: ChartNoAxesCombined },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: Settings }
];
export function AppShell({ children, email }: { children: React.ReactNode; email: string | null }) {
  const path = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  const menu = <><div className="mb-10 flex items-center gap-2 px-2 text-2xl font-bold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-lg bg-lime text-lg text-ink">s</span>SubTrack</div><nav className="grid gap-1">{links.map(({ href,label,icon:Icon})=><Link onClick={()=>setOpen(false)} key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${path === href ? 'bg-white text-ink shadow-sm' : 'text-stone-500 hover:bg-white/60 hover:text-ink'}`}><Icon size={18}/>{label}</Link>)}</nav><div className="mt-auto border-t border-stone-200 pt-5"><div className="mb-3 truncate px-3 text-xs text-stone-500">{email}</div><button onClick={async()=>{await createClient().auth.signOut();router.replace('/login');router.refresh()}} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-500 hover:bg-white hover:text-ink"><LogOut size={18}/>Log out</button></div></>;
  return <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]"><aside className="sticky top-0 hidden h-screen flex-col border-r border-stone-200 bg-[#f1f2ed] p-5 lg:flex">{menu}</aside><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-[#f7f7f3]/90 px-5 backdrop-blur lg:hidden"><Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-lime text-base">s</span>SubTrack</Link><button onClick={()=>setOpen(true)} aria-label="Open menu" className="rounded-lg p-2"><Menu size={21}/></button></header>{open&&<div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={()=>setOpen(false)}><aside onClick={e=>e.stopPropagation()} className="flex h-full w-72 flex-col bg-[#f1f2ed] p-5 shadow-2xl"><button onClick={()=>setOpen(false)} className="ml-auto mb-4 rounded-lg p-2"><X size={20}/></button>{menu}</aside></div>}<main className="min-w-0">{children}</main></div>;
}
