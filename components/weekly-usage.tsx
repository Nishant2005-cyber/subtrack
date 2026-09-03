import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import type { UsageLog } from '@/lib/types';

export function WeeklyUsage({ usage }: { usage: UsageLog[] }) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday to Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Count distinct subscriptions logged per day
  const dailyData = weekDays.map((date) => {
    const iso = format(date, 'yyyy-MM-dd');
    const logsForDay = usage.filter((l) => l.logged_date === iso);
    const uniqueSubs = new Set(logsForDay.map((l) => l.subscription_id)).size;
    const isCurrentDay = isSameDay(date, now);
    const isFuture = date > now && !isCurrentDay;
    return {
      date,
      iso,
      dayInitial: format(date, 'EEEEE'), // M, T, W, T, F, S, S
      shortDay: format(date, 'EEE'),     // Mon, Tue, etc.
      count: uniqueSubs,
      isCurrentDay,
      isFuture,
    };
  });

  const maxCount = Math.max(...dailyData.map((d) => d.count), 1);
  const totalWeekLogs = dailyData.reduce((sum, d) => sum + d.count, 0);

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="panel-title">Usage this week</h2>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {totalWeekLogs === 0
              ? 'No activity logged yet this week'
              : `${totalWeekLogs} ${totalWeekLogs === 1 ? 'use' : 'uses'} recorded`}
          </p>
        </div>
        <span className="pill bg-violet-50 text-violet font-semibold">Self-reported</span>
      </div>

      {/* 7-Day Dynamic Bar Chart */}
      <div className="grid grid-cols-7 gap-1.5 items-end h-[75px] pt-2">
        {dailyData.map((d) => {
          // Dynamic height calculation: 6px min, 56px max based on real usage count
          const heightPx = d.count > 0 ? Math.round((d.count / maxCount) * 44) + 12 : 6;
          return (
            <div
              key={d.iso}
              className="flex flex-col items-center justify-end h-full group relative cursor-default"
            >
              {/* Tooltip on hover */}
              <div className="absolute -top-7 hidden group-hover:flex items-center justify-center rounded-md bg-stone-900 px-2 py-0.5 text-[10px] text-white whitespace-nowrap z-20 shadow-md pointer-events-none transition-opacity">
                {d.shortDay}: {d.count > 0 ? `${d.count} used` : 'None'}
              </div>

              {/* Bar */}
              <div
                className={`w-5 rounded-t transition-all duration-300 ${
                  d.isCurrentDay
                    ? d.count > 0
                      ? 'bg-violet ring-2 ring-violet/30'
                      : 'bg-violet/30'
                    : d.count > 0
                    ? 'bg-violet/80'
                    : 'bg-stone-200'
                } ${d.isFuture ? 'opacity-35' : ''}`}
                style={{ height: `${heightPx}px` }}
              />

              {/* Day Initial */}
              <span
                className={`mt-2 block text-[10px] font-bold ${
                  d.isCurrentDay
                    ? 'text-violet underline decoration-2 underline-offset-2'
                    : 'text-stone-400'
                }`}
              >
                {d.dayInitial}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
        Tap <b className="text-ink font-semibold">Used today</b> whenever you use a service to update this chart in real-time.
      </p>
    </section>
  );
}
