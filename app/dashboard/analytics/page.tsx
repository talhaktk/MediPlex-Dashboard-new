import { fetchAppointmentsFromDb, computeMonthlyStats, computeReasonStats, computeAgeStats, computeStats } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import AnalyticsClient from './AnalyticsClient';

export const revalidate = 0;

export default async function AnalyticsPage() {
  const data = await fetchAppointmentsFromDb();

  const stats   = computeStats(data);
  const monthly = computeMonthlyStats(data);
  const reasons = computeReasonStats(data);
  const ages    = computeAgeStats(data);

  return (
    <>
      <Topbar title="Analytics" subtitle="Practice performance and patient demographics" />
      <main className="flex-1 p-8">
        <AnalyticsClient
          data={data}
          stats={stats}
          monthly={monthly}
          reasons={reasons}
          ages={ages}
        />
      </main>
    </>
  );
}