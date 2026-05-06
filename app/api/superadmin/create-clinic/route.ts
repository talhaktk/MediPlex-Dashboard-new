import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function slug(str: string, maxLen = 16): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, maxLen);
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 6);
}

function buildClinicId(orgName: string, clinicName: string): string {
  const orgSlug    = slug(orgName, 10);
  const clinicSlug = slug(clinicName, 12);
  return `${orgSlug}_${clinicSlug}_${shortId()}`;
}

export async function POST(req: NextRequest) {
  // Guard: super admin only
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      // Required
      orgId, clinicName, speciality,
      // Clinic details
      city, address, phone, clinicEmail, website,
      // Doctor / first user
      doctorName, doctorEmail, doctorPassword, doctorRole = 'doctor',
      // Subscription
      plan = 'Standard', aiScribeLimit = 100, subscriptionExpiry,
      // Clinic settings extras
      mrPrefix = 'MR', mrDigits = 4, consultationFee = 0, currency = 'PKR',
    } = body;

    if (!orgId || !clinicName || !doctorEmail || !doctorPassword) {
      return NextResponse.json({ error: 'orgId, clinicName, doctorEmail and doctorPassword are required' }, { status: 400 });
    }

    // 1. Resolve org
    const { data: org, error: orgErr } = await admin.from('organisations').select('id,name').eq('id', orgId).single();
    if (orgErr || !org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    // 2. Check email uniqueness
    const { data: existingLogin } = await admin.from('logins').select('id').eq('email', doctorEmail.toLowerCase()).maybeSingle();
    if (existingLogin) {
      return NextResponse.json({ error: `Email ${doctorEmail} is already registered` }, { status: 409 });
    }

    // 3. Generate clinic_id
    const clinicId = buildClinicId(org.name, clinicName);

    // 4. Insert into `clinics` table
    const defaultModules = getDefaultModules(speciality || 'General Practice');
    const { error: clinicErr } = await admin.from('clinics').insert({
      id:                  clinicId,
      org_id:              orgId,
      name:                clinicName,
      speciality:          speciality || 'General Practice',
      city:                city || '',
      status:              'active',
      is_active:           true,
      subscription_expiry: subscriptionExpiry || null,
      modules:             defaultModules,
    });
    if (clinicErr) throw new Error(`clinics: ${clinicErr.message}`);

    // 5. Insert full clinic_settings
    const { error: csErr } = await admin.from('clinic_settings').insert({
      clinic_id:              clinicId,
      clinic_name:            clinicName,
      clinic_type:            'Clinic',
      speciality:             speciality || 'General Practice',
      clinic_address:         address || '',
      clinic_city:            city || '',
      clinic_phone:           phone || '',
      clinic_email:           clinicEmail || doctorEmail.toLowerCase(),
      clinic_website:         website || '',
      doctor_name:            doctorName || '',
      default_consultation_fee: parseFloat(String(consultationFee)) || 0,
      currency:               currency,
      mr_prefix:              mrPrefix,
      mr_digits:              parseInt(String(mrDigits)) || 4,
      invoice_prefix:         'INV',
      tax_percentage:         0,
      morning_start:          '09:00',
      morning_end:            '13:00',
      evening_start:          '14:00',
      evening_end:            '18:00',
      slot_duration:          15,
      max_per_slot:           1,
      modules:                defaultModules,
      onboarding_complete:    true,
    });
    if (csErr) throw new Error(`clinic_settings: ${csErr.message}`);

    // 6. Create doctor login
    const initials = doctorName
      ? doctorName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3)
      : doctorEmail.slice(0, 2).toUpperCase();

    const { data: loginRow, error: loginErr } = await admin.from('logins').insert({
      email:         doctorEmail.toLowerCase(),
      password_hash: doctorPassword,
      name:          doctorName || doctorEmail,
      user_role:     doctorRole,
      clinic_id:     clinicId,
      org_id:        orgId,
      initials:      initials,
      is_active:     true,
      is_super_admin: false,
    }).select('id').single();
    if (loginErr) throw new Error(`logins: ${loginErr.message}`);

    // 7. Create subscription
    const trialEnd = subscriptionExpiry
      ? new Date(subscriptionExpiry).toISOString()
      : (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString(); })();

    await admin.from('subscriptions').insert({
      clinic_id:        clinicId,
      org_id:           orgId,
      plan_name:        plan,
      status:           'active',
      start_date:       new Date().toISOString().split('T')[0],
      next_billing:     subscriptionExpiry || trialEnd.split('T')[0],
      trial_ends_at:    trialEnd,
      ai_scribe_limit:  parseInt(String(aiScribeLimit)) || 100,
      ai_scribe_used:   0,
    });

    return NextResponse.json({
      ok:       true,
      clinicId,
      loginId:  loginRow?.id,
      orgName:  org.name,
      clinicName,
      doctorEmail: doctorEmail.toLowerCase(),
    });

  } catch (err: any) {
    console.error('[superadmin/create-clinic]', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

function getDefaultModules(speciality: string): Record<string, boolean> {
  const base = { telehealth: true, ai_scribe: true, lab_results: true, procedures: true, feedback: true, appointments: true, patients: true, billing: true, prescriptions: true, reminders: true };
  const sp = speciality.toLowerCase();
  if (sp.includes('pediatric') || sp.includes('paediatric')) {
    return { ...base, vaccines: true, who_charts: true, weight_based_dose: true };
  }
  if (sp.includes('gynecol') || sp.includes('obstet')) {
    return { ...base, anc_record: true, lmp_edd: true, obstetric_history: true };
  }
  if (sp.includes('cardiol')) {
    return { ...base, bmi_calc: true, bp_history: true, chronic_conditions: true, ecg_findings: true, cardiac_risk: true };
  }
  if (sp.includes('orthop')) {
    return { ...base, pain_scale: true, rom: true, surgical_history: true };
  }
  return { ...base, bmi_calc: true, chronic_conditions: true, bp_history: true, family_history: true };
}
