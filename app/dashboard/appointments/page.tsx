// Change the import path to match your filename 'sheets'
import { fetchAppointmentsFromDb } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; 
import Topbar from '@/components/layout/Topbar';
import AppointmentsClient from './AppointmentsClient';

export const revalidate = 0; 

export default async function AppointmentsPage() {
  // Use the new function name you created
  const session = await getServerSession(authOptions);
  const clinicId = (session?.user as any)?.clinicId || null;
  const data = await fetchAppointmentsFromDb(clinicId);

  return (
    <>
      <Topbar
        title="Appointments"
        subtitle="Manage all patient appointments"
      />
      <main className="flex-1 p-8">
        <AppointmentsClient data={data} />
      </main>
    </>
  );
}