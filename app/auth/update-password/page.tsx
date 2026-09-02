'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { useToast } from '@/components/toast';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { success: toastSuccess } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      return setError('Password must be at least 6 characters long.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match. Please re-enter.');
    }

    setBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      return setError(updateError.message);
    }

    setSuccess(true);
    toastSuccess('Password updated successfully!');
    setTimeout(() => {
      router.replace('/dashboard');
    }, 1500);
  }

  return (
    <main className="min-h-screen bg-[#f7f7f3] p-5 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink">
            <KeyRound size={22} />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-bold">Set New Password</h1>
            <p className="text-xs text-stone-500">Create a secure new password for your account.</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
            <AlertCircle size={17} className="shrink-0 mt-0.5 text-rose-600" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-900">
            <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-600" />
            <p className="font-bold text-sm">Password updated successfully!</p>
            <p className="mt-1 text-xs text-emerald-700">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <label className="block text-xs font-bold text-stone-700">
              New Password
              <div className="relative mt-1">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="field pr-10"
                  autoFocus
                />
                <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              </div>
            </label>

            <label className="block text-xs font-bold text-stone-700">
              Confirm New Password
              <div className="relative mt-1">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="field pr-10"
                />
                <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              </div>
            </label>

            <button
              disabled={busy}
              className="action w-full justify-center bg-ink py-3 text-white font-bold hover:bg-black disabled:opacity-50 mt-2"
            >
              {busy ? 'Updating password…' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
