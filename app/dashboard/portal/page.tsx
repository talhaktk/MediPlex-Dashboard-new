import { fetchAppointmentsFromSheet } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import PatientPortalPage from './PatientPortalPage';

export default async function PortalPage() {
  const data = await fetchAppointmentsFromSheet();
  return (
    <>
      <Topbar title="Patient Portal" subtitle="Lab Results · Consent Forms · Documents"/>
      <main className="flex-1 p-8">
        <PatientPortalPage appointments={data}/>
      </main>
    </>
  );
}
