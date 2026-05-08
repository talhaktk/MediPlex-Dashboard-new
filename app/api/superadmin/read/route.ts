import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

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
    return NextResponse.json({ error: 'Service key not configured' }, { status: 500 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    const { table, select = '*', order } = await req.json();

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table '${table}' not allowed` }, { status: 400 });
    }

    let q = admin.from(table).select(select);
    if (order) q = q.order(order.column, { ascending: order.ascending ?? false });

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
