import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import WisprVoicePlugin from '@/components/WisprVoicePlugin';
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
        <WisprVoicePlugin/>
        <footer className="px-8 py-3 text-center border-t border-black/5">
          <span className="text-[11px] text-gray-400">Powered by </span>
          <a href="https://mediplex.io" target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-semibold text-gold hover:underline">MediPlex</a>
          <span className="text-[11px] text-gray-400"> — AI for Smart Healthcare</span>
        </footer>
      </div>
    </div>
    </ClinicProvider>
  );
}
