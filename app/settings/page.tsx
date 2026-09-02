import { redirect } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { ProfileForm } from '@/components/profile-form';
import { getAppData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { user, settings } = await getAppData();
  if (!user || !settings) redirect('/login');

  const fullName = (user.user_metadata?.full_name as string) || null;

  return (
    <AppShell email={user.email ?? null}>
      <div className="mx-auto max-w-3xl px-5 py-7 sm:px-8 lg:px-10">
        <header className="mb-7">
          <p className="flex items-center gap-1.5 text-sm text-stone-500">
            <UserCheck size={14} className="text-violet" />
            Account & Preferences
          </p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">Account Settings</h1>
        </header>

        <ProfileForm
          userEmail={user.email ?? null}
          userFullName={fullName}
          settings={settings}
        />
      </div>
    </AppShell>
  );
}
