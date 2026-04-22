import { createClient } from '@supabase/supabase-js';

export interface ClinicSettings {
  clinic_name: string;
  doctor_name: string;
  doctor_qualification: string;
  clinic_phone: string;
  clinic_address: string;
  clinic_email: string;
  whatsapp_number: string;
  speciality: string;
}

const DEFAULT: ClinicSettings = {
  clinic_name: 'My Clinic',
  doctor_name: 'Dr. Name',
  doctor_qualification: 'MBBS, FCPS',
  clinic_phone: '',
  clinic_address: '',
  clinic_email: '',
  whatsapp_number: '',
  speciality: 'Pediatrics',
};

// Cache in memory
let cached: ClinicSettings | null = null;

export async function getClinicSettings(): Promise<ClinicSettings> {
  if (cached) return cached;
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await sb.from('clinic_settings').select('*').eq('id', 1).maybeSingle();
    cached = data ? { ...DEFAULT, ...data } : DEFAULT;
    return cached;
  } catch {
    return DEFAULT;
  }
}

export function clearSettingsCache() { cached = null; }
