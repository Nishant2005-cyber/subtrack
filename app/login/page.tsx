'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { AppLogo, SubTrackIcon } from '@/components/app-logo';
import { resendSignupOtp, sendSignupOtp, verifySignupOtp } from '@/app/actions';

// Strict RFC 5322 email regex
function isEmailValid(emailStr: string): boolean {
  if (!emailStr) return false;
  const trimmed = emailStr.trim();
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(trimmed) && !trimmed.includes('..');
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [signupStep, setSignupStep] = useState<'details' | 'verify'>('details');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  // OTP State & Countdown
  const [token, setToken] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  // Countdown timer for OTP expiration & resend cooldown
  useEffect(() => {
    if (signupStep !== 'verify' || !expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(remainingSeconds);

      setResendCooldown((prev) => Math.max(0, prev - 1));

      if (remainingSeconds === 0) {
        setStatus({
          type: 'error',
          text: 'The verification code has expired. Please click "Resend code" to receive a new one.',
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [signupStep, expiresAt]);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Submit Login or Password Reset (Direct for existing users)
  async function submitLoginOrReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const supabase = createClient();

    if (mode === 'forgot') {
      if (!isEmailValid(email)) {
        setBusy(false);
        return setStatus({
          type: 'error',
          text: 'Please enter a valid email address in the correct format (e.g. name@example.com).',
        });
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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
      if (!isEmailValid(email)) {
        setBusy(false);
        return setStatus({
          type: 'error',
          text: 'Please enter a valid email address in the correct format (e.g. name@example.com).',
        });
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setBusy(false);
      if (error) {
        return setStatus({ type: 'error', text: error.message });
      }
      location.assign('/dashboard');
      return;
    }
  }

  // 2. Submit Signup Step 1 (Enter Details -> Send 6-digit OTP to email)
  async function submitSignupDetails(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);

    // Validate Name
    if (!fullName.trim() || fullName.trim().length < 2) {
      setBusy(false);
      return setStatus({
        type: 'error',
        text: 'Please enter your full name (at least 2 characters).',
      });
    }

    // Validate Email Format
    if (!isEmailValid(email)) {
      setBusy(false);
      return setStatus({
        type: 'error',
        text: 'Please enter a valid email address in the correct format (e.g. name@example.com).',
      });
    }

    // Validate Password
    if (!password || password.length < 6) {
      setBusy(false);
      return setStatus({
        type: 'error',
        text: 'Password must be at least 6 characters long.',
      });
    }

    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('password', password);

      const res = await sendSignupOtp(formData);
      setBusy(false);

      if (res.token && res.expiresAt) {
        setToken(res.token);
        setExpiresAt(res.expiresAt);
        setTimeLeft(Math.floor((res.expiresAt - Date.now()) / 1000));
        setResendCooldown(30); // 30s cooldown
        setSignupStep('verify');
        setOtpCode('');
        setDevCode(res.devCode ?? null);
        setStatus(null);
      }
    } catch (err) {
      setBusy(false);
      setStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send security code.',
      });
    }
  }

  // 3. Submit Signup Step 2 (Verify OTP -> Create Account -> Redirect to Login WITHOUT auto-login)
  async function submitVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setBusy(false);
      return setStatus({
        type: 'error',
        text: 'enter the code correctly',
      });
    }

    try {
      await verifySignupOtp({
        token,
        code: otpCode.trim(),
      });

      setBusy(false);

      // Account created successfully!
      // Requirement: Redirect to login page, DO NOT automatically log in.
      setMode('login');
      setSignupStep('details');
      setPassword('');
      setOtpCode('');
      setDevCode(null);
      setStatus({
        type: 'success',
        text: 'Account created successfully! Please enter your password to log in.',
      });
    } catch (err) {
      setBusy(false);
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      setStatus({
        type: 'error',
        text: msg.includes('enter the code correctly') ? 'enter the code correctly' : msg,
      });
    }
  }

  // 4. Resend OTP Code
  async function handleResendCode() {
    if (resendCooldown > 0 || busy || !token) return;
    setBusy(true);
    setStatus(null);

    try {
      const res = await resendSignupOtp({ token });
      setBusy(false);

      if (res.token && res.expiresAt) {
        setToken(res.token);
        setExpiresAt(res.expiresAt);
        setTimeLeft(Math.floor((res.expiresAt - Date.now()) / 1000));
        setResendCooldown(30);
        setDevCode(res.devCode ?? null);
        setStatus({
          type: 'success',
          text: 'A fresh 6-digit verification code has been sent to your email.',
        });
      }
    } catch (err) {
      setBusy(false);
      setStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to resend code.',
      });
    }
  }

  // 5. Magic Link Login (Optional alternative for existing users)
  async function magicLink() {
    if (!isEmailValid(email)) {
      return setStatus({
        type: 'error',
        text: 'Please enter a valid email address in the correct format (e.g. name@example.com).',
      });
    }
    setBusy(true);
    setStatus(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      setStatus({ type: 'error', text: error.message });
    } else {
      setStatus({
        type: 'success',
        text: 'Magic link sent! Check your email inbox to log in.',
      });
    }
  }

  const isEmailFormatValid = email ? isEmailValid(email) : true;

  return (
    <main className="min-h-screen bg-[#f7f7f3] p-5 text-ink md:grid md:grid-cols-2 md:p-8">
      {/* Left Branding Panel */}
      <section className="relative hidden overflow-hidden rounded-[28px] bg-[#282a25] p-11 text-white md:block">
        <div className="absolute right-[-80px] top-[-70px] h-64 w-64 rounded-full bg-lime opacity-20" />
        <div className="relative">
          <div className="mb-20 flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
            <SubTrackIcon size={38} />
            <span>
              Sub<span className="text-lime">Track</span>
            </span>
          </div>
          <h1 className="max-w-md font-serif text-5xl leading-[1.1]">
            Make every subscription earn its place.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-stone-300">
            See every renewal in one calm place, catch waste early, and decide what stays.
          </p>
          <div className="mt-12 grid gap-4">
            {[
              'Never miss a renewal deadline',
              'One-time security code verification on signup',
              'Log real usage in one tap',
              'Track Autopay mandates running, paused, or deleted',
            ].map((x) => (
              <div className="flex items-center gap-3 text-sm" key={x}>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-ink">
                  <Check size={14} />
                </span>
                <span>{x}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right Authentication Form Area */}
      <section className="mx-auto flex w-full max-w-md flex-col justify-center py-10">
        <div className="mb-8 flex items-center justify-between md:hidden">
          <AppLogo size="sm" href="/login" />
        </div>

        <p className="mb-2 text-sm text-stone-500">Welcome to SubTrack</p>

        {/* Dynamic Titles */}
        <h2 className="font-serif text-4xl tracking-tight">
          {mode === 'login'
            ? 'Welcome back'
            : mode === 'signup'
            ? signupStep === 'details'
              ? 'Create your account'
              : 'Verify your email'
            : 'Reset your password'}
        </h2>

        <p className="mt-3 text-sm leading-6 text-stone-500">
          {mode === 'login'
            ? 'Log in with your email and password to see what is renewing next.'
            : mode === 'signup'
            ? signupStep === 'details'
              ? 'Enter your details below to set up your subscription home.'
              : `We sent a 6-digit security code to ${email}.`
            : 'Enter your email address and we will send you a link to reset your password.'}
        </p>

        {/* Status Alerts */}
        {status && (
          <div
            className={`mt-6 flex items-start gap-2.5 rounded-2xl border p-4 text-sm transition-all shadow-xs ${
              status.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {status.type === 'error' ? (
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
            ) : (
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
            )}
            <p className="font-semibold leading-relaxed">{status.text}</p>
          </div>
        )}

        {/* Development Helper Banner (in case Resend test domain restricts external emails) */}
        {devCode && signupStep === 'verify' && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center justify-between">
            <div>
              <span className="font-bold">Security Code: </span>
              <span className="font-mono font-extrabold text-sm tracking-wider">{devCode}</span>
            </div>
            <button
              type="button"
              onClick={() => setOtpCode(devCode)}
              className="text-[11px] font-bold text-amber-900 underline hover:text-ink"
            >
              Fill Code
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE: SIGNUP - STEP 2 (OTP VERIFICATION)                */}
        {/* ======================================================== */}
        {mode === 'signup' && signupStep === 'verify' ? (
          <form onSubmit={submitVerifyOtp} className="mt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="otp-input" className="text-sm font-bold text-ink">
                  Enter 6-Digit Security Code
                </label>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold ${
                    timeLeft < 60 ? 'text-rose-600' : 'text-stone-500'
                  }`}
                >
                  <Clock size={13} />
                  {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : 'Expired'}
                </span>
              </div>

              <div className="relative">
                <input
                  id="otp-input"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  required
                  placeholder="• • • • • •"
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-center text-2xl font-extrabold tracking-[12px] text-ink outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/10 font-mono"
                />
              </div>
              <p className="mt-2 text-xs text-stone-400">
                Code is valid for 10 minutes only. Check your inbox and spam folder.
              </p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={busy || otpCode.length !== 6 || timeLeft === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50 shadow-sm"
            >
              {busy ? (
                'Verifying code…'
              ) : (
                <>
                  <ShieldCheck size={17} /> Verify & Create Account
                </>
              )}
            </button>

            {/* Resend Code & Back Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-200/80 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSignupStep('details');
                  setStatus(null);
                }}
                className="inline-flex items-center gap-1 font-semibold text-stone-500 hover:text-ink transition"
              >
                <ArrowLeft size={13} /> Edit details
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || busy}
                className="inline-flex items-center gap-1 font-bold text-violet hover:underline disabled:opacity-50 disabled:no-underline"
              >
                <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend the code'}
              </button>
            </div>
          </form>
        ) : (
          /* ======================================================== */
          /* MODE: LOGIN / SIGNUP STEP 1 / FORGOT PASSWORD           */
          /* ======================================================== */
          <form
            onSubmit={mode === 'signup' ? submitSignupDetails : submitLoginOrReset}
            className="mt-6 space-y-4"
          >
            {/* 1. Name Field (Only for Signup) */}
            {mode === 'signup' && (
              <label className="block text-sm font-semibold">
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-stone-400" /> Full Name
                </span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  type="text"
                  required
                  placeholder="e.g. Nishant Khandelwal"
                  className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/10 font-medium"
                />
              </label>
            )}

            {/* 2. Email Field (Always visible, with strict format validation) */}
            <label className="block text-sm font-semibold">
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail size={14} className="text-stone-400" /> Email Address
                </span>
                {emailTouched && email && (
                  <span
                    className={`text-[11px] font-bold ${
                      isEmailFormatValid ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {isEmailFormatValid ? 'Valid email format ✓' : 'Invalid email format'}
                  </span>
                )}
              </span>

              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailTouched(true);
                }}
                onBlur={() => setEmailTouched(true)}
                type="email"
                required
                placeholder="name@example.com"
                className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none transition font-medium ${
                  emailTouched && email && !isEmailFormatValid
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-stone-200 focus:border-violet focus:ring-4 focus:ring-violet/10'
                }`}
              />
              {emailTouched && email && !isEmailFormatValid && (
                <p className="mt-1 text-xs text-rose-600">
                  Please enter a valid format like <b>username@domain.com</b>
                </p>
              )}
            </label>

            {/* 3. Password Field */}
            {mode !== 'forgot' && (
              <label className="block text-sm font-semibold">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound size={14} className="text-stone-400" /> Password
                  </span>
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
                    placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 pr-11 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/10 font-medium"
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

            {/* Submit Action Button */}
            <button
              disabled={busy || (mode === 'signup' && emailTouched && !isEmailFormatValid)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60 shadow-sm"
            >
              {busy ? (
                'Please wait…'
              ) : mode === 'login' ? (
                <>
                  Log in <ArrowRight size={16} />
                </>
              ) : mode === 'signup' ? (
                <>
                  Send Verification Code <ArrowRight size={16} />
                </>
              ) : (
                <>
                  Send reset link <Mail size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Magic link alternative (only for login) */}
        {mode === 'login' && (
          <button
            disabled={!email || busy}
            onClick={magicLink}
            type="button"
            className="mt-3 w-full rounded-xl border border-stone-200 bg-white py-3 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition"
          >
            Email me a sign-in link
          </button>
        )}

        {/* Mode Switcher Footer */}
        <div className="mt-7 text-center text-sm text-stone-500">
          {mode === 'forgot' ? (
            <button
              onClick={() => {
                setMode('login');
                setStatus(null);
              }}
              className="inline-flex items-center gap-1 font-semibold text-stone-700 hover:text-ink"
            >
              <ArrowLeft size={14} /> Back to login
            </button>
          ) : mode === 'login' ? (
            <p>
              Don’t have an account?{' '}
              <button
                onClick={() => {
                  setMode('signup');
                  setSignupStep('details');
                  setStatus(null);
                }}
                className="font-bold text-violet hover:underline"
              >
                Create one
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setSignupStep('details');
                  setStatus(null);
                }}
                className="font-bold text-violet hover:underline"
              >
                Log in
              </button>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
