'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// EPI Pakistan Schedule
const EPI_SCHEDULE = [
  { id:'bcg',    name:'BCG',           due_weeks:0,   notes:'At birth — left shoulder' },
  { id:'opv0',   name:'OPV-0',         due_weeks:0,   notes:'At birth — oral' },
  { id:'hepb0',  name:'Hep-B (Birth)', due_weeks:0,   notes:'At birth — thigh' },
  { id:'penta1', name:'Penta-1',       due_weeks:6,   notes:'6 weeks — DPT+HepB+Hib' },
  { id:'opv1',   name:'OPV-1',         due_weeks:6,   notes:'6 weeks — oral' },
  { id:'pcv1',   name:'PCV-1',         due_weeks:6,   notes:'6 weeks — thigh' },
  { id:'ipv1',   name:'IPV-1',         due_weeks:6,   notes:'6 weeks — thigh' },
  { id:'penta2', name:'Penta-2',       due_weeks:10,  notes:'10 weeks' },
  { id:'opv2',   name:'OPV-2',         due_weeks:10,  notes:'10 weeks — oral' },
  { id:'pcv2',   name:'PCV-2',         due_weeks:10,  notes:'10 weeks' },
  { id:'penta3', name:'Penta-3',       due_weeks:14,  notes:'14 weeks' },
  { id:'opv3',   name:'OPV-3',         due_weeks:14,  notes:'14 weeks — oral' },
  { id:'pcv3',   name:'PCV-3',         due_weeks:14,  notes:'14 weeks' },
  { id:'ipv2',   name:'IPV-2',         due_weeks:14,  notes:'14 weeks' },
  { id:'measles1',name:'Measles-1',    due_weeks:39,  notes:'9 months' },
  { id:'vita1',  name:'Vitamin-A (1)', due_weeks:39,  notes:'9 months' },
  { id:'measles2',name:'Measles-2 + MMR', due_weeks:65, notes:'15 months' },
  { id:'vita2',  name:'Vitamin-A (2)', due_weeks:65,  notes:'15 months' },
  { id:'typhoid',name:'Typhoid (TCV)', due_weeks:91,  notes:'21 months' },
  { id:'dtp_b1', name:'DTP Booster-1', due_weeks:78, notes:'18 months' },
  { id:'opv_b',  name:'OPV Booster',  due_weeks:78,  notes:'18 months — oral' },
];

interface VaccRecord { vaccine_id: string; given_date: string; batch?: string; given_by?: string; }

interface Props { mrNumber?: string; childName: string; dobString?: string; }

export default function VaccinationSchedule({ mrNumber, childName, dobString }: Props) {
  const [records, setRecords] = useState<VaccRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string|null>(null);
  const [editId, setEditId] = useState<string|null>(null);
  const [editDate, setEditDate] = useState('');
  const [editBatch, setEditBatch] = useState('');

  const dob = dobString ? new Date(dobString) : null;
  const ageWeeks = dob ? Math.floor((Date.now() - dob.getTime()) / (7*24*3600*1000)) : null;

  useEffect(() => {
    const q = mrNumber
      ? supabase.from('vaccinations').select('*').eq('mr_number', mrNumber)
      : supabase.from('vaccinations').select('*').ilike('child_name', childName);
    q.then(({ data }) => { setRecords(data || []); setLoading(false); });
  }, [mrNumber, childName]);

  const isGiven = (id: string) => records.find(r => r.vaccine_id === id);

  const markGiven = async (vaccId: string, date: string, batch: string) => {
    setSaving(vaccId);
    const row = {
      vaccine_id: vaccId,
      mr_number: mrNumber || null,
      child_name: childName,
      given_date: date,
      batch: batch || null,
    };
    const { error } = await supabase.from('vaccinations').upsert([row], { onConflict: 'vaccine_id,mr_number' });
    if (error) {
      // Table might not exist yet
      toast.error('Please create vaccinations table in Supabase first');
    } else {
      setRecords(prev => [...prev.filter(r=>r.vaccine_id!==vaccId), { vaccine_id:vaccId, given_date:date, batch }]);
      toast.success('Vaccination recorded');
    }
    setSaving(null);
    setEditId(null);
  };

  const getStatus = (v: typeof EPI_SCHEDULE[0]) => {
    const given = isGiven(v.id);
    if (given) return 'given';
    if (ageWeeks === null) return 'unknown';
    if (ageWeeks >= v.due_weeks) return 'overdue';
    if (ageWeeks >= v.due_weeks - 2) return 'due';
    return 'upcoming';
  };

  if (loading) return <div className="text-center py-6 text-gray-400 text-[13px]">Loading...</div>;

  const given = EPI_SCHEDULE.filter(v => getStatus(v) === 'given').length;
  const overdue = EPI_SCHEDULE.filter(v => getStatus(v) === 'overdue').length;
  const due = EPI_SCHEDULE.filter(v => getStatus(v) === 'due').length;

  return (
    <div className="space-y-4 mt-2">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 text-center" style={{background:'#f0fdf4',border:'1px solid #bbf7d0'}}>
          <div className="text-[20px] font-bold text-emerald-600">{given}</div>
          <div className="text-[10px] text-emerald-600 font-medium uppercase tracking-widest">Given</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{background:'#fff7ed',border:'1px solid #fed7aa'}}>
          <div className="text-[20px] font-bold text-orange-500">{due}</div>
          <div className="text-[10px] text-orange-500 font-medium uppercase tracking-widest">Due Now</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{background:'#fef2f2',border:'1px solid #fecaca'}}>
          <div className="text-[20px] font-bold text-red-500">{overdue}</div>
          <div className="text-[10px] text-red-500 font-medium uppercase tracking-widest">Overdue</div>
        </div>
      </div>

      {!dobString && (
        <div className="rounded-xl px-3 py-2 text-[12px] text-amber-700" style={{background:'#fefce8',border:'1px solid #fde68a'}}>
          ⚠ Date of birth not set — cannot calculate due dates. Add DOB in patient records.
        </div>
      )}

      {/* Vaccine list */}
      <div className="space-y-2">
        {EPI_SCHEDULE.map(v => {
          const status = getStatus(v);
          const rec = isGiven(v.id);
          const isEditing = editId === v.id;
          return (
            <div key={v.id} className="rounded-xl overflow-hidden" style={{border:`1px solid ${status==='given'?'#bbf7d0':status==='overdue'?'#fecaca':status==='due'?'#fed7aa':'#e5e7eb'}`}}>
              <div className="flex items-center justify-between px-4 py-3" style={{background:status==='given'?'#f0fdf4':status==='overdue'?'#fef2f2':status==='due'?'#fff7ed':'#f9f9f9'}}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{background:status==='given'?'#16a34a':status==='overdue'?'#dc2626':status==='due'?'#ea580c':'#d1d5db'}}>
                    {status==='given'?<Check size={14} color="white"/>:status==='overdue'?<AlertCircle size={14} color="white"/>:<Clock size={14} color="white"/>}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-navy">{v.name}</div>
                    <div className="text-[10px] text-gray-400">{v.notes}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {rec && <div className="text-[11px] text-emerald-600 font-medium">{new Date(rec.given_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>}
                  {!rec && status!=='upcoming' && (
                    <button onClick={()=>{setEditId(v.id);setEditDate(new Date().toISOString().split('T')[0]);setEditBatch('');}}
                      className="text-[11px] px-3 py-1 rounded-lg font-medium"
                      style={{background:'rgba(201,168,76,0.15)',color:'#a07a2a',border:'1px solid rgba(201,168,76,0.3)'}}>
                      Mark Given
                    </button>
                  )}
                </div>
              </div>
              {isEditing && (
                <div className="px-4 py-3 border-t border-black/5 flex gap-2 items-center flex-wrap" style={{background:'#fff'}}>
                  <input type="date" value={editDate} onChange={e=>setEditDate(e.target.value)}
                    className="border border-black/10 rounded-lg px-3 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                  <input type="text" placeholder="Batch # (optional)" value={editBatch} onChange={e=>setEditBatch(e.target.value)}
                    className="border border-black/10 rounded-lg px-3 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold flex-1"/>
                  <button onClick={()=>markGiven(v.id,editDate,editBatch)} disabled={saving===v.id||!editDate}
                    className="btn-gold text-[11px] py-1.5 px-3">
                    {saving===v.id?'Saving...':'Save'}
                  </button>
                  <button onClick={()=>setEditId(null)} className="text-[11px] text-gray-400">Cancel</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-gray-400 text-center">EPI Pakistan Schedule · Expanded Programme on Immunization</div>
    </div>
  );
}
