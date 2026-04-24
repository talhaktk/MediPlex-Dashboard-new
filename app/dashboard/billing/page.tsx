import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Topbar from '@/components/layout/Topbar';
import BillingClient from './BillingClient';

export const revalidate = 0;

const ALLOWED = ['super_admin','org_owner','doctor_admin','doctor','receptionist'];

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const role    = (session?.user as any)?.role;
  const clinicId = (session?.user as any)?.clinicId || null;
  if (!ALLOWED.includes(role)) redirect('/dashboard');

  let q = supabase.from('appointments').select('*').order('appointment_date', { ascending: false });
  if (clinicId && role !== 'super_admin') q = (q as any).eq('clinic_id', clinicId);
  const { data: appointments } = await q;

  return (
    <>
      <Topbar title="Billing" subtitle="Invoices, fee tracking and payment records" />
      <main className="flex-1 p-8">
        <BillingClient data={appointments || []} />
      </main>
    </>
  );
}
