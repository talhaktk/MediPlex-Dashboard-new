import { supabase } from '@/lib/supabase';
import Topbar from '@/components/layout/Topbar';
import BillingClient from './BillingClient';

export const revalidate = 0; // Set to 0 for real-time data

export default async function BillingPage() {
  // Fetch from Supabase billing table directly
  const { data: billingRecords } = await supabase
    .from('billing')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <>
      <Topbar title="Billing" subtitle="Invoices, fee tracking and payment records" />
      <main className="flex-1 p-8">
<BillingClient data={billingRecords || []} />
      </main>
    </>
  );
}