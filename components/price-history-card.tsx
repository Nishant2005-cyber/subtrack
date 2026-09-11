import { ArrowDownRight, ArrowUpRight, History, TrendingUp } from 'lucide-react';
import { currency as formatCurrency } from '@/lib/format';
import type { PriceChange } from '@/lib/types';

export function PriceHistoryCard({
  currentCost,
  currency,
  priceHistory,
}: {
  currentCost: number;
  currency: string;
  priceHistory: PriceChange[] | null | undefined;
}) {
  const history = Array.isArray(priceHistory) ? priceHistory : [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <TrendingUp size={16} />
          </div>
          <div>
            <h2 className="panel-title">Price-Hike Tracking</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Historical cost changes and rate adjustment logs
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Current Price</span>
          <span className="font-mono text-sm font-extrabold text-stone-900 dark:text-stone-100">
            {formatCurrency(currentCost, currency)}
          </span>
        </div>
      </div>

      <div className="mt-4">
        {history.length > 0 ? (
          <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
            {history.map((entry, idx) => {
              const diffVal = entry.diff ?? (entry.new_cost - (entry.old_cost ?? entry.previous_cost ?? entry.new_cost));
              const isHike = diffVal > 0 || (entry.percentage ?? 0) > 0;
              const displayOldCost = entry.old_cost ?? entry.previous_cost ?? entry.new_cost;
              return (
                <div key={idx} className="relative flex items-start justify-between gap-3 text-xs">
                  {/* Dot */}
                  <span
                    className={`absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#181816] ${
                      isHike ? 'bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-950' : 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-950'
                    }`}
                  />

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-stone-800 dark:text-stone-200">
                        {isHike ? 'Price Increase' : 'Price Cut'}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                          isHike
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {isHike ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {isHike ? `+${entry.percentage}%` : `${entry.percentage}%`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-stone-500 dark:text-stone-400 text-[11px]">
                      From <span className="font-mono">{formatCurrency(displayOldCost, entry.currency || currency)}</span> to{' '}
                      <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{formatCurrency(entry.new_cost, entry.currency || currency)}</span>
                      {entry.diff !== undefined && (
                        <span className="ml-1 text-stone-400">
                          ({isHike ? `+${entry.diff}` : `${entry.diff}`} {entry.currency || currency})
                        </span>
                      )}
                    </p>
                  </div>

                  <span className="text-[11px] font-mono text-stone-400 shrink-0 mt-0.5">
                    {entry.date || entry.changed_at}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 p-4 text-center text-xs text-stone-500 dark:text-stone-400">
            <p className="font-semibold text-stone-700 dark:text-stone-300">No price changes recorded yet.</p>
            <p className="mt-0.5 text-[11px]">
              SubTrack automatically captures rate hikes and price adjustments whenever you update the cost of this subscription.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
