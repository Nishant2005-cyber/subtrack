'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Circle, Clock, Mail, Users } from 'lucide-react';
import { toggleMemberPayment } from '@/app/actions';
import { useToast } from '@/components/toast';
import { currency as formatCurrency } from '@/lib/format';
import type { SharedMember } from '@/lib/types';

export function SharedMembersCard({
  subscriptionId,
  cost,
  currency,
  splitCount,
  myShare,
  members: initialMembers,
}: {
  subscriptionId: string;
  cost: number;
  currency: string;
  splitCount: number;
  myShare: number;
  members: SharedMember[];
}) {
  const [members, setMembers] = useState<SharedMember[]>(initialMembers || []);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { success: toastSuccess, error: toastError } = useToast();

  const sharePerPerson = Number((cost / (splitCount || 1)).toFixed(2));
  const paidCount = members.filter((m) => m.paid).length;

  const handleToggle = (memberId: string, currentPaid: boolean) => {
    const newPaid = !currentPaid;
    setPendingId(memberId);

    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, paid: newPaid, paid_at: newPaid ? new Date().toISOString() : undefined }
          : m
      )
    );

    startTransition(async () => {
      try {
        await toggleMemberPayment(subscriptionId, memberId, newPaid);
        toastSuccess(newPaid ? 'Marked as paid!' : 'Marked as unpaid.');
      } catch (e) {
        // Rollback
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, paid: currentPaid } : m))
        );
        toastError(e instanceof Error ? e.message : 'Could not update payment status.');
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
            <Users size={16} />
          </div>
          <div>
            <h2 className="panel-title">Shared Plan Split ({splitCount}-way)</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Total: {formatCurrency(cost, currency)} · Each share: {formatCurrency(sharePerPerson, currency)}
            </p>
          </div>
        </div>
        <div className="rounded-full bg-violet-50 dark:bg-violet-950/50 px-3 py-1 text-xs font-bold text-violet-800 dark:text-violet-300">
          My Share: {formatCurrency(myShare || sharePerPerson, currency)}
        </div>
      </div>

      {/* Member Payment Tracking */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-stone-600 dark:text-stone-300">
            Split Members ({paidCount}/{members.length} settled)
          </span>
          {members.length > 0 && (
            <span className="text-stone-400 text-[11px]">
              Tap to mark as paid for current month
            </span>
          )}
        </div>

        {members.length > 0 ? (
          <div className="space-y-2">
            {members.map((member) => {
              const isUpdating = pendingId === member.id;
              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                    member.paid
                      ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                      : 'border-stone-200 bg-stone-50/50 dark:border-stone-800 dark:bg-stone-900/30'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">
                        {member.name || 'Anonymous member'}
                      </span>
                      {member.paid ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                          <CheckCircle2 size={10} /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                    </div>
                    {member.email && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 truncate">
                        <Mail size={11} /> {member.email}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs font-bold text-stone-700 dark:text-stone-300">
                      {formatCurrency(member.share_amount || sharePerPerson, currency)}
                    </span>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggle(member.id, !!member.paid)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                        member.paid
                          ? 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                      }`}
                    >
                      {member.paid ? (
                        <>
                          <Circle size={12} /> Mark Unpaid
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} /> Mark Paid
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 p-4 text-center text-xs text-stone-500 dark:text-stone-400">
            No member names added yet. Click <b>Edit</b> above to add member names and track who has paid!
          </p>
        )}
      </div>
    </div>
  );
}
