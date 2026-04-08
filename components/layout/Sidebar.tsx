'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, CalendarDays, Users, BarChart3,
  Calendar, Settings, LogOut,
} from 'lucide-react';

const navItems = [
  { label: 'Overview',     href: '/dashboard',              icon: LayoutDashboard, roles: ['admin','doctor','receptionist'] },
  { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarDays,    roles: ['admin','doctor','receptionist'] },
  { label: 'Patients',     href: '/dashboard/patients',     icon: Users,           roles: ['admin','doctor'] },
  { label: 'Analytics',    href: '/dashboard/analytics',    icon: BarChart3,       roles: ['admin','doctor'] },
  { label: 'Calendar',     href: '/dashboard/calendar',     icon: Calendar,        roles: ['admin','doctor','receptionist'] },
  { label: 'Settings',     href: '/dashboard/settings',     icon: Settings,        roles: ['admin'] },
];

const ROLE_COLOR: Record<string, string> = {
  admin:        '#c9a84c',
  doctor:       '#1a7f5e',
  receptionist: '#2b6cb0',
};

const ROLE_LABEL: Record<string, string> = {
  admin:        'Admin',
  doctor:       'Doctor',
  receptionist: 'Receptionist',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { data: session } = useSession();

  const user     = session?.user as { name?: string; email?: string; role?: string; initials?: string } | undefined;
  const role     = (user?.role || 'admin') as string; // default admin so nav always shows
  const initials = user?.initials || user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'DR';
  const name     = user?.name || 'Dr. Talha';

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const visibleNav = navItems.filter(item => item.roles.includes(role));

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

      {/* User card */}
      <div className="mx-4 mt-4 mb-2 rounded-xl p-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-navy font-semibold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c87a)' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-white text-[13px] font-medium truncate">{name}</div>
            <div className="text-[10px] truncate" style={{ color: ROLE_COLOR[role] || '#c9a84c' }}>
              {role === 'admin' ? 'Pediatrician · ' : ''}{ROLE_LABEL[role] || 'Staff'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 overflow-y-auto">
        <div className="text-[10px] text-white/25 tracking-widest uppercase px-3 mb-2 font-medium">
          Main Menu
        </div>
        <ul className="space-y-0.5">
          {visibleNav.map(({ label, href, icon: Icon }) => {
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
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-white/5 pt-3">
        <div className="text-[10px] text-white/20 text-center px-3 mb-3">
          {process.env.NEXT_PUBLIC_CLINIC_NAME || 'MediPlex Pediatric Clinic'}<br />
          {process.env.NEXT_PUBLIC_CLINIC_ADDRESS || 'New York, NY · USA'}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-white/40 hover:text-red-400 hover:bg-white/5 transition-all w-full">
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
