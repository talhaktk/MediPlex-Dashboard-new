import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/staff/messages?action=list
// GET /api/staff/messages?action=thread&mr=MR-XXX
// POST /api/staff/messages        { mrNumber, patientName, body, clinicId }
// PATCH /api/staff/messages       { ids: [...] }  — mark staff_read_at

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.isPatient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getAdmin();
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const clinicId = user.clinicId as string | null;
  const isSuperAdmin = user.isSuperAdmin as boolean;

  if (action === 'list') {
    let q = sb.from('patient_messages')
      .select('mr_number,patient_name,body,created_at,sender,staff_read_at')
      .order('created_at', { ascending: false });

    if (!isSuperAdmin && clinicId) {
      q = q.or(`clinic_id.eq.${clinicId},clinic_id.is.null`);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  }

  if (action === 'thread') {
    const mr = searchParams.get('mr');
    if (!mr) return NextResponse.json({ error: 'Missing mr' }, { status: 400 });

    let q = sb.from('patient_messages')
      .select('*')
      .eq('mr_number', mr)
      .order('created_at', { ascending: true });

    if (!isSuperAdmin && clinicId) {
      q = q.or(`clinic_id.eq.${clinicId},clinic_id.is.null`);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.isPatient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { mrNumber, patientName, body, clinicId } = await req.json();
  if (!mrNumber || !body?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const sb = getAdmin();
  const { error } = await sb.from('patient_messages').insert([{
    mr_number:    mrNumber,
    clinic_id:    clinicId || null,
    patient_name: patientName || mrNumber,
    sender:       'clinic',
    body:         body.trim(),
  }]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.isPatient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ids } = await req.json();
  if (!ids?.length) return NextResponse.json({ ok: true });

  const sb = getAdmin();
  await sb.from('patient_messages')
    .update({ staff_read_at: new Date().toISOString() })
    .in('id', ids);

  return NextResponse.json({ ok: true });
}
