import { fetchAppointmentsFromSheet } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';

export const revalidate = 60;

export default async function RemindersPage() {
  const data       = await fetchAppointmentsFromSheet();
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || 'MediPlex Pediatric Clinic';
  const { createClient } = await import('@supabase/supabase-js');
  const sb2 = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {auth:{persistSession:false}});
  const { data: cs2 } = await sb2.from('clinic_settings').select('doctor_name,clinic_name').eq('id',1).maybeSingle();
  const doctorName = cs2?.doctor_name || process.env.NEXT_PUBLIC_DOCTOR_NAME || 'Doctor';
  const clinicName2 = cs2?.clinic_name || process.env.NEXT_PUBLIC_CLINIC_NAME || 'MediPlex';

  const { default: RemindersClient } = await import('./RemindersClient');

  return (
    <>
      <Topbar title="WhatsApp Reminders" subtitle="Send appointment reminders and follow-ups" />
      <main className="flex-1 p-8">
        <RemindersClient data={data} clinicName={clinicName2} doctorName={doctorName} />
      </main>
    </>
  );
}
