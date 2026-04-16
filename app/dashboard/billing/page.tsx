import { supabase } from '@/lib/supabase';
import Topbar from '@/components/layout/Topbar';
import BillingClient from './BillingClient';

export const revalidate = 0;

export default async function BillingPage() {
  // BillingClient needs appointments for the invoice picker.
  // It fetches its own invoices internally via Supabase realtime.
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .order('appointment_date', { ascending: false });

  return (
    <>
      <Topbar title="Billing" subtitle="Invoices, fee tracking and payment records" />
      <main className="flex-1 p-8">
        <BillingClient data={appointments || []} />
      </main>
    </>
  );
}