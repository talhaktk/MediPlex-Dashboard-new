import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Script from 'next/script';
import Sidebar from '@/components/layout/Sidebar';
import WisprVoicePlugin from '@/components/WisprVoicePlugin';
import { SessionTimeoutGuard } from '@/components/ui/SessionTimeoutGuard';
import { ClinicProvider } from '@/lib/clinicContext';
import OfflineIndicator   from '@/components/ui/OfflineIndicator';
import OfflineSyncManager from '@/components/ui/OfflineSyncManager';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner';

const CRISP_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || '';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <ClinicProvider>
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="main-content flex-1 flex flex-col">
        <AnnouncementBanner />
        {children}
        <WisprVoicePlugin/>
        <SessionTimeoutGuard/>
        <OfflineSyncManager />
        <OfflineIndicator />
        <footer className="px-8 py-3 text-center border-t border-black/5">
          <span className="text-[11px] text-gray-400">Powered by </span>
          <a href="https://mediplex.io" target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-semibold text-gold hover:underline">MediPlex</a>
          <span className="text-[11px] text-gray-400"> — AI for Smart Healthcare</span>
        </footer>
      </div>
    </div>
    {CRISP_ID && (
      <Script id="crisp-chat" strategy="afterInteractive">{`
        window.$crisp=[];
        window.CRISP_WEBSITE_ID="${CRISP_ID}";
        (function(){
          var d=document,s=d.createElement("script");
          s.src="https://client.crisp.chat/l.js";
          s.async=1;
          d.getElementsByTagName("head")[0].appendChild(s);
        })();
      `}</Script>
    )}
    </ClinicProvider>
  );
}
