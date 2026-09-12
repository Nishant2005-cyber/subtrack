'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { categoryLabel, currency } from '@/lib/format';

const colors = ['#6154d9', '#d7f96a', '#ffb66b', '#75c9ef', '#f6a6ba', '#b9b9b2'];

export function SpendingChart({
  data,
  currencyCode,
}: {
  data: { name: string; value: number }[];
  currencyCode: string;
}) {
  if (!data.length) {
    return (
      <div className="grid h-60 place-items-center text-sm text-stone-500 dark:text-stone-400">
        Add a subscription to see your category breakdown.
      </div>
    );
  }

  return (
    <div className="grid items-center gap-3 sm:grid-cols-[1fr_.9fr]">
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="78%"
              paddingAngle={3}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => currency(Number(value), currencyCode)}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid var(--border, #292524)',
                backgroundColor: '#1c1c19',
                color: '#f5f5f4',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                fontSize: '12px',
                padding: '8px 12px',
              }}
              itemStyle={{ color: '#f5f5f4' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-3">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
              <i
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: colors[i % colors.length] }}
              />
              {categoryLabel(item.name)}
            </span>
            <b className="text-xs text-stone-900 dark:text-stone-100 font-mono">
              {currency(item.value, currencyCode)}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}
