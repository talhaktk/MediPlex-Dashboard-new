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
  return NextResponse.json({ order: {
    id: order.id, child_name: order.child_name || order.patient_name,
    mr_number: order.mr_number, order_type: order.order_type,
    tests: order.tests, clinical_notes: order.clinical_notes,
    ordered_by: order.ordered_by, status: order.status,
  }});
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const sb = getAdmin();
  const body = await req.json();
  
  if (body.action === 'verify_phone') {
    const { data: order } = await sb.from('lab_orders').select('mr_number,phone,clinic_id').eq('qr_token', params.token).maybeSingle();
    if (!order) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
    
    const inputPhone = body.phone?.replace(/\s+/g,'').replace(/^00/,'+');
    
    // Check phone from order itself first
    if (order.phone) {
      const orderPhone = order.phone.replace(/\s+/g,'').replace(/^00/,'+');
      if (orderPhone === inputPhone || orderPhone.endsWith(inputPhone.slice(-9))) {
        return NextResponse.json({ ok: true });
      }
    }
    
    // Check patients table
    const { data: patient } = await sb.from('patients').select('whatsapp_number').eq('mr_number', order.mr_number).maybeSingle();
    if (patient?.whatsapp_number) {
      const patPhone = patient.whatsapp_number.replace(/\s+/g,'').replace(/^00/,'+');
      if (patPhone === inputPhone || patPhone.endsWith(inputPhone.slice(-9))) {
        return NextResponse.json({ ok: true });
      }
    }
    
    // Check appointments
    const { data: appt } = await sb.from('appointments').select('whatsapp').eq('mr_number', order.mr_number).order('appointment_date',{ascending:false}).limit(1).maybeSingle();
    if (appt?.whatsapp) {
      const apptPhone = appt.whatsapp.replace(/\s+/g,'').replace(/^00/,'+');
      if (apptPhone === inputPhone || apptPhone.endsWith(inputPhone.slice(-9))) {
        return NextResponse.json({ ok: true });
      }
    }
    
    // No phone on file — allow anyway (clinic may not have recorded phone)
    const hasAnyPhone = order.phone || patient?.whatsapp_number || appt?.whatsapp;
    if (!hasAnyPhone) return NextResponse.json({ ok: true });
    
    return NextResponse.json({ error: 'Phone number does not match our records. Please check with your clinic.' }, { status: 403 });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function PUT(req: NextRequest, { params }: { params: { token: string } }) {
  const sb = getAdmin();
  const formData = await req.formData();
  const files = formData.getAll('files') as File[];
  const labName = formData.get('labName') as string || '';
  const techName = formData.get('techName') as string || '';
  const notes = formData.get('notes') as string || '';

  const { data: order } = await sb.from('lab_orders').select('*').eq('qr_token', params.token).maybeSingle();
  if (!order) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
  if (new Date(order.qr_expires_at) < new Date()) return NextResponse.json({ error: 'Link expired' }, { status: 410 });

  const BUCKET = 'lab-results';
  const fileUrls: string[] = [];
  for (const file of files) {
    const ext = file.name.split('.').pop() || 'pdf';
    const path = `${order.clinic_id || 'general'}/${order.mr_number}/${order.id}_${Date.now()}.${ext}`;
    const buf = await file.arrayBuffer();
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: true });
    if (!upErr) {
      const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(path);
      fileUrls.push(urlData.publicUrl);
    }
  }

  // Save to lab_results — this is what both patient tab and patient portal read
  const { error } = await sb.from('lab_results').insert([{
    mr_number: order.mr_number,
    child_name: order.child_name || order.patient_name,
    clinic_id: order.clinic_id,
    order_id: order.id,
    test_name: (order.tests || []).map((t: any) => t.name || t).join(', '),
    lab_name: labName,
    technician_name: techName,
    notes: notes || null,
    file_urls: fileUrls,
    result_type: order.order_type || 'lab',
    visit_date: new Date().toISOString().split('T')[0],
    uploaded_at: new Date().toISOString(),
    has_abnormal: false,
  }]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update order status to completed
  await sb.from('lab_orders').update({
    status: 'completed', lab_name: labName, technician_name: techName,
  }).eq('id', order.id);

  // Notify doctor
  await sb.from('notifications').insert([{
    clinic_id: order.clinic_id,
    type: 'lab_result',
    title: '🔬 Lab Results Received',
    message: `Results for ${order.child_name || order.patient_name} (MR# ${order.mr_number}) uploaded by ${labName || 'Lab'}`,
    is_read: false,
  }]).catch(() => {});

  return NextResponse.json({ ok: true });
}
