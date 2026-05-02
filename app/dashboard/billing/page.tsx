import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import Topbar from '@/components/layout/Topbar';
import BillingClient from './BillingClient';

export const revalidate = 0;
const ALLOWED = ['super_admin','org_owner','doctor_admin','doctor','receptionist'];

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const role    = (session?.user as any)?.role;
  const clinicId = (session?.user as any)?.clinicId || null;
  if (!ALLOWED.includes(role)) redirect('/dashboard');

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  let q = sb.from('appointments').select('*').order('appointment_date', { ascending: false });
  if (clinicId && role !== 'super_admin') q = (q as any).eq('clinic_id', clinicId);
  const { data: appointments } = await q;

  const { data: clinicSettings } = clinicId
    ? await sb.from('clinic_settings').select('*').eq('clinic_id', clinicId).maybeSingle()
    : { data: null };

  return (
    <>
      <Topbar title="Billing" subtitle="Invoices, fee tracking and payment records" />
      <main className="flex-1 p-8">
        <BillingClient data={appointments || []} clinicSettings={clinicSettings} />
      </main>
    </>
  );
}
