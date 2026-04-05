'use client';

import { Bell, Search, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); window.location.reload(); }, 800);
  };

  return (
    <header className="h-16 bg-white border-b border-black/5 flex items-center px-8 gap-4 sticky top-0 z-30">
      <div className="flex-1">
        <h1 className="font-display font-semibold text-navy text-[17px] leading-tight">{title}</h1>
        {subtitle && <p className="text-[11px] text-gray-400 font-light mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-[12px] text-gray-400 font-light hidden md:block">
          {format(now, "EEE, MMM d, yyyy · h:mm a")} ET
        </div>

        <button
          onClick={handleRefresh}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-navy hover:bg-gray-100 transition-all"
          title="Refresh data"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>

        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-navy hover:bg-gray-100 transition-all relative">
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold" />
        </button>

        <div className="w-px h-5 bg-gray-200 hidden md:block" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-navy text-[12px] font-semibold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c87a)' }}>
            DT
          </div>
          <div className="hidden md:block">
            <div className="text-[12px] font-medium text-navy">Dr. Talha</div>
            <div className="text-[10px] text-gray-400">Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
