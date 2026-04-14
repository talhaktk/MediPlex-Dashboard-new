import { fetchAppointmentsFromDb, computeMonthlyStats, computeReasonStats, computeAgeStats, computeStats } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import AnalyticsClient from './AnalyticsClient';

export const revalidate = 0; 

export default async function AnalyticsPage() {
  const data = await fetchAppointmentsFromDb();
  
  const stats = computeStats(data);
  const monthlyStats = computeMonthlyStats(data);
  const reasonStats = computeReasonStats(data);
  const ageStats = computeAgeStats(data);

  return (
    <>
      <Topbar 
        title="Analytics" 
        subtitle="Practice performance and patient demographics" 
      />
      <main className="flex-1 p-8">
        <AnalyticsClient 
          data={data}
          stats={stats}
          // @ts-ignore
          monthlyStats={monthlyStats}
          // @ts-ignore
          reasonStats={reasonStats}
          // @ts-ignore
          ageStats={ageStats}
        />
      </main>
    </>
  );
}