import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function slug(s: string, max = 12) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, max);
}
function shortId() { return Math.random().toString(36).slice(2, 6); }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      // Clinic profile
      clinicName, address, city, phone, email, website, speciality,
      // Organisation (optional — auto-derived from clinicName if not provided)
      orgName,
      // Doctor profile
      doctorName, doctorSpecialization, pmdc, consultationFee,
      // Schedule
      morningStart, morningEnd, eveningStart, eveningEnd, slotDuration, maxPerSlot,
      // Billing
      currency, invoicePrefix, tax,
      // MR
      mrPrefix, mrDigits,
      // Auth
      password,
    } = body;

    if (!clinicName || !email || !password) {
      return NextResponse.json({ error: 'clinicName, email and password are required' }, { status: 400 });
    }

    // 1. Check email not taken
    const { data: existing } = await admin
      .from('logins')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // 2. Auto-create Organisation
    //    If orgName is provided (user typed it), use it; otherwise use clinicName.
    const resolvedOrgName = orgName?.trim() || clinicName;
    const orgId = `org_${slug(resolvedOrgName, 12)}_${shortId()}`;

    const { error: orgErr } = await admin.from('organisations').insert({
      id:         orgId,
      name:       resolvedOrgName,
      owner_name: doctorName || '',
      email:      email.toLowerCase(),
      phone:      phone || '',
      city:       city || '',
      country:    'Pakistan',
      status:     'active',
    });
    if (orgErr) throw new Error(`organisations: ${orgErr.message}`);

    // 3. Create Clinic row (mirrors what superadmin create-clinic does)
    const clinicId = `${slug(resolvedOrgName, 8)}_${slug(clinicName, 10)}_${shortId()}`;
    const defaultModules = {
      appointments: true, patients: true, lab_results: true,
      prescriptions: true, billing: true, ai_scribe: true,
      reminders: true, feedback: true,
    };

    const { error: clinicErr } = await admin.from('clinics').insert({
      id:         clinicId,
      org_id:     orgId,
      name:       clinicName,
      speciality: doctorSpecialization || speciality || 'General Practice',
      city:       city || '',
      address:    address || '',
      phone:      phone || '',
      email:      email.toLowerCase(),
      is_active:  true,
      status:     'active',
      modules:    defaultModules,
    });
    if (clinicErr) throw new Error(`clinics: ${clinicErr.message}`);

    // 4. Insert clinic_settings
    //    Only insert columns that exist in the base schema.
    //    Extra columns (clinic_logo_url, doctor_photo_url, etc.) are added
    //    via /api/settings/migrate and can be saved later from Settings page.
    const initials = doctorName
      ? doctorName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3)
      : clinicName.slice(0, 2).toUpperCase();

    const { error: csErr } = await admin.from('clinic_settings').insert({
      clinic_id:                clinicId,
      clinic_name:              clinicName,
      speciality:               doctorSpecialization || speciality || 'General Practice',
      clinic_address:           address || '',
      clinic_city:              city || '',
      clinic_phone:             phone || '',
      clinic_email:             email.toLowerCase(),
      clinic_website:           website || '',
      doctor_name:              doctorName || '',
      default_consultation_fee: parseFloat(String(consultationFee)) || 0,
      morning_start:            morningStart || '09:00',
      morning_end:              morningEnd   || '13:00',
      evening_start:            eveningStart || '14:00',
      evening_end:              eveningEnd   || '18:00',
      slot_duration:            parseInt(String(slotDuration)) || 15,
      max_per_slot:             parseInt(String(maxPerSlot)) || 1,
      currency:                 currency || 'PKR',
      invoice_prefix:           invoicePrefix || 'INV',
      tax_percentage:           parseFloat(String(tax)) || 0,
      mr_prefix:                mrPrefix || 'MR',
      mr_digits:                parseInt(String(mrDigits)) || 4,
      modules:                  defaultModules,
      onboarding_complete:      true,
    });
    if (csErr) throw new Error(`clinic_settings: ${csErr.message}`);

    // 5. Create doctor login
    const loginInsert: Record<string, any> = {
      email:         email.toLowerCase(),
      password_hash: password,
      name:          doctorName || clinicName,
      user_role:     'doctor',
      clinic_id:     clinicId,
      org_id:        orgId,
      initials:      initials,
      is_active:     true,
      is_super_admin: false,
    };
    const { data: loginRow, error: loginErr } = await admin
      .from('logins')
      .insert(loginInsert)
      .select('id')
      .single();
    if (loginErr) throw new Error(`logins: ${loginErr.message}`);

    // 6. Create subscription (14-day trial)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    await admin.from('subscriptions').insert({
      clinic_id:       clinicId,
      org_id:          orgId,
      plan_name:       'Trial',
      status:          'active',
      start_date:      new Date().toISOString().split('T')[0],
      next_billing:    trialEnd.toISOString().split('T')[0],
      trial_ends_at:   trialEnd.toISOString(),
      ai_scribe_limit: 50,
      ai_scribe_used:  0,
    });

    return NextResponse.json({
      ok:        true,
      clinicId,
      orgId,
      orgName:   resolvedOrgName,
      loginId:   loginRow?.id,
      message:   'Account created. 14-day trial started.',
    });

  } catch (err: any) {
    console.error('[onboarding]', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
