import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { NotificationInbox } from '@/components/notification-inbox';
import { getAllNotifications } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const { user, notifications } = await getAllNotifications();
  if (!user) redirect('/login');

  return (
    <AppShell email={user.email ?? null}>
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-sm text-stone-500">
              <Bell size={14} className="text-violet" />
              Activity & Reminders
            </p>
            <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Notification Inbox</h1>
          </div>
        </header>

        <NotificationInbox initialNotifications={notifications} />
      </div>
    </AppShell>
  );
}
