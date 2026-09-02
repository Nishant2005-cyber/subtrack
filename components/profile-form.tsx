'use client';

import { useState, useTransition } from 'react';
import { 
  Bell, 
  Check, 
  KeyRound, 
  Lock, 
  Mail, 
  MessageSquare, 
  Moon, 
  Phone, 
  ShieldCheck, 
  User, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { saveSettings, updateUserPassword, updateUserProfile } from '@/app/actions';
import { useToast } from '@/components/toast';
import type { UserSettings } from '@/lib/types';

export function ProfileForm({
  userEmail,
  userFullName,
  settings,
}: {
  userEmail: string | null;
  userFullName: string | null;
  settings: UserSettings;
}) {
  const { success: toastSuccess, error: toastError } = useToast();
  
  // Profile form state
  const [profilePending, startProfileTransition] = useTransition();
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password form state
  const [passwordPending, startPasswordTransition] = useTransition();
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification settings state
  const [settingsPending, startSettingsTransition] = useTransition();
  const [settingsStatus, setSettingsStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleProfileSubmit = (formData: FormData) => {
    setProfileStatus(null);
    startProfileTransition(async () => {
      try {
        await updateUserProfile(formData);
        setProfileStatus({ type: 'success', message: 'Profile details updated successfully!' });
        toastSuccess('Profile updated successfully!');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not update profile.';
        setProfileStatus({ type: 'error', message: msg });
        toastError(msg);
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setPasswordStatus({ type: 'error', message: msg });
      return toastError(msg);
    }

    if (newPassword !== confirmPassword) {
      const msg = 'New passwords do not match.';
      setPasswordStatus({ type: 'error', message: msg });
      return toastError(msg);
    }

    const formData = new FormData(e.currentTarget);
    startPasswordTransition(async () => {
      try {
        await updateUserPassword(formData);
        setPasswordStatus({ type: 'success', message: 'Password changed successfully!' });
        toastSuccess('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not update password.';
        setPasswordStatus({ type: 'error', message: msg });
        toastError(msg);
      }
    });
  };

  const handleSettingsSubmit = (formData: FormData) => {
    setSettingsStatus(null);
    startSettingsTransition(async () => {
      try {
        await saveSettings(formData);
        setSettingsStatus({ type: 'success', message: 'Notification preferences saved!' });
        toastSuccess('Notification settings saved!');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not save settings.';
        setSettingsStatus({ type: 'error', message: msg });
        toastError(msg);
      }
    });
  };

  return (
    <div className="space-y-7">
      {/* 1. Account Profile Card */}
      <section className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet">
            <User size={19} />
          </span>
          <div>
            <h2 className="panel-title">Account Profile</h2>
            <p className="mt-0.5 text-xs text-stone-500">Manage your personal details and contact info.</p>
          </div>
        </div>

        <form action={handleProfileSubmit} className="p-5 space-y-4">
          {profileStatus && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-medium transition-all ${
                profileStatus.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {profileStatus.type === 'error' ? (
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              ) : (
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
              )}
              <p>{profileStatus.message}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-stone-700">
              Full Name / Display Name
              <input
                name="full_name"
                defaultValue={userFullName ?? ''}
                placeholder="e.g. John Doe"
                className="field mt-1.5"
              />
            </label>

            <label className="text-xs font-bold text-stone-700">
              Email Address
              <input
                type="email"
                disabled
                defaultValue={userEmail ?? ''}
                className="field mt-1.5 bg-stone-100/70 text-stone-500 cursor-not-allowed"
                title="Account email address"
              />
            </label>

            <label className="text-xs font-bold text-stone-700 sm:col-span-2">
              Phone Number <span className="font-normal text-stone-400">(with country code, e.g. +91...)</span>
              <input
                name="phone"
                type="tel"
                defaultValue={settings.phone ?? ''}
                placeholder="+91 98765 43210"
                className="field mt-1.5"
              />
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              disabled={profilePending}
              className="action bg-ink text-white hover:bg-black disabled:opacity-50 text-xs font-bold px-4 py-2.5"
            >
              {profilePending ? 'Saving profile…' : 'Save Profile Details'}
            </button>
          </div>
        </form>
      </section>

      {/* 2. Security & Password Card */}
      <section className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime text-ink">
            <KeyRound size={19} />
          </span>
          <div>
            <h2 className="panel-title">Security & Password</h2>
            <p className="mt-0.5 text-xs text-stone-500">Update your account login password.</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
          {passwordStatus && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-medium transition-all ${
                passwordStatus.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {passwordStatus.type === 'error' ? (
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              ) : (
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
              )}
              <p>{passwordStatus.message}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-stone-700">
              New Password
              <div className="relative mt-1.5">
                <input
                  name="new_password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="field pr-10"
                />
                <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              </div>
            </label>

            <label className="text-xs font-bold text-stone-700">
              Confirm New Password
              <div className="relative mt-1.5">
                <input
                  name="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="field pr-10"
                />
                <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              </div>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              disabled={passwordPending}
              className="action bg-stone-900 text-white hover:bg-black disabled:opacity-50 text-xs font-bold px-4 py-2.5"
            >
              {passwordPending ? 'Updating password…' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>

      {/* 3. Notification Preferences Form */}
      <section className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700">
            <Bell size={19} />
          </span>
          <div>
            <h2 className="panel-title">Notification Preferences</h2>
            <p className="mt-0.5 text-xs text-stone-500">Choose when and where you receive renewal alerts.</p>
          </div>
        </div>

        <form action={handleSettingsSubmit} className="p-5 space-y-6">
          {settingsStatus && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-medium transition-all ${
                settingsStatus.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {settingsStatus.type === 'error' ? (
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              ) : (
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
              )}
              <p>{settingsStatus.message}</p>
            </div>
          )}

          {/* Timing */}
          <div>
            <label className="block max-w-xs text-xs font-bold text-stone-700">
              Reminder Notice Window
              <select
                name="reminder_days_before"
                defaultValue={settings.reminder_days_before}
                className="field mt-1.5"
              >
                <option value="1">1 day before renewal</option>
                <option value="2">2 days before renewal</option>
                <option value="3">3 days before renewal</option>
                <option value="7">7 days before renewal</option>
              </select>
            </label>
            <p className="mt-1.5 text-[11px] text-stone-500">
              Reminders repeat daily until acknowledged or when subscription status changes.
            </p>
          </div>

          {/* Channels */}
          <div className="space-y-3 border-t pt-5">
            <h3 className="text-xs font-bold text-stone-700">Delivery Channels</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3.5 rounded-xl border border-stone-200 p-4 hover:bg-stone-50 transition">
                <input
                  name="notify_email"
                  type="checkbox"
                  defaultChecked={settings.notify_email}
                  className="h-4 w-4 accent-violet"
                />
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-sky-700">
                  <Mail size={16} />
                </span>
                <div>
                  <b className="block text-xs font-bold text-ink">Email Alerts</b>
                  <span className="text-[11px] text-stone-500 truncate block">Sent to {userEmail}</span>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-3.5 rounded-xl border border-stone-200 p-4 hover:bg-stone-50 transition">
                <input
                  name="notify_sms"
                  type="checkbox"
                  defaultChecked={settings.notify_sms}
                  className="h-4 w-4 accent-violet"
                />
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <MessageSquare size={16} />
                </span>
                <div>
                  <b className="block text-xs font-bold text-ink">SMS Alerts</b>
                  <span className="text-[11px] text-stone-500">Carrier rates apply</span>
                </div>
              </label>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="border-t pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Moon size={15} className="text-orange-600" />
              <h3 className="text-xs font-bold text-stone-700">Quiet Hours</h3>
            </div>
            <p className="text-[11px] text-stone-500 mb-3">
              Avoid email and SMS reminders during the hours you choose.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-stone-700">
                Start Time
                <input
                  name="quiet_hours_start"
                  type="time"
                  defaultValue={settings.quiet_hours_start?.slice(0, 5) || ''}
                  className="field mt-1.5"
                />
              </label>

              <label className="text-xs font-bold text-stone-700">
                End Time
                <input
                  name="quiet_hours_end"
                  type="time"
                  defaultValue={settings.quiet_hours_end?.slice(0, 5) || ''}
                  className="field mt-1.5"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <button
              disabled={settingsPending}
              className="action bg-ink text-white hover:bg-black disabled:opacity-50 text-xs font-bold px-5 py-2.5"
            >
              {settingsPending ? 'Saving preferences…' : 'Save Notification Preferences'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
