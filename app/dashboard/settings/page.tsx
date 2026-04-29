import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import SettingsPageNew from '@/components/ui/SettingsPageNew';

export const revalidate = 0;

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const user = session.user as any;
  if (!['super_admin','doctor_admin','admin'].includes(user?.role||'')) redirect('/dashboard');
  return (
    <>
      <Topbar title="Settings" subtitle="Clinic configuration and management"/>
      <main className="flex-1 p-8">
        <SettingsPageNew/>
      </main>
    </>
  );
}
