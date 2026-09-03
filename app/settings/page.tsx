import { redirect } from 'next/navigation';
import { Mail, UserCheck } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { ProfileForm } from '@/components/profile-form';
import { LogoutButton } from '@/components/logout-button';
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

        {/* Account Info & Logout Session Card */}
        <section className="card mb-7 p-5 bg-white border border-stone-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-700">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Signed in as</p>
                <p className="text-sm font-bold text-ink mt-0.5">{user.email}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </section>

        <ProfileForm
          userEmail={user.email ?? null}
          userFullName={fullName}
          settings={settings}
        />
      </div>
    </AppShell>
  );
}
