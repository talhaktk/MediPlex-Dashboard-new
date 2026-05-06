import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MIGRATION_SQL = `
ALTER TABLE clinic_settings
  ADD COLUMN IF NOT EXISTS accepted_payment_methods  JSONB,
  ADD COLUMN IF NOT EXISTS insurance_providers        JSONB,
  ADD COLUMN IF NOT EXISTS appointment_types          JSONB,
  ADD COLUMN IF NOT EXISTS soap_templates             JSONB,
  ADD COLUMN IF NOT EXISTS referral_templates         JSONB,
  ADD COLUMN IF NOT EXISTS consent_templates          JSONB,
  ADD COLUMN IF NOT EXISTS custom_patient_fields      JSONB,
  ADD COLUMN IF NOT EXISTS whatsapp_reminders         BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_reminders              BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_reminders            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_hours             INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS reminder_message           TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_enabled         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_timeout            INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS whatsapp_api_key           TEXT,
  ADD COLUMN IF NOT EXISTS lab_integration_key        TEXT,
  ADD COLUMN IF NOT EXISTS pharmacy_integration_key   TEXT,
  ADD COLUMN IF NOT EXISTS safepay_key                TEXT,
  ADD COLUMN IF NOT EXISTS safepay_secret             TEXT,
  ADD COLUMN IF NOT EXISTS online_booking             BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS print_mode                 TEXT DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS paper_size                 TEXT DEFAULT 'A4',
  ADD COLUMN IF NOT EXISTS print_font_size            TEXT DEFAULT '12',
  ADD COLUMN IF NOT EXISTS print_margin_top           INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS print_margin_bottom        INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS print_margin_left          INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS print_margin_right         INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS invoice_footer             TEXT,
  ADD COLUMN IF NOT EXISTS doctor_photo_url           TEXT,
  ADD COLUMN IF NOT EXISTS doctor_bio                 TEXT,
  ADD COLUMN IF NOT EXISTS doctor_qualification       TEXT,
  ADD COLUMN IF NOT EXISTS doctor_license             TEXT,
  ADD COLUMN IF NOT EXISTS timezone                   TEXT DEFAULT 'Asia/Karachi',
  ADD COLUMN IF NOT EXISTS tax_percentage             NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_id                     TEXT,
  ADD COLUMN IF NOT EXISTS default_consultation_fee   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_per_slot               INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS whatsapp_number            TEXT,
  ADD COLUMN IF NOT EXISTS clinic_website             TEXT,
  ADD COLUMN IF NOT EXISTS clinic_province            TEXT,
  ADD COLUMN IF NOT EXISTS npi_number                 TEXT,
  ADD COLUMN IF NOT EXISTS doctor_signature_url       TEXT,
  ADD COLUMN IF NOT EXISTS mr_prefix                  TEXT DEFAULT 'MR',
  ADD COLUMN IF NOT EXISTS mr_digits                  INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS morning_start              TEXT DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS morning_end                TEXT DEFAULT '13:00',
  ADD COLUMN IF NOT EXISTS evening_start              TEXT DEFAULT '14:00',
  ADD COLUMN IF NOT EXISTS evening_end                TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS invoice_prefix             TEXT DEFAULT 'INV';

ALTER TABLE lab_orders
  ADD COLUMN IF NOT EXISTS rx_id TEXT;
`;

export async function POST() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({
      ok: false,
      message: 'SUPABASE_SERVICE_ROLE_KEY not set. Run this SQL manually in Supabase SQL Editor:',
      sql: MIGRATION_SQL,
    }, { status: 200 });
  }

  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { persistSession: false } }
    );
    const { error } = await admin.rpc('exec_sql', { sql: MIGRATION_SQL });
    if (error) throw error;
    return NextResponse.json({ ok: true, message: 'Migration applied' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message, sql: MIGRATION_SQL }, { status: 500 });
  }
}
