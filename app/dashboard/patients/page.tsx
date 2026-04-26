import { redirect } from 'next/navigation';
import { fetchAppointmentsFromDb } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import PatientsClient from './PatientsClient';

export const revalidate = 0;

const ALLOWED = ['super_admin','doctor_admin','admin','doctor'];

export default async function PatientsPage() {
  const session = await getServerSession(authOptions);
  const role    = (session?.user as any)?.role;
  const clinicId = (session?.user as any)?.clinicId || null;
  if (!ALLOWED.includes(role)) redirect('/dashboard');
  const data = await fetchAppointmentsFromDb(clinicId);
  const uniqueCount = new Set(data.map(a => a.childName.toLowerCase().trim()).filter(Boolean)).size;

  return (
    <>
      <Topbar title="Patients" subtitle={`${uniqueCount} unique patient records`} />
      <main className="flex-1 p-8">
        <PatientsClient data={data} />
      </main>
    </>
  );
}
