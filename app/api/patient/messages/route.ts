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

async function resolveClinicId(sb: ReturnType<typeof getAdmin>, mrNumber: string): Promise<string | null> {
  // Try appointments first (most reliable)
  const { data: appt } = await sb
    .from('appointments')
    .select('clinic_id')
    .eq('mr_number', mrNumber)
    .order('appointment_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (appt?.clinic_id) return appt.clinic_id;

  // Fallback: patients table
  const { data: pat } = await sb
    .from('patients')
    .select('clinic_id')
    .eq('mr_number', mrNumber)
    .maybeSingle();
  if (pat?.clinic_id) return pat.clinic_id;

  return null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isPatient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Message is empty' }, { status: 400 });

  const sb = getAdmin();
  const mrNumber = user.mrNumber as string;
  const name = user.patientName || user.name || 'Patient';

  // Always resolve clinic_id fresh from DB — never trust the null session value
  let clinicId = user.clinicId as string | null;
  if (!clinicId) {
    clinicId = await resolveClinicId(sb, mrNumber);
    // Backfill patient_accounts so future sessions carry the correct clinicId
    if (clinicId) {
      await sb.from('patient_accounts').update({ clinic_id: clinicId }).eq('mr_number', mrNumber);
    }
  }

  const { error } = await sb.from('patient_messages').insert([{
    mr_number:    mrNumber,
    clinic_id:    clinicId,
    patient_name: name,
    sender:       'patient',
    body:         body.trim(),
  }]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, clinicId });
}
