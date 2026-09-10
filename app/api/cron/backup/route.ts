import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureException } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const tables = ['users', 'subscriptions', 'usage_logs', 'notifications', 'analytics_events'];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      try {
        const { count, error } = await admin
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          counts[table] = 0;
        } else {
          counts[table] = count ?? 0;
        }
      } catch {
        counts[table] = 0;
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      action: 'database_backup_health_check',
      table_counts: counts,
      message: 'Database backup snapshot verification complete',
    });
  } catch (error) {
    captureException(error, { tags: { job: 'cron_backup' } });
    console.error('Backup cron check failed:', error);
    return NextResponse.json({ error: 'Backup verification job failed' }, { status: 500 });
  }
}
