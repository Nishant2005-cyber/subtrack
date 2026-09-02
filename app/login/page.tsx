'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { AppLogo, SubTrackIcon } from '@/components/app-logo';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const supabase = createClient();

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?next=/auth/update-password`,
      });
      setBusy(false);
      if (error) {
        return setStatus({ type: 'error', text: error.message });
      }
      return setStatus({
        type: 'success',
        text: 'Password reset link sent! Please check your email inbox.',
      });
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        return setStatus({ type: 'error', text: error.message });
      }
      location.assign('/dashboard');
      return;
    }

    if (mode === 'signup') {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      setBusy(false);
      if (result.error) {
        return setStatus({ type: 'error', text: result.error.message });
      }
      if (!result.data.session) {
        return setStatus({
          type: 'success',
          text: 'Account created! Check your inbox to confirm your email.',
        });
      }
      location.assign('/dashboard');
    }
  }

  async function magicLink() {
    if (!email) {
      return setStatus({ type: 'error', text: 'Please enter your email address first.' });
    }
    setBusy(true);
    setStatus(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      setStatus({ type: 'error', text: error.message });
    } else {
      setStatus({ type: 'success', text: 'Magic link sent! Check your email inbox to log in.' });
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f3] p-5 text-ink md:grid md:grid-cols-2 md:p-8">
      {/* Left Branding Panel */}
      <section className="relative hidden overflow-hidden rounded-[28px] bg-[#282a25] p-11 text-white md:block">
        <div className="absolute right-[-80px] top-[-70px] h-64 w-64 rounded-full bg-lime opacity-20" />
        <div className="relative">
          <div className="mb-20 flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
            <SubTrackIcon size={38} />
            <span>Sub<span className="text-lime">Track</span></span>
          </div>
          <h1 className="max-w-md font-serif text-5xl leading-[1.1]">Make every subscription earn its place.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-stone-300">
            See every renewal in one calm place, catch waste early, and decide what stays.
          </p>
          <div className="mt-12 grid gap-4">
            {['Never miss a trial ending', 'Log real usage in one tap', 'Renew safely on the service site'].map((x) => (
              <div className="flex items-center gap-3 text-sm" key={x}>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-ink">
                  <Check size={14} />
                </span>
                {x}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right Auth Form */}
      <section className="mx-auto flex w-full max-w-md flex-col justify-center py-12 md:py-0">
        <div className="mb-9 md:hidden">
          <AppLogo size="md" href="/login" />
        </div>

        <p className="mb-2 text-sm text-stone-500">Welcome to SubTrack</p>
        <h2 className="font-serif text-4xl tracking-tight">
          {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Start tracking smarter' : 'Reset your password'}
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          {mode === 'login'
            ? 'Log in to see what is renewing next.'
            : mode === 'signup'
            ? 'Set up your private subscription home in a minute.'
            : 'Enter your email address and we will send you a link to reset your password.'}
        </p>

        {/* Status Feedback Banner */}
        {status && (
          <div
            className={`mt-6 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm transition-all ${
              status.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {status.type === 'error' ? (
              <AlertCircle size={17} className="shrink-0 mt-0.5 text-rose-600" />
            ) : (
              <CheckCircle2 size={17} className="shrink-0 mt-0.5 text-emerald-600" />
            )}
            <p className="font-medium">{status.text}</p>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/10"
            />
          </label>

          {mode !== 'forgot' && (
            <label className="block text-sm font-semibold">
              <div className="flex items-center justify-between">
                <span>Password</span>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setStatus(null);
                    }}
                    className="text-xs font-semibold text-violet hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-2">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  required
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 pr-11 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:text-ink transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          )}

          <button
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60 shadow-sm"
          >
            {busy ? (
              'Please wait…'
            ) : mode === 'login' ? (
              <>Log in <ArrowRight size={16} /></>
            ) : mode === 'signup' ? (
              <>Create account <ArrowRight size={16} /></>
            ) : (
              <>Send reset link <Mail size={16} /></>
            )}
          </button>
        </form>

        {mode === 'login' && (
          <button
            disabled={!email || busy}
            onClick={magicLink}
            className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition disabled:opacity-50"
          >
            Email me a magic link
          </button>
        )}

        <div className="mt-7 text-center text-sm text-stone-500">
          {mode === 'forgot' ? (
            <button
              onClick={() => {
                setMode('login');
                setStatus(null);
              }}
              className="inline-flex items-center gap-1.5 font-bold text-violet hover:underline"
            >
              <ArrowLeft size={14} /> Back to Log in
            </button>
          ) : mode === 'login' ? (
            <>
              New here?{' '}
              <button
                onClick={() => {
                  setMode('signup');
                  setStatus(null);
                }}
                className="font-bold text-violet hover:underline"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setStatus(null);
                }}
                className="font-bold text-violet hover:underline"
              >
                Log in
              </button>
            </>
          )}
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-stone-400">
          <LockKeyhole size={12} /> Your subscription data stays private to your account.
        </p>
      </section>
    </main>
  );
}
