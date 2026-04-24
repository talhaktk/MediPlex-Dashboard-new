import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = session.user as any;
  if (user?.role !== 'admin' && !user?.isSuperAdmin) return null;
  return user;
}

// ── GET — fetch users for this clinic ────────────────────────────────────────
export async function GET() {
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let q = supabase.from('logins').select('*').order('created_at', { ascending: false });
  if (!user.isSuperAdmin && user.clinicId) q = q.eq('clinic_id', user.clinicId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ users: [], error: error.message });

  const users = (data || []).map((r: any) => ({
    id:       r.id,
    name:     r.name     || '',
    email:    r.email    || '',
    role:     r.user_role || r.role || 'receptionist',
    initials: r.initials || '',
    active:   r.is_active ?? true,
  }));

  return NextResponse.json({ users });
}

// ── POST — add / toggle / delete user ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === 'add') {
    const { error } = await supabase.from('logins').insert([{
      name:          body.name,
      email:         body.email.toLowerCase(),
      password_hash: body.password,
      user_role:     body.role || 'receptionist',
      initials:      body.initials || body.name.slice(0, 2).toUpperCase(),
      is_active:     body.active ?? true,
      is_super_admin: false,
      clinic_id:     admin.clinicId || null,
      org_id:        admin.orgId    || null,
    }]);
    if (error) return NextResponse.json({ ok: false, error: error.message });
    return NextResponse.json({ ok: true });
  }

  if (action === 'toggle') {
    const { error } = await supabase.from('logins').update({ is_active: body.active }).eq('id', body.id);
    if (error) return NextResponse.json({ ok: false, error: error.message });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    const { error } = await supabase.from('logins').delete().eq('id', body.id);
    if (error) return NextResponse.json({ ok: false, error: error.message });
    return NextResponse.json({ ok: true });
  }

  if (action === 'resetPassword') {
    const { error } = await supabase.from('logins').update({ password_hash: body.password }).eq('id', body.id);
    if (error) return NextResponse.json({ ok: false, error: error.message });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' });
}
