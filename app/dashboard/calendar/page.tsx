import { fetchAppointmentsFromDb } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import CalendarClient from './CalendarClient';

export const revalidate = 30;

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  const clinicId = (session?.user as any)?.clinicId || null;
  const data = await fetchAppointmentsFromDb(clinicId);
  return (
    <>
      <Topbar title="Calendar" subtitle="Schedule & manage appointments"/>
      <main className="flex-1 p-8">
        <CalendarClient data={data}/>
      </main>
    </>
  );
}
