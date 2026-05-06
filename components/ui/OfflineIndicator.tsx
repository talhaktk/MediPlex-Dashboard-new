'use client';

import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { getSyncMeta }     from '@/lib/offlineDb';
import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [visible,  setVisible]  = useState(false);
  const [syncing,  setSyncing]  = useState(false);

  useEffect(() => {
    getSyncMeta('last_sync').then((ts: string | null) => {
      if (ts) setLastSync(new Date(ts));
    });
  }, [online]);

  // Show banner when offline; briefly when coming back online
  useEffect(() => {
    if (!online) { setVisible(true); return; }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, [online]);

  const formatSince = (d: Date) => {
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ago`;
  };

  const handleForceSync = () => {
    setSyncing(true);
    window.dispatchEvent(new CustomEvent('mediplex-force-sync'));
    setTimeout(() => setSyncing(false), 2500);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-lg transition-all"
      style={{
        background: online ? '#0a1628' : '#7f1d1d',
        border:     online ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(239,68,68,0.5)',
        color:      '#fff',
        minWidth:   '220px',
        justifyContent: 'center',
      }}
    >
      {online ? (
        <>
          <Wifi size={13} className="text-emerald-400 flex-shrink-0" />
          <span className="text-[12px] font-medium">Back online</span>
          {lastSync && (
            <span className="text-[11px] text-white/50">· synced {formatSince(lastSync)}</span>
          )}
        </>
      ) : (
        <>
          <WifiOff size={13} className="text-red-300 flex-shrink-0" />
          <div>
            <span className="text-[12px] font-medium">Offline mode</span>
            {lastSync && (
              <span className="text-[11px] text-white/50 ml-1.5">· cached {formatSince(lastSync)}</span>
            )}
          </div>
          <button
            onClick={handleForceSync}
            className="ml-1 p-1 rounded-lg hover:bg-white/10 transition-all flex-shrink-0"
            title="Retry connection"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
          </button>
        </>
      )}
    </div>
  );
}
