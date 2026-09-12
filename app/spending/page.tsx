import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { SpendingChart } from '@/components/spending-chart';
import { BudgetMeter } from '@/components/budget-meter';
import { ExportModal } from '@/components/export-modal';
import { getAppData } from '@/lib/data';
import { categoryLabel, currency, monthlyCost } from '@/lib/format';

export default async function SpendingPage() {
  const { user, settings, subscriptions } = await getAppData();
  if (!user) redirect('/login');

  const active = subscriptions.filter((s) => s.status === 'active');
  const totalsByCurrency = active.reduce<Record<string, number>>((acc, s) => {
    const curr = s.currency || 'INR';
    acc[curr] = (acc[curr] || 0) + monthlyCost(Number(s.cost), s.billing_cycle);
    return acc;
  }, {});

  const currencyCodes = Object.keys(totalsByCurrency);
  const primaryCurrency = currencyCodes[0] ?? 'INR';
  const primaryTotal = totalsByCurrency[primaryCurrency] ?? 0;

  const chartsByCurrency: Record<string, { name: string; value: number }[]> = {};
  for (const curr of (currencyCodes.length > 0 ? currencyCodes : ['INR'])) {
    const subsInCurr = active.filter((s) => (s.currency || 'INR') === curr);
    const catTotals = subsInCurr.reduce<Record<string, number>>((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + monthlyCost(Number(s.cost), s.billing_cycle);
      return acc;
    }, {});
    chartsByCurrency[curr] = Object.entries(catTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  return (
    <AppShell email={user.email ?? null}>
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-stone-500 dark:text-stone-400">See the bigger picture</p>
            <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl text-ink dark:text-stone-100">Spending & Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportModal
              subscriptions={subscriptions}
              monthlySpend={primaryTotal}
              currencyCode={primaryCurrency}
            />
          </div>
        </header>

        {/* 3 Summary Cards */}
        <section className="mt-7 grid gap-3 sm:grid-cols-3">
          <article className="card p-5">
            <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Monthly equivalent</p>
            <p className="mt-2 text-3xl font-bold tracking-tight font-mono text-emerald-700 dark:text-emerald-400">
              {currencyCodes.length === 0
                ? currency(0, 'INR')
                : currencyCodes.map((c) => currency(totalsByCurrency[c], c)).join(' + ')}
            </p>
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">Across active subscriptions</p>
          </article>
          <article className="card p-5">
            <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Annual commitment</p>
            <p className="mt-2 text-3xl font-bold tracking-tight font-mono text-stone-900 dark:text-stone-100">
              {currencyCodes.length === 0
                ? currency(0, 'INR')
                : currencyCodes.map((c) => currency(totalsByCurrency[c] * 12, c)).join(' + ')}
            </p>
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">If you keep everything for a year</p>
          </article>
          <article className="card p-5">
            <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Biggest category</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {chartsByCurrency[primaryCurrency]?.length
                ? categoryLabel(chartsByCurrency[primaryCurrency][0].name)
                : '—'}
            </p>
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
              {chartsByCurrency[primaryCurrency]?.length
                ? `${currency(chartsByCurrency[primaryCurrency][0].value, primaryCurrency)}/mo${currencyCodes.length > 1 ? ` (${primaryCurrency})` : ''}`
                : 'Your top monthly subscription type'}
            </p>
          </article>
        </section>

        {/* Budget Cap Widget */}
        <section className="mt-5 space-y-4">
          {currencyCodes.length === 0 ? (
            <BudgetMeter
              monthlySpent={0}
              currencyCode="INR"
              monthlyCap={settings?.monthly_budget_cap}
              annualCap={settings?.annual_budget_cap}
            />
          ) : (
            currencyCodes.map((curr, idx) => (
              <BudgetMeter
                key={curr}
                monthlySpent={totalsByCurrency[curr]}
                currencyCode={curr}
                monthlyCap={idx === 0 ? settings?.monthly_budget_cap : null}
                annualCap={idx === 0 ? settings?.annual_budget_cap : null}
              />
            ))
          )}
        </section>

        {/* Category Breakdown Chart */}
        {currencyCodes.length <= 1 ? (
          <section className="card mt-7 p-5 sm:p-7">
            <div className="mb-3">
              <h2 className="panel-title">Monthly spend by category</h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Yearly plans are shown as their monthly equivalent.
              </p>
            </div>
            <SpendingChart data={chartsByCurrency[primaryCurrency] ?? []} currencyCode={primaryCurrency} />
          </section>
        ) : (
          currencyCodes.map((curr) => (
            <section key={curr} className="card mt-7 p-5 sm:p-7">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="panel-title">Monthly spend by category ({curr})</h2>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    Yearly plans are shown as their monthly equivalent in {curr}.
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {currency(totalsByCurrency[curr], curr)}/mo
                </span>
              </div>
              <SpendingChart data={chartsByCurrency[curr] ?? []} currencyCode={curr} />
            </section>
          ))
        )}

        {/* Active Subscriptions List */}
        <section className="card mt-7 overflow-hidden">
          <div className="border-b border-stone-200 dark:border-stone-800 px-5 py-5">
            <h2 className="panel-title">All active subscriptions</h2>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {active.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="font-bold text-stone-900 dark:text-stone-100">{s.service_name}</p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    {categoryLabel(s.category)} · billed {s.billing_cycle}
                    {s.is_shared && (
                      <span className="ml-1 text-violet dark:text-violet-400 font-semibold">
                        (Shared {s.split_count || 2} ways)
                      </span>
                    )}
                  </p>
                </div>
                <b className="text-sm font-mono text-stone-900 dark:text-stone-100">
                  {currency(Number(s.cost), s.currency)}
                </b>
              </div>
            ))}
            {!active.length && (
              <p className="p-8 text-center text-sm text-stone-500 dark:text-stone-400">
                No active subscriptions to show.
              </p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
