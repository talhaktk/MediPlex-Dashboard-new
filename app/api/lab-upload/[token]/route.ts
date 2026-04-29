import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const sb = getAdmin();
  const { data: order } = await sb.from('lab_orders').select('*').eq('qr_token', params.token).maybeSingle();
  if (!order) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
  if (new Date(order.qr_expires_at) < new Date()) return NextResponse.json({ error: 'This QR code has expired. Please ask the clinic for a new order.' }, { status: 410 });
  // Don't expose DOB in GET — only expose order details
  return NextResponse.json({ order: {
    id: order.id, child_name: order.child_name, mr_number: order.mr_number,
    order_type: order.order_type, tests: order.tests, clinical_notes: order.clinical_notes,
    status: order.status,
  }});
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const sb = getAdmin();
  const body = await req.json();
  if (body.action === 'verify_dob') {
    const { data: order } = await sb.from('lab_orders').select('mr_number,clinic_id').eq('qr_token', params.token).maybeSingle();
    if (!order) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
    // Check DOB from patients table
    const { data: patient } = await sb.from('patients').select('date_of_birth').eq('mr_number', order.mr_number).maybeSingle();
    if (!patient?.date_of_birth) return NextResponse.json({ ok: true }); // No DOB on file — allow
    const inputDob = new Date(body.dob).toISOString().split('T')[0];
    const patientDob = new Date(patient.date_of_birth).toISOString().split('T')[0];
    if (inputDob !== patientDob) return NextResponse.json({ error: 'Date of birth does not match our records' }, { status: 403 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function PUT(req: NextRequest, { params }: { params: { token: string } }) {
  const sb = getAdmin();
  const formData = await req.formData();
  const files = formData.getAll('files') as File[];
  const labName = formData.get('labName') as string;
  const techName = formData.get('techName') as string || '';
  const notes = formData.get('notes') as string || '';

  const { data: order } = await sb.from('lab_orders').select('*').eq('qr_token', params.token).maybeSingle();
  if (!order) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
  if (new Date(order.qr_expires_at) < new Date()) return NextResponse.json({ error: 'Link expired' }, { status: 410 });

  // Upload files to storage
  const fileUrls: string[] = [];
  for (const file of files) {
    const ext = file.name.split('.').pop() || 'pdf';
    const path = `${order.clinic_id}/${order.mr_number}/${order.id}_${Date.now()}.${ext}`;
    const buf = await file.arrayBuffer();
    const { error: upErr } = await sb.storage.from('lab-results').upload(path, buf, { contentType: file.type, upsert: true });
    if (!upErr) {
      const { data: urlData } = sb.storage.from('lab-results').getPublicUrl(path);
      fileUrls.push(urlData.publicUrl);
    }
  }

  // Save to lab_results
  const { error } = await sb.from('lab_results').insert([{
    mr_number: order.mr_number,
    child_name: order.child_name,
    clinic_id: order.clinic_id,
    order_id: order.id,
    test_name: (order.tests || []).map((t: any) => t.name || t).join(', '),
    lab_name: labName,
    technician_name: techName,
    notes: notes,
    file_urls: fileUrls,
    result_type: order.order_type || 'lab',
    visit_date: new Date().toISOString().split('T')[0],
    uploaded_at: new Date().toISOString(),
  }]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update order status
  await sb.from('lab_orders').update({ status: 'completed', lab_name: labName, technician_name: techName }).eq('id', order.id);

  // Create notification for doctor
  await sb.from('notifications').insert([{
    clinic_id: order.clinic_id,
    type: 'lab_result',
    title: `🔬 Lab Results Received`,
    message: `Results for ${order.child_name} (MR# ${order.mr_number}) uploaded by ${labName}`,
  }]);

  return NextResponse.json({ ok: true });
}
