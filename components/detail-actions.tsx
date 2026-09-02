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
        className={`action ${usedToday ? 'bg-lime text-ink' : 'bg-ink text-white'} disabled:opacity-70`}
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
          className="action bg-stone-100 text-stone-700 hover:bg-stone-200"
        >
          {status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
          {status === 'paused' ? 'Resume' : 'Pause'}
        </button>
      )}

      {status === 'canceled' ? (
        <button
          disabled={pending}
          onClick={() => run(() => setSubscriptionStatus(id, 'active'), 'Subscription reactivated!')}
          className="action bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
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
          className="action bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
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
        className="action bg-red-50 text-red-700 hover:bg-red-100"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}
