import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const uptimeSeconds = Math.floor(process.uptime());
  const mem = process.memoryUsage();

  const checks: Record<string, { status: 'pass' | 'fail' | 'warn'; latencyMs?: number; message?: string }> = {
    server: {
      status: 'pass',
      message: 'Node runtime operational',
    },
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    checks.database = {
      status: 'warn',
      message: 'Supabase credentials not configured in environment',
    };
  } else {
    try {
      const dbStart = Date.now();
      const client = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      // Quick probe to verify database connectivity
      const { error } = await client.from('subscriptions').select('id').limit(1);
      const dbLatency = Date.now() - dbStart;

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is no rows, which is still successful connection
        checks.database = {
          status: 'fail',
          latencyMs: dbLatency,
          message: error.message,
        };
      } else {
        checks.database = {
          status: 'pass',
          latencyMs: dbLatency,
          message: 'Connected to Supabase Postgres instance',
        };
      }
    } catch (err: unknown) {
      checks.database = {
        status: 'fail',
        message: err instanceof Error ? err.message : 'Database ping failed',
      };
    }
  }

  const isHealthy = Object.values(checks).every((c) => c.status !== 'fail');
  const totalLatencyMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      latencyMs: totalLatencyMs,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      memory: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      },
      checks,
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
