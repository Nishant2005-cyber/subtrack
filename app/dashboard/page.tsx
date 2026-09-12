import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BellRing, CalendarClock, CircleDollarSign, Lightbulb, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Greeting } from '@/components/greeting';
import { SubscriptionForm } from '@/components/subscription-form';
import { SubscriptionList } from '@/components/subscription-list';
import { ReminderAlert } from '@/components/reminder-alert';
import { WeeklyUsage } from '@/components/weekly-usage';
import { SmartInsights } from '@/components/smart-insights';
import { BudgetMeter } from '@/components/budget-meter';
import { ExportModal } from '@/components/export-modal';
import { getAppData } from '@/lib/data';
import { currency, daysUntil, getTodayDateStr, monthlyCost } from '@/lib/format';

export default async function Dashboard() {
  const { user, settings, subscriptions, usage, notifications } = await getAppData();
  if (!user || !settings) redirect('/login');

  const active = subscriptions.filter((s) => s.status === 'active');
  const totalsByCurrency = active.reduce<Record<string, number>>((acc, s) => {
    const curr = s.currency || 'INR';
    acc[curr] = (acc[curr] || 0) + monthlyCost(Number(s.cost), s.billing_cycle);
    return acc;
  }, {});
  const currencyCodes = Object.keys(totalsByCurrency);
  const primaryCurrency = currencyCodes[0] ?? 'INR';
  const primaryTotal = totalsByCurrency[primaryCurrency] ?? 0;

  const due = active.filter(
    (s) => daysUntil(s.next_renewal_date) >= 0 && daysUntil(s.next_renewal_date) <= 7
  );
  const dueTotalsByCurrency = due.reduce<Record<string, number>>((acc, s) => {
    const curr = s.currency || 'INR';
    acc[curr] = (acc[curr] || 0) + Number(s.cost);
    return acc;
  }, {});
  const dueCurrencies = Object.keys(dueTotalsByCurrency);
  const dueValueFormatted = dueCurrencies.length === 0
    ? currency(0, primaryCurrency)
    : dueCurrencies.map((c) => currency(dueTotalsByCurrency[c], c)).join(' + ');

  const today = getTodayDateStr();
  const usedToday = new Set(
    usage.filter((l) => l.logged_date === today).map((l) => l.subscription_id)
  );

  const next = active[0];
  const reminder = notifications.find((n) => {
    if (n.type !== 'renewal_reminder') return false;
    const sub = subscriptions.find((s) => s.id === n.subscription_id);
    return sub && sub.status === 'active';
  });
  const reminderSub = reminder
    ? subscriptions.find((s) => s.id === reminder.subscription_id)
    : undefined;

  return (
    <AppShell email={user.email ?? null}>
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-stone-500 dark:text-stone-400">Your subscription home</p>
            <Greeting name={user.user_metadata?.full_name} />
          </div>
          <div className="flex items-center gap-2">
            <ExportModal
              subscriptions={subscriptions}
              monthlySpend={primaryTotal}
              currencyCode={primaryCurrency}
            />
            <SubscriptionForm />
          </div>
        </header>

        {/* 4 Key Metrics */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            title="Monthly spend"
            value={
              currencyCodes.length === 0
                ? currency(0, 'INR')
                : currencyCodes.map((c) => currency(totalsByCurrency[c], c)).join(' + ')
            }
            note={currencyCodes.length > 1 ? `${currencyCodes.length} currencies tracked` : 'Active subscriptions only'}
            color="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/40"
            icon={<CircleDollarSign size={18} />}
          />
          <Stat
            title="Active subscriptions"
            value={String(active.length)}
            note={`${new Set(active.map((s) => s.category)).size} categories tracked`}
            color="bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
            icon={<Sparkles size={18} />}
          />
          <Stat
            title="Due this week"
            value={dueValueFormatted}
            note={`${due.length} renewal${due.length === 1 ? '' : 's'} coming up`}
            color="bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
            icon={<CalendarClock size={18} />}
            href="/calendar"
          />
          <Stat
            title="Open reminders"
            value={String(
              notifications.filter((n) => {
                const sub = subscriptions.find((s) => s.id === n.subscription_id);
                return !sub || sub.status === 'active';
              }).length
            )}
            note="View Inbox →"
            color="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
            icon={<BellRing size={18} />}
            href="/notifications"
          />
        </section>

        {/* Budget Cap & Spending Limit Widget */}
        <section className="mt-5 space-y-4">
          {currencyCodes.length === 0 ? (
            <BudgetMeter
              monthlySpent={0}
              currencyCode="INR"
              monthlyCap={settings.monthly_budget_cap}
              annualCap={settings.annual_budget_cap}
            />
          ) : (
            currencyCodes.map((curr, idx) => (
              <BudgetMeter
                key={curr}
                monthlySpent={totalsByCurrency[curr]}
                currencyCode={curr}
                monthlyCap={idx === 0 ? settings.monthly_budget_cap : null}
                annualCap={idx === 0 ? settings.annual_budget_cap : null}
              />
            ))
          )}
        </section>

        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,.75fr)]">
          <section>
            <SubscriptionList
              subscriptions={subscriptions}
              usedTodayIds={Array.from(usedToday)}
            />
          </section>
          <aside className="space-y-6">
            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="panel-title">Next reminder</h2>
                <BellRing size={17} className="text-violet dark:text-violet-400" />
              </div>
              {reminder && reminderSub ? (
                <>
                  <ReminderAlert
                    id={reminder.id}
                    title={`${reminderSub.service_name} needs your attention`}
                    body={String(
                      reminder.metadata?.message ??
                        `Your renewal is coming up. You can renew on the official service site when ready.`
                    )}
                  />
                  <div className="mt-3 flex gap-2">
                    {reminderSub.renewal_url && (
                      <a
                        href={reminderSub.renewal_url}
                        target="_blank"
                        rel="noreferrer"
                        className="action bg-ink text-white hover:bg-black dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white shadow-xs"
                      >
                        Renew on site ↗
                      </a>
                    )}
                    <a
                      href={`/subscriptions/${reminderSub.id}`}
                      className="action bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 dark:hover:bg-stone-700 shadow-xs"
                    >
                      View details
                    </a>
                  </div>
                </>
              ) : next ? (
                <>
                  <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 p-4 border border-orange-100 dark:border-orange-900/40">
                    <p className="text-sm font-bold text-orange-950 dark:text-orange-200">
                      {next.service_name} renews in {Math.max(0, daysUntil(next.next_renewal_date))} days
                    </p>
                    <p className="mt-1 text-xs leading-5 text-stone-600 dark:text-orange-200/90">
                      Your {currency(Number(next.cost), next.currency)} {next.billing_cycle} plan is coming up. We’ll use your {settings.reminder_days_before}-day preference.
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {next.renewal_url && (
                      <a
                        href={next.renewal_url}
                        target="_blank"
                        rel="noreferrer"
                        className="action bg-ink text-white hover:bg-black dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white shadow-xs"
                      >
                        Renew on site ↗
                      </a>
                    )}
                    <a
                      href={`/subscriptions/${next.id}`}
                      className="action bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 dark:hover:bg-stone-700 shadow-xs"
                    >
                      View details
                    </a>
                  </div>
                </>
              ) : (
                <p className="subtle">Add a subscription to start tracking reminders.</p>
              )}
            </section>
            <WeeklyUsage usage={usage} />
          </aside>
        </div>
        <SmartInsights subscriptions={subscriptions} usage={usage} />
      </div>
    </AppShell>
  );
}
function Stat({title,value,note,color,icon,href}:{title:string;value:string;note:string;color:string;icon:React.ReactNode;href?:string}){
  const card = (
    <article className={`card p-5 ${href ? 'hover:border-stone-300 dark:hover:border-stone-700 transition-colors cursor-pointer' : ''}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${color}`}>{icon}</span>
      <p className="mt-4 text-xs font-bold text-stone-500 dark:text-stone-400">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{value}</p>
      <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">{note}</p>
    </article>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
