import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

const BUCKET = 'lab-results';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function signedUrl(sb: ReturnType<typeof getAdmin>, publicUrl: string): Promise<string> {
  try {
    const marker = `/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return publicUrl;
    const path = decodeURIComponent(publicUrl.slice(idx + marker.length).split('?')[0]);
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
    return data?.signedUrl || publicUrl;
  } catch { return publicUrl; }
}

async function signFileUrls(sb: ReturnType<typeof getAdmin>, urls: any): Promise<string[]> {
  const arr: string[] = Array.isArray(urls) ? urls : (typeof urls === 'string' && urls ? [urls] : []);
  return Promise.all(arr.map(u => signedUrl(sb, u)));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.isPatient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { mrNumber, patientName, phone, orderType, tests, clinicalNotes, rxId } = body;
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
    rx_id:          rxId || null,
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
  const action  = searchParams.get('action');
  const sb = getAdmin();

  // Return uploaded file URLs for a specific order (with signed URLs)
  if (action === 'files') {
    const orderId = searchParams.get('orderId');
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    const { data } = await sb
      .from('lab_results')
      .select('id,test_name,file_urls,notes,visit_date,uploaded_at,radiologist_report')
      .eq('order_id', orderId);
    const files = await Promise.all(
      (data || []).map(async (f: any) => ({
        ...f,
        file_urls: await signFileUrls(sb, f.file_urls),
      }))
    );
    return NextResponse.json({ files });
  }

  const mrNumber = searchParams.get('mr');
  const patientName = searchParams.get('name');
  if (!mrNumber && !patientName) return NextResponse.json({ error: 'Missing mr or name' }, { status: 400 });

  let query = sb.from('lab_orders').select('*').order('created_at', { ascending: false });
  if (mrNumber) query = query.eq('mr_number', mrNumber);
  else if (patientName) query = query.ilike('patient_name', '%'+patientName+'%');
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}
