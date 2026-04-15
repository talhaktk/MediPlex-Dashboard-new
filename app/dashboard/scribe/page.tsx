import { fetchAppointmentsFromSheet } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import ScribeClient from './ScribeClient';

export const revalidate = 60;

export default async function ScribePage() {
  const data = await fetchAppointmentsFromSheet();
  return (
    <>
      <Topbar title="AI Scribe" subtitle="Clinical documentation powered by AI" />
      <main className="flex-1 p-8">
        <ScribeClient data={data} />
      </main>
    </>
  );
}
