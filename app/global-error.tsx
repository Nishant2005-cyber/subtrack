'use client';

import { useEffect } from 'react';
import { captureException } from '@/lib/monitoring';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, {
      tags: { scope: 'global_error_boundary' },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f7f7f3] text-[#1c1917] font-sans antialiased grid place-items-center p-6 m-0">
        <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-700 text-2xl font-bold">
            !
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            System Level Error
          </h1>
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">
            A critical application error occurred at the root layout. This event has been dispatched to monitoring.
          </p>

          {error.message && (
            <div className="mt-4 rounded-xl bg-stone-50 p-3 text-xs font-mono text-stone-600 break-words border border-stone-200/80 text-left">
              {error.message}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-black shadow-sm cursor-pointer"
            >
              Reload Application
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-sm"
            >
              Return Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
