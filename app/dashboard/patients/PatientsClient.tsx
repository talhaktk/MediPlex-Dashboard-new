'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Appointment } from '@/types';
import { formatUSDate, syncHealthToDb, syncVitalsToDb } from '@/lib/sheets';
import { supabase } from '@/lib/supabase';
import { Search, X, Phone, Mail, Calendar, User, Heart, Activity, FileText, Plus, Save, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { getHealth, setHealth, addVitals, getLatestVitals, getPrescriptionsByPatient, patientKey, HealthRecord, VitalSigns } from '@/lib/store';
import StatusPill from '@/components/ui/StatusPill';
import LabResultsWithPrint from '@/components/ui/LabResultsWithPrint';
import ConsentForms from '@/components/ui/ConsentForms';
import TelehealthHistory from '@/components/ui/TelehealthHistory';
import WHOGrowthChart from '@/components/ui/WHOGrowthChart';
import VaccinationSchedule from '@/components/ui/VaccinationSchedule';

interface PatientRecord {
  key: string; mrNumber: string; name: string; gender: string;
  parentName: string; age: string; whatsapp: string; email: string;
  visits: Appointment[]; lastVisit: string; totalVisits: number; status: string;
}

const BLOOD_GROUPS = ['','A+','A-','B+','B-','AB+','AB-','O+','O-'];
const GENDER_COLORS: Record<string,{bg:string;color:string}> = {
  Male:{bg:'#dbeafe',color:'#1d4ed8'}, Female:{bg:'#fce7f3',color:'#be185d'}, Other:{bg:'#f3e8ff',color:'#7c3aed'},
};
const SCRIBE_COLORS: Record<string,string> = {
  soap:'#3b82f6', prescription:'#10b981', discharge:'#f59e0b', referral:'#8b5cf6',
};

function buildPatients(data: Appointment[]): PatientRecord[] {
  const map = new Map<string, PatientRecord>();
  [...data].sort((a,b) => (b.appointmentDate||'').localeCompare(a.appointmentDate||'')).forEach(a => {
    const k = a.childName.toLowerCase().trim();
    if (!k) return;
    if (!map.has(k)) map.set(k, { key:k, mrNumber:(a as any).mr_number||'', name:a.childName, gender:(a as any).gender||'', parentName:a.parentName, age:a.childAge, whatsapp:a.whatsapp, email:a.email, visits:[], lastVisit:a.appointmentDate, totalVisits:0, status:a.status });
    const p = map.get(k)!;
    p.visits.push(a);
    p.totalVisits++;
    const incoming = (a as any).mr_number || '';
    if (incoming) {
      const en = parseInt((p.mrNumber||'').replace(/^A-?0*/i,'') || '0');
      const in_ = parseInt(incoming.replace(/^A-?0*/i,'') || '0');
      if (in_ > en) p.mrNumber = incoming;
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
  const [activeTab, setActiveTab] = useState<'visits'|'health'|'growth'|'billing'|'prescriptions'|'scribe'|'procedures'|'labs'|'consent'|'telehealth'|'vaccines'>('visits');
  const [editHealth, setEditHealth] = useState(false);
  const [draft, setDraft] = useState<HealthRecord>(emptyHealth());
  const [newVitals, setNewVitals] = useState<Partial<VitalSigns>>({ weight:'', height:'', bp:'', pulse:'', temperature:'', recordedAt: new Date().toISOString().split('T')[0] });
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [patientInvoices, setPatientInvoices] = useState<any[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [dbVitals, setDbVitals] = useState<any[]>([]);
  const [patientDob, setPatientDob] = useState<string>('');
  const [aptVitals, setAptVitals] = useState<any[]>([]);
  const [scribeOutputs, setScribeOutputs] = useState<any[]>([]);
  const [dbRx, setDbRx] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [selectedScribe, setSelectedScribe] = useState<any|null>(null);
  const [showProcedureForm, setShowProcedureForm] = useState(false);
  const [savingProcedure, setSavingProcedure] = useState(false);
  const [procedureForm, setProcedureForm] = useState<Record<string,string>>({
    procedure_name:'', procedure_type:'', tier:'',
    indication:'', site:'', laterality:'N/A',
    anaesthesia_type:'None', anaesthesia_agent:'',
    equipment:'', technique:'', specimen_collected:'No',
    consent_obtained:'Yes - Parent/Guardian', patient_education:'Yes',
    start_time:'', end_time:'', ebl:'',
    cpt_code:'', icd10_code:'',
    immediate_outcome:'Successful', complications:'None',
    patient_tolerance:'Good', additional_notes:'',
    performed_by:'', notes:'', status:'Completed',
    date: new Date().toISOString().split('T')[0],
  });

  const patients = useMemo(() => buildPatients(data), [data]);
  const filtered = useMemo(() => {
    if (!search) return patients;
    const q = search.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q) || p.parentName.toLowerCase().includes(q) || (p.whatsapp||'').includes(q) || (p.mrNumber||'').toLowerCase().includes(q));
  }, [patients, search]);

  useEffect(() => {
    if (!selected) { setPatientInvoices([]); setDbVitals([]); setAptVitals([]); setScribeOutputs([]); setDbRx([]); setProcedures([]); return; }
    setLoadingBilling(true);

    const bq = selected.mrNumber
      ? supabase.from('billing').select('*').eq('mr_number', selected.mrNumber)
      : supabase.from('billing').select('*').ilike('child_name', selected.name);
    bq.order('created_at', { ascending: false }).then(({ data: rows }) => { if (rows) setPatientInvoices(rows); setLoadingBilling(false); });

    const vq = selected.mrNumber
      ? supabase.from('patient_vitals').select('*').eq('mr_number', selected.mrNumber)
      : supabase.from('patient_vitals').select('*').ilike('child_name', selected.name);
    vq.order('recorded_at', { ascending: false }).then(({ data: rows }) => { if (rows) setDbVitals(rows); });
    if (selected.mrNumber) {
      supabase.from('patients').select('date_of_birth').eq('mr_number', selected.mrNumber).maybeSingle()
        .then(({ data: pd }) => { if (pd?.date_of_birth) setPatientDob(pd.date_of_birth); });
    }

    const aq = selected.mrNumber
      ? supabase.from('appointments').select('id,appointment_date,visit_weight,visit_height,visit_bp,visit_pulse,visit_temperature').eq('mr_number', selected.mrNumber)
      : supabase.from('appointments').select('id,appointment_date,visit_weight,visit_height,visit_bp,visit_pulse,visit_temperature').ilike('child_name', selected.name);
    aq.order('appointment_date', { ascending: false }).then(({ data: rows }) => {
      if (rows) setAptVitals(rows.filter(r => r.visit_weight || r.visit_bp || r.visit_height || r.visit_pulse || r.visit_temperature));
    });

    const pq = selected.mrNumber
      ? supabase.from('procedures').select('*').eq('mr_number', selected.mrNumber)
      : supabase.from('procedures').select('*').ilike('child_name', selected.name);
    pq.order('date', { ascending: false }).then(({ data: rows }) => { if (rows) setProcedures(rows); });

    const sq = selected.mrNumber
      ? supabase.from('scribe_outputs').select('*').eq('mr_number', selected.mrNumber)
      : supabase.from('scribe_outputs').select('*').ilike('child_name', selected.name);
    sq.order('created_at', { ascending: false }).then(({ data: rows }) => { if (rows) setScribeOutputs(rows); });

    const rq = selected.mrNumber
      ? supabase.from('prescriptions').select('*').eq('mr_number', selected.mrNumber)
      : supabase.from('prescriptions').select('*').ilike('child_name', selected.name);
    rq.order('created_at', { ascending: false }).then(({ data: rows }) => { if (rows) setDbRx(rows); });

    if (selected.mrNumber) {
      supabase.from('patients').select('blood_group,allergies,conditions,notes').eq('mr_number', selected.mrNumber).maybeSingle()
        .then(({ data: row }) => {
          if (row) {
            const key = selected.key;
            const local = getHealth(key);
            if (row.blood_group) local.bloodGroup = row.blood_group;
            if (row.allergies)   local.allergies  = row.allergies;
            if (row.conditions)  local.conditions = row.conditions;
            if (row.notes)       local.notes      = row.notes;
            setHealth(key, local);
            setHealthState({...local});
            setDraft({...local});
          }
        });
    }
  }, [selected]);

  const openPatient = (p: PatientRecord) => {
    const h = getHealth(p.key);
    setHealthState(h); setDraft({...h}); setSelected(p); setActiveTab('visits'); setEditHealth(false);
  };

  const handleNewAppointment = (p: PatientRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('mediplex_apt_prefill', JSON.stringify({ child_name:p.name, parent_name:p.parentName, child_age:p.age, whatsapp_number:p.whatsapp, email_address:p.email, gender:p.gender||'', mr_number:p.mrNumber||'' }));
    router.push('/dashboard/appointments');
  };

  const saveHealthRecord = async () => {
    if (!selected) return;
    setHealth(selected.key, draft);
    setHealthState({...draft});
    setEditHealth(false);
    toast.success('Health record saved');
    await syncHealthToDb(selected.mrNumber, selected.name, { bloodGroup:draft.bloodGroup, allergies:draft.allergies, conditions:draft.conditions, notes:draft.notes });
  };

  const saveVitals = async () => {
    if (!selected) return;
    const vitalsRecord: VitalSigns = { weight:newVitals.weight||'', height:newVitals.height||'', bp:newVitals.bp||'', pulse:newVitals.pulse||'', temperature:newVitals.temperature||'', recordedAt:newVitals.recordedAt||new Date().toISOString().split('T')[0] };
    addVitals(selected.key, vitalsRecord);
    const updated = getHealth(selected.key);
    setHealthState(updated); setDraft({...updated});
    setNewVitals({ weight:'', height:'', bp:'', pulse:'', temperature:'', recordedAt:new Date().toISOString().split('T')[0] });
    setShowVitalsForm(false);
    toast.success('Vitals recorded');
    await syncVitalsToDb(selected.mrNumber, selected.name, vitalsRecord);
    const vq = selected.mrNumber
      ? supabase.from('patient_vitals').select('*').eq('mr_number', selected.mrNumber)
      : supabase.from('patient_vitals').select('*').ilike('child_name', selected.name);
    vq.order('recorded_at', { ascending: false }).then(({ data: rows }) => { if (rows) setDbVitals(rows); });
    if (selected.mrNumber) {
      supabase.from('patients').select('date_of_birth').eq('mr_number', selected.mrNumber).maybeSingle()
        .then(({ data: pd }) => { if (pd?.date_of_birth) setPatientDob(pd.date_of_birth); });
    }
  };

  const latestVitals = selected ? getLatestVitals(selected.key) : null;
  const localRx = useMemo(() => selected ? getPrescriptionsByPatient(selected.key) : [], [selected]);

  const allRx = useMemo(() => {
    const localIds = new Set(localRx.map(r => r.id));
    const extra = dbRx.filter(r => !localIds.has(r.id)).map(r => ({ id:r.id, appointmentId:'', childName:r.child_name, parentName:r.parent_name, childAge:r.child_age, date:r.date, diagnosis:r.diagnosis, medicines:r.medicines||[], advice:r.advice, followUp:r.follow_up, createdAt:r.created_at }));
    return [...localRx, ...extra].sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
  }, [localRx, dbRx]);

  const allVitals = useMemo(() => {
    const local = health.vitals || [];
    const used = new Set(local.map(v => v.recordedAt));
    const fromPatientVitals = dbVitals.map(dv => ({ weight:dv.weight, height:dv.height, bp:dv.bp, pulse:dv.pulse, temperature:dv.temperature, recordedAt:dv.recorded_at, _source:'record' }));
    const fromApt = aptVitals.filter(av => av.visit_weight||av.visit_bp||av.visit_height||av.visit_pulse||av.visit_temperature).map(av => ({ weight:av.visit_weight||'', height:av.visit_height||'', bp:av.visit_bp||'', pulse:av.visit_pulse||'', temperature:av.visit_temperature||'', recordedAt:av.appointment_date, _source:'visit' }));
    return [...local, ...fromPatientVitals, ...fromApt].sort((a,b) => (b.recordedAt||'').localeCompare(a.recordedAt||''));
  }, [health.vitals, dbVitals, aptVitals]);

  const latestAllVitals = allVitals[0] || null;
  const multiVisit = patients.filter(p => p.totalVisits > 1).length;
  const avgVisits  = patients.length ? (data.length / patients.length).toFixed(1) : '0';

  const tabs = [
    { key:'visits',        label:'Visits' },
    { key:'health',        label:'Health' },
    { key:'growth',        label:'Growth & Vitals' },
    { key:'billing',       label:`Billing (${patientInvoices.length})` },
    { key:'prescriptions', label:`Rx (${allRx.length})` },
    { key:'scribe',        label:`AI Notes (${scribeOutputs.length})` },
    { key:'procedures',    label:`Procedures (${procedures.length})` },
    {key:'labs',label:'Labs & Reports'},
    {key:'consent',label:'Consent Forms'},
    {key:'telehealth',label:'Telehealth'},
    {key:'vaccines',label:'Vaccines'},
  ] as const;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[{label:'Total Patients',value:patients.length},{label:'Multiple Visits',value:multiVisit},{label:'Single Visit',value:patients.length-multiVisit},{label:'Avg Visits / Patient',value:avgVisits}].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="text-[10px] tracking-widest uppercase text-gray-400 font-medium mb-1">{s.label}</div>
            <div className="font-display text-[28px] font-semibold text-navy">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input type="text" placeholder="Search by child name, parent, phone, or MR#..." value={search} onChange={e => setSearch(e.target.value)} className="search-input"/>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p, i) => {
          const h = getHealth(p.key);
          const hasHealth = h.bloodGroup || h.allergies || h.conditions;
          const latestV = getLatestVitals(p.key);
          const gc = GENDER_COLORS[p.gender] || null;
          return (
            <div key={p.key} onClick={() => openPatient(p)} className="card p-4 cursor-pointer hover:shadow-md transition-all animate-in" style={{ animationDelay:`${Math.min(i*30,300)}ms` }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-bold flex-shrink-0" style={{ background:'#f5edd8', color:'#a07a2a' }}>{p.name.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy text-[14px] truncate">{p.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">Parent: {p.parentName}</div>
                  {p.mrNumber && <div className="text-[10px] font-mono text-amber-600 mt-0.5">{p.mrNumber}</div>}
                </div>
                {hasHealth && <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:'#fee2e2' }}><Heart size={9} style={{ color:'#dc2626' }}/></div>}
              </div>
              <div className="space-y-1.5 text-[12px] text-gray-500">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.age && <span className="flex items-center gap-1"><User size={11} className="text-gray-400"/>Age {p.age}</span>}
                  {gc && p.gender && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background:gc.bg, color:gc.color }}>{p.gender}</span>}
                </div>
                {p.whatsapp && p.whatsapp !== '-' && <div className="flex items-center gap-1.5 font-mono text-[11px]"><Phone size={11} className="text-gray-400"/>{p.whatsapp}</div>}
                <div className="flex items-center gap-1.5"><Calendar size={11} className="text-gray-400"/>Last: {formatUSDate(p.lastVisit)}</div>
                {latestV && <div className="flex items-center gap-1.5 text-[10px] text-emerald-600"><Activity size={10}/>{latestV.weight && `${latestV.weight}kg`}{latestV.bp && ` · BP ${latestV.bp}`}</div>}
              </div>
              <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
                <span className="text-[11px] text-gray-400"><span className="font-semibold text-navy">{p.totalVisits}</span> {p.totalVisits===1?'visit':'visits'}</span>
                <button onClick={(e) => handleNewAppointment(p, e)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:scale-105" style={{ background:'rgba(201,168,76,0.1)', color:'#a07a2a', border:'1px solid rgba(201,168,76,0.3)' }}><Plus size={11} /> New Apt</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Patient Detail Modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(10,22,40,0.65)' }} onClick={() => setSelected(null)}>
          <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-black/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-bold" style={{ background:'#f5edd8', color:'#a07a2a' }}>{selected.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-display font-semibold text-navy text-[18px]">{selected.name}</div>
                    {selected.gender && GENDER_COLORS[selected.gender] && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background:GENDER_COLORS[selected.gender].bg, color:GENDER_COLORS[selected.gender].color }}>{selected.gender}</span>}
                  </div>
                  <div className="text-[12px] text-gray-400">Parent: {selected.parentName} · {selected.age ? `Age ${selected.age}` : '-'}</div>
                  {selected.mrNumber && <div className="text-[11px] font-mono text-amber-600 mt-0.5">MR# {selected.mrNumber}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { setSelected(null); handleNewAppointment(selected, e); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{ background:'rgba(201,168,76,0.1)', color:'#a07a2a', border:'1px solid rgba(201,168,76,0.25)' }}><Plus size={12} /> New Appointment</button>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X size={14} className="text-gray-600"/></button>
              </div>
            </div>

            {/* Latest vitals strip */}
            {latestAllVitals && (
              <div className="px-5 py-3 bg-gray-50 border-b border-black/5 flex-shrink-0">
                <div className="flex flex-wrap gap-4 text-[12px] text-gray-600 mb-2">
                  {selected.whatsapp && selected.whatsapp !== '-' && <span className="flex items-center gap-1"><Phone size={11}/>{selected.whatsapp}</span>}
                  {selected.email && selected.email !== '-' && <span className="flex items-center gap-1"><Mail size={11}/>{selected.email}</span>}
                  <span className="flex items-center gap-1"><Calendar size={11}/>{selected.totalVisits} visits</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {[{label:'Weight',val:latestAllVitals.weight?`${latestAllVitals.weight} kg`:null},{label:'Height',val:latestAllVitals.height?`${latestAllVitals.height} cm`:null},{label:'BP',val:latestAllVitals.bp||null},{label:'Pulse',val:latestAllVitals.pulse?`${latestAllVitals.pulse} bpm`:null},{label:'Temp',val:latestAllVitals.temperature?`${latestAllVitals.temperature}°C`:null}].filter(v=>v.val).map(v=>(
                    <span key={v.label} className="px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>{v.label}: <strong>{v.val}</strong></span>
                  ))}
                  {health.bloodGroup && <span className="px-2 py-0.5 rounded-full" style={{background:'#fff0f0',color:'#dc2626'}}>BG: <strong>{health.bloodGroup}</strong></span>}
                  {health.allergies && <span className="px-2 py-0.5 rounded-full" style={{background:'#fff7ed',color:'#ea580c'}}>⚠ {health.allergies}</span>}
                  <span className="text-gray-400">as of {formatUSDate(latestAllVitals.recordedAt)}</span>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-black/5 flex-shrink-0 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${activeTab===t.key?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>{t.label}</button>
              ))}
            </div>

            {/* Tab content — ALL tabs live inside this div */}
            <div className="flex-1 overflow-y-auto">

              {/* VISITS */}
              {activeTab==='visits' && (
                <div className="divide-y divide-black/5">
                  {selected.visits.sort((a,b)=>(b.appointmentDate||'').localeCompare(a.appointmentDate||'')).map(v=>{
                    const vit = aptVitals.find(av => av.id === v.id);
                    return (
                      <div key={v.id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-[13px] font-medium text-navy">{formatUSDate(v.appointmentDate)}</div>
                            <div className="text-[12px] text-gray-500 mt-0.5">{v.appointmentTime}{v.visitType?` · ${v.visitType}`:''}{v.reason?` · ${v.reason}`:''}</div>
                            {(v as any).mr_number && <div className="text-[10px] font-mono text-amber-600 mt-0.5">MR# {(v as any).mr_number}</div>}
                          </div>
                          <StatusPill status={v.status}/>
                        </div>
                        {vit && (vit.visit_weight || vit.visit_bp) && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                            {vit.visit_weight && <span className="px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>⚖ {vit.visit_weight}kg</span>}
                            {vit.visit_height && <span className="px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>📏 {vit.visit_height}cm</span>}
                            {vit.visit_bp && <span className="px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>❤ BP {vit.visit_bp}</span>}
                            {vit.visit_pulse && <span className="px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>💓 {vit.visit_pulse}bpm</span>}
                            {vit.visit_temperature && <span className="px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>🌡 {vit.visit_temperature}°C</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* HEALTH */}
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
                      {[{label:'Allergies',val:health.allergies,bg:'#fff7ed',border:'#fed7aa',color:'#ea580c'},{label:'Medical Conditions',val:health.conditions,bg:'#f0fdf4',border:'#bbf7d0',color:'#16a34a'},{label:'Doctor Notes',val:health.notes,bg:'#f8f8f8',border:'#e5e7eb',color:'#374151'}].map(f=>(
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
                        <select value={draft.bloodGroup} onChange={e=>setDraft(p=>({...p,bloodGroup:e.target.value}))} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                          {BLOOD_GROUPS.map(g=><option key={g} value={g}>{g||'Select...'}</option>)}
                        </select>
                      </div>
                      {[{label:'Allergies',key:'allergies',placeholder:'e.g. Penicillin, Peanuts'},{label:'Medical Conditions',key:'conditions',placeholder:'e.g. Asthma, Diabetes'},{label:'Doctor Notes',key:'notes',placeholder:'General notes...'}].map(f=>(
                        <div key={f.key}>
                          <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{f.label}</label>
                          <textarea rows={f.key==='notes'?4:2} placeholder={f.placeholder} value={(draft as any)[f.key]||''} onChange={e=>setDraft(p=>({...p,[f.key]:e.target.value}))} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold resize-none"/>
                        </div>
                      ))}
                      <button onClick={saveHealthRecord} className="btn-gold gap-1.5 text-[12px] py-2 px-4 w-full justify-center"><Save size={13}/> Save Health Record</button>
                    </>
                  )}
                </div>
              )}

              {/* GROWTH & VITALS */}
              {activeTab==='growth' && (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-medium text-navy">Growth & Vital Signs</div>
                    <button onClick={()=>setShowVitalsForm(!showVitalsForm)} className="btn-gold text-[11px] py-1.5 px-3 gap-1"><Plus size={11}/> Record Vitals</button>
                  </div>
                  {showVitalsForm && (
                    <div className="rounded-xl p-4" style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.25)'}}>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {[{label:'Date',key:'recordedAt',type:'date'},{label:'Weight (kg)',key:'weight',type:'number',placeholder:'18.5'},{label:'Height (cm)',key:'height',type:'number',placeholder:'105'},{label:'BP',key:'bp',type:'text',placeholder:'110/70'},{label:'Pulse (bpm)',key:'pulse',type:'number',placeholder:'88'},{label:'Temp (°C)',key:'temperature',type:'number',placeholder:'37.2'}].map(f=>(
                          <div key={f.key}>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">{f.label}</label>
                            <input type={f.type} placeholder={(f as any).placeholder||''} value={(newVitals as any)[f.key]||''} onChange={e=>setNewVitals(p=>({...p,[f.key]:e.target.value}))} className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        ))}
                      </div>
                      <button onClick={saveVitals} className="btn-gold text-[11px] py-1.5 px-4 gap-1"><Save size={11}/> Save Vitals</button>
                    </div>
                  )}
                  {allVitals.length > 0 ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-2">Vitals History</div>
                      <div className="space-y-2">
                        {allVitals.map((v,i)=>(
                          <div key={i} className="rounded-lg p-3 flex flex-wrap gap-3 text-[12px]" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.1)'}}>
                            <span className="font-medium text-navy">{formatUSDate(v.recordedAt)}</span>
                            {(v as any)._source === 'visit' && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{background:'#dbeafe',color:'#1d4ed8'}}>Visit</span>}
                            {v.weight && <span className="text-gray-600">⚖ {v.weight}kg</span>}
                            {v.height && <span className="text-gray-600">📏 {v.height}cm</span>}
                            {v.bp && <span className="text-gray-600">❤ BP {v.bp}</span>}
                            {v.pulse && <span className="text-gray-600">💓 {v.pulse}bpm</span>}
                            {v.temperature && <span className="text-gray-600">🌡 {v.temperature}°C</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <div className="text-center py-8 text-gray-400 text-[13px]">No vitals recorded yet</div>}
                  <WHOGrowthChart vitals={allVitals} gender={(health as any).gender || selected.gender} ageMonths={selected.age ? Math.round(parseFloat(selected.age)*12) : undefined}/>
                </div>
              )}

              {/* BILLING */}
              {activeTab==='billing' && (
                <div className="p-5 space-y-3">
                  {loadingBilling ? <div className="text-center py-8 text-gray-400 text-[13px]">Loading...</div>
                  : patientInvoices.length===0 ? <div className="text-center py-8 text-gray-400 text-[13px]">No invoices</div>
                  : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[{label:'Total Paid',val:`PKR ${patientInvoices.reduce((s,i)=>s+(Number(i.amount_paid)||0),0).toLocaleString()}`,color:'#1a7f5e'},{label:'Total Billed',val:`PKR ${patientInvoices.reduce((s,i)=>s+(Number(i.consultation_fee)||0),0).toLocaleString()}`,color:'#0a1628'},{label:'Invoices',val:patientInvoices.length,color:'#c9a84c'}].map(s=>(
                          <div key={s.label} className="rounded-xl p-3 text-center" style={{background:'#f9f7f3'}}>
                            <div className="text-[18px] font-bold" style={{color:s.color}}>{s.val}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {patientInvoices.map(inv=>{
                        const fee=Number(inv.consultation_fee)||0, disc=Number(inv.discount)||0, paid=Number(inv.amount_paid)||0, due=Math.max(0,fee-disc-paid), st=inv.payment_status||'Unpaid';
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

              {/* PRESCRIPTIONS */}
              {activeTab==='prescriptions' && (
                <div className="p-5 space-y-3">
                  {allRx.length===0 ? <div className="text-center py-8 text-gray-400 text-[13px]">No prescriptions</div>
                  : allRx.map(rx=>(
                    <div key={rx.id} className="rounded-xl p-4" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.12)'}}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-mono text-[11px] text-gray-400">{rx.id}</div>
                        <div className="text-[12px] text-navy">{formatUSDate(rx.date)}</div>
                      </div>
                      {rx.diagnosis && <div className="text-[13px] font-medium text-navy mb-2">{rx.diagnosis}</div>}
                      <div className="flex flex-wrap gap-1.5">
                        {(rx.medicines||[]).map((m: any) => (
                          <span key={m.id||m.name} className="text-[11px] bg-white border border-black/10 text-navy px-2 py-0.5 rounded font-medium">{m.name} · {m.frequency}</span>
                        ))}
                      </div>
                      {rx.advice && <div className="text-[11px] text-gray-500 mt-2">{rx.advice}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* AI SCRIBE NOTES */}
              {activeTab==='scribe' && (
                <div className="p-5 space-y-3">
                  {scribeOutputs.length===0 ? (
                    <div className="text-center py-8">
                      <Bot size={32} className="mx-auto mb-2 text-gray-300"/>
                      <div className="text-gray-400 text-[13px]">No AI notes saved yet</div>
                      <div className="text-gray-300 text-[11px] mt-1">Generate and save notes in the AI Scribe tab</div>
                    </div>
                  ) : scribeOutputs.map((s, i) => {
                    const color = SCRIBE_COLORS[s.mode] || '#6b7280';
                    const modeLabel = s.mode === 'soap' ? 'SOAP Note' : s.mode === 'prescription' ? 'Prescription' : s.mode === 'discharge' ? 'Discharge Summary' : s.mode === 'referral' ? 'Referral Letter' : s.mode;
                    return (
                      <div key={s.id||i} className="rounded-xl overflow-hidden cursor-pointer" style={{border:`1px solid ${color}33`}} onClick={()=>setSelectedScribe(s)}>
                        <div className="flex items-center justify-between px-4 py-2.5" style={{background:`${color}11`}}>
                          <div className="flex items-center gap-2">
                            <Bot size={13} style={{color}}/>
                            <span className="text-[12px] font-semibold" style={{color}}>{modeLabel}</span>
                          </div>
                          <span className="text-[11px] text-gray-400">{s.generated_at ? new Date(s.generated_at).toLocaleDateString() : formatUSDate(s.created_at?.slice(0,10)||'')}</span>
                        </div>
                        <div className="px-4 py-3 max-h-48 overflow-y-auto">
                          {(s.output||'').split('\n').slice(0,12).map((line: string, j: number) => {
                            if (line.startsWith('**') && line.endsWith('**')) return <div key={j} className="text-[11px] font-bold mt-2 mb-0.5" style={{color}}>{line.replace(/\*\*/g,'')}</div>;
                            return <div key={j} className="text-[12px] text-gray-600">{line}</div>;
                          })}
                          {(s.output||'').split('\n').length > 12 && <div className="text-[11px] text-gray-400 mt-1">... {(s.output||'').split('\n').length - 12} more lines</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PROCEDURES */}
              {activeTab==='procedures' && (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-medium text-navy">Procedures Performed</div>
                    <button onClick={()=>{setProcedureForm({procedure_name:'',procedure_type:'',tier:'',indication:'',site:'',laterality:'N/A',anaesthesia_type:'None',anaesthesia_agent:'',equipment:'',technique:'',specimen_collected:'No',consent_obtained:'Yes - Parent/Guardian',patient_education:'Yes',start_time:'',end_time:'',ebl:'',cpt_code:'',icd10_code:'',immediate_outcome:'Successful',complications:'None',patient_tolerance:'Good',additional_notes:'',performed_by:'',notes:'',status:'Completed',date:new Date().toISOString().split('T')[0]});setShowProcedureForm(true);}}
                      className="btn-gold text-[11px] py-1.5 px-3 gap-1"><Plus size={11}/> Add Procedure</button>
                  </div>

                  {showProcedureForm && (()=>{
                    const name=(procedureForm.procedure_name||'').toLowerCase();
                    const T1=['nebulisation','nebulization','injection','iv cannula','cannula','dressing','ear syringing','backslab','back slab','splint','wound care','enema','oxygen'];
                    const T3=['surgery','sedation','anaesthesia','anesthesia','lumbar puncture','biopsy','scope','endoscopy','hair transplant','circumcision','drainage','incision','intubation','central line'];
                    const autoTier=T3.some(t=>name.includes(t))?'3':T1.some(t=>name.includes(t))?'1':'2';
                    const tier=procedureForm.tier||autoTier;
                    const fi=(label:string,key:string,opts:{type?:string;placeholder?:string;span?:boolean}={})=>(<div key={key} className={opts.span?'col-span-2':''}><label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">{label}</label><input type={opts.type||'text'} placeholder={opts.placeholder||''} value={procedureForm[key]||''} onChange={e=>setProcedureForm(p=>({...p,[key]:e.target.value}))} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[12px] text-navy bg-white outline-none focus:border-gold"/></div>);
                    const se=(label:string,key:string,opts:string[],span?:boolean)=>(<div key={key} className={span?'col-span-2':''}><label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">{label}</label><select value={procedureForm[key]||''} onChange={e=>setProcedureForm(p=>({...p,[key]:e.target.value}))} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[12px] text-navy bg-white outline-none focus:border-gold">{opts.map(o=><option key={o} value={o}>{o}</option>)}</select></div>);
                    const ta=(label:string,key:string,ph:string)=>(<div key={key} className="col-span-2"><label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">{label}</label><textarea rows={2} placeholder={ph} value={procedureForm[key]||''} onChange={e=>setProcedureForm(p=>({...p,[key]:e.target.value}))} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[12px] text-navy bg-white outline-none focus:border-gold resize-none"/></div>);
                    return (
                      <div className="rounded-xl p-4 space-y-4" style={{background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.25)'}}>
                        <div className="flex items-center justify-between">
                          <div className="text-[12px] font-semibold text-navy">New Procedure</div>
                          <div className="flex gap-1">{([['1','Quick'],['2','Minor'],['3','Major']] as [string,string][]).map(([tv,lv])=>(<button key={tv} onClick={()=>setProcedureForm(p=>({...p,tier:tv}))} className="px-2.5 py-1 rounded-lg text-[10px] font-medium" style={{background:tier===tv?'#0a1628':'rgba(0,0,0,0.05)',color:tier===tv?'#fff':'#6b7280'}}>{lv}</button>))}</div>
                        </div>
                        {procedureForm.procedure_name&&(<div className="text-[10px] px-2 py-1 rounded" style={{background:'rgba(59,130,246,0.08)',color:'#3b82f6'}}>Auto-detected: Tier {autoTier} — {autoTier==='1'?'Quick':autoTier==='3'?'Major':'Minor'} Procedure</div>)}
                        <div className="grid grid-cols-2 gap-3">
                          {fi('Procedure Name *','procedure_name',{placeholder:'e.g. Nebulisation, Backslab, Biopsy',span:true})}
                          {fi('Date *','date',{type:'date'})}
                          {fi('Performed By','performed_by',{placeholder:'e.g. Dr. Talha'})}
                          {se('Status','status',['Completed','In Progress','Planned','Abandoned'])}
                          {se('Outcome','immediate_outcome',['Successful','Partial','Unsuccessful','Complication'])}
                          {tier>='2'&&se('Patient Tolerance','patient_tolerance',['Good','Fair','Poor'])}
                          {tier>='2'&&fi('Indication','indication',{placeholder:'e.g. Bronchospasm, Fracture',span:true})}
                          {tier>='2'&&fi('Site','site',{placeholder:'e.g. Right forearm'})}
                          {tier>='2'&&se('Laterality','laterality',['N/A','Left','Right','Bilateral'])}
                          {tier>='2'&&se('Anaesthesia','anaesthesia_type',['None','Local','Topical','Sedation','General'])}
                          {tier>='2'&&procedureForm.anaesthesia_type!=='None'&&fi('Agent','anaesthesia_agent',{placeholder:'e.g. Lidocaine 1%'})}
                          {tier>='2'&&fi('Equipment','equipment',{placeholder:'e.g. 22G cannula, POP cast',span:true})}
                          {tier>='2'&&se('Specimen','specimen_collected',['No','Yes - Lab','Yes - Bedside'])}
                          {tier>='3'&&se('Consent','consent_obtained',['Yes - Parent/Guardian','Yes - Patient','Not Required'])}
                          {tier>='3'&&fi('Start Time','start_time',{type:'time'})}
                          {tier>='3'&&fi('End Time','end_time',{type:'time'})}
                          {tier>='3'&&fi('Est. Blood Loss','ebl',{placeholder:'e.g. Minimal'})}
                          {tier>='3'&&fi('CPT Code','cpt_code',{placeholder:'e.g. 36000'})}
                          {tier>='3'&&fi('ICD-10','icd10_code',{placeholder:'e.g. J45.9'})}
                          {se('Complications','complications',['None','Minor Bleeding','Vasovagal','Infection Risk','Failed Attempt','Pain','Other'])}
                          {ta('Clinical Notes','notes','Findings, technique, patient response...')}
                          {ta('Post-procedure Instructions','additional_notes','Instructions for parent/patient...')}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button disabled={savingProcedure||!procedureForm.procedure_name} onClick={async()=>{
                            if(!selected||!procedureForm.procedure_name)return;
                            setSavingProcedure(true);
                            const id=`PROC-${Date.now().toString(36).toUpperCase()}`;
                            try{
                              const apt=selected.visits.find(v=>v.appointmentDate===procedureForm.date);
                              const row:Record<string,any>={id,mr_number:selected.mrNumber||null,child_name:selected.name,parent_name:selected.parentName,appointment_id:apt?.id||null,appointment_date:procedureForm.date,date:procedureForm.date};
                              ['procedure_name','procedure_type','tier','indication','site','laterality','anaesthesia_type','anaesthesia_agent','equipment','technique','specimen_collected','consent_obtained','start_time','end_time','ebl','cpt_code','icd10_code','immediate_outcome','complications','patient_tolerance','performed_by','notes','additional_notes','status'].forEach(k=>{if(procedureForm[k])row[k]=procedureForm[k];});
                              await supabase.from('procedures').insert([row]);
                              setProcedures(prev=>[{...row,created_at:new Date().toISOString()},...prev]);
                              setShowProcedureForm(false);toast.success('Procedure saved');
                            }catch(err:any){toast.error('Failed: '+err.message);}
                            finally{setSavingProcedure(false);}
                          }} className="btn-gold text-[11px] py-1.5 px-4 gap-1"><Save size={11}/> {savingProcedure?'Saving...':'Save Procedure'}</button>
                          <button onClick={()=>setShowProcedureForm(false)} className="btn-outline text-[11px] py-1.5 px-3">Cancel</button>
                        </div>
                      </div>
                    );
                  })()}

                  {procedures.length===0&&!showProcedureForm
                    ? <div className="text-center py-8 text-gray-400 text-[13px]">No procedures recorded</div>
                   : procedures.map((p,i)=>(
  <div key={p.id||i} className="rounded-xl overflow-hidden" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.18)'}}>
    
    {/* Header bar */}
    <div className="flex items-start justify-between px-4 py-3" style={{background:'rgba(201,168,76,0.08)',borderBottom:'1px solid rgba(201,168,76,0.15)'}}>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-[14px] font-bold text-navy">{p.procedure_name}</div>
          {p.tier && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:'#0a1628',color:'#c9a84c'}}>Tier {p.tier} — {p.tier==='1'?'Quick':p.tier==='3'?'Major':'Minor'}</span>}
          {p.immediate_outcome && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{background:p.immediate_outcome==='Successful'?'#dcfce7':p.immediate_outcome==='Complication'?'#fee2e2':'#fff7ed',color:p.immediate_outcome==='Successful'?'#166534':p.immediate_outcome==='Complication'?'#991b1b':'#92400e'}}>{p.immediate_outcome}</span>}
          {p.status && p.status!=='Completed' && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#f3f4f6',color:'#6b7280'}}>{p.status}</span>}
        </div>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {p.complications && p.complications!=='None' && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#fee2e2',color:'#991b1b'}}>⚠ {p.complications}</span>}
          {p.anaesthesia_type && p.anaesthesia_type!=='None' && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#f3e8ff',color:'#7c3aed'}}>Anaes: {p.anaesthesia_type}{p.anaesthesia_agent?` (${p.anaesthesia_agent})`:''}</span>}
          {p.site && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#f3f4f6',color:'#6b7280'}}>📍 {p.site}{p.laterality&&p.laterality!=='N/A'?` (${p.laterality})`:''}</span>}
          {p.specimen_collected && p.specimen_collected!=='No' && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#f0fdf4',color:'#166534'}}>🧪 {p.specimen_collected}</span>}
          {p.patient_tolerance && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#f3f4f6',color:'#6b7280'}}>Tolerance: {p.patient_tolerance}</span>}
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        <div className="text-[12px] font-semibold text-navy">{formatUSDate(p.date||p.appointment_date)}</div>
        {p.performed_by && <div className="text-[11px] text-gray-500 mt-0.5">By: {p.performed_by}</div>}
        {(p.start_time||p.end_time) && <div className="text-[10px] text-gray-400 mt-0.5">{p.start_time&&`Start: ${p.start_time}`}{p.start_time&&p.end_time&&' · '}{p.end_time&&`End: ${p.end_time}`}</div>}
        <div className="flex gap-1 mt-2 justify-end">
          <button onClick={()=>{navigator.clipboard.writeText([`PROCEDURE REPORT`,`Patient: ${selected?.name} (MR# ${selected?.mrNumber||'-'})`,`Procedure: ${p.procedure_name}`,`Date: ${p.date}`,p.performed_by?`Performed By: ${p.performed_by}`:'',p.tier?`Tier: ${p.tier}`:'',p.immediate_outcome?`Outcome: ${p.immediate_outcome}`:'',p.indication?`Indication: ${p.indication}`:'',p.site?`Site: ${p.site}${p.laterality&&p.laterality!=='N/A'?` (${p.laterality})`:''}`:'' ,p.anaesthesia_type&&p.anaesthesia_type!=='None'?`Anaesthesia: ${p.anaesthesia_type}${p.anaesthesia_agent?` - ${p.anaesthesia_agent}`:''}`:'' ,p.equipment?`Equipment: ${p.equipment}`:'',p.technique?`Technique: ${p.technique}`:'',p.ebl?`Est. Blood Loss: ${p.ebl}`:'',p.cpt_code?`CPT: ${p.cpt_code}`:'',p.icd10_code?`ICD-10: ${p.icd10_code}`:'',p.complications&&p.complications!=='None'?`Complications: ${p.complications}`:'',p.consent_obtained?`Consent: ${p.consent_obtained}`:'',p.specimen_collected&&p.specimen_collected!=='No'?`Specimen: ${p.specimen_collected}`:'',p.notes?`\nNotes:\n${p.notes}`:'',p.additional_notes?`\nPost-procedure:\n${p.additional_notes}`:''].filter(Boolean).join('\n'));toast.success('Copied!');}} className="text-[10px] px-2.5 py-1 rounded-lg font-medium" style={{background:'rgba(201,168,76,0.15)',color:'#a07a2a',border:'1px solid rgba(201,168,76,0.3)'}}>Copy</button>
          <button onClick={()=>{
            const rows = [
              ['Patient', `${selected?.name} (MR# ${selected?.mrNumber||'-'})`],
              ['Parent', selected?.parentName||'-'],
              ['Age', selected?.age||'-'],
              ['Procedure', p.procedure_name],
              ['Date', formatUSDate(p.date||p.appointment_date)],
              p.performed_by ? ['Performed By', p.performed_by] : null,
              p.tier ? ['Procedure Tier', `Tier ${p.tier} — ${p.tier==='1'?'Quick Procedure':p.tier==='3'?'Major Procedure':'Minor Procedure'}`] : null,
              p.procedure_type ? ['Procedure Type', p.procedure_type] : null,
              p.status ? ['Status', p.status] : null,
              p.immediate_outcome ? ['Outcome', p.immediate_outcome] : null,
              p.patient_tolerance ? ['Patient Tolerance', p.patient_tolerance] : null,
              p.indication ? ['Indication', p.indication] : null,
              p.site ? ['Site', `${p.site}${p.laterality&&p.laterality!=='N/A'?` (${p.laterality})`:''}` ] : null,
              p.anaesthesia_type && p.anaesthesia_type!=='None' ? ['Anaesthesia', `${p.anaesthesia_type}${p.anaesthesia_agent?` — ${p.anaesthesia_agent}`:''}` ] : null,
              p.equipment ? ['Equipment Used', p.equipment] : null,
              p.technique ? ['Technique', p.technique] : null,
              p.start_time ? ['Start Time', p.start_time] : null,
              p.end_time ? ['End Time', p.end_time] : null,
              p.ebl ? ['Est. Blood Loss', p.ebl] : null,
              p.specimen_collected && p.specimen_collected!=='No' ? ['Specimen Collected', p.specimen_collected] : null,
              p.consent_obtained ? ['Consent', p.consent_obtained] : null,
              p.patient_education ? ['Patient Education', p.patient_education] : null,
              p.cpt_code ? ['CPT Code', p.cpt_code] : null,
              p.icd10_code ? ['ICD-10 Code', p.icd10_code] : null,
              p.complications && p.complications!=='None' ? ['Complications', p.complications] : null,
            ].filter(Boolean) as [string,string][];
            const rowsHtml = rows.map(([l,v])=>`<tr><td class="lbl">${l}</td><td class="val">${v}</td></tr>`).join('');
            const w = window.open('','_blank');
            if(!w)return;
            w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Procedure Report — ${p.procedure_name}</title><style>
              *{box-sizing:border-box;margin:0;padding:0}
              body{font-family:Arial,sans-serif;color:#0a1628;padding:36px;font-size:13px;max-width:750px;margin:0 auto}
              .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #c9a84c}
              .clinic{font-size:18px;font-weight:700;color:#0a1628}
              .clinic-sub{font-size:11px;color:#6b7280;margin-top:2px}
              .title{font-size:22px;font-weight:700;color:#c9a84c;text-align:right}
              .patient-bar{background:#f9f7f3;border:1px solid rgba(201,168,76,0.3);border-radius:8px;padding:12px 16px;margin-bottom:20px;display:flex;gap:24px;flex-wrap:wrap}
              .pb-item{font-size:12px}.pb-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:2px}.pb-val{font-weight:600;color:#0a1628}
              .section{margin-bottom:20px}
              .section-title{font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:#c9a84c;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid rgba(201,168,76,0.2)}
              table{width:100%;border-collapse:collapse}
              td.lbl{width:38%;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;padding:7px 10px;vertical-align:top;border-bottom:1px solid #f3f4f6}
              td.val{font-size:13px;font-weight:500;color:#0a1628;padding:7px 10px;border-bottom:1px solid #f3f4f6}
              .notes-box{background:#f8f8f8;border:1px solid #e5e7eb;border-radius:6px;padding:12px;font-size:13px;line-height:1.7;margin-top:4px;white-space:pre-wrap}
              .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${p.immediate_outcome==='Successful'?'#dcfce7':p.immediate_outcome==='Complication'?'#fee2e2':'#fff7ed'};color:${p.immediate_outcome==='Successful'?'#166534':p.immediate_outcome==='Complication'?'#991b1b':'#92400e'}}
              .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
              @media print{body{padding:20px}}
            </style></head><body>
            <div class="header">
              <div><div class="clinic">MediPlex Pediatric Centre</div><div class="clinic-sub">Procedure Report</div></div>
              <div><div class="title">${p.procedure_name}</div><div style="font-size:11px;color:#6b7280;text-align:right;margin-top:4px">${formatUSDate(p.date||p.appointment_date)}</div>${p.immediate_outcome?`<div style="text-align:right;margin-top:4px"><span class="badge">${p.immediate_outcome}</span></div>`:''}</div>
            </div>
            <div class="patient-bar">
              <div class="pb-item"><div class="pb-lbl">Patient</div><div class="pb-val">${selected?.name}</div></div>
              <div class="pb-item"><div class="pb-lbl">MR Number</div><div class="pb-val">${selected?.mrNumber||'-'}</div></div>
              <div class="pb-item"><div class="pb-lbl">Age</div><div class="pb-val">${selected?.age||'-'}</div></div>
              <div class="pb-item"><div class="pb-lbl">Parent</div><div class="pb-val">${selected?.parentName||'-'}</div></div>
              ${p.performed_by?`<div class="pb-item"><div class="pb-lbl">Performed By</div><div class="pb-val">${p.performed_by}</div></div>`:''}
            </div>
            <div class="section">
              <div class="section-title">Procedure Details</div>
              <table>${rowsHtml}</table>
            </div>
            ${p.notes?`<div class="section"><div class="section-title">Clinical Notes</div><div class="notes-box">${p.notes}</div></div>`:''}
            ${p.additional_notes?`<div class="section"><div class="section-title">Post-Procedure Instructions</div><div class="notes-box">${p.additional_notes}</div></div>`:''}
            <div class="footer">MediPlex Pediatric Centre · Generated ${new Date().toLocaleString()} · Confidential</div>
            </body></html>`);
            w.document.close();
            setTimeout(()=>w.print(),500);
          }} className="text-[10px] px-2.5 py-1 rounded-lg font-medium" style={{background:'rgba(43,108,176,0.1)',color:'#1d4ed8',border:'1px solid rgba(43,108,176,0.2)'}}>Print</button>
        </div>
      </div>
    </div>

    {/* All filled fields body */}
    <div className="px-4 py-3 space-y-1.5">
      {[
        p.indication       && { label:'Indication',       val:p.indication },
        p.equipment        && { label:'Equipment',        val:p.equipment },
        p.technique        && { label:'Technique',        val:p.technique },
        p.ebl              && { label:'Est. Blood Loss',  val:p.ebl },
        p.cpt_code         && { label:'CPT Code',         val:`${p.cpt_code}${p.icd10_code?` · ICD-10: ${p.icd10_code}`:''}` },
        p.consent_obtained && { label:'Consent',          val:p.consent_obtained },
      ].filter(Boolean).map((f:any)=>(
        <div key={f.label} className="flex gap-2 text-[12px]">
          <span className="text-gray-400 font-medium flex-shrink-0" style={{minWidth:120}}>{f.label}:</span>
          <span className="text-navy">{f.val}</span>
        </div>
      ))}
      {p.notes && (
        <div className="mt-2 pt-2 border-t border-black/5">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Clinical Notes</div>
          <div className="text-[12px] text-gray-700 whitespace-pre-wrap">{p.notes}</div>
        </div>
      )}
      {p.additional_notes && (
        <div className="mt-2 pt-2 border-t border-black/5">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Post-Procedure Instructions</div>
          <div className="text-[12px] text-gray-700 whitespace-pre-wrap">{p.additional_notes}</div>
        </div>
      )}
    </div>
  </div>
))
                  }
                </div>
              )}


              {/* TELEHEALTH */}
              {activeTab==='vaccines' && (
                <div className="p-5">
                  <VaccinationSchedule mrNumber={selected.mrNumber} childName={selected.name} dobString={patientDob}/>
                </div>
              )}

              {activeTab==='telehealth' && (
                <div className="p-5">
                  <TelehealthHistory mrNumber={selected.mrNumber} childName={selected.name}/>
                </div>
              )}

              {/* LABS */}
              {activeTab==='labs' && (
                <div className="p-5">
                  <LabResultsWithPrint childName={selected.name} mrNumber={selected.mrNumber} patientAge={selected.age} parentName={selected.parentName} visitDate={new Date().toISOString().split('T')[0]}/>
                </div>
              )}

              {/* CONSENT FORMS */}
              {activeTab==='consent' && (
                <div className="p-5">
                  <ConsentForms childName={selected.name} parentName={selected.parentName} childAge={selected.age} mrNumber={selected.mrNumber} clinicName="MediPlex Pediatric Centre" doctorName="Dr. Talha"/>
                </div>
              )}

            </div>{/* end flex-1 overflow-y-auto */}
          </div>{/* end card */}
        </div>
      )}{/* end selected modal */}

      {/* SCRIBE FULL VIEW POPUP */}
      {selectedScribe && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{background:'rgba(10,22,40,0.85)'}} onClick={()=>setSelectedScribe(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden" style={{background:'#1e293b',border:'1px solid rgba(255,255,255,0.12)'}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{borderColor:'rgba(255,255,255,0.08)',background:`${SCRIBE_COLORS[selectedScribe.mode]||'#6b7280'}22`}}>
              <div className="flex items-center gap-2">
                <Bot size={16} style={{color:SCRIBE_COLORS[selectedScribe.mode]||'#6b7280'}}/>
                <span className="font-semibold text-white">{selectedScribe.mode==='soap'?'SOAP Note':selectedScribe.mode==='prescription'?'Prescription':selectedScribe.mode==='discharge'?'Discharge Summary':selectedScribe.mode==='referral'?'Referral Letter':selectedScribe.mode}</span>
                <span className="text-xs text-white/40">{selectedScribe.generated_at ? new Date(selectedScribe.generated_at).toLocaleDateString() : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>{navigator.clipboard.writeText(selectedScribe.output||'');toast.success('Copied!');}} className="text-xs px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)'}}>Copy</button>
                <button onClick={()=>{const w=window.open('','_blank');if(!w)return;const col=SCRIBE_COLORS[selectedScribe.mode]||'#6b7280';const lbl=selectedScribe.mode==='soap'?'SOAP Note':selectedScribe.mode==='discharge'?'Discharge Summary':selectedScribe.mode==='referral'?'Referral Letter':'Prescription';w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+lbl+'</title><style>body{font-family:Arial;padding:30px;max-width:800px;margin:0 auto;color:#0a1628}.hdr{background:#0a1628;color:#fff;padding:14px 20px;border-radius:8px 8px 0 0}.body{border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px}.info{background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:8px 14px;margin-bottom:16px;font-size:12px}.sec{font-weight:700;font-size:11px;color:'+col+';margin-top:14px;margin-bottom:3px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;padding-bottom:3px}.line{font-size:13px;margin:2px 0;line-height:1.6}.tbl{font-family:monospace;font-size:11px;color:#555}.warn{color:#ea580c;font-weight:600}@media print{body{padding:10px}}</style></head><body><div class="hdr"><div style="font-size:16px;font-weight:700">MediPlex Pediatric Centre</div><div style="font-size:11px;opacity:0.6">'+lbl+'</div></div><div class="body"><div class="info">Patient: <strong>'+(selected?.name||'')+'</strong> · Age: '+(selected?.age||'-')+' · MR#: '+(selected?.mrNumber||'-')+'</div>'+(selectedScribe.output||'').split('\n').map((line:string)=>line.startsWith('**')&&line.endsWith('**')?'<div class="sec">'+line.replace(/\*\*/g,'')+'</div>':line.startsWith('|')?'<div class="tbl">'+line+'</div>':line.includes('⚠️')?'<div class="warn">'+line+'</div>':'<div class="line">'+line+'</div>').join('')+'</div></body></html>');w.document.close();setTimeout(()=>w.print(),400);}} className="text-xs px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)'}}>Print</button>
                <button onClick={()=>setSelectedScribe(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10"><X size={14}/></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {(selectedScribe.output||'').split('\n').map((line:string,i:number)=>{
                const color=SCRIBE_COLORS[selectedScribe.mode]||'#6b7280';
                if(line.startsWith('**')&&line.endsWith('**')) return <div key={i} className="font-bold text-sm mt-4 mb-1.5 pb-1 border-b" style={{color,borderColor:'rgba(255,255,255,0.08)'}}>{line.replace(/\*\*/g,'')}</div>;
                if(line.startsWith('|')) return <div key={i} className="text-xs font-mono text-white/60 border-b py-0.5" style={{borderColor:'rgba(255,255,255,0.05)'}}>{line}</div>;
                if(line.startsWith('- ')||line.startsWith('• ')) return <div key={i} className="text-xs text-white/65 ml-2 my-0.5">{line}</div>;
                if(line.includes('⚠️')) return <div key={i} className="text-xs font-medium my-1 px-2 py-1 rounded" style={{background:'rgba(239,68,68,0.1)',color:'#f87171'}}>{line}</div>;
                return <div key={i} className="text-[13px] text-white/75 my-0.5">{line}</div>;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}