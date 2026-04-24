'use client';
import React from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LayoutDashboard, CalendarDays, Users, BarChart3, Calendar, Settings, LogOut, Receipt, MessageCircle, FileText, Stethoscope, Bot } from 'lucide-react';
import { Star as StarIcon } from 'lucide-react';
import { FolderOpen } from 'lucide-react';

// Role-based navigation
const ALL_NAV = [
  { label:'Overview',       href:'/dashboard',              icon:LayoutDashboard, roles:['super_admin','org_owner','doctor_admin','admin','doctor','receptionist'] },
  { label:'Appointments',   href:'/dashboard/appointments', icon:CalendarDays,    roles:['super_admin','org_owner','doctor_admin','admin','doctor','receptionist'] },
  { label:'Calendar',       href:'/dashboard/calendar',     icon:Calendar,        roles:['super_admin','org_owner','doctor_admin','admin','doctor','receptionist'] },
  { label:'Patients',       href:'/dashboard/patients',     icon:Users,           roles:['super_admin','doctor_admin','admin','doctor'] },
  { label:'Patient Portal', href:'/dashboard/portal',       icon:FolderOpen,      roles:['super_admin','doctor_admin','admin','doctor'] },
  { label:'Prescription',   href:'/dashboard/prescription', icon:FileText,        roles:['super_admin','doctor_admin','doctor'] },
  { label:'Clinical',       href:'/dashboard/clinical',     icon:Stethoscope,     roles:['super_admin','doctor_admin','doctor'] },
  { label:'AI Scribe',      href:'/dashboard/scribe',       icon:Bot,             roles:['super_admin','doctor_admin','doctor'] },
  { label:'Telehealth',     href:'/dashboard/telehealth',   icon:MessageCircle,   roles:['super_admin','doctor_admin','doctor','receptionist'] },
  { label:'Billing',        href:'/dashboard/billing',      icon:Receipt,         roles:['super_admin','org_owner','doctor_admin','admin','receptionist'] },
  { label:'Reminders',      href:'/dashboard/reminders',    icon:MessageCircle,   roles:['super_admin','org_owner','doctor_admin','admin','doctor','receptionist'] },
  { label:'Analytics',      href:'/dashboard/analytics',    icon:BarChart3,       roles:['super_admin','org_owner','doctor_admin','admin','doctor'] },
  { label:'Feedback',       href:'/dashboard/feedback',     icon:StarIcon,        roles:['super_admin','org_owner','doctor_admin','admin','doctor'] },
  { label:'Settings',       href:'/dashboard/settings',     icon:Settings,        roles:['super_admin','doctor_admin','admin'] },
];

export default function Sidebar() {
  const [clinicName, setClinicName] = React.useState('');
  const [doctorName, setDoctorName] = React.useState('');
  const [speciality, setSpeciality] = React.useState('');

  const fetchSettings = React.useCallback(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('clinic_settings').select('clinic_name,doctor_name,speciality').eq('id',1).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setClinicName(data.clinic_name || '');
            setDoctorName(data.doctor_name || '');
            setSpeciality(data.speciality || '');
          }
        });
    });
  }, []);

  React.useEffect(() => {
    fetchSettings();
    // Refetch when settings are saved
    window.addEventListener('clinic-settings-saved', fetchSettings);
    return () => window.removeEventListener('clinic-settings-saved', fetchSettings);
  }, [fetchSettings]);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as { name?: string; role?: string; initials?: string } | undefined;
  const name = user?.name || doctorName || 'Doctor';
  const role = user?.role ?? 'admin';
  const { modules } = useClinic();
  const dbInitials = (doctorName || name).replace(/^Dr\.?\s*/i,'').split(' ').map((n:string) => n[0]||'').join('').toUpperCase().slice(0,2) || 'DR';
  const initials = user?.initials ?? dbInitials;
  const roleLabel = role === 'admin' ? 'Admin' : role === 'doctor' ? 'Doctor' : role === 'receptionist' ? 'Receptionist' : 'Staff';
  const roleColor = role === 'admin' ? '#c9a84c' : role === 'doctor' ? '#1a7f5e' : '#2b6cb0';
  const handleSignOut = async () => { await signOut({ redirect: false }); router.push('/login'); };
  return (
    <aside className="sidebar">
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-navy font-bold text-sm flex-shrink-0" style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>M+</div>
          <div>
            <div className="text-white font-display font-semibold text-[15px] leading-tight tracking-wide">MediPlex</div>
            {doctorName && <div className="text-[11px] mt-0.5" style={{color:'#c9a84c'}}>{doctorName}</div>}
            {clinicName && <div className="text-[10px] text-white/50">{clinicName}</div>}
            {speciality && <div className="text-gold text-[10px] tracking-widest uppercase font-light mt-0.5">{speciality}</div>}
          </div>
        </div>
      </div>
      <div className="mx-4 mt-4 mb-2 rounded-xl p-3" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(201,168,76,0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-navy font-semibold text-sm flex-shrink-0" style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>{initials}</div>
          <div className="min-w-0">
            <div className="text-white text-[13px] font-medium truncate">{name}</div>
            <div className="text-[10px] truncate" style={{ color:roleColor }}>{roleLabel}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 pt-2 overflow-y-auto">
        <div className="text-[10px] text-white/25 tracking-widest uppercase px-3 mb-2 font-medium">Main Menu</div>
        <ul className="space-y-0.5">
          {ALL_NAV.filter(n => n.roles.includes(role || 'receptionist')).filter(n => {
              if (n.href==='/dashboard/scribe' && modules.ai_scribe===false) return false;
              if (n.href==='/dashboard/telehealth' && modules.telehealth===false) return false;
              if (n.href==='/dashboard/feedback' && modules.feedback===false) return false;
              return true;
            }).map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 ${active ? 'bg-white/10 text-gold font-medium' : 'text-white/55 hover:text-white/85 hover:bg-white/5'}`}>
                  <Icon size={15} className="flex-shrink-0" />
                  {label}
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="px-3 pb-4 border-t border-white/5 pt-3">
        {clinicName && <div className="text-[10px] text-white/20 text-center px-3 mb-3">{clinicName}<br />{speciality}</div>}
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-white/40 hover:text-red-400 hover:bg-white/5 transition-all w-full"><LogOut size={15} />Sign Out</button>
      </div>
    </aside>
  );
}
