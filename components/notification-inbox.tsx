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
  in_app: { label: 'In-App', icon: <Bell size={12} />, color: 'bg-stone-100 text-stone-700' },
  email: { label: 'Email', icon: <Mail size={12} />, color: 'bg-sky-100 text-sky-700' },
  sms: { label: 'SMS', icon: <MessageSquare size={12} />, color: 'bg-emerald-100 text-emerald-700' },
  telegram: { label: 'Telegram', icon: <Send size={12} />, color: 'bg-blue-100 text-blue-700' },
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
            <span className="text-xs font-bold text-stone-500">Total Reminders</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100 text-violet">
              <Bell size={16} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight">{initialNotifications.length}</p>
          <p className="mt-1 text-xs text-stone-500">All-time delivered alerts</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">Unread</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-100 text-rose-700">
              <Clock3 size={16} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-rose-700">{unreadCount}</p>
          <p className="mt-1 text-xs text-stone-500">Awaiting your review</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">Read & Resolved</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime text-ink">
              <CheckCheck size={16} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight">{readCount}</p>
          <p className="mt-1 text-xs text-stone-500">Acknowledged reminders</p>
        </div>
      </section>

      {/* Filter Tabs & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'all' ? 'bg-ink text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All ({initialNotifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'unread' ? 'bg-rose-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'read' ? 'bg-ink text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Read ({readCount})
          </button>
          <button
            onClick={() => setFilter('renewal')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'renewal' ? 'bg-ink text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Renewals
          </button>
          <button
            onClick={() => setFilter('unused')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'unused' ? 'bg-ink text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Usage Nudges
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            disabled={pending}
            onClick={handleMarkAll}
            className="action border bg-white text-xs font-bold text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-50"
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
                  item.acknowledged ? 'bg-white/80 opacity-75' : 'border-l-4 border-l-rose-500 bg-white shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base font-bold ${
                        item.type === 'renewal_reminder'
                          ? 'bg-orange-100 text-orange-700'
                          : item.type === 'unused_reminder'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-violet-100 text-violet-800'
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
                        <h3 className="font-bold text-ink">
                          {sub?.service_name ?? 'Subscription'} {item.type === 'renewal_reminder' ? 'Renewal Alert' : 'Usage Check'}
                        </h3>
                        {sub && (
                          <span className="pill bg-stone-100 text-[11px] font-semibold text-stone-600">
                            {categoryLabel(sub.category)} · {currency(Number(sub.cost), sub.currency)}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${channel.color}`}>
                          {channel.icon}
                          {channel.label}
                        </span>
                        {!item.acknowledged ? (
                          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            ● Unread
                          </span>
                        ) : (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                            ✓ Read
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-stone-700">{message}</p>

                      {/* TMDB Upcoming Titles Nudge if present */}
                      {titles.length > 0 && (
                        <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3 text-xs text-violet-900">
                          <p className="flex items-center gap-1.5 font-bold">
                            <Film size={13} /> Upcoming titles on {sub?.service_name}:
                          </p>
                          <p className="mt-1 text-violet-700">{titles.join(' • ')}</p>
                        </div>
                      )}

                      <p className="mt-3 text-[11px] text-stone-400">Sent on {formatTime(item.sent_at)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    <button
                      disabled={pending}
                      onClick={() => handleToggle(item.id, item.acknowledged)}
                      className={`action text-xs ${
                        item.acknowledged
                          ? 'border bg-stone-50 text-stone-600 hover:bg-stone-100'
                          : 'bg-ink text-white hover:bg-black'
                      }`}
                      title={item.acknowledged ? 'Mark as unread' : 'Mark as read'}
                    >
                      <Check size={13} />
                      {item.acknowledged ? 'Mark unread' : 'Mark read'}
                    </button>

                    {sub && (
                      <Link
                        href={`/subscriptions/${sub.id}`}
                        className="action border bg-white text-xs text-stone-700 hover:bg-stone-50"
                      >
                        View details
                      </Link>
                    )}

                    {sub?.renewal_url && (
                      <a
                        href={sub.renewal_url}
                        target="_blank"
                        rel="noreferrer"
                        className="action bg-lime text-xs font-bold text-ink hover:opacity-90"
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
          <div className="card py-16 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
              <BellOff size={24} />
            </div>
            <h3 className="font-serif text-xl">No reminders found</h3>
            <p className="mt-1 text-sm text-stone-500">
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
