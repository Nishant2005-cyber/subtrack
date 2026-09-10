'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { captureException } from '@/lib/monitoring';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, {
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f7f7f3] grid place-items-center p-5 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-7 shadow-xl text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-700">
          <AlertTriangle size={24} />
        </div>

        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-stone-500 leading-relaxed">
          An unexpected error occurred while loading this page. Our monitoring system has recorded this incident.
        </p>

        {error.message && (
          <div className="mt-4 rounded-xl bg-stone-50 p-3 text-xs font-mono text-stone-600 break-words border border-stone-200/80 text-left">
            {error.message}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black"
          >
            <RefreshCw size={13} /> Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50"
          >
            <ArrowLeft size={13} /> Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
