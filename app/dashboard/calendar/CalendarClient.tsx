'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Appointment } from '@/types';
import { supabase } from '@/lib/supabase';
import { useClinic, withClinicFilter, withClinicId } from '@/lib/clinicContext';
import { formatUSDate } from '@/lib/sheets';
import StatusPill from '@/components/ui/StatusPill';
import { ChevronLeft, ChevronRight, Plus, X, Save } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, parseISO, isValid, addMonths, subMonths,
  isToday, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays
} from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_DOT: Record<string, string> = {
  Confirmed: '#1a7f5e', Cancelled: '#c53030',
  Rescheduled: '#b47a00', Pending: '#2b6cb0', 'No-Show': '#6b7280',
};
const STATUS_BG: Record<string, string> = {
  Confirmed: '#f0fdf4', Cancelled: '#fef2f2',
  Rescheduled: '#fefce8', Pending: '#eff6ff', 'No-Show': '#f9fafb',
};

type ViewMode = 'month' | 'week';

interface NewAptForm {
  child_name: string; parent_name: string; child_age: string;
  whatsapp_number: string; reason_for_visit: string;
  visit_type: string; appointment_date: string; appointment_time: string;
}

const EMPTY_FORM: NewAptForm = {
  child_name:'', parent_name:'', child_age:'', whatsapp_number:'',
  reason_for_visit:'', visit_type:'New Visit', appointment_date:'', appointment_time:'',
};

export default function CalendarClient({ data: initialData }: { data: Appointment[] }) {
  const [data, setData] = useState<Appointment[]>(initialData);
  const { clinicId, isSuperAdmin } = useClinic();
  const [view, setView] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [showNewApt, setShowNewApt] = useState(false);
  const [newAptForm, setNewAptForm] = useState<NewAptForm>({...EMPTY_FORM});
  const [saving, setSaving] = useState(false);
  const [dragApt, setDragApt] = useState<Appointment | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('clinic_settings').select('*').eq('id',1).maybeSingle()
      .then(({ data }) => { if (data) setSchedule(data); });
  }, []);

  // Generate time slots
  const generateSlots = (sch: any) => {
    if (!sch) return [];
    const slots: string[] = [];
    const addSlots = (start: string, end: string) => {
      const [sh,sm] = start.split(':').map(Number);
      const [eh,em] = end.split(':').map(Number);
      let mins = sh*60+sm;
      const endM = eh*60+em;
      while (mins < endM) {
        const h = Math.floor(mins/60);
        const m = mins%60;
        const ampm = h>=12?'PM':'AM';
        const h12 = h>12?h-12:h===0?12:h;
        slots.push(`${h12}:${m.toString().padStart(2,'0')} ${ampm}`);
        mins += sch.slot_duration||15;
      }
    };
    addSlots(sch.morning_start||'09:00', sch.morning_end||'12:00');
    addSlots(sch.evening_start||'14:00', sch.evening_end||'17:00');
    return slots;
  };

  const timeSlots = useMemo(() => generateSlots(schedule), [schedule]);

  // Check if a day is a working day
  const isWorkingDay = (date: Date) => {
    if (!schedule?.working_days) return true;
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dayName = days[date.getDay()];
    return schedule.working_days.split(',').includes(dayName);
  };

  // Appointments map
  const aptByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    data.forEach(a => {
      const d = parseISO(a.appointmentDate);
      if (!isValid(d)) return;
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [data]);

  // Week days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({length:7}, (_,i) => addDays(weekStart, i));

  // Month days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const prefixCells = Array(monthStart.getDay()).fill(null);

  // Open new appointment form
  const openNewApt = (date: Date, time?: string) => {
    setNewAptForm({
      ...EMPTY_FORM,
      appointment_date: format(date, 'yyyy-MM-dd'),
      appointment_time: time || '',
    });
    setShowNewApt(true);
  };

  // Save new appointment
  const saveNewApt = async () => {
    if (!newAptForm.child_name || !newAptForm.appointment_date || !newAptForm.appointment_time) {
      toast.error('Name, date and time are required'); return;
    }
    // Check working day
    if (newAptForm.appointment_date) {
      const aptDay = new Date(newAptForm.appointment_date);
      if (!isWorkingDay(aptDay)) {
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        toast.error(`${days[aptDay.getDay()]} is not a working day. Working days: ${schedule?.working_days||'Mon-Sat'}`);
        return;
      }
    }
    // Check conflict
    const conflicts = data.filter(a =>
      a.appointmentDate === newAptForm.appointment_date &&
      a.appointmentTime === newAptForm.appointment_time &&
      !['Cancelled','No-Show'].includes(a.status)
    );
    const maxPerSlot = schedule?.max_per_slot || 1;
    if (conflicts.length >= maxPerSlot) {
      if (!confirm(`Slot taken by: ${conflicts.map(a=>a.childName).join(', ')}. Book as emergency?`)) return;
    }
    setSaving(true);
    try {
      const { data: inserted, error } = await supabase.from('appointments').insert([{
        child_name: newAptForm.child_name,
        parent_name: newAptForm.parent_name,
        child_age: newAptForm.child_age,
        whatsapp_number: newAptForm.whatsapp_number,
        reason_for_visit: newAptForm.reason_for_visit,
        visit_type: newAptForm.visit_type,
        appointment_date: newAptForm.appointment_date,
        appointment_time: newAptForm.appointment_time,
        status: 'Confirmed',
      }]).select();
      if (error) throw error;
      toast.success('Appointment booked!');
      setShowNewApt(false);
      // Refresh
      const { data: rows } = await supabase.from('appointments').select('*').order('appointment_date',{ascending:false});
      if (rows) setData(rows.map((row:any) => ({
        id: row.id.toString(), childName: row.child_name||'', parentName: row.parent_name||'',
        childAge: row.child_age||'', whatsapp: row.whatsapp_number||'', email: row.email_address||'',
        appointmentDate: row.appointment_date||'', appointmentTime: row.appointment_time||'',
        reason: row.reason_for_visit||'', visitType: row.visit_type||'New',
        status: row.status||'Confirmed', attendanceStatus: row.attendance_status||'',
        checkInTime: row.check_in_time||'', inClinicTime: row.in_clinic_time||'',
        mr_number: row.mr_number||'', gender: row.gender||'',
      } as any)));
    } catch (err:any) { toast.error('Failed: ' + err.message); }
    setSaving(false);
  };

  // Drag handlers
  const handleDragStart = (apt: Appointment) => setDragApt(apt);
  const handleDragOver = (e: React.DragEvent, dateKey: string) => { e.preventDefault(); setDragOverDate(dateKey); };
  const handleDrop = async (e: React.DragEvent, dateKey: string, time?: string) => {
    e.preventDefault();
    if (!dragApt) return;
    if (dragApt.appointmentDate === dateKey && dragApt.appointmentTime === (time||dragApt.appointmentTime)) {
      setDragApt(null); setDragOverDate(null); return;
    }
    if (!confirm(`Move ${dragApt.childName} to ${formatUSDate(dateKey)}${time?' at '+time:''}?`)) {
      setDragApt(null); setDragOverDate(null); return;
    }
    try {
      await supabase.from('appointments').update({
        appointment_date: dateKey,
        appointment_time: time || dragApt.appointmentTime,
        status: 'Rescheduled',
      }).eq('id', dragApt.id);
      setData(prev => prev.map(a => a.id === dragApt.id
        ? {...a, appointmentDate: dateKey, appointmentTime: time||a.appointmentTime, status:'Rescheduled'}
        : a
      ));
      toast.success(`${dragApt.childName} rescheduled`);
    } catch { toast.error('Failed to reschedule'); }
    setDragApt(null); setDragOverDate(null);
  };

  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const selectedApts = selectedDay ? aptByDate.get(format(selectedDay,'yyyy-MM-dd'))||[] : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={()=>view==='month'?setCurrentDate(subMonths(currentDate,1)):setCurrentDate(subWeeks(currentDate,1))}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-gold">
            <ChevronLeft size={14} className="text-gray-500"/>
          </button>
          <div className="font-display font-semibold text-navy text-[18px]">
            {view==='month' ? format(currentDate,'MMMM yyyy') : `${format(weekStart,'MMM d')} – ${format(addDays(weekStart,6),'MMM d, yyyy')}`}
          </div>
          <button onClick={()=>view==='month'?setCurrentDate(addMonths(currentDate,1)):setCurrentDate(addWeeks(currentDate,1))}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-gold">
            <ChevronRight size={14} className="text-gray-500"/>
          </button>
          <button onClick={()=>setCurrentDate(new Date())} className="px-3 py-1.5 text-[12px] rounded-lg border border-gray-200 hover:border-gold text-gray-500">Today</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7">
            {(['month','week'] as ViewMode[]).map(v => (
              <button key={v} onClick={()=>setView(v)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all capitalize ${view===v?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={()=>openNewApt(new Date())} className="btn-gold text-[12px] py-2 px-3 gap-1.5">
            <Plus size={13}/> New Appointment
          </button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {view==='month' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card lg:col-span-2">
            <div className="p-4">
              <div className="grid grid-cols-7 mb-1">
                {DOW.map(d => <div key={d} className="text-center text-[11px] text-gray-400 font-medium uppercase tracking-wider py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {prefixCells.map((_,i) => <div key={`pre-${i}`}/>)}
                {monthDays.map(day => {
                  const key = format(day,'yyyy-MM-dd');
                  const apts = aptByDate.get(key)||[];
                  const isSelected = selectedDay && isSameDay(day,selectedDay);
                  const isTodayDay = isToday(day);
                  const isWorking = isWorkingDay(day);
                  const isDragOver = dragOverDate === key;
                  return (
                    <div key={key}
                      onClick={()=>setSelectedDay(isSameDay(day,selectedDay!)?null:day)}
                      onDoubleClick={()=>openNewApt(day)}
                      onDragOver={e=>handleDragOver(e,key)}
                      onDrop={e=>handleDrop(e,key)}
                      onDragLeave={()=>setDragOverDate(null)}
                      className={`min-h-[72px] rounded-xl p-1.5 cursor-pointer transition-all border ${
                        isDragOver?'border-gold bg-amber-50':
                        isSelected?'border-gold bg-amber-50':
                        isTodayDay?'border-navy/20 bg-navy/5':
                        !isWorking?'border-transparent bg-gray-50 opacity-50':
                        apts.length>0?'border-gray-100 hover:border-gold/40':
                        'border-transparent hover:border-gray-100'
                      }`}>
                      <div className={`text-[12px] font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                        isTodayDay?'bg-navy text-white text-[11px]':isSelected?'text-amber-800':'text-gray-600'
                      }`}>{format(day,'d')}</div>
                      {apts.slice(0,2).map((a,i) => (
                        <div key={i} draggable onDragStart={()=>handleDragStart(a)}
                          className="flex items-center gap-1 truncate cursor-grab active:cursor-grabbing"
                          onClick={e=>{e.stopPropagation();}}>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:STATUS_DOT[a.status]||'#8a9bb0'}}/>
                          <span className="text-[10px] text-gray-600 truncate leading-tight">{a.childName}</span>
                        </div>
                      ))}
                      {apts.length>2 && <div className="text-[10px] text-gray-400 pl-2.5">+{apts.length-2}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Day sidebar */}
          <div className="card">
            <div className="px-4 py-3.5 border-b border-black/5">
              <div className="font-medium text-navy text-[13px]">
                {selectedDay ? format(selectedDay,'EEEE, MMMM d') : 'Select a day'}
              </div>
              {selectedDay && (
                <div className="flex items-center justify-between mt-1">
                  <div className="text-[11px] text-gray-400">{selectedApts.length} appointment(s)</div>
                  <button onClick={()=>openNewApt(selectedDay)} className="text-[11px] text-gold hover:text-amber-700 font-medium flex items-center gap-1">
                    <Plus size={11}/> Add
                  </button>
                </div>
              )}
            </div>
            <div className="divide-y divide-black/5">
              {!selectedDay && <div className="px-4 py-8 text-center text-[13px] text-gray-400">Click a day · Double-click to add</div>}
              {selectedDay && selectedApts.length===0 && <div className="px-4 py-8 text-center text-[13px] text-gray-400">No appointments · Double-click to add</div>}
              {selectedApts.sort((a,b)=>(a.appointmentTime||'').localeCompare(b.appointmentTime||'')).map(a=>(
                <div key={a.id} className="px-4 py-3" draggable onDragStart={()=>handleDragStart(a)}>
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="font-medium text-navy text-[13px]">{a.childName}</div><div className="text-[11px] text-gray-400">{a.parentName}</div></div>
                    <StatusPill status={a.status}/>
                  </div>
                  <div className="mt-1 flex gap-3 text-[11px] text-gray-500">
                    <span>⏰ {a.appointmentTime||'No time'}</span>
                    {a.childAge&&<span>👤 {a.childAge}yr</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {view==='week' && (
        <div className="card overflow-hidden">
          <div className="grid" style={{gridTemplateColumns:`80px repeat(7, 1fr)`}}>
            {/* Header row */}
            <div className="border-b border-r border-black/5 p-2"/>
            {weekDays.map(day => {
              const key = format(day,'yyyy-MM-dd');
              const isWorking = isWorkingDay(day);
              const isDragOver = dragOverDate === key;
              return (
                <div key={key}
                  onDragOver={e=>handleDragOver(e,key)} onDrop={e=>handleDrop(e,key)} onDragLeave={()=>setDragOverDate(null)}
                  className={`border-b border-r border-black/5 p-2 text-center transition-all ${isDragOver?'bg-amber-50':!isWorking?'bg-gray-50':''}`}>
                  <div className="text-[11px] text-gray-400 font-medium uppercase">{format(day,'EEE')}</div>
                  <div className={`text-[16px] font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full mt-0.5 ${isToday(day)?'bg-navy text-white':'text-navy'}`}>
                    {format(day,'d')}
                  </div>
                  {!isWorking && <div className="text-[9px] text-gray-400 mt-0.5">Off</div>}
                </div>
              );
            })}
            {/* Time slot rows */}
            {timeSlots.map(slot => (
              <>
                <div key={`label-${slot}`} className="border-b border-r border-black/5 px-2 py-1.5 text-[10px] text-gray-400 text-right leading-tight">
                  {slot}
                </div>
                {weekDays.map(day => {
                  const key = format(day,'yyyy-MM-dd');
                  const slotApts = (aptByDate.get(key)||[]).filter(a => a.appointmentTime === slot);
                  const isWorking = isWorkingDay(day);
                  const isDragOver = dragOverDate === `${key}_${slot}`;
                  const isFull = slotApts.filter(a=>!['Cancelled','No-Show'].includes(a.status)).length >= (schedule?.max_per_slot||1);
                  return (
                    <div key={`${key}-${slot}`}
                      onClick={()=>{ if(isWorking) openNewApt(day, slot); }}
                      onDragOver={e=>handleDragOver(e,`${key}_${slot}`)}
                      onDrop={e=>handleDrop(e,key,slot)}
                      onDragLeave={()=>setDragOverDate(null)}
                      className={`border-b border-r border-black/5 p-1 min-h-[36px] transition-all ${
                        isDragOver?'bg-amber-100':
                        !isWorking?'bg-gray-50':
                        isFull?'bg-red-50/30':
                        'hover:bg-amber-50/50 cursor-pointer'
                      }`}>
                      {slotApts.map(a => (
                        <div key={a.id} draggable onDragStart={e=>{e.stopPropagation();handleDragStart(a);}}
                          onClick={e=>e.stopPropagation()}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium truncate cursor-grab mb-0.5"
                          style={{background:STATUS_BG[a.status]||'#f9fafb',color:STATUS_DOT[a.status]||'#374151',border:`1px solid ${STATUS_DOT[a.status]}33`}}>
                          {a.childName}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      {showNewApt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-black/5">
              <div className="font-semibold text-navy text-[15px]">New Appointment</div>
              <button onClick={()=>setShowNewApt(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                {l:'Child Name *',k:'child_name',ph:'Full name'},
                {l:'Parent Name',k:'parent_name',ph:'Parent name'},
                {l:'Age',k:'child_age',ph:'e.g. 5'},
                {l:'WhatsApp',k:'whatsapp_number',ph:'+92...'},
                {l:'Reason',k:'reason_for_visit',ph:'e.g. Fever'},
              ].map(f=>(
                <div key={f.k}>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">{f.l}</label>
                  <input type="text" placeholder={f.ph} value={(newAptForm as any)[f.k]}
                    onChange={e=>setNewAptForm(p=>({...p,[f.k]:e.target.value}))}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Date</label>
                  <input type="date" value={newAptForm.appointment_date}
                    onChange={e=>setNewAptForm(p=>({...p,appointment_date:e.target.value}))}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Time</label>
                  {timeSlots.length > 0 ? (
                    <select value={newAptForm.appointment_time}
                      onChange={e=>setNewAptForm(p=>({...p,appointment_time:e.target.value}))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                      <option value="">Select slot...</option>
                      {timeSlots.map(s=>{
                        const taken = data.filter(a=>a.appointmentDate===newAptForm.appointment_date&&a.appointmentTime===s&&!['Cancelled','No-Show'].includes(a.status)).length;
                        const full = taken>=(schedule?.max_per_slot||1);
                        return <option key={s} value={s} style={{color:full?'#dc2626':'inherit'}}>{s}{full?' ⚠ Full':taken>0?` (${taken}/${schedule?.max_per_slot})`  :''}</option>;
                      })}
                    </select>
                  ) : (
                    <input type="time" value={newAptForm.appointment_time}
                      onChange={e=>setNewAptForm(p=>({...p,appointment_time:e.target.value}))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t border-black/5">
              <button onClick={saveNewApt} disabled={saving} className="btn-gold text-[13px] py-2.5 px-5 flex-1 gap-1.5">
                <Save size={13}/> {saving?'Saving...':'Book Appointment'}
              </button>
              <button onClick={()=>setShowNewApt(false)} className="btn-outline text-[12px] py-2 px-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
