import { redirect } from 'next/navigation';
import { fetchAppointmentsFromDb } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import PrescriptionClient from './PrescriptionClient';

export const revalidate = 60;

const ALLOWED = ['super_admin','doctor_admin','admin','doctor'];

export default async function PrescriptionPage() {
  const { createClient } = await import('@supabase/supabase-js');
  const sb3 = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {auth:{persistSession:false}});
  const { data: cs3 } = await sb3.from('clinic_settings').select('doctor_name,clinic_name,clinic_phone,clinic_address').eq('id',1).maybeSingle();
  const session = await getServerSession(authOptions);
  const role    = (session?.user as any)?.role;
  const clinicId = (session?.user as any)?.clinicId || null;
  if (!ALLOWED.includes(role)) redirect('/dashboard');
  const data = await fetchAppointmentsFromDb(clinicId);
  return (
    <>
      <Topbar title="Prescription Pad" subtitle="Write and print digital prescriptions" />
      <main className="flex-1 p-8">
        <PrescriptionClient
          data={data}
          clinicName={cs3?.clinic_name || process.env.NEXT_PUBLIC_CLINIC_NAME || 'My Clinic'}
          doctorName={cs3?.doctor_name || process.env.NEXT_PUBLIC_DOCTOR_NAME || 'Doctor'}
          clinicPhone={process.env.NEXT_PUBLIC_CLINIC_PHONE || ''}
          clinicAddress={process.env.NEXT_PUBLIC_CLINIC_ADDRESS || ''}
        />
      </main>
    </>
  );
}
