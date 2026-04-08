import { fetchAppointmentsFromSheet } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import PatientsClient from './PatientsClient';

export const revalidate = 60;

export default async function PatientsPage() {
  const data = await fetchAppointmentsFromSheet();
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
