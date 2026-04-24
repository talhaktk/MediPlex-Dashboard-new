import { redirect } from 'next/navigation';
import { fetchAppointmentsFromDb } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import ScribeClient from './ScribeClient';

export const revalidate = 60;

const ALLOWED = ['super_admin','doctor_admin','admin','doctor'];

export default async function ScribePage() {
  const session = await getServerSession(authOptions);
  const role    = (session?.user as any)?.role;
  const clinicId = (session?.user as any)?.clinicId || null;
  if (!ALLOWED.includes(role)) redirect('/dashboard');
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
