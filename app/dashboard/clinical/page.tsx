import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import ClinicalClient from './ClinicalClient';

const ALLOWED = ['super_admin','doctor_admin','admin','doctor'];

export default async function ClinicalPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!ALLOWED.includes(role)) redirect('/dashboard');

  return (
    <>
      <Topbar title="Clinical Support" subtitle="Drug interactions · Dose calculator · BNF/BNFC" />
      <main className="flex-1 p-8">
        <ClinicalClient bnfApiKey={process.env.BNF_API_KEY || ''} />
      </main>
    </>
  );
}
