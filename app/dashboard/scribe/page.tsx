import { fetchAppointmentsFromDb } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import ScribeClient from './ScribeClient';

export const revalidate = 60;

export default async function ScribePage() {
  const session = await getServerSession(authOptions);
  const clinicId = (session?.user as any)?.clinicId || null;
  const data = await fetchAppointmentsFromDb(clinicId);
  return (
    <>
      <Topbar title="AI Scribe" subtitle="Clinical documentation powered by AI" />
      <main className="flex-1 p-8">
        <ScribeClient data={data} />
      </main>
    </>
  );
}
