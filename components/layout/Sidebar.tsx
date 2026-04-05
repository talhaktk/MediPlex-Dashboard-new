'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CalendarDays, Users, BarChart3,
  Calendar, Settings, LogOut, Activity, Bell
} from 'lucide-react';

const navItems = [
  { label: 'Overview',      href: '/dashboard',             icon: LayoutDashboard },
  { label: 'Appointments',  href: '/dashboard/appointments', icon: CalendarDays },
  { label: 'Patients',      href: '/dashboard/patients',     icon: Users },
  { label: 'Analytics',     href: '/dashboard/analytics',    icon: BarChart3 },
  { label: 'Calendar',      href: '/dashboard/calendar',     icon: Calendar },
  { label: 'Settings',      href: '/dashboard/settings',     icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-navy font-bold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c87a)' }}>
            M+
          </div>
          <div>
            <div className="text-white font-display font-semibold text-[15px] leading-tight tracking-wide">
              MediPlex
            </div>
            <div className="text-gold text-[10px] tracking-widest uppercase font-light mt-0.5">
              Pediatric Centre
            </div>
          </div>
        </div>
      </div>

      {/* Doctor card */}
      <div className="mx-4 mt-4 mb-2 rounded-xl p-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-navy font-semibold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c87a)' }}>
            DT
          </div>
          <div className="min-w-0">
            <div className="text-white text-[13px] font-medium truncate">Dr. Talha</div>
            <div className="text-gold text-[10px] truncate">Pediatrician · Admin</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 overflow-y-auto">
        <div className="text-[10px] text-white/25 tracking-widest uppercase px-3 mb-2 font-medium">
          Main Menu
        </div>
        <ul className="space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 ${
                    active
                      ? 'bg-white/10 text-gold font-medium'
                      : 'text-white/55 hover:text-white/85 hover:bg-white/5'
                  }`}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  {label}
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-white/5 pt-3">
        <div className="text-[10px] text-white/20 text-center px-3">
          {process.env.NEXT_PUBLIC_CLINIC_NAME || 'MediPlex Pediatric Clinic'}<br />
          New York, NY · USA
        </div>
        <button className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-white/40 hover:text-white/70 hover:bg-white/5 transition-all w-full">
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
