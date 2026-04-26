'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, CalendarDays, Pill, FlaskConical,
  MessageSquare, LogOut, User, ChevronDown
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { href: '/patient/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/patient/appointments',  label: 'Appointments',  icon: CalendarDays    },
  { href: '/patient/prescriptions', label: 'Prescriptions', icon: Pill            },
  { href: '/patient/labs',          label: 'Lab Results',   icon: FlaskConical    },
  { href: '/patient/messages',      label: 'Messages',      icon: MessageSquare   },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router   = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const user = session?.user as any;
  const name = user?.patientName || user?.name || 'Patient';
  const mr   = user?.mrNumber || '';

  // Register page has its own layout (no nav needed)
  if (pathname === '/patient/register') return <>{children}</>;

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f8' }}>

      {/* Top navbar */}
      <nav className="sticky top-0 z-50 shadow-sm"
        style={{ background: '#0a1628', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
              <span className="text-[#0a1628] font-bold text-sm">M+</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-semibold text-sm">MediPlex</span>
              <span className="text-white/40 text-xs ml-1.5">Patient Portal</span>
            </div>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <button key={item.href} onClick={() => router.push(item.href)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                  style={{
                    background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
                    color: active ? '#c9a84c' : 'rgba(255,255,255,0.55)',
                  }}>
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* User menu */}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-white text-[12px] font-medium leading-none">{name}</div>
                {mr && <div className="text-white/40 text-[10px] mt-0.5">{mr}</div>}
              </div>
              <ChevronDown size={13} className="text-white/40" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl shadow-xl z-50 overflow-hidden"
                style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="text-white text-[12px] font-medium">{name}</div>
                  {mr && <div className="text-white/40 text-[11px]">MR: {mr}</div>}
                </div>
                <button onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/login' }); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors">
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex border-t overflow-x-auto px-2 pb-2 pt-1 gap-1 no-scrollbar"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {NAV.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <button key={item.href} onClick={() => router.push(item.href)}
                className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                style={{ color: active ? '#c9a84c' : 'rgba(255,255,255,0.45)', background: active ? 'rgba(201,168,76,0.12)' : 'transparent' }}>
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Click outside to close menu */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
    </div>
  );
}
