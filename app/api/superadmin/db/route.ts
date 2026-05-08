import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Allowed tables for superadmin write operations
const ALLOWED_TABLES = new Set([
  'organisations', 'clinics', 'clinic_settings', 'logins',
  'subscriptions', 'mediplex_expenses', 'announcements',
]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    const { op, table, payload, match } = await req.json();

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table '${table}' not allowed` }, { status: 400 });
    }

    let result: any;
    switch (op) {
      case 'insert':
        result = await admin.from(table).insert(payload).select();
        break;
      case 'update':
        result = await admin.from(table).update(payload).match(match).select();
        break;
      case 'upsert':
        result = await admin.from(table).upsert(payload).select();
        break;
      case 'delete':
        result = await admin.from(table).delete().match(match);
        break;
      default:
        return NextResponse.json({ error: `Unknown op: ${op}` }, { status: 400 });
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: result.data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
