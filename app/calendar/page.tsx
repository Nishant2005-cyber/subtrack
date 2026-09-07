import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { CalendarView } from '@/components/calendar-view';
import { getAppData } from '@/lib/data';

export default async function CalendarPage() {
  const { user, subscriptions } = await getAppData();
  if (!user) redirect('/login');

  return (
    <AppShell email={user.email ?? null}>
      <CalendarView subscriptions={subscriptions} />
    </AppShell>
  );
}

