'use client';

import { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  X,
} from 'lucide-react';
import { currency as formatCurrency, dateLabel, getTodayDateStr } from '@/lib/format';
import type { Subscription } from '@/lib/types';

export function ExportModal({
  subscriptions,
  monthlySpend,
  currencyCode = 'INR',
}: {
  subscriptions: Subscription[];
  monthlySpend: number;
  currencyCode?: string;
}) {
  const [open, setOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'csv' | 'pdf'>('pdf');

  const today = getTodayDateStr();
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const annualCommitment = monthlySpend * 12;

  // RFC 4180 CSV generation with UTF-8 BOM
  const handleDownloadCsv = () => {
    const headers = [
      'Service Name',
      'Category',
      'Cost',
      'Currency',
      'Billing Cycle',
      'Next Renewal Date',
      'Status',
      'Autopay Status',
      'Shared Plan',
      'My Share',
      'Renewal URL',
    ];

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = subscriptions.map((s) => [
      escapeCsv(s.service_name),
      escapeCsv(s.category),
      escapeCsv(s.cost),
      escapeCsv(s.currency),
      escapeCsv(s.billing_cycle),
      escapeCsv(s.next_renewal_date),
      escapeCsv(s.status),
      escapeCsv(s.autopay_status ?? 'running'),
      escapeCsv(s.is_shared ? `Yes (${s.split_count || 2}-way)` : 'No'),
      escapeCsv(s.is_shared && s.my_share ? s.my_share : s.cost),
      escapeCsv(s.renewal_url ?? ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `subtrack-subscriptions-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="action border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 shadow-xs"
        title="Export subscriptions to CSV or PDF"
      >
        <Download size={14} />
        Export
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4 no-print">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white dark:bg-[#181816] text-stone-900 dark:text-stone-100 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-100">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X size={18} />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                <Download size={19} />
              </span>
              <div>
                <h2 className="font-serif text-2xl font-bold">Export Subscriptions</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Download spreadsheet data or generate a printable statement.
                </p>
              </div>
            </div>

            {/* Export Format Cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="flex flex-col items-start p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 hover:border-emerald-500 hover:bg-emerald-50/30 transition text-left group"
              >
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <FileSpreadsheet size={18} />
                  <span>Download CSV</span>
                </div>
                <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                  RFC 4180 spreadsheet format with Excel UTF-8 support.
                </p>
                <span className="mt-3 text-xs font-bold text-emerald-600 group-hover:underline">
                  Download file →
                </span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex flex-col items-start p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 hover:border-violet hover:bg-violet-50/30 transition text-left group"
              >
                <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400 font-bold text-sm">
                  <Printer size={18} />
                  <span>Print / Save PDF</span>
                </div>
                <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                  Print-ready statement formatted for A4 & PDF saving.
                </p>
                <span className="mt-3 text-xs font-bold text-violet group-hover:underline">
                  Open Print dialog →
                </span>
              </button>
            </div>

            {/* Statement Preview */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-4 bg-white dark:bg-[#121210]">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <div>
                  <h3 className="font-serif font-bold text-base">Statement Preview</h3>
                  <p className="text-[11px] text-stone-400">Generated on {today}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-stone-500 block">Active Subscriptions</span>
                  <span className="text-sm font-extrabold">{activeSubs.length} services</span>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-2 my-3 text-center">
                <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Monthly Equivalent</span>
                  <span className="text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(monthlySpend, currencyCode)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Annual Commitment</span>
                  <span className="text-base font-extrabold font-mono text-stone-800 dark:text-stone-200">
                    {formatCurrency(annualCommitment, currencyCode)}
                  </span>
                </div>
              </div>

              {/* Mini Table Preview */}
              <div className="max-h-48 overflow-auto text-xs divide-y divide-stone-100 dark:divide-stone-800">
                {subscriptions.map((s) => (
                  <div key={s.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{s.service_name}</span>
                      <span className="text-stone-400 ml-1.5 text-[11px]">
                        ({s.billing_cycle}) · Renews {dateLabel(s.next_renewal_date)}
                      </span>
                    </div>
                    <span className="font-mono font-bold">
                      {formatCurrency(s.cost, s.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="action bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
