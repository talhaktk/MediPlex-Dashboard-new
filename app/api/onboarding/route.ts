import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      // Clinic profile
      clinicName, clinicType, address, city, phone, email, website, logoUrl, speciality,
      // Doctor profile
      doctorName, doctorSpecialization, pmdc, doctorPhotoUrl, doctorSignatureUrl, consultationFee,
      // Schedule
      workingDays, morningStart, morningEnd, eveningStart, eveningEnd, slotDuration, maxPerSlot,
      // Billing
      currency, invoicePrefix, tax, paymentMethods,
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

    // 2. Generate clinic_id
    const clinicId = `clinic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 3. Insert clinic_settings
    const initials = doctorName
      ? doctorName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3)
      : clinicName.slice(0, 2).toUpperCase();

    const { error: csErr } = await admin.from('clinic_settings').insert({
      clinic_id:              clinicId,
      clinic_name:            clinicName,
      clinic_type:            clinicType || 'General',
      speciality:             doctorSpecialization || speciality || 'General Practice',
      clinic_address:         address || '',
      clinic_city:            city || '',
      clinic_phone:           phone || '',
      clinic_email:           email.toLowerCase(),
      clinic_website:         website || '',
      clinic_logo_url:        logoUrl || '',
      doctor_name:            doctorName || '',
      doctor_qualification:   pmdc ? `PMDC: ${pmdc}` : '',
      doctor_license:         pmdc || '',
      doctor_photo_url:       doctorPhotoUrl || '',
      doctor_signature_url:   doctorSignatureUrl || '',
      default_consultation_fee: parseFloat(consultationFee) || 0,
      morning_start:          morningStart || '09:00',
      morning_end:            morningEnd   || '13:00',
      evening_start:          eveningStart || '14:00',
      evening_end:            eveningEnd   || '18:00',
      slot_duration:          parseInt(slotDuration) || 15,
      max_per_slot:           parseInt(maxPerSlot) || 1,
      currency:               currency || 'PKR',
      invoice_prefix:         invoicePrefix || 'INV',
      tax_percentage:         parseFloat(tax) || 0,
      accepted_payment_methods: paymentMethods || ['cash'],
      mr_prefix:              mrPrefix || 'MR',
      mr_digits:              parseInt(mrDigits) || 4,
      modules: {
        appointments: true, patients: true, lab_results: true,
        prescriptions: true, billing: true, ai_scribe: true,
        reminders: true, feedback: true,
      },
      onboarding_complete: true,
    });
    if (csErr) throw new Error(`clinic_settings: ${csErr.message}`);

    // 4. Insert login (doctor/admin user)
    const { data: loginRow, error: loginErr } = await admin.from('logins').insert({
      email:      email.toLowerCase(),
      password_hash: password,
      name:       doctorName || clinicName,
      user_role:  'doctor',
      clinic_id:  clinicId,
      initials:   initials,
      is_active:  true,
    }).select('id').single();
    if (loginErr) throw new Error(`logins: ${loginErr.message}`);

    // 5. Create subscription (14-day trial)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    await admin.from('subscriptions').insert({
      clinic_id:        clinicId,
      plan:             'trial',
      status:           'active',
      trial_ends_at:    trialEnd.toISOString(),
      ai_scribe_limit:  50,
      ai_scribe_used:   0,
    });

    return NextResponse.json({
      ok:       true,
      clinicId,
      loginId:  loginRow?.id,
      message:  'Account created. 14-day trial started.',
    });

  } catch (err: any) {
    console.error('[onboarding]', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
