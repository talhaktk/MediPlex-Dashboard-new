import { fetchAppointmentsFromDb } from '@/lib/data'; // Points to the new function you just created
import Topbar from '@/components/layout/Topbar';
import AppointmentsClient from './AppointmentsClient';

// Disable static caching so you see real-time database changes
export const revalidate = 0; 

export default async function AppointmentsPage() {
  // Fetching from Supabase instead of Google Sheets
  const data = await fetchAppointmentsFromDb();

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