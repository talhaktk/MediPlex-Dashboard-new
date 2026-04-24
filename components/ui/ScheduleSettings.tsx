'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/lib/clinicContext';
import { Save, Loader2, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DURATIONS = [10, 15, 20, 30, 45, 60];

export default function ScheduleSettings() {
  const { clinicId } = useClinic();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    morning_start: '09:00',
    morning_end: '12:00',
    evening_start: '14:00',
    evening_end: '17:00',
    slot_duration: 15,
    max_per_slot: 1,
    working_days: 'Mon,Tue,Wed,Thu,Fri,Sat',
  });

  useEffect(() => {
    supabase.from('clinic_settings').select('morning_start,morning_end,evening_start,evening_end,slot_duration,max_per_slot,working_days').eq('clinic_id', clinicId||'').maybeSingle()
      .then(({ data }) => {
        if (data) setForm(p => ({...p, ...data}));
        setLoading(false);
      });
  }, []);

  const workingDays = form.working_days ? form.working_days.split(',') : [];

  const toggleDay = (day: string) => {
    const days = workingDays.includes(day)
      ? workingDays.filter(d => d !== day)
      : [...workingDays, day];
    setForm(p => ({...p, working_days: days.join(',')}));
  };

  // Generate time slots preview
  const generateSlots = (start: string, end: string, duration: number) => {
    const slots = [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let mins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    while (mins < endMins) {
      const h = Math.floor(mins/60);
      const m = mins % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h > 12 ? h-12 : h === 0 ? 12 : h;
      slots.push(`${h12}:${m.toString().padStart(2,'0')} ${ampm}`);
      mins += duration;
    }
    return slots;
  };

  const morningSlots = generateSlots(form.morning_start, form.morning_end, form.slot_duration);
  const eveningSlots = generateSlots(form.evening_start, form.evening_end, form.slot_duration);

  const handleSave = async () => {
    setSaving(true);
    const { data: ex } = await supabase.from('clinic_settings').select('id').eq('clinic_id',clinicId||'').maybeSingle();
    let serr; if(ex?.id) { ({error: serr} = await supabase.from('clinic_settings').update({
      morning_start: form.morning_start,
      morning_end: form.morning_end,
      evening_start: form.evening_start,
      evening_end: form.evening_end,
      slot_duration: form.slot_duration,
      max_per_slot: form.max_per_slot,
      working_days: form.working_days,
      updated_at: new Date().toISOString(),
    }).eq('id', ex.id)); } else { ({error: serr} = await supabase.from('clinic_settings').insert([{clinic_id:clinicId||null, ...form, updated_at:new Date().toISOString()}])); }
    const error = serr;
    setSaving(false);
    if (error) { toast.error('Failed: ' + error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    window.dispatchEvent(new Event('clinic-settings-saved'));
    toast.success('Schedule settings saved!');
  };

  if (loading) return <div className="text-center py-8 text-gray-400 text-[13px]">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="card p-6 space-y-5">
        <div className="font-medium text-navy text-[15px] pb-3 border-b border-black/5">Doctor Schedule</div>

        {/* Working Days */}
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-2">Working Days</label>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map(day => (
              <button key={day} onClick={() => toggleDay(day)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                style={{
                  background: workingDays.includes(day) ? '#0a1628' : '#f9f7f3',
                  color: workingDays.includes(day) ? '#fff' : '#6b7280',
                  border: workingDays.includes(day) ? '1px solid #0a1628' : '1px solid #e5e7eb'
                }}>
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Slot Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-2">Appointment Duration</label>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map(d => (
                <button key={d} onClick={() => setForm(p => ({...p, slot_duration: d}))}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: form.slot_duration === d ? '#c9a84c' : '#f9f7f3',
                    color: form.slot_duration === d ? '#fff' : '#6b7280',
                    border: form.slot_duration === d ? '1px solid #c9a84c' : '1px solid #e5e7eb'
                  }}>
                  {d} min
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-2">Max Patients Per Slot</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setForm(p => ({...p, max_per_slot: n}))}
                  className="w-9 h-9 rounded-lg text-[13px] font-medium transition-all"
                  style={{
                    background: form.max_per_slot === n ? '#0a1628' : '#f9f7f3',
                    color: form.max_per_slot === n ? '#fff' : '#6b7280',
                    border: form.max_per_slot === n ? '1px solid #0a1628' : '1px solid #e5e7eb'
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Time Slots */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="text-[12px] font-semibold text-navy flex items-center gap-2">
              <Clock size={13}/> Morning Session
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Start</label>
                <input type="time" value={form.morning_start}
                  onChange={e => setForm(p => ({...p, morning_start: e.target.value}))}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">End</label>
                <input type="time" value={form.morning_end}
                  onChange={e => setForm(p => ({...p, morning_end: e.target.value}))}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {morningSlots.slice(0,8).map(s => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#f0fdf4',color:'#166534',border:'1px solid #bbf7d0'}}>{s}</span>
              ))}
              {morningSlots.length > 8 && <span className="text-[10px] text-gray-400">+{morningSlots.length-8} more</span>}
            </div>
            <div className="text-[11px] text-gray-400">{morningSlots.length} slots · {morningSlots.length * form.max_per_slot} max patients</div>
          </div>
          <div className="space-y-3">
            <div className="text-[12px] font-semibold text-navy flex items-center gap-2">
              <Clock size={13}/> Evening Session
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Start</label>
                <input type="time" value={form.evening_start}
                  onChange={e => setForm(p => ({...p, evening_start: e.target.value}))}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">End</label>
                <input type="time" value={form.evening_end}
                  onChange={e => setForm(p => ({...p, evening_end: e.target.value}))}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {eveningSlots.slice(0,8).map(s => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#eff6ff',color:'#1e40af',border:'1px solid #bfdbfe'}}>{s}</span>
              ))}
              {eveningSlots.length > 8 && <span className="text-[10px] text-gray-400">+{eveningSlots.length-8} more</span>}
            </div>
            <div className="text-[11px] text-gray-400">{eveningSlots.length} slots · {eveningSlots.length * form.max_per_slot} max patients</div>
          </div>
        </div>

        <div className="rounded-xl p-3 text-[12px]" style={{background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.2)'}}>
          <span className="font-medium text-amber-800">Total daily capacity: </span>
          <span className="text-amber-700">{(morningSlots.length + eveningSlots.length) * form.max_per_slot} patients/day · {morningSlots.length + eveningSlots.length} slots</span>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="btn-gold gap-2 text-[13px] py-2.5 px-6 flex items-center">
          {saving ? <><Loader2 size={14} className="animate-spin"/>Saving...</>
           : saved ? <><CheckCircle size={14}/>Saved!</>
           : <><Save size={14}/>Save Schedule</>}
        </button>
      </div>
    </div>
  );
}
