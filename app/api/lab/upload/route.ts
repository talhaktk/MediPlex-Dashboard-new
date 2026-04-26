import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const REFERENCE_RANGES: Record<string, { low: number; high: number; critLow?: number; critHigh?: number; unit: string }> = {
  // CBC
  'Hemoglobin':           { low: 11.5, high: 16.5, critLow: 7,    critHigh: 20,  unit: 'g/dL' },
  'Hb':                   { low: 11.5, high: 16.5, critLow: 7,    critHigh: 20,  unit: 'g/dL' },
  'WBC':                  { low: 4.5,  high: 11.0, critLow: 2,    critHigh: 30,  unit: 'x10³/μL' },
  'Platelets':            { low: 150,  high: 400,  critLow: 50,   critHigh: 1000,unit: 'x10³/μL' },
  'Hematocrit':           { low: 35,   high: 50,   unit: '%' },
  'MCV':                  { low: 80,   high: 100,  unit: 'fL' },
  'MCH':                  { low: 27,   high: 33,   unit: 'pg' },
  'MCHC':                 { low: 32,   high: 36,   unit: 'g/dL' },
  'Neutrophils':          { low: 40,   high: 75,   unit: '%' },
  'Lymphocytes':          { low: 20,   high: 45,   unit: '%' },
  'Eosinophils':          { low: 1,    high: 6,    unit: '%' },
  'Monocytes':            { low: 2,    high: 10,   unit: '%' },
  // LFT
  'ALT':                  { low: 7,    high: 56,   critHigh: 200, unit: 'U/L' },
  'SGPT':                 { low: 7,    high: 56,   critHigh: 200, unit: 'U/L' },
  'AST':                  { low: 10,   high: 40,   critHigh: 200, unit: 'U/L' },
  'SGOT':                 { low: 10,   high: 40,   critHigh: 200, unit: 'U/L' },
  'ALP':                  { low: 44,   high: 147,  unit: 'U/L' },
  'GGT':                  { low: 9,    high: 48,   unit: 'U/L' },
  'Total Bilirubin':      { low: 0.2,  high: 1.2,  critHigh: 5,   unit: 'mg/dL' },
  'Direct Bilirubin':     { low: 0,    high: 0.3,  unit: 'mg/dL' },
  'Albumin':              { low: 3.5,  high: 5.0,  unit: 'g/dL' },
  'Total Protein':        { low: 6.0,  high: 8.3,  unit: 'g/dL' },
  // RFT
  'Creatinine':           { low: 0.6,  high: 1.2,  critHigh: 10,  unit: 'mg/dL' },
  'BUN':                  { low: 7,    high: 20,   critHigh: 100, unit: 'mg/dL' },
  'Urea':                 { low: 15,   high: 45,   unit: 'mg/dL' },
  'Uric Acid':            { low: 3.5,  high: 7.2,  unit: 'mg/dL' },
  'eGFR':                 { low: 60,   high: 120,  critLow: 15,   unit: 'mL/min' },
  // Blood Sugar
  'Fasting Blood Sugar':  { low: 70,   high: 100,  critLow: 50,   critHigh: 400, unit: 'mg/dL' },
  'FBS':                  { low: 70,   high: 100,  critLow: 50,   critHigh: 400, unit: 'mg/dL' },
  'RBS':                  { low: 70,   high: 140,  critLow: 50,   critHigh: 500, unit: 'mg/dL' },
  'Random Blood Sugar':   { low: 70,   high: 140,  critLow: 50,   critHigh: 500, unit: 'mg/dL' },
  'HbA1c':               { low: 4,    high: 5.7,  critHigh: 14,  unit: '%' },
  'PPBS':                 { low: 70,   high: 140,  unit: 'mg/dL' },
  // Lipids
  'Total Cholesterol':    { low: 0,    high: 200,  critHigh: 300, unit: 'mg/dL' },
  'LDL':                  { low: 0,    high: 130,  critHigh: 190, unit: 'mg/dL' },
  'HDL':                  { low: 40,   high: 999,  unit: 'mg/dL' },
  'Triglycerides':        { low: 0,    high: 150,  critHigh: 500, unit: 'mg/dL' },
  // Electrolytes
  'Sodium':               { low: 136,  high: 145,  critLow: 120,  critHigh: 160, unit: 'mEq/L' },
  'Potassium':            { low: 3.5,  high: 5.0,  critLow: 2.5,  critHigh: 6.5, unit: 'mEq/L' },
  'Chloride':             { low: 98,   high: 107,  unit: 'mEq/L' },
  'Bicarbonate':          { low: 22,   high: 29,   unit: 'mEq/L' },
  'Calcium':              { low: 8.5,  high: 10.5, critLow: 6,    critHigh: 13,  unit: 'mg/dL' },
  'Magnesium':            { low: 1.7,  high: 2.2,  critLow: 1.0,  critHigh: 4.0, unit: 'mg/dL' },
  'Phosphorus':           { low: 2.5,  high: 4.5,  unit: 'mg/dL' },
  // Thyroid
  'TSH':                  { low: 0.4,  high: 4.0,  unit: 'mIU/L' },
  'T3':                   { low: 80,   high: 200,  unit: 'ng/dL' },
  'T4':                   { low: 5.0,  high: 12.0, unit: 'μg/dL' },
  'Free T4':              { low: 0.8,  high: 1.8,  unit: 'ng/dL' },
  'Free T3':              { low: 2.3,  high: 4.2,  unit: 'pg/mL' },
  // Iron
  'Serum Iron':           { low: 60,   high: 170,  unit: 'μg/dL' },
  'TIBC':                 { low: 240,  high: 450,  unit: 'μg/dL' },
  'Ferritin':             { low: 12,   high: 300,  unit: 'ng/mL' },
  // Inflammation
  'CRP':                  { low: 0,    high: 5,    critHigh: 100, unit: 'mg/L' },
  'ESR':                  { low: 0,    high: 20,   unit: 'mm/hr' },
  // Coagulation
  'PT':                   { low: 11,   high: 13.5, critHigh: 30,  unit: 'sec' },
  'INR':                  { low: 0.8,  high: 1.2,  critHigh: 5,   unit: '' },
  'APTT':                 { low: 25,   high: 35,   unit: 'sec' },
  // Cardiac
  'Troponin I':           { low: 0,    high: 0.04, critHigh: 2,   unit: 'ng/mL' },
  'CK-MB':                { low: 0,    high: 25,   critHigh: 100, unit: 'U/L' },
  // Vitamins
  'Vitamin D':            { low: 30,   high: 100,  critLow: 10,   unit: 'ng/mL' },
  'Vitamin B12':          { low: 200,  high: 900,  unit: 'pg/mL' },
  'Folate':               { low: 3,    high: 20,   unit: 'ng/mL' },
  // Urine
  'Urine Protein':        { low: 0,    high: 150,  unit: 'mg/day' },
  'Urine Creatinine':     { low: 500,  high: 2000, unit: 'mg/day' },
  // Pediatric extras
  'Lead':                 { low: 0,    high: 5,    critHigh: 45,  unit: 'μg/dL' },
  'IgE':                  { low: 0,    high: 100,  unit: 'IU/mL' },
};

function getFlag(testName: string, value: number): { flag: string; refLow?: number; refHigh?: number } {
  const norm = testName.trim();
  const ref = REFERENCE_RANGES[norm];
  if (!ref) return { flag: 'normal' };

  if (ref.critLow !== undefined && value < ref.critLow) return { flag: 'critical_low',  refLow: ref.low, refHigh: ref.high };
  if (ref.critHigh !== undefined && value > ref.critHigh) return { flag: 'critical_high', refLow: ref.low, refHigh: ref.high };
  if (value < ref.low)  return { flag: 'low',  refLow: ref.low, refHigh: ref.high };
  if (value > ref.high) return { flag: 'high', refLow: ref.low, refHigh: ref.high };
  return { flag: 'normal', refLow: ref.low, refHigh: ref.high };
}

// GET — verify token and return order info (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const sb = getAdmin();
  const { data: order, error } = await sb
    .from('lab_orders')
    .select('id,patient_name,dob,order_type,tests,clinical_notes,qr_expires_at,status,mr_number')
    .eq('qr_token', token)
    .maybeSingle();

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (new Date(order.qr_expires_at) < new Date()) return NextResponse.json({ error: 'QR code has expired' }, { status: 410 });

  // Return order info without dob (used for verification on client)
  return NextResponse.json({
    ok: true,
    orderId:      order.id,
    patientName:  order.patient_name,
    orderType:    order.order_type,
    tests:        order.tests,
    clinicalNotes:order.clinical_notes,
    status:       order.status,
    expiresAt:    order.qr_expires_at,
    hasDob:       !!order.dob,
  });
}

// POST — verify DOB, then process upload
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const token      = formData.get('token') as string;
  const dobInput   = formData.get('dob') as string;       // YYYY-MM-DD
  const resultJson = formData.get('results') as string;   // JSON array of {testName, value, unit}
  const reportText = formData.get('reportText') as string | null;
  const files      = formData.getAll('files') as File[];

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const sb = getAdmin();
  const { data: order, error } = await sb
    .from('lab_orders')
    .select('*')
    .eq('qr_token', token)
    .maybeSingle();

  if (error || !order) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
  if (new Date(order.qr_expires_at) < new Date()) return NextResponse.json({ error: 'QR code has expired' }, { status: 410 });

  // DOB verification (if dob set on order)
  if (order.dob) {
    if (!dobInput) return NextResponse.json({ error: 'Date of birth required for verification' }, { status: 403 });
    const norm = (s: string) => s.replace(/-/g, '');
    if (norm(order.dob) !== norm(dobInput)) {
      return NextResponse.json({ error: 'Date of birth does not match. Please check with your clinic.' }, { status: 403 });
    }
  }

  // Upload files to Supabase Storage
  const uploadedUrls: string[] = [];
  for (const file of files) {
    const ext  = (file.name.split('.').pop() || 'bin').toLowerCase();
    const path = `${order.mr_number}/${order.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buf  = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await sb.storage.from('lab-results').upload(path, buf, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });
    if (!upErr) {
      const { data: pub } = sb.storage.from('lab-results').getPublicUrl(path);
      if (pub?.publicUrl) uploadedUrls.push(pub.publicUrl);
    }
  }

  // Parse result values and flag abnormals
  let resultValues: any[] = [];
  let hasAbnormal = false;
  if (resultJson) {
    try {
      const rows: { testName: string; value: string; unit?: string }[] = JSON.parse(resultJson);
      resultValues = rows.map(r => {
        const numVal = parseFloat(r.value);
        const flagInfo = !isNaN(numVal) ? getFlag(r.testName, numVal) : { flag: 'normal' };
        if (['high', 'low', 'critical_high', 'critical_low'].includes(flagInfo.flag)) hasAbnormal = true;
        return {
          order_id:    order.id,
          clinic_id:   order.clinic_id,
          mr_number:   order.mr_number,
          test_name:   r.testName,
          value:       isNaN(numVal) ? null : numVal,
          value_text:  r.value,
          unit:        r.unit || REFERENCE_RANGES[r.testName]?.unit || '',
          reference_low:  flagInfo.refLow  ?? null,
          reference_high: flagInfo.refHigh ?? null,
          flag:        flagInfo.flag,
        };
      });
      if (resultValues.length > 0) {
        await sb.from('lab_result_values').insert(resultValues);
      }
    } catch {}
  }

  // Insert into existing lab_results table for backward compat (AI Scribe, patient portal)
  await sb.from('lab_results').insert([{
    mr_number:          order.mr_number,
    child_name:         order.patient_name,
    visit_date:         new Date().toISOString().split('T')[0],
    test_name:          order.order_type === 'radiology' ? `Radiology: ${(order.tests as any[]).map((t: any) => t.name).join(', ')}` : (order.tests as any[]).map((t: any) => t.name).join(', '),
    notes:              reportText || (resultValues.length ? resultValues.map(r => `${r.test_name}: ${r.value_text} ${r.unit}`.trim()).join(' | ') : ''),
    file_urls:          uploadedUrls,
    order_id:           order.id,
    radiologist_report: reportText || null,
    has_abnormal:       hasAbnormal,
  }]);

  // Mark order as complete/partial
  await sb.from('lab_orders').update({ status: 'complete' }).eq('id', order.id);

  // Notify doctor
  if (order.clinic_id) {
    const flagText = hasAbnormal ? ' ⚠️ Abnormal values detected' : '';
    await sb.from('notifications').insert([{
      clinic_id: order.clinic_id,
      type:      'lab_result',
      title:     `📋 Lab Results Received${flagText}`,
      body:      `Results for ${order.patient_name} (${order.mr_number}) have been uploaded.${flagText}`,
    }]);
  }

  return NextResponse.json({ ok: true, filesUploaded: uploadedUrls.length, resultValues: resultValues.length, hasAbnormal });
}
