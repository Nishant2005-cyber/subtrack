'use client';

import { useTransition } from 'react';
import { Check, Clock3 } from 'lucide-react';
import { acknowledgeNotification } from '@/app/actions';
import { useToast } from '@/components/toast';

export function ReminderAlert({ id, title, body }: { id: string; title: string; body: string }) {
  const [pending, start] = useTransition();
  const { success, error } = useToast();

  const handleAcknowledge = () => {
    start(async () => {
      try {
        await acknowledgeNotification(id);
        success('Reminder acknowledged!');
      } catch (e) {
        error(e instanceof Error ? e.message : 'Could not acknowledge reminder.');
      }
    });
  };

  return (
    <div className="rounded-xl bg-orange-50 p-4 border border-orange-100">
      <div className="flex gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-200 text-orange-800">
          <Clock3 size={16} />
        </span>
        <div>
          <p className="text-sm font-bold text-orange-950">{title}</p>
          <p className="mt-1 text-xs leading-5 text-stone-600">{body}</p>
        </div>
      </div>
      <button
        disabled={pending}
        onClick={handleAcknowledge}
        className="action mt-3 bg-white text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-50 text-xs font-bold"
      >
        <Check size={13} />
        {pending ? 'Saving…' : 'Got it'}
      </button>
    </div>
  );
}
