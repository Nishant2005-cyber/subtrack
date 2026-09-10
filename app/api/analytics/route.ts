import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_name, properties = {}, page_url } = body;

    if (!event_name || typeof event_name !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid event_name' }, { status: 400 });
    }

    // Attempt to extract user_id if an authenticated session exists
    let userId: string | null = null;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch {
      // Unauthenticated / guest event is acceptable
    }

    const userAgent = request.headers.get('user-agent') || body.user_agent || null;

    const admin = createAdminClient();
    const { error } = await admin.from('analytics_events').insert({
      event_name,
      user_id: userId,
      properties,
      page_url: page_url || null,
      user_agent: userAgent,
    });

    if (error) {
      // Table might not be migrated yet in Supabase editor
      return NextResponse.json({ success: true, persisted: false, warning: error.message });
    }

    return NextResponse.json({ success: true, persisted: true });
  } catch {
    // Return 200 to prevent client errors during background telemetry
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
