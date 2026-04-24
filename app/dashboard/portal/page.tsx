import { fetchAppointmentsFromDb } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import PatientPortalPage from './PatientPortalPage';

export default async function PortalPage() {
  const session = await getServerSession(authOptions);
  const clinicId = (session?.user as any)?.clinicId || null;
  const data = await fetchAppointmentsFromDb(clinicId);
  return (
    <>
      <Topbar title="Patient Portal" subtitle="Lab Results · Consent Forms · Documents"/>
      <main className="flex-1 p-8">
        <PatientPortalPage appointments={data}/>
      </main>
    </>
  );
}
