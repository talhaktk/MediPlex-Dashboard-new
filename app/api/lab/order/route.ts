import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.isPatient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { mrNumber, patientName, phone, orderType, tests, clinicalNotes } = body;
  if (!mrNumber || !tests?.length || !orderType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const sb = getAdmin();

  // Auto-resolve phone if not provided
  let resolvedPhone = phone?.trim() || null;
  if (!resolvedPhone) {
    const { data: appt } = await sb.from('appointments').select('whatsapp').eq('mr_number', mrNumber).order('appointment_date', { ascending: false }).limit(1).maybeSingle();
    resolvedPhone = appt?.whatsapp || null;
    if (!resolvedPhone) {
      const { data: pat } = await sb.from('patients').select('whatsapp_number').eq('mr_number', mrNumber).maybeSingle();
      resolvedPhone = pat?.whatsapp_number || null;
    }
  }

  const qrToken   = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await sb.from('lab_orders').insert([{
    clinic_id:      user.clinicId || null,
    mr_number:      mrNumber,
    patient_name:   patientName,
    phone:          resolvedPhone,
    order_type:     orderType,
    tests:          tests,
    clinical_notes: clinicalNotes || null,
    ordered_by:     user.name || 'Doctor',
    qr_token:       qrToken,
    qr_expires_at:  expiresAt,
    status:         'pending',
  }]).select('id,qr_token,qr_expires_at').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    orderId:  data.id,
    qrToken:  data.qr_token,
    expiresAt:data.qr_expires_at,
    phone:    resolvedPhone,
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.isPatient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mrNumber = searchParams.get('mr');
  if (!mrNumber) return NextResponse.json({ error: 'Missing mr' }, { status: 400 });

  const sb = getAdmin();
  const { data, error } = await sb.from('lab_orders').select('*').eq('mr_number', mrNumber).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}
