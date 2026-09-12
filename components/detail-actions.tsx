'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Check, Pause, Play, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { deleteSubscription, logUsage, setSubscriptionStatus } from '@/app/actions';
import { useToast } from '@/components/toast';
import type { Status } from '@/lib/types';

export function DetailActions({ id, status, usedToday }: { id: string; status: Status; usedToday: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const run = (fn: () => Promise<void>, successMessage: string) => {
    start(async () => {
      try {
        await fn();
        toastSuccess(successMessage);
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Action failed. Please try again.');
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        disabled={pending || usedToday || status !== 'active'}
        onClick={() => run(() => logUsage(id), 'Activity logged for today!')}
        className={`action ${
          usedToday
            ? 'bg-emerald-100 text-emerald-700 font-bold dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/40'
            : 'bg-ink text-white hover:bg-black dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white'
        } disabled:opacity-70`}
      >
        <Check size={14} />
        {usedToday ? 'Logged today' : 'Used today'}
      </button>

      {status !== 'canceled' && (
        <button
          disabled={pending}
          onClick={() =>
            run(
              () => setSubscriptionStatus(id, status === 'paused' ? 'active' : 'paused'),
              status === 'paused' ? 'Subscription resumed!' : 'Subscription paused.'
            )
          }
          className="action bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
        >
          {status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
          {status === 'paused' ? 'Resume' : 'Pause'}
        </button>
      )}

      {status === 'canceled' ? (
        <button
          disabled={pending}
          onClick={() => run(() => setSubscriptionStatus(id, 'active'), 'Subscription reactivated!')}
          className="action bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
        >
          <RotateCcw size={14} />
          Reactivate subscription
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => {
            if (confirm('Cancel this subscription? Future reminders will be stopped.')) {
              run(
                () => setSubscriptionStatus(id, 'canceled'),
                'Subscription canceled. Future reminders stopped.'
              );
            }
          }}
          className="action bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
        >
          <XCircle size={14} />
          Cancel Subscription
        </button>
      )}

      <button
        disabled={pending}
        onClick={() => {
          if (confirm('Delete this subscription and its usage history? This cannot be undone.')) {
            run(async () => {
              await deleteSubscription(id);
              router.replace('/dashboard');
            }, 'Subscription deleted.');
          }
        }}
        className="action bg-red-50 text-red-700 hover:bg-red-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border dark:border-rose-900/50 dark:hover:bg-rose-900/60"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}
