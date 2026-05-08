import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ announcements: [] });

  const user = session.user as any;
  const clinicId = user?.clinicId || '';
  const plan = user?.plan || '';

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ announcements: [] });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false });

  if (error || !data) return NextResponse.json({ announcements: [] });

  // Filter by target
  const filtered = data.filter((a: any) => {
    if (a.target === 'all') return true;
    if (a.target === `plan:${plan}`) return true;
    if (a.target === `clinic:${clinicId}`) return true;
    return false;
  });

  return NextResponse.json({ announcements: filtered });
}
