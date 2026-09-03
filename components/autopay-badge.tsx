'use client';

import { useState, useTransition } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { updateAutopayStatus } from '@/app/actions';
import { useToast } from '@/components/toast';
import type { AutopayStatus } from '@/lib/types';

const config: Record<
  AutopayStatus,
  {
    label: string;
    pillClass: string;
    dotClass: string;
    title: string;
    description: string;
  }
> = {
  running: {
    label: 'Autopay Running',
    pillClass: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100',
    dotClass: 'bg-emerald-500',
    title: 'Autopay Running',
    description: 'UPI / Card mandate is active. Renews automatically on due date.',
  },
  paused: {
    label: 'Autopay Paused',
    pillClass: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
    dotClass: 'bg-amber-500',
    title: 'Autopay Paused',
    description: 'Mandate is paused in your bank/UPI app. Will not auto-renew.',
  },
  deleted: {
    label: 'Autopay Deleted',
    pillClass: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100',
    dotClass: 'bg-rose-500',
    title: 'Autopay Deleted',
    description: 'Mandate was deleted/canceled. Subscription will expire.',
  },
};

export function AutopayBadge({
  subscriptionId,
  currentStatus = 'running',
  serviceName,
  size = 'sm',
}: {
  subscriptionId: string;
  currentStatus?: AutopayStatus;
  serviceName: string;
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { success: toastSuccess, error: toastError } = useToast();

  const status = currentStatus in config ? currentStatus : 'running';
  const current = config[status];

  const handleSelect = (newStatus: AutopayStatus) => {
    if (newStatus === status) {
      setOpen(false);
      return;
    }
    setOpen(false);
    startTransition(async () => {
      try {
        await updateAutopayStatus(subscriptionId, newStatus);
        toastSuccess(`${serviceName} set to ${config[newStatus].label}!`);
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Failed to update Autopay status.');
      }
    });
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`inline-flex items-center gap-1.5 rounded-md border font-semibold transition-all select-none ${
          current.pillClass
        } ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'} ${
          pending ? 'opacity-70' : ''
        }`}
        title={`${current.title}: ${current.description} · Click to change`}
      >
        {pending ? (
          <Loader2 size={10} className="animate-spin text-stone-600" />
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${current.dotClass}`} />
        )}
        <span>{current.label}</span>
        <ChevronDown size={11} className="opacity-60 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 mt-1.5 w-64 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl z-40 text-left animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-2 py-1 border-b border-stone-100 mb-1">
              <p className="text-[11px] font-bold text-ink">Set Autopay Status</p>
              <p className="text-[10px] text-stone-500">Track your payment mandate state</p>
            </div>

            {(['running', 'paused', 'deleted'] as AutopayStatus[]).map((key) => {
              const item = config[key];
              const isSelected = key === status;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(key)}
                  className={`flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
                    isSelected
                      ? 'bg-stone-100 text-ink font-bold'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-ink'
                  }`}
                >
                  <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${item.dotClass}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{item.title}</span>
                      {isSelected && <Check size={13} className="text-ink" />}
                    </div>
                    <p className="text-[10px] font-normal leading-4 text-stone-500">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
