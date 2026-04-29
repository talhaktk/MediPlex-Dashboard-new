'use client';
import { t, Lang } from '@/lib/translations';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { CalendarDays, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const statusColor: Record<string, { bg: string; color: string; label: string }> = {
  confirmed:    { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: t('Confirmed', lang)   },
  pending:      { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: t('Pending', lang)     },
  completed:    { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6', label: t('Completed', lang)   },
  cancelled:    { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: t('Cancelled', lang)   },
  pending_confirmation: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: 'Awaiting Confirmation' },
};

export default function PatientAppointments() {
  const { data: session } = useSession();
  const user     = session?.user as any;
  const mrNumber = user?.mrNumber;

  const [appointments, setAppointments] = useState<any[]>([]);
  const [tab,          setTab]          = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>('en');
  useEffect(()=>{ const s=localStorage.getItem('patient_lang'); if(s==='ur') setLang('ur'); },[]);

  useEffect(() => {
    if (!mrNumber) return;
    supabase.from('appointments').select('*').eq('mr_number', mrNumber)
      .order('appointment_date', { ascending: false })
      .then(({ data }) => { setAppointments(data || []); setLoading(false); });
  }, [mrNumber]);

  const today    = new Date(); today.setHours(0,0,0,0);
  const upcoming = appointments.filter(a => new Date(a.appointment_date) >= today);
  const past     = appointments.filter(a => new Date(a.appointment_date) < today);
  const shown    = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#0a1628]">My Appointments</h1>
        <p className="text-slate-500 text-sm">Your visit history and upcoming bookings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(10,22,40,0.07)' }}>
        {([
          { id: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { id: 'past',     label: `Past (${past.length})` },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? '#0a1628' : 'transparent',
              color:      tab === t.id ? '#ffffff' : '#64748b',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl" style={{ border:'1px solid #e2e8f0' }}>
          <CalendarDays size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium" dir={lang==='ur'?'rtl':'ltr'}>{t('No upcoming appointments', lang)}</p>
          <p className="text-slate-400 text-sm mt-1" dir={lang==='ur'?'rtl':'ltr'}>{t('Contact your clinic to book an appointment', lang)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(a => {
            const s = statusColor[a.status] || statusColor['pending'];
            const apptDate = new Date(a.appointment_date);
            const isToday = apptDate.toDateString() === new Date().toDateString();
            return (
              <div key={a.id} className="bg-white rounded-2xl p-5"
                style={{ border: isToday ? '2px solid rgba(59,130,246,0.4)' : '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    {/* Date block */}
                    <div className="w-14 text-center flex-shrink-0 rounded-xl py-2"
                      style={{ background: isToday ? 'rgba(59,130,246,0.1)' : '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {apptDate.toLocaleDateString('en-GB',{month:'short'})}
                      </div>
                      <div className="text-2xl font-bold leading-none" style={{ color: isToday ? '#3b82f6' : '#0a1628' }}>
                        {apptDate.getDate()}
                      </div>
                      <div className="text-[10px] text-slate-400">{apptDate.getFullYear()}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#0a1628]">{a.appointment_type || 'Consultation'}</h3>
                        {isToday && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(59,130,246,0.15)', color:'#3b82f6' }}>Today</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                        {a.appointment_time && <span className="flex items-center gap-1"><Clock size={11}/>{a.appointment_time}</span>}
                        {a.doctor_name && <span className="flex items-center gap-1"><User size={11}/>{a.doctor_name}</span>}
                        {a.clinic_name && <span className="flex items-center gap-1"><MapPin size={11}/>{a.clinic_name}</span>}
                      </div>
                      {a.chief_complaint && (
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          <span className="font-medium text-slate-600">Complaint:</span> {a.chief_complaint}
                        </p>
                      )}
                      {/* Vitals if present */}
                      {(a.visit_weight || a.visit_bp || a.visit_temperature) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {a.visit_weight && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">⚖ {a.visit_weight} kg</span>}
                          {a.visit_bp     && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">💉 BP {a.visit_bp}</span>}
                          {a.visit_temperature && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">🌡 {a.visit_temperature}°C</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                    style={{ background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
