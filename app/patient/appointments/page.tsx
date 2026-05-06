'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { CalendarDays, Clock, X, RefreshCw, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { t, Lang } from '@/lib/translations';

const statusColor: Record<string,{bg:string;color:string;label:string}> = {
  confirmed:    { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'Confirmed'   },
  pending:      { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Pending'     },
  completed:    { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6', label: 'Completed'   },
  cancelled:    { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'Cancelled'   },
  rescheduled:  { bg: 'rgba(168,85,247,0.1)',  color: '#a855f7', label: 'Rescheduled' },
};

export default function PatientAppointments() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const mrNumber = user?.mrNumber;
  const clinicId = user?.clinicId;
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming'|'past'>('upcoming');
  const [lang, setLang] = useState<Lang>('en');
  const [showBook, setShowBook] = useState(false);
  const [bookForm, setBookForm] = useState({date:'',time:'',reason:'',notes:''});
  const [booking, setBooking] = useState(false);
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  useEffect(()=>{ const s=localStorage.getItem('patient_lang'); if(s==='ur') setLang('ur'); },[]);

  useEffect(() => {
    if (!mrNumber) return;
    Promise.all([
      supabase.from('appointments').select('*').eq('mr_number', mrNumber).order('appointment_date',{ascending:false}),
      supabase.from('clinic_settings').select('online_booking,morning_start,morning_end,evening_start,evening_end,slot_duration,working_days,clinic_name').eq('clinic_id', clinicId||'').maybeSingle(),
    ]).then(([apts, cs]) => {
      setAppointments(apts.data||[]);
      setClinicSettings(cs.data);
      setLoading(false);
    });
  }, [mrNumber, clinicId]);

  const now = new Date().toISOString().split('T')[0];
  const upcoming = appointments.filter(a=>a.appointment_date>=now&&a.status!=='Cancelled');
  const past = appointments.filter(a=>a.appointment_date<now||a.status==='Cancelled');

  const cancelApt = async (id:string) => {
    if (!confirm('Cancel this appointment?')) return;
    const {error} = await supabase.from('appointments').update({status:'Cancelled'}).eq('id',id);
    if (error) toast.error(error.message);
    else { toast.success('Appointment cancelled'); setAppointments(prev=>prev.map(a=>a.id===id?{...a,status:'Cancelled'}:a)); }
  };

  const requestReschedule = async (apt:any) => {
    const newDate = prompt('Enter preferred new date (YYYY-MM-DD):');
    if (!newDate) return;
    const {error} = await supabase.from('patient_messages').insert([{
      mr_number: mrNumber, clinic_id: clinicId,
      patient_name: user?.name || 'Patient',
      sender: 'patient', body: `Reschedule request for appointment on ${apt.appointment_date} at ${apt.appointment_time}. Preferred new date: ${newDate}`,
      created_at: new Date().toISOString(),
    }]);
    if (error) toast.error(error.message);
    else toast.success('Reschedule request sent to clinic!');
  };

  const bookAppointment = async () => {
    if (!bookForm.date||!bookForm.time||!bookForm.reason) { toast.error('Fill all required fields'); return; }
    setBooking(true);
    const {error} = await supabase.from('appointments').insert([{
      mr_number: mrNumber, clinic_id: clinicId,
      child_name: user?.name||'Patient',
      appointment_date: bookForm.date, appointment_time: bookForm.time,
      reason: bookForm.reason, status: 'Pending',
      created_at: new Date().toISOString(),
    }]);
    setBooking(false);
    if (error) toast.error(error.message);
    else { toast.success('Appointment request sent!'); setShowBook(false); setBookForm({date:'',time:'',reason:'',notes:''}); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"/></div>;

  const list = tab==='upcoming' ? upcoming : past;

  return (
    <div className="max-w-2xl mx-auto space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('My Appointments',lang)}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('Upcoming Appointments',lang)}</p>
        </div>
        {clinicSettings?.online_booking && (
          <button onClick={()=>setShowBook(!showBook)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{background:'#0a1628'}}>
            <Plus size={14}/> Book
          </button>
        )}
      </div>

      {/* Booking Form */}
      {showBook && (
        <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-800">Book New Appointment</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Date *</label>
              <input type="date" min={now} value={bookForm.date} onChange={e=>setBookForm(p=>({...p,date:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"/>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Time *</label>
              <input type="time" value={bookForm.time} onChange={e=>setBookForm(p=>({...p,time:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"/>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Reason for Visit *</label>
            <input value={bookForm.reason} onChange={e=>setBookForm(p=>({...p,reason:e.target.value}))}
              placeholder="e.g. Fever, Follow-up, Vaccination..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"/>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Additional Notes</label>
            <textarea value={bookForm.notes} onChange={e=>setBookForm(p=>({...p,notes:e.target.value}))} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none"/>
          </div>
          <div className="flex gap-2">
            <button onClick={bookAppointment} disabled={booking}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{background:'#0a1628'}}>
              {booking?'Sending...':'Send Request'}
            </button>
            <button onClick={()=>setShowBook(false)} className="px-4 py-2.5 rounded-xl text-sm border border-slate-200 text-slate-600">Cancel</button>
          </div>
          <p className="text-xs text-slate-400">* Clinic will confirm your appointment</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-slate-100">
        {(['upcoming','past'] as const).map(k=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab===k?'bg-slate-800 text-white':'text-slate-500 hover:text-slate-700'}`}>
            {k==='upcoming'?t('Upcoming',lang):t('Past',lang)} ({(k==='upcoming'?upcoming:past).length})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm" dir={lang==='ur'?'rtl':'ltr'}>{t('No upcoming appointments',lang)}</p>
          <p className="text-sm mt-1" dir={lang==='ur'?'rtl':'ltr'}>{t('Contact your clinic to book an appointment',lang)}</p>
        </div>
      ) : list.map(a => {
        const sk = (a.status||'pending').toLowerCase();
        const sc = statusColor[sk] || statusColor.pending;
        const isUpcoming = a.appointment_date >= now && a.status !== 'Cancelled';
        return (
          <div key={a.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{background:'rgba(10,22,40,0.06)'}}>
                  <div className="text-xs font-medium text-slate-500">{new Date(a.appointment_date).toLocaleString('en-US',{month:'short'})}</div>
                  <div className="text-lg font-bold text-slate-800">{new Date(a.appointment_date).getDate()}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm">{a.reason||'Visit'}</div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <Clock size={11}/> {a.appointment_time||'—'}
                  </div>
                  <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{background:sc.bg,color:sc.color}}>{t(sc.label,lang)}</span>
                </div>
              </div>
              {isUpcoming && (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={()=>requestReschedule(a)} title="Request Reschedule"
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50"
                    style={{background:'rgba(59,130,246,0.08)'}}>
                    <RefreshCw size={13} className="text-blue-500"/>
                  </button>
                  <button onClick={()=>cancelApt(a.id)} title="Cancel Appointment"
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50"
                    style={{background:'rgba(239,68,68,0.08)'}}>
                    <X size={13} className="text-red-400"/>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
