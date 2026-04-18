'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Appointment } from '@/types';
import { formatUSDate, syncHealthToDb, syncVitalsToDb } from '@/lib/sheets';
import { supabase } from '@/lib/supabase';
import {
  Search, X, Phone, Mail, Calendar, User, Heart,
  Activity, FileText, Plus, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getHealth, setHealth, addVitals, getLatestVitals,
  getPrescriptionsByPatient, patientKey, HealthRecord, VitalSigns
} from '@/lib/store';
import StatusPill from '@/components/ui/StatusPill';

interface PatientRecord {
  key: string; mrNumber: string; name: string; gender: string;
  parentName: string; age: string; whatsapp: string; email: string;
  visits: Appointment[]; lastVisit: string; totalVisits: number; status: string;
}

const BLOOD_GROUPS = ['','A+','A-','B+','B-','AB+','AB-','O+','O-'];
const GENDER_COLORS: Record<string,{bg:string;color:string}> = {
  Male:   {bg:'#dbeafe',color:'#1d4ed8'},
  Female: {bg:'#fce7f3',color:'#be185d'},
  Other:  {bg:'#f3e8ff',color:'#7c3aed'},
};

function buildPatients(data: Appointment[]): PatientRecord[] {
  const map = new Map<string, PatientRecord>();
  [...data]
    .sort((a,b) => (b.appointmentDate||'').localeCompare(a.appointmentDate||''))
    .forEach(a => {
      const k = a.childName.toLowerCase().trim();
      if (!k) return;
      if (!map.has(k)) {
        map.set(k, {
          key: k, mrNumber: (a as any).mr_number || '',
          name: a.childName, gender: (a as any).gender || '',
          parentName: a.parentName, age: a.childAge,
          whatsapp: a.whatsapp, email: a.email,
          visits: [], lastVisit: a.appointmentDate, totalVisits: 0, status: a.status,
        });
      }
      const p = map.get(k)!;
      p.visits.push(a);
      p.totalVisits++;
      // Always use HIGHEST MR number (most recently assigned)
      const incoming = (a as any).mr_number || '';
      if (incoming) {
        const existingNum = parseInt((p.mrNumber||'').replace(/^A-?0*/i,'') || '0');
        const incomingNum = parseInt(incoming.replace(/^A-?0*/i,'') || '0');
        if (incomingNum > existingNum) p.mrNumber = incoming;
      }
      if ((a as any).gender && !p.gender) p.gender = (a as any).gender;
      if (a.appointmentDate > p.lastVisit) { p.lastVisit = a.appointmentDate; p.status = a.status; }
    });
  return Array.from(map.values()).sort((a,b) => b.lastVisit.localeCompare(a.lastVisit));
}

function emptyHealth(): HealthRecord {
  return { bloodGroup:'', allergies:'', conditions:'', notes:'', weights:[], heights:[], vitals:[] };
}

export default function PatientsClient({ data }: { data: Appointment[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PatientRecord | null>(null);
  const [health, setHealthState] = useState<HealthRecord>(emptyHealth());
  const [activeTab, setActiveTab] = useState<'visits'|'health'|'growth'|'billing'|'prescriptions'>('visits');
  const [editHealth, setEditHealth] = useState(false);
  const [draft, setDraft] = useState<HealthRecord>(emptyHealth());
  const [newVitals, setNewVitals] = useState<Partial<VitalSigns>>({
    weight:'', height:'', bp:'', pulse:'', temperature:'',
    recordedAt: new Date().toISOString().split('T')[0]
  });
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [patientInvoices, setPatientInvoices] = useState<any[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [dbVitals, setDbVitals] = useState<any[]>([]);
  const [dbHealth, setDbHealth] = useState<{bloodGroup?:string;allergies?:string;conditions?:string;notes?:string}>({});
  const [aptVitals, setAptVitals] = useState<any[]>([]);

  const patients = useMemo(() => buildPatients(data), [data]);
  const filtered = useMemo(() => {
    if (!search) return patients;
    const q = search.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) || p.parentName.toLowerCase().includes(q) ||
      (p.whatsapp||'').includes(q) || (p.mrNumber||'').toLowerCase().includes(q)
    );
  }, [patients, search]);

  useEffect(() => {
    if (!selected) { setPatientInvoices([]); setDbVitals([]); return; }
    setLoadingBilling(true);
    const bq = selected.mrNumber
      ? supabase.from('billing').select('*').eq('mr_number', selected.mrNumber)
      : supabase.from('billing').select('*').ilike('child_name', selected.name);
    bq.order('created_at', { ascending: false }).then(({ data: rows }) => {
      if (rows) setPatientInvoices(rows);
      setLoadingBilling(false);
    });
    // Fetch vitals from patient_vitals table
    const vq = selected.mrNumber
      ? supabase.from('patient_vitals').select('*').eq('mr_number', selected.mrNumber)
      : supabase.from('patient_vitals').select('*').ilike('child_name', selected.name);
    vq.order('recorded_at', { ascending: false }).then(({ data: rows }) => {
      if (rows && rows.length > 0) setDbVitals(rows);
    });

    // Fetch vitals from appointments table (visit vitals)
    const aq = selected.mrNumber
      ? supabase.from('appointments').select('appointment_date,visit_weight,visit_height,visit_bp,visit_pulse,visit_temperature').eq('mr_number', selected.mrNumber).not('visit_weight', 'is', null)
      : supabase.from('appointments').select('appointment_date,visit_weight,visit_height,visit_bp,visit_pulse,visit_temperature').ilike('child_name', selected.name).not('visit_weight', 'is', null);
    aq.order('appointment_date', { ascending: false }).then(({ data: rows }) => {
      if (rows && rows.length > 0) setAptVitals(rows);
    });

    // Fetch health info (blood group, allergies, conditions, notes) from patients table
    if (selected.mrNumber) {
      supabase.from('patients').select('blood_group,allergies,conditions,notes').eq('mr_number', selected.mrNumber).maybeSingle()
        .then(({ data: row }) => {
          if (row) {
            setDbHealth({ bloodGroup: row.blood_group || '', allergies: row.allergies || '', conditions: row.conditions || '', notes: row.notes || '' });
            // Also sync to localStorage so it shows in health tab
            const key = selected.key;
            const local = getHealth(key);
            if (!local.bloodGroup && row.blood_group) local.bloodGroup = row.blood_group;
            if (!local.allergies  && row.allergies)   local.allergies  = row.allergies;
            if (!local.conditions && row.conditions)  local.conditions = row.conditions;
            if (!local.notes      && row.notes)       local.notes      = row.notes;
            setHealth(key, local);
            setHealthState({...local});
            setDraft({...local});
          }
        });
    }
  }, [selected]);

  const openPatient = (p: PatientRecord) => {
    const h = getHealth(p.key);
    setHealthState(h); setDraft({...h}); setSelected(p);
    setActiveTab('visits'); setEditHealth(false);
  };

  const handleNewAppointment = (p: PatientRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('mediplex_apt_prefill', JSON.stringify({
      child_name: p.name, parent_name: p.parentName, child_age: p.age,
      whatsapp_number: p.whatsapp, email_address: p.email,
      gender: p.gender || '', mr_number: p.mrNumber || '',
    }));
    router.push('/dashboard/appointments');
  };

  const saveHealthRecord = async () => {
    if (!selected) return;
    setHealth(selected.key, draft); setHealthState({...draft}); setEditHealth(false);
    toast.success('Health record saved');
    await syncHealthToDb(selected.mrNumber, selected.name, {
      bloodGroup: draft.bloodGroup, allergies: draft.allergies,
      conditions: draft.conditions, notes: draft.notes, vitals: draft.vitals,
    });
  };

  const saveVitals = async () => {
    if (!selected) return;
    const vitalsRecord: VitalSigns = {
      weight: newVitals.weight||'', height: newVitals.height||'',
      bp: newVitals.bp||'', pulse: newVitals.pulse||'',
      temperature: newVitals.temperature||'',
      recordedAt: newVitals.recordedAt||new Date().toISOString().split('T')[0],
    };
    addVitals(selected.key, vitalsRecord);
    const updated = getHealth(selected.key);
    setHealthState(updated); setDraft({...updated});
    setNewVitals({weight:'',height:'',bp:'',pulse:'',temperature:'',recordedAt:new Date().toISOString().split('T')[0]});
    setShowVitalsForm(false);
    toast.success('Vitals recorded');
    await syncVitalsToDb(selected.mrNumber, selected.name, vitalsRecord);
    await syncHealthToDb(selected.mrNumber, selected.name, { vitals: updated.vitals });
    const vq = selected.mrNumber
      ? supabase.from('patient_vitals').select('*').eq('mr_number', selected.mrNumber)
      : supabase.from('patient_vitals').select('*').ilike('child_name', selected.name);
    vq.order('recorded_at', { ascending: false }).then(({ data: rows }) => { if (rows) setDbVitals(rows); });
  };

  const latestVitals = selected ? getLatestVitals(selected.key) : null;
  const patientRx    = useMemo(() => selected ? getPrescriptionsByPatient(selected.key) : [], [selected]);
  const multiVisit   = patients.filter(p => p.totalVisits > 1).length;
  const avgVisits    = patients.length ? (data.length / patients.length).toFixed(1) : '0';

  const allVitals = useMemo(() => {
    const local = health.vitals || [];
    const usedDates = new Set(local.map(v => v.recordedAt));

    // Add from patient_vitals table
    const fromPatientVitals = dbVitals
      .filter(dv => !usedDates.has(dv.recorded_at))
      .map(dv => {
        usedDates.add(dv.recorded_at);
        return { weight:dv.weight, height:dv.height, bp:dv.bp, pulse:dv.pulse, temperature:dv.temperature, recordedAt:dv.recorded_at, source:'visit' };
      });

    // Add from appointments table (visit vitals)
    const fromAppointments = aptVitals
      .filter(av => av.appointment_date && !usedDates.has(av.appointment_date) && (av.visit_weight || av.visit_bp))
      .map(av => {
        usedDates.add(av.appointment_date);
        return { weight:av.visit_weight||'', height:av.visit_height||'', bp:av.visit_bp||'', pulse:av.visit_pulse||'', temperature:av.visit_temperature||'', recordedAt:av.appointment_date, source:'appointment' };
      });

    return [...local, ...fromPatientVitals, ...fromAppointments]
      .sort((a,b) => (b.recordedAt||'').localeCompare(a.recordedAt||''));
  }, [health.vitals, dbVitals, aptVitals]);

  const tabs = [
    { key:'visits',        label:'Visits' },
    { key:'health',        label:'Health' },
    { key:'growth',        label:'Growth & Vitals' },
    { key:'billing',       label:`Billing (${patientInvoices.length})` },
    { key:'prescriptions', label:`Rx (${patientRx.length})` },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {label:'Total Patients',value:patients.length},
          {label:'Multiple Visits',value:multiVisit},
          {label:'Single Visit',value:patients.length-multiVisit},
          {label:'Avg Visits / Patient',value:avgVisits},
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="text-[10px] tracking-widest uppercase text-gray-400 font-medium mb-1">{s.label}</div>
            <div className="font-display text-[28px] font-semibold text-navy">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input type="text" placeholder="Search by child name, parent, phone, or MR#..."
          value={search} onChange={e => setSearch(e.target.value)} className="search-input"/>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p, i) => {
          const h = getHealth(p.key);
          const hasHealth = h.bloodGroup || h.allergies || h.conditions;
          const latestV = getLatestVitals(p.key);
          const gc = GENDER_COLORS[p.gender] || null;
          return (
            <div key={p.key} onClick={() => openPatient(p)}
              className="card p-4 cursor-pointer hover:shadow-md transition-all animate-in"
              style={{ animationDelay:`${Math.min(i*30,300)}ms` }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                  style={{ background:'#f5edd8', color:'#a07a2a' }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy text-[14px] truncate">{p.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">Parent: {p.parentName}</div>
                  {p.mrNumber && <div className="text-[10px] font-mono text-amber-600 mt-0.5">{p.mrNumber}</div>}
                </div>
                {hasHealth && (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:'#fee2e2' }}>
                    <Heart size={9} style={{ color:'#dc2626' }}/>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 text-[12px] text-gray-500">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.age && <span className="flex items-center gap-1"><User size={11} className="text-gray-400"/>Age {p.age}</span>}
                  {gc && p.gender && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background:gc.bg, color:gc.color }}>{p.gender}</span>
                  )}
                </div>
                {p.whatsapp && p.whatsapp !== '-' && (
                  <div className="flex items-center gap-1.5 font-mono text-[11px]"><Phone size={11} className="text-gray-400"/>{p.whatsapp}</div>
                )}
                <div className="flex items-center gap-1.5"><Calendar size={11} className="text-gray-400"/>Last: {formatUSDate(p.lastVisit)}</div>
                {latestV && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600">
                    <Activity size={10}/>{latestV.weight && `${latestV.weight}kg`}{latestV.bp && ` · BP ${latestV.bp}`}
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  <span className="font-semibold text-navy">{p.totalVisits}</span> {p.totalVisits===1?'visit':'visits'}
                </span>
                <button onClick={(e) => handleNewAppointment(p, e)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:scale-105"
                  style={{ background:'rgba(201,168,76,0.1)', color:'#a07a2a', border:'1px solid rgba(201,168,76,0.3)' }}
                  title="Book new appointment">
                  <Plus size={11} /> New Apt
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(10,22,40,0.65)' }} onClick={() => setSelected(null)}>
          <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-black/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-bold" style={{ background:'#f5edd8', color:'#a07a2a' }}>
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-display font-semibold text-navy text-[18px]">{selected.name}</div>
                    {selected.gender && GENDER_COLORS[selected.gender] && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background:GENDER_COLORS[selected.gender].bg, color:GENDER_COLORS[selected.gender].color }}>
                        {selected.gender}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-gray-400">Parent: {selected.parentName} · {selected.age ? `Age ${selected.age}` : '-'}</div>
                  {selected.mrNumber && <div className="text-[11px] font-mono text-amber-600 mt-0.5">MR# {selected.mrNumber}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { setSelected(null); handleNewAppointment(selected, e); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                  style={{ background:'rgba(201,168,76,0.1)', color:'#a07a2a', border:'1px solid rgba(201,168,76,0.25)' }}>
                  <Plus size={12} /> New Appointment
                </button>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                  <X size={14} className="text-gray-600"/>
                </button>
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-b border-black/5 flex-shrink-0">
              <div className="flex flex-wrap gap-4 text-[12px] text-gray-600 mb-2">
                {selected.whatsapp && selected.whatsapp !== '-' && <span className="flex items-center gap-1"><Phone size={11}/>{selected.whatsapp}</span>}
                {selected.email && selected.email !== '-' && <span className="flex items-center gap-1"><Mail size={11}/>{selected.email}</span>}
                <span className="flex items-center gap-1"><Calendar size={11}/>{selected.totalVisits} visits</span>
              </div>
              {latestVitals && (
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {[
                    {label:'Weight',val:latestVitals.weight?`${latestVitals.weight} kg`:null},
                    {label:'Height',val:latestVitals.height?`${latestVitals.height} cm`:null},
                    {label:'BP',val:latestVitals.bp||null},
                    {label:'Pulse',val:latestVitals.pulse?`${latestVitals.pulse} bpm`:null},
                    {label:'Temp',val:latestVitals.temperature?`${latestVitals.temperature}°C`:null},
                  ].filter(v=>v.val).map(v=>(
                    <span key={v.label} className="px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>
                      {v.label}: <strong>{v.val}</strong>
                    </span>
                  ))}
                  <span className="text-gray-400">as of {formatUSDate(latestVitals.recordedAt)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-1 p-2 border-b border-black/5 flex-shrink-0 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${activeTab===t.key?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab==='visits' && (
                <div className="divide-y divide-black/5">
                  {selected.visits.sort((a,b)=>(b.appointmentDate||'').localeCompare(a.appointmentDate||'')).map(v=>(
                    <div key={v.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-[13px] font-medium text-navy">{formatUSDate(v.appointmentDate)}</div>
                        <div className="text-[12px] text-gray-500 mt-0.5">
                          {v.appointmentTime}{v.visitType?` · ${v.visitType}`:''}{v.reason?` · ${v.reason}`:''}
                        </div>
                        {(v as any).mr_number && <div className="text-[10px] font-mono text-amber-600 mt-0.5">MR# {(v as any).mr_number}</div>}
                      </div>
                      <StatusPill status={v.status}/>
                    </div>
                  ))}
                </div>
              )}

              {activeTab==='health' && (
                <div className="p-5 space-y-4">
                  {!editHealth ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-[13px] font-medium text-navy">Health Information</div>
                        <button onClick={()=>{setDraft({...health});setEditHealth(true);}} className="btn-outline text-[11px] py-1.5 px-3 gap-1"><FileText size={11}/> Edit</button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl p-4" style={{background:'#fff0f0',border:'1px solid #fecaca'}}>
                          <div className="text-[10px] uppercase tracking-widest text-red-400 font-medium mb-1">Blood Group</div>
                          <div className="text-[28px] font-bold text-red-600">{health.bloodGroup||'-'}</div>
                        </div>
                        <div className="rounded-xl p-4" style={{background:'#fff9e6',border:'1px solid #fde68a'}}>
                          <div className="text-[10px] uppercase tracking-widest text-amber-600 font-medium mb-1">Total Visits</div>
                          <div className="text-[28px] font-bold text-amber-700">{selected.totalVisits}</div>
                        </div>
                      </div>
                      {[
                        {label:'Allergies',val:health.allergies,bg:'#fff7ed',border:'#fed7aa',color:'#ea580c'},
                        {label:'Medical Conditions',val:health.conditions,bg:'#f0fdf4',border:'#bbf7d0',color:'#16a34a'},
                        {label:'Doctor Notes',val:health.notes,bg:'#f8f8f8',border:'#e5e7eb',color:'#374151'},
                      ].map(f=>(
                        <div key={f.label} className="rounded-xl p-4" style={{background:f.bg,border:`1px solid ${f.border}`}}>
                          <div className="text-[11px] uppercase tracking-widest font-medium mb-2" style={{color:f.color}}>{f.label}</div>
                          <div className="text-[13px] text-navy">{f.val||`No ${f.label.toLowerCase()} recorded`}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-[13px] font-medium text-navy">Edit Health Record</div>
                        <button onClick={()=>setEditHealth(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Blood Group</label>
                        <select value={draft.bloodGroup} onChange={e=>setDraft(p=>({...p,bloodGroup:e.target.value}))}
                          className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                          {BLOOD_GROUPS.map(g=><option key={g} value={g}>{g||'Select...'}</option>)}
                        </select>
                      </div>
                      {[
                        {label:'Allergies',key:'allergies',placeholder:'e.g. Penicillin, Peanuts'},
                        {label:'Medical Conditions',key:'conditions',placeholder:'e.g. Asthma, Diabetes'},
                        {label:'Doctor Notes',key:'notes',placeholder:'General notes...'},
                      ].map(f=>(
                        <div key={f.key}>
                          <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{f.label}</label>
                          <textarea rows={f.key==='notes'?4:2} placeholder={f.placeholder}
                            value={(draft as unknown as Record<string,string>)[f.key]||''}
                            onChange={e=>setDraft(p=>({...p,[f.key]:e.target.value}))}
                            className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold resize-none"/>
                        </div>
                      ))}
                      <button onClick={saveHealthRecord} className="btn-gold gap-1.5 text-[12px] py-2 px-4 w-full justify-center">
                        <Save size={13}/> Save Health Record
                      </button>
                    </>
                  )}
                </div>
              )}

              {activeTab==='growth' && (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-medium text-navy">Growth & Vital Signs</div>
                    <button onClick={()=>setShowVitalsForm(!showVitalsForm)} className="btn-gold text-[11px] py-1.5 px-3 gap-1"><Plus size={11}/> Record Vitals</button>
                  </div>
                  {showVitalsForm && (
                    <div className="rounded-xl p-4" style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.25)'}}>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {[
                          {label:'Date',key:'recordedAt',type:'date',placeholder:''},
                          {label:'Weight (kg)',key:'weight',type:'number',placeholder:'18.5'},
                          {label:'Height (cm)',key:'height',type:'number',placeholder:'105'},
                          {label:'BP',key:'bp',type:'text',placeholder:'110/70'},
                          {label:'Pulse (bpm)',key:'pulse',type:'number',placeholder:'88'},
                          {label:'Temp (°C)',key:'temperature',type:'number',placeholder:'37.2'},
                        ].map(f=>(
                          <div key={f.key}>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">{f.label}</label>
                            <input type={f.type} placeholder={f.placeholder}
                              value={(newVitals as Record<string,string>)[f.key]||''}
                              onChange={e=>setNewVitals(p=>({...p,[f.key]:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        ))}
                      </div>
                      <button onClick={saveVitals} className="btn-gold text-[11px] py-1.5 px-4 gap-1"><Save size={11}/> Save Vitals</button>
                    </div>
                  )}
                  {allVitals.length>0 ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-2">Vitals History</div>
                      <div className="space-y-2">
                        {allVitals.map((v,i)=>(
                          <div key={i} className="rounded-lg p-3 flex flex-wrap gap-3 text-[12px]" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.1)'}}>
                            <span className="font-medium text-navy">{formatUSDate(v.recordedAt)}</span>
                            {v.weight&&<span className="text-gray-600">⚖ {v.weight} kg</span>}
                            {v.height&&<span className="text-gray-600">📏 {v.height} cm</span>}
                            {v.bp&&<span className="text-gray-600">❤ BP {v.bp}</span>}
                            {v.pulse&&<span className="text-gray-600">💓 {v.pulse} bpm</span>}
                            {v.temperature&&<span className="text-gray-600">🌡 {v.temperature}°C</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-[13px]">No vitals recorded yet</div>
                  )}
                </div>
              )}

              {activeTab==='billing' && (
                <div className="p-5 space-y-3">
                  {loadingBilling ? <div className="text-center py-8 text-gray-400 text-[13px]">Loading...</div>
                  : patientInvoices.length===0 ? <div className="text-center py-8 text-gray-400 text-[13px]">No invoices</div>
                  : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          {label:'Total Paid',val:`PKR ${patientInvoices.reduce((s,i)=>s+(Number(i.amount_paid)||0),0).toLocaleString()}`,color:'#1a7f5e'},
                          {label:'Total Billed',val:`PKR ${patientInvoices.reduce((s,i)=>s+(Number(i.consultation_fee)||0),0).toLocaleString()}`,color:'#0a1628'},
                          {label:'Invoices',val:patientInvoices.length,color:'#c9a84c'},
                        ].map(s=>(
                          <div key={s.label} className="rounded-xl p-3 text-center" style={{background:'#f9f7f3'}}>
                            <div className="text-[18px] font-bold" style={{color:s.color}}>{s.val}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {patientInvoices.map(inv=>{
                        const fee=Number(inv.consultation_fee)||0, disc=Number(inv.discount)||0, paid=Number(inv.amount_paid)||0;
                        const due=Math.max(0,fee-disc-paid); const st=inv.payment_status||'Unpaid';
                        return (
                          <div key={inv.id} className="rounded-xl p-3 flex items-center justify-between" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.12)'}}>
                            <div>
                              <div className="text-[12px] font-mono text-gray-400">{inv.invoice_number||`INV-${inv.id}`}</div>
                              <div className="text-[13px] font-medium text-navy">{formatUSDate(inv.date)} · {inv.visit_type||'-'}</div>
                              <div className="text-[11px] text-gray-500">PKR {fee.toLocaleString()} · Paid: {paid.toLocaleString()} · Due: {due.toLocaleString()}</div>
                            </div>
                            <span className={`pill ${st==='Paid'?'pill-confirmed':st==='Partial'?'pill-rescheduled':'pill-cancelled'}`}>{st}</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {activeTab==='prescriptions' && (
                <div className="p-5 space-y-3">
                  {patientRx.length===0 ? <div className="text-center py-8 text-gray-400 text-[13px]">No prescriptions</div>
                  : patientRx.map(rx=>(
                    <div key={rx.id} className="rounded-xl p-4" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.12)'}}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-mono text-[11px] text-gray-400">{rx.id}</div>
                        <div className="text-[12px] text-navy">{formatUSDate(rx.date)}</div>
                      </div>
                      {rx.diagnosis&&<div className="text-[13px] font-medium text-navy mb-2">{rx.diagnosis}</div>}
                      <div className="flex flex-wrap gap-1.5">
                        {rx.medicines.map(m=>(
                          <span key={m.id} className="text-[11px] bg-white border border-black/10 text-navy px-2 py-0.5 rounded font-medium">
                            {m.name} · {m.frequency}
                          </span>
                        ))}
                      </div>
                      {rx.advice&&<div className="text-[11px] text-gray-500 mt-2">{rx.advice}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}