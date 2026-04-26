import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Attempt to find a patient record by MR number, trying several formats
async function findPatient(sb: ReturnType<typeof getAdmin>, raw: string) {
  const variants = Array.from(new Set([
    raw,
    raw.toUpperCase(),
    raw.toLowerCase(),
    raw.replace(/^MR[-\s]?/i, ''),            // strip "MR-" prefix
    raw.replace(/^MR[-\s]?/i, '').padStart(4,'0'), // zero-pad after stripping
    'MR-' + raw.replace(/^MR[-\s]?/i, ''),    // ensure "MR-" prefix
    'MR' + raw.replace(/^MR[-\s]?/i, ''),     // "MR" without dash
  ]));

  for (const v of variants) {
    const { data: p } = await sb.from('patients').select('name,phone,mr_number').eq('mr_number', v).maybeSingle();
    if (p) return p;
  }

  // Try ilike as last resort
  const { data: pLike } = await sb.from('patients').select('name,phone,mr_number').ilike('mr_number', `%${raw.replace(/^MR[-\s]?/i,'')}%`).limit(1).maybeSingle();
  if (pLike) return pLike;

  // Try appointments
  for (const v of variants) {
    const { data: a } = await sb.from('appointments').select('child_name,whatsapp,clinic_id,mr_number')
      .eq('mr_number', v).order('appointment_date', { ascending: false }).limit(1).maybeSingle();
    if (a) return { name: a.child_name, phone: a.whatsapp, clinic_id: a.clinic_id, mr_number: a.mr_number };
  }
  const { data: aLike } = await sb.from('appointments').select('child_name,whatsapp,clinic_id,mr_number')
    .ilike('mr_number', `%${raw.replace(/^MR[-\s]?/i,'')}%`)
    .order('appointment_date', { ascending: false }).limit(1).maybeSingle();
  if (aLike) return { name: aLike.child_name, phone: aLike.whatsapp, clinic_id: aLike.clinic_id, mr_number: aLike.mr_number };

  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;
  const sb = getAdmin();

  // ── Step 1: verify MR number ──────────────────────────────────────────────
  if (action === 'verify') {
    const raw = (body.mrNumber || '').trim();
    if (!raw) return NextResponse.json({ error: 'Please enter your MR number' }, { status: 400 });

    // Check if account already exists
    const { data: existing } = await sb.from('patient_accounts').select('id').eq('mr_number', raw.toUpperCase()).maybeSingle();
    if (existing) return NextResponse.json({ error: 'An account already exists for this MR number. Please sign in.' }, { status: 409 });

    const patient = await findPatient(sb, raw);
    if (!patient) return NextResponse.json({ error: 'MR number not found in our system. Please check with your clinic or ask them to add your records first.' }, { status: 404 });

    return NextResponse.json({
      ok: true,
      mrNumber:  patient.mr_number || raw.toUpperCase(),
      name:      patient.name || '',
      phone:     patient.phone || '',
      clinicId:  (patient as any).clinic_id || null,
    });
  }

  // ── Step 2: create account ────────────────────────────────────────────────
  if (action === 'create') {
    const { mrNumber, name, phone, email, password, clinicId } = body;
    if (!mrNumber || !name || !password) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

    // Double-check no duplicate
    const { data: dup } = await sb.from('patient_accounts').select('id').eq('mr_number', mrNumber).maybeSingle();
    if (dup) return NextResponse.json({ error: 'Account already exists. Please sign in.' }, { status: 409 });

    const { error: insertErr } = await sb.from('patient_accounts').insert([{
      mr_number:    mrNumber,
      clinic_id:    clinicId || null,
      patient_name: name.trim(),
      phone:        phone?.trim() || null,
      email:        email?.trim() || null,
      password_hash: password,
    }]);

    if (insertErr) {
      console.error('[patient-register] insert error:', insertErr.message);
      return NextResponse.json({ error: 'Registration failed: ' + insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
