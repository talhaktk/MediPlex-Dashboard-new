import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import { ClinicProvider } from '@/lib/clinicContext';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <ClinicProvider>
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="main-content flex-1 flex flex-col">
        {children}
      </div>
    </div>
    </ClinicProvider>
  );
}
