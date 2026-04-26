'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  CalendarDays, Pill, FlaskConical, MessageSquare,
  Clock, CheckCircle, ChevronRight, Heart, AlertTriangle, Activity
} from 'lucide-react';

export default function PatientDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const mrNumber = user?.mrNumber;
  const clinicId = user?.clinicId;

  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labs,          setLabs]          = useState<any[]>([]);
  const [messages,      setMessages]      = useState<any[]>([]);
  const [patientInfo,   setPatientInfo]   = useState<any>(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    if (!mrNumber) return;
    const load = async () => {
      const [appts, rxs, labRows, msgs, pInfo] = await Promise.all([
        supabase.from('appointments').select('*').eq('mr_number', mrNumber)
          .order('appointment_date', { ascending: false }).limit(5),
        supabase.from('prescriptions').select('*').eq('mr_number', mrNumber)
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('lab_results').select('*').eq('mr_number', mrNumber)
          .order('uploaded_at', { ascending: false }).limit(3),
        supabase.from('patient_messages').select('*').eq('mr_number', mrNumber)
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('patients').select('*').eq('mr_number', mrNumber).maybeSingle(),
      ]);
      setAppointments(appts.data || []);
      setPrescriptions(rxs.data || []);
      setLabs(labRows.data || []);
      setMessages(msgs.data || []);
      setPatientInfo(pInfo.data);
      setLoading(false);
    };
    load();
  }, [mrNumber]);

  const upcoming = appointments.filter(a => new Date(a.appointment_date) >= new Date());
  const past     = appointments.filter(a => new Date(a.appointment_date) < new Date());
  const unreadMsgs = messages.filter(m => m.sender === 'clinic' && !m.read_at).length;

  const stats = [
    { label: 'Upcoming Visits',   value: upcoming.length,       icon: CalendarDays,  color: '#3b82f6', href: '/patient/appointments'  },
    { label: 'Prescriptions',     value: prescriptions.length,  icon: Pill,           color: '#10b981', href: '/patient/prescriptions' },
    { label: 'Lab Reports',       value: labs.length,           icon: FlaskConical,   color: '#f59e0b', href: '/patient/labs'          },
    { label: 'Messages',          value: unreadMsgs || messages.length, icon: MessageSquare, color: '#8b5cf6', href: '/patient/messages' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Welcome */}
      <div className="rounded-2xl p-6 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg,#0a1628,#142240)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}>
          {(user?.patientName || user?.name || 'P').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-xl truncate">
            Welcome, {user?.patientName || user?.name || 'Patient'}
          </h1>
          <p className="text-white/50 text-sm">MR Number: <span className="font-mono text-[#c9a84c]">{mrNumber}</span></p>
        </div>
        {unreadMsgs > 0 && (
          <div className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}>
            {unreadMsgs} new message{unreadMsgs > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Health badges from patients table */}
      {patientInfo && (
        <div className="flex flex-wrap gap-2">
          {patientInfo.blood_group && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#f87171' }}>
              <Heart size={11} /> Blood Group: {patientInfo.blood_group}
            </span>
          )}
          {patientInfo.allergies && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.2)', color: '#fb923c' }}>
              <AlertTriangle size={11} /> Allergies: {patientInfo.allergies}
            </span>
          )}
          {patientInfo.conditions && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>
              <Activity size={11} /> {patientInfo.conditions}
            </span>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.label} onClick={() => router.push(s.href)}
              className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${s.color}18` }}>
                <Icon size={18} style={{ color: s.color }} />
              </div>
              <div className="text-2xl font-bold text-[#0a1628]">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Upcoming appointments */}
        <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0a1628]">Upcoming Appointments</h3>
            <button onClick={() => router.push('/patient/appointments')}
              className="text-xs text-[#3b82f6] hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <CalendarDays size={28} className="mx-auto mb-2 opacity-30" />
              No upcoming appointments
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.slice(0,3).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8fafc' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.12)' }}>
                    <CalendarDays size={16} style={{ color: '#3b82f6' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#0a1628] truncate">{a.appointment_type || 'Consultation'}</div>
                    <div className="text-xs text-slate-500">{new Date(a.appointment_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{ background:'rgba(59,130,246,0.1)', color:'#3b82f6' }}>
                    <Clock size={9} className="inline mr-0.5" />{a.appointment_time || 'TBD'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent prescriptions */}
        <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0a1628]">Recent Prescriptions</h3>
            <button onClick={() => router.push('/patient/prescriptions')}
              className="text-xs text-[#10b981] hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </button>
          </div>
          {prescriptions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Pill size={28} className="mx-auto mb-2 opacity-30" />
              No prescriptions on file
            </div>
          ) : (
            <div className="space-y-2">
              {prescriptions.map(rx => (
                <div key={rx.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8fafc' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.12)' }}>
                    <CheckCircle size={16} style={{ color: '#10b981' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#0a1628] truncate">{rx.diagnosis || 'Prescription'}</div>
                    <div className="text-xs text-slate-500">
                      {rx.medicines?.length || 0} medicine{(rx.medicines?.length||0) !== 1 ? 's' : ''} · {rx.date ? new Date(rx.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent lab results */}
        <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0a1628]">Recent Lab Results</h3>
            <button onClick={() => router.push('/patient/labs')}
              className="text-xs text-[#f59e0b] hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </button>
          </div>
          {labs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <FlaskConical size={28} className="mx-auto mb-2 opacity-30" />
              No lab results on file
            </div>
          ) : (
            <div className="space-y-2">
              {labs.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8fafc' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.12)' }}>
                    <FlaskConical size={16} style={{ color: '#f59e0b' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#0a1628] truncate">{l.test_name}</div>
                    <div className="text-xs text-slate-500">{l.visit_date || l.uploaded_at?.slice(0,10) || ''}</div>
                  </div>
                  {l.file_urls?.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background:'rgba(245,158,11,0.1)', color:'#f59e0b' }}>Report</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0a1628]">
              Messages
              {unreadMsgs > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background:'#8b5cf6', color:'#fff' }}>{unreadMsgs}</span>
              )}
            </h3>
            <button onClick={() => router.push('/patient/messages')}
              className="text-xs text-[#8b5cf6] hover:underline flex items-center gap-0.5">
              Open chat <ChevronRight size={12} />
            </button>
          </div>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
              No messages yet
            </div>
          ) : (
            <div className="space-y-2">
              {messages.slice(0,3).map(m => (
                <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: m.sender === 'clinic' && !m.read_at ? 'rgba(139,92,246,0.06)' : '#f8fafc' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: m.sender === 'clinic' ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)', color: m.sender === 'clinic' ? '#8b5cf6' : '#3b82f6' }}>
                    {m.sender === 'clinic' ? 'Dr' : 'Me'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500 mb-0.5">{m.sender === 'clinic' ? 'Clinic' : 'You'} · {new Date(m.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
                    <div className="text-sm text-[#0a1628] truncate">{m.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
