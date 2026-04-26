import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import MessagesClient from './MessagesClient';

export const revalidate = 0;

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  const user    = session?.user as any;
  if (!user) redirect('/login');
  return (
    <>
      <Topbar title="Patient Messages" subtitle="Inbox — reply to patient enquiries" />
      <main className="flex-1 p-6 overflow-hidden">
        <MessagesClient clinicId={user.clinicId || null} isSuperAdmin={user.isSuperAdmin || false} />
      </main>
    </>
  );
}
