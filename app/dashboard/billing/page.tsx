import { fetchAppointmentsFromSheet } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import BillingClient from './BillingClient';

export const revalidate = 60;

export default async function BillingPage() {
  const data = await fetchAppointmentsFromSheet();
  return (
    <>
      <Topbar title="Billing" subtitle="Invoices, fee tracking and payment records" />
      <main className="flex-1 p-8">
        <BillingClient data={data} />
      </main>
    </>
  );
}
