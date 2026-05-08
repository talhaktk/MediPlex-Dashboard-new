import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || user?.role !== 'org_owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sb = admin();

  // Resolve orgId: prefer JWT, fall back to DB lookup via logins.email
  let orgId = user.orgId;
  if (!orgId && user.email) {
    const { data: login } = await sb
      .from('logins')
      .select('org_id')
      .eq('email', user.email)
      .maybeSingle();
    orgId = login?.org_id || null;
  }

  if (!orgId) return NextResponse.json({ error: 'No orgId found' }, { status: 400 });

  // 1. Clinics for this org
  const { data: clinics } = await sb
    .from('clinics')
    .select('id,name,speciality,city,is_active')
    .eq('org_id', orgId)
    .eq('is_active', true);

  const orgClinics = clinics || [];
  const clinicIds = orgClinics.map((c: any) => c.id);

  if (clinicIds.length === 0) {
    return NextResponse.json({ clinics: [], patients: [], appointments: [], invoices: [], expenses: [], feedback: [], staff: [] });
  }

  // 2. All data in parallel — patients table has no clinic_id, count via appointments
  const [
    { data: appointments },
    { data: invoices },
    { data: expenses },
    { data: feedback },
    { data: staff },
  ] = await Promise.all([
    sb.from('appointments').select('*').in('clinic_id', clinicIds).order('appointment_date', { ascending: false }).limit(1000),
    sb.from('billing').select('*').in('clinic_id', clinicIds).order('created_at', { ascending: false }),
    sb.from('expenses').select('*').in('clinic_id', clinicIds).order('date', { ascending: false }),
    sb.from('feedback').select('*').in('clinic_id', clinicIds).order('created_at', { ascending: false }).limit(500),
    sb.from('logins').select('id,name,email,user_role,clinic_id,is_active,created_at').in('clinic_id', clinicIds).eq('is_super_admin', false),
  ]);

  // Build per-clinic unique patient counts from appointments (mr_number or child_name as key)
  const aptRows = appointments || [];
  const patientCountByClinic: Record<string, number> = {};
  for (const clinicId of clinicIds) {
    const seen = new Set<string>();
    for (const a of aptRows) {
      if (a.clinic_id !== clinicId) continue;
      seen.add(a.mr_number || a.child_name || `_${a.id}`);
    }
    patientCountByClinic[clinicId] = seen.size;
  }

  return NextResponse.json({
    clinics: orgClinics,
    patientCountByClinic,
    appointments: aptRows,
    invoices: invoices || [],
    expenses: expenses || [],
    feedback: feedback || [],
    staff: staff || [],
  });
}
