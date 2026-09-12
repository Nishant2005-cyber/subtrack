'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { 
  Bell, 
  BellOff, 
  CalendarClock, 
  Check, 
  CheckCheck, 
  Clock3, 
  ExternalLink, 
  Film, 
  Mail, 
  MessageSquare, 
  Send, 
  Sparkles 
} from 'lucide-react';
import { markAllNotificationsRead, toggleNotificationRead } from '@/app/actions';
import { useToast } from '@/components/toast';
import { categoryLabel, currency, dateLabel } from '@/lib/format';
import type { Notification, Subscription } from '@/lib/types';

export type EnrichedNotification = Notification & {
  subscription?: Subscription;
};

const channelBadge: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  in_app: { label: 'In-App', icon: <Bell size={12} />, color: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
  email: { label: 'Email', icon: <Mail size={12} />, color: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' },
  sms: { label: 'SMS', icon: <MessageSquare size={12} />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  telegram: { label: 'Telegram', icon: <Send size={12} />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  } catch {
    return iso;
  }
}

export function NotificationInbox({ initialNotifications }: { initialNotifications: EnrichedNotification[] }) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'renewal' | 'unused'>('all');
  const [pending, startTransition] = useTransition();

  const unreadCount = initialNotifications.filter(n => !n.acknowledged).length;
  const readCount = initialNotifications.filter(n => n.acknowledged).length;

  const filtered = initialNotifications.filter(n => {
    if (filter === 'unread') return !n.acknowledged;
    if (filter === 'read') return n.acknowledged;
    if (filter === 'renewal') return n.type === 'renewal_reminder';
    if (filter === 'unused') return n.type === 'unused_reminder';
    return true;
  });

  const { success: toastSuccess, error: toastError } = useToast();

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      try {
        await toggleNotificationRead(id, !current);
        toastSuccess(!current ? 'Reminder marked as read' : 'Reminder marked as unread');
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Could not update notification status.');
      }
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      try {
        await markAllNotificationsRead();
        toastSuccess('All reminders marked as read!');
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Could not mark all as read.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats & Quick Actions */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Total Reminders</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100 text-violet dark:bg-violet-950/60 dark:text-violet-300">
              <Bell size={16} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-ink dark:text-stone-100">{initialNotifications.length}</p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">All-time delivered alerts</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Unread</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <Clock3 size={16} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-rose-700 dark:text-rose-400">{unreadCount}</p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Awaiting your review</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Read & Resolved</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/40">
              <CheckCheck size={16} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-ink dark:text-stone-100">{readCount}</p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Acknowledged reminders</p>
        </div>
      </section>

      {/* Filter Tabs & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-ink text-white shadow-sm dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
            }`}
          >
            All ({initialNotifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'unread'
                ? 'bg-rose-600 text-white shadow-sm dark:bg-rose-500 dark:text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'read'
                ? 'bg-ink text-white shadow-sm dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
            }`}
          >
            Read ({readCount})
          </button>
          <button
            onClick={() => setFilter('renewal')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'renewal'
                ? 'bg-ink text-white shadow-sm dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
            }`}
          >
            Renewals
          </button>
          <button
            onClick={() => setFilter('unused')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'unused'
                ? 'bg-ink text-white shadow-sm dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
            }`}
          >
            Usage Nudges
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            disabled={pending}
            onClick={handleMarkAll}
            className="action border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-200 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-50"
          >
            <CheckCheck size={14} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((item) => {
            const sub = item.subscription;
            const channel = channelBadge[item.channel] || channelBadge.in_app;
            const message = String(item.metadata?.message ?? 'Subscription reminder');
            const titles = Array.isArray(item.metadata?.titles) ? (item.metadata.titles as string[]) : [];

            return (
              <article
                key={item.id}
                className={`card relative overflow-hidden p-5 transition-all ${
                  item.acknowledged
                    ? 'border border-stone-200/80 bg-white/80 dark:border-stone-800/80 dark:bg-[#181816]/80'
                    : 'border border-stone-200/80 border-l-4 border-l-rose-500 bg-white shadow-sm dark:border-stone-800 dark:border-l-rose-500 dark:bg-[#181816]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base font-bold ${
                        item.type === 'renewal_reminder'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                          : item.type === 'unused_reminder'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300'
                      }`}
                    >
                      {item.type === 'renewal_reminder' ? (
                        <CalendarClock size={19} />
                      ) : item.type === 'unused_reminder' ? (
                        <Clock3 size={19} />
                      ) : (
                        <Sparkles size={19} />
                      )}
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-ink dark:text-stone-100">
                          {sub?.service_name ?? 'Subscription'} {item.type === 'renewal_reminder' ? 'Renewal Alert' : 'Usage Check'}
                        </h3>
                        {sub && (
                          <span className="pill bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                            {categoryLabel(sub.category)} · {currency(Number(sub.cost), sub.currency)}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${channel.color}`}>
                          {channel.icon}
                          {channel.label}
                        </span>
                        {!item.acknowledged ? (
                          <span className="rounded-full bg-rose-500/15 dark:bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400">
                            ● Unread
                          </span>
                        ) : (
                          <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                            ✓ Read
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-stone-700 dark:text-stone-300">{message}</p>

                      {/* TMDB Upcoming Titles Nudge if present */}
                      {titles.length > 0 && (
                        <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/70 dark:border-violet-900/50 dark:bg-violet-950/30 p-3 text-xs text-violet-900 dark:text-violet-200">
                          <p className="flex items-center gap-1.5 font-bold">
                            <Film size={13} /> Upcoming titles on {sub?.service_name}:
                          </p>
                          <p className="mt-1 text-violet-700 dark:text-violet-300">{titles.join(' • ')}</p>
                        </div>
                      )}

                      <p className="mt-3 text-[11px] text-stone-400 dark:text-stone-500">Sent on {formatTime(item.sent_at)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    <button
                      disabled={pending}
                      onClick={() => handleToggle(item.id, item.acknowledged)}
                      className={`action text-xs ${
                        item.acknowledged
                          ? 'border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                          : 'bg-ink text-white hover:bg-black dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white'
                      }`}
                      title={item.acknowledged ? 'Mark as unread' : 'Mark as read'}
                    >
                      <Check size={13} />
                      {item.acknowledged ? 'Mark unread' : 'Mark read'}
                    </button>

                    {sub && (
                      <Link
                        href={`/subscriptions/${sub.id}`}
                        className="action border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 shadow-xs"
                      >
                        View details
                      </Link>
                    )}

                    {sub?.renewal_url && (
                      <a
                        href={sub.renewal_url}
                        target="_blank"
                        rel="noreferrer"
                        className="action bg-ink text-white hover:bg-black dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white text-xs font-bold shadow-xs"
                      >
                        Renew on site <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="card py-16 text-center dark:bg-[#181816] dark:border-stone-800">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400">
              <BellOff size={24} />
            </div>
            <h3 className="font-serif text-xl text-stone-900 dark:text-stone-100">No reminders found</h3>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {filter !== 'all'
                ? `There are no notifications matching the "${filter}" filter.`
                : 'As your subscriptions approach their renewal dates, your reminder history will appear here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
