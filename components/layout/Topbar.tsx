'use client';

import { Bell, RefreshCw, Menu } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from 'next-auth/react';

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [now, setNow] = useState(new Date());
  const { data: session } = useSession();
  const clinicId = (session?.user as any)?.clinicId;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [doctorName, setDoctorName] = useState('Doctor');
  const [initials, setInitials] = useState('DR');
  const [refreshing, setRefreshing] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Karachi');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!clinicId) return;
    const fetchNotifs = () => {
      supabase.from('notifications').select('*').eq('clinic_id', clinicId).eq('is_read', false)
        .order('created_at', { ascending: false }).limit(10)
        .then(({ data }) => setNotifications(data || []));
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, [clinicId]);

  useEffect(() => {
    supabase.from('clinic_settings').select('doctor_name').eq('id', 1).maybeSingle()
      .then(({ data }) => {
        if (data?.doctor_name) {
          setDoctorName(data.doctor_name);
          const parts = data.doctor_name.replace(/^Dr\.?\s*/i, '').split(' ');
          setInitials(parts.map((p: string) => p[0] || '').join('').toUpperCase().slice(0, 2) || 'DR');
        }
      });
  }, []);

  useEffect(() => {
    if (!clinicId) return;
    supabase.from('clinic_settings').select('timezone').eq('clinic_id', clinicId).maybeSingle()
      .then(({ data }) => { if (data?.timezone) setTimezone(data.timezone); });
  }, [clinicId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: number) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllRead = async () => {
    if (!clinicId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('clinic_id', clinicId);
    setNotifications([]);
    setShowNotifs(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); window.location.reload(); }, 800);
  };

  return (
    <header className="h-16 bg-white border-b border-black/5 flex items-center px-4 md:px-8 gap-3 md:gap-4 sticky top-0 z-30">
      {/* Hamburger — mobile only */}
      <button
        className="show-mobile-only w-8 h-8 rounded-lg flex items-center justify-center text-navy hover:bg-gray-100 transition-all flex-shrink-0"
        onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="font-display font-semibold text-navy text-[17px] leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-gray-400 font-light mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-[12px] text-gray-400 font-light hidden md:block">
          {now.toLocaleString("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })} {new Intl.DateTimeFormat('en-US',{timeZoneName:'short',timeZone:timezone}).formatToParts(now).find(p=>p.type==='timeZoneName')?.value||''}
        </div>

        <button
          onClick={handleRefresh}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-navy hover:bg-gray-100 transition-all"
          title="Refresh data"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-navy hover:bg-gray-100 transition-all relative"
          >
            <Bell size={14} />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-lg border border-black/5 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/5">
                <span className="text-[12px] font-semibold text-navy">Notifications</span>
                {notifications.length > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-gold hover:underline">Mark all read</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px] text-gray-400">No new notifications</div>
              ) : (
                <ul className="max-h-64 overflow-y-auto divide-y divide-black/5">
                  {notifications.map(n => (
                    <li key={n.id} className="px-4 py-2.5 flex items-start gap-2 hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="text-[12px] text-navy font-medium">{n.title}</p>
                        <p className="text-[11px] text-gray-400">{n.body}</p>
                      </div>
                      <button onClick={() => markRead(n.id)} className="text-[10px] text-gold hover:underline mt-0.5 flex-shrink-0">Dismiss</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-200 hidden md:block" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-navy text-[12px] font-semibold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c87a)' }}>
            {initials}
          </div>
          <div className="hidden md:block">
            <div className="text-[12px] font-medium text-navy">{doctorName}</div>
            <div className="text-[10px] text-gray-400">Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
