import { fetchAppointmentsFromDb } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import CalendarClient from './CalendarClient';

export const revalidate = 30;

export default async function CalendarPage() {
  const data = await fetchAppointmentsFromDb();
  return (
    <>
      <Topbar title="Calendar" subtitle="Schedule & manage appointments"/>
      <main className="flex-1 p-8">
        <CalendarClient data={data}/>
      </main>
    </>
  );
}
