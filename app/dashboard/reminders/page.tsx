import { fetchAppointmentsFromDb } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import Topbar from '@/components/layout/Topbar';

export const revalidate = 0;

export default async function RemindersPage() {
  const session = await getServerSession(authOptions);
  const clinicId = (session?.user as any)?.clinicId || null;
  const data = await fetchAppointmentsFromDb(clinicId);

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: cs } = clinicId
    ? await sb.from('clinic_settings').select('doctor_name,clinic_name').eq('clinic_id', clinicId).maybeSingle()
    : { data: null };

  const doctorName = cs?.doctor_name || process.env.NEXT_PUBLIC_DOCTOR_NAME || 'Doctor';
  const clinicName = cs?.clinic_name || process.env.NEXT_PUBLIC_CLINIC_NAME || 'MediPlex';

  const { default: RemindersClient } = await import('./RemindersClient');

  return (
    <>
      <Topbar title="WhatsApp Reminders" subtitle="Send appointment reminders and follow-ups" />
      <main className="flex-1 p-8">
        <RemindersClient data={data} clinicName={clinicName} doctorName={doctorName} />
      </main>
    </>
  );
}
