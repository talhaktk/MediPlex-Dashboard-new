import { fetchAppointmentsFromSheet } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import AppointmentsClient from './AppointmentsClient';

export const revalidate = 60;

export default async function AppointmentsPage() {
  const data = await fetchAppointmentsFromSheet();
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
