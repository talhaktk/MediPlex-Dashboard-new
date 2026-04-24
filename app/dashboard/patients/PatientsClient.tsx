'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Appointment } from '@/types';
import { formatUSDate, syncHealthToDb, syncVitalsToDb } from '@/lib/sheets';
import { supabase } from '@/lib/supabase';
import { useClinic, withClinicFilter, withClinicId } from '@/lib/clinicContext';
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
    const { clinicId, isSuperAdmin, modules, role } = useClinic();
const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PatientRecord | null>(null);
  const [health, setHealthState] = useState<HealthRecord>(emptyHealth());
  const [activeTab, setActiveTab] = useState<string>('visits');
  const [editHealth, setEditHealth] = useState(false);
  const [draft, setDraft] = useState<HealthRecord>(emptyHealth());
  const [newVitals, setNewVitals] = useState<Partial<VitalSigns>>({ weight:'', height:'', bp:'', pulse:'', temperature:'', recordedAt: new Date().toISOString().split('T')[0] });
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showAssessForm, setShowAssessForm] = useState(false);
  const [assessForm, setAssessForm] = useState<Record<string,any>>({});
  const [assessments, setAssessments] = useState<any[]>([]);
  const [patientInvoices, setPatientInvoices] = useState<any[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [dbVitals, setDbVitals] = useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = useState<any>(null);
  useEffect(()=>{ supabase.from('clinic_settings').select('clinic_name,doctor_name').eq('id',1).maybeSingle().then(({data})=>{if(data)setClinicSettings(data);}); },[]);
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
      ? supabase.from('appointments').select('id,appointment_date,created_at,visit_weight,visit_height,visit_bp,visit_pulse,visit_temperature').eq('mr_number', selected.mrNumber)
      : supabase.from('appointments').select('id,appointment_date,created_at,visit_weight,visit_height,visit_bp,visit_pulse,visit_temperature').ilike('child_name', selected.name);
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

  const saveAssessment = async () => {
    if (!selected) return;
    const { error } = await supabase.from('clinical_assessments').insert([{
      mr_number: selected.mrNumber || null,
      child_name: selected.name,
      clinic_id: clinicId || null,
      recorded_at: assessForm.recorded_at || new Date().toISOString().split('T')[0],
      pain_scale: assessForm.pain_scale ? Number(assessForm.pain_scale) : null,
      rom_flexion: assessForm.rom_flexion || null,
      rom_extension: assessForm.rom_extension || null,
      affected_joint: assessForm.affected_joint || null,
      bmi: assessForm.bmi ? Number(assessForm.bmi) : null,
      smoking_status: assessForm.smoking_status || null,
      fundal_height: assessForm.fundal_height || null,
      fhr: assessForm.fhr || null,
      gestational_age: assessForm.gestational_age || null,
      notes: assessForm.notes || null,
      ecg_findings: assessForm.ecg_findings || null,
      ejection_fraction: assessForm.ejection_fraction ? Number(assessForm.ejection_fraction) : null,
      cardiac_risk: assessForm.cardiac_risk || null,
      spo2: assessForm.spo2 ? Number(assessForm.spo2) : null,
      peak_flow: assessForm.peak_flow ? Number(assessForm.peak_flow) : null,
      spirometry: assessForm.spirometry || null,
      gcs_score: assessForm.gcs_score ? Number(assessForm.gcs_score) : null,
      nihss_score: assessForm.nihss_score ? Number(assessForm.nihss_score) : null,
      seizure_log: assessForm.seizure_log || null,
      hba1c: assessForm.hba1c ? Number(assessForm.hba1c) : null,
      blood_glucose: assessForm.blood_glucose ? Number(assessForm.blood_glucose) : null,
      phq9: assessForm.phq9 ? Number(assessForm.phq9) : null,
      gad7: assessForm.gad7 ? Number(assessForm.gad7) : null,
      egfr: assessForm.egfr ? Number(assessForm.egfr) : null,
      fluid_balance: assessForm.fluid_balance || null,
      cancer_stage: assessForm.cancer_stage || null,
      ecog_status: assessForm.ecog_status || null,
      das28: assessForm.das28 ? Number(assessForm.das28) : null,
      va_right: assessForm.va_right || null,
      va_left: assessForm.va_left || null,
      iop_right: assessForm.iop_right ? Number(assessForm.iop_right) : null,
      iop_left: assessForm.iop_left ? Number(assessForm.iop_left) : null,
      audiogram: assessForm.audiogram || null,
      tympanometry: assessForm.tympanometry || null,
      psa: assessForm.psa ? Number(assessForm.psa) : null,
      urine_flow: assessForm.urine_flow ? Number(assessForm.urine_flow) : null,
      wound_assessment: assessForm.wound_assessment || null,
      drain_output: assessForm.drain_output ? Number(assessForm.drain_output) : null,
      abpi_right: assessForm.abpi_right ? Number(assessForm.abpi_right) : null,
      abpi_left: assessForm.abpi_left ? Number(assessForm.abpi_left) : null,
      skin_score: assessForm.skin_score || null,
      cbc_summary: assessForm.cbc_summary || null,
      surgical_history: assessForm.surgical_history || null,
      implant_type: assessForm.implant_type || null,
      implant_date: assessForm.implant_date || null,
      lmp_date: assessForm.lmp_date || null,
      edd_date: assessForm.edd_date || null,
      gpa: assessForm.gpa || null,
      obstetric_history: assessForm.obstetric_history || null,
      chronic_conditions: assessForm.chronic_conditions || null,
      bp_reading: assessForm.bp_reading || null,
      family_history: assessForm.family_history || null,
    }]);
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success('Assessment saved');
    setShowAssessForm(false);
    setAssessForm({});
    // Refresh
    const aQ = selected.mrNumber
      ? supabase.from('clinical_assessments').select('*').eq('mr_number', selected.mrNumber).order('created_at',{ascending:false})
      : supabase.from('clinical_assessments').select('*').ilike('child_name', selected.name).order('created_at',{ascending:false});
    const { data: aRows } = await aQ;
    setAssessments(aRows || []);
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
    await syncVitalsToDb(selected.mrNumber, selected.name, {...vitalsRecord, pain_scale:(newVitals as any).pain_scale||null, rom_flexion:(newVitals as any).rom_flexion||null, rom_extension:(newVitals as any).rom_extension||null, fundal_height:(newVitals as any).fundal_height||null, fhr:(newVitals as any).fhr||null}, clinicId || undefined);
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
    const fromPatientVitals = dbVitals.map(dv => ({ weight:dv.weight, height:dv.height, bp:dv.bp, pulse:dv.pulse, temperature:dv.temperature, recordedAt:dv.recorded_at, createdAt:dv.created_at||dv.recorded_at, _source:'record' }));
    const fromApt = aptVitals.filter(av => av.visit_weight||av.visit_bp||av.visit_height||av.visit_pulse||av.visit_temperature).map(av => ({ weight:av.visit_weight||'', height:av.visit_height||'', bp:av.visit_bp||'', pulse:av.visit_pulse||'', temperature:av.visit_temperature||'', recordedAt:av.appointment_date, createdAt:av.created_at||av.appointment_date, _source:'visit' }));
    const combined = [...fromPatientVitals, ...fromApt];
    combined.sort((a,b) => ((b as any).createdAt||'').localeCompare((a as any).createdAt||''));
    return combined;
  }, [dbVitals, aptVitals]);

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
    ...(modules.telehealth !== false ? [{key:'telehealth',label:'Telehealth'}] : []),
    ...(modules.vaccines !== false ? [{key:'vaccines',label:'Vaccines'}] : []),
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
                        <div>
                          <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Date of Birth</label>
                          <input type="date" value={patientDob} onChange={e=>setPatientDob(e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                        </div>
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
                    {(['pain_scale','rom','bmi_calc','anc_record','surgical_history','implant_tracking','lmp_edd','obstetric_history','chronic_conditions','family_history','bp_history','ecg_findings','ejection_fraction','cardiac_risk','spo2_tracking','peak_flow','spirometry','gcs_score','nihss_score','seizure_log','hba1c_tracking','glucose_log','insulin_adjustment','phq9_score','gad7_score','session_notes','gfr_tracking','fluid_balance','cancer_staging','ecog_status','cbc_trend','das28_score','joint_map','visual_acuity','iop_tracking','audiogram','tympanometry','psa_tracking','urine_flow','abpi','skin_scoring','wound_care','drain_output','drug_compliance','device_tracking','dialysis_record'].some(k=>modules[k])) && (
                      <button onClick={()=>setShowAssessForm(!showAssessForm)} className="btn-outline text-[11px] py-1.5 px-3 gap-1"><Plus size={11}/> Clinical Assessment</button>
                    )}
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
                      {/* BMI — GP */}
                      {modules.bmi_calc && (newVitals as any).weight && (newVitals as any).height && (
                        <div className="mb-3 px-3 py-2 rounded-lg text-[12px]" style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)'}}>
                          <span className="font-medium text-blue-700">BMI: </span>
                          <span className="text-blue-600 font-bold">
                            {(parseFloat((newVitals as any).weight) / Math.pow(parseFloat((newVitals as any).height)/100, 2)).toFixed(1)}
                          </span>
                          <span className="text-blue-500 ml-2 text-[11px]">
                            {(() => { const bmi = parseFloat((newVitals as any).weight) / Math.pow(parseFloat((newVitals as any).height)/100, 2); return bmi < 18.5 ? '— Underweight' : bmi < 25 ? '— Normal ✅' : bmi < 30 ? '— Overweight ⚠️' : '— Obese 🔴'; })()}
                          </span>
                        </div>
                      )}
                      {/* Pain Scale — Orthopedics */}
                      {modules.pain_scale && (
                        <div className="mb-3">
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Pain Scale (0-10)</label>
                          <div className="flex items-center gap-3">
                            <input type="range" min="0" max="10" value={(newVitals as any).pain_scale||0}
                              onChange={e=>setNewVitals((p:any)=>({...p,pain_scale:e.target.value}))} className="flex-1"/>
                            <span className="w-8 text-center font-bold text-[16px]" style={{color:Number((newVitals as any).pain_scale||0)>7?'#dc2626':Number((newVitals as any).pain_scale||0)>4?'#d97706':'#16a34a'}}>
                              {(newVitals as any).pain_scale||0}
                            </span>
                          </div>
                        </div>
                      )}
                      {/* ROM — Orthopedics */}
                      {modules.rom && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">ROM Flexion (°)</label>
                            <input type="text" placeholder="e.g. 120" value={(newVitals as any).rom_flexion||''}
                              onChange={e=>setNewVitals((p:any)=>({...p,rom_flexion:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">ROM Extension (°)</label>
                            <input type="text" placeholder="e.g. 0" value={(newVitals as any).rom_extension||''}
                              onChange={e=>setNewVitals((p:any)=>({...p,rom_extension:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        </div>
                      )}
                      {/* Fundal Height/FHR — Gynecology */}
                      {modules.anc_record && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Fundal Height (cm)</label>
                            <input type="text" placeholder="e.g. 28" value={(newVitals as any).fundal_height||''}
                              onChange={e=>setNewVitals((p:any)=>({...p,fundal_height:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Fetal Heart Rate (bpm)</label>
                            <input type="text" placeholder="e.g. 140" value={(newVitals as any).fhr||''}
                              onChange={e=>setNewVitals((p:any)=>({...p,fhr:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        </div>
                      )}
                      <button onClick={saveVitals} className="btn-gold text-[11px] py-1.5 px-4 gap-1"><Save size={11}/> Save Vitals</button>
                    </div>
                  )}
                  {/* Clinical Assessment Form */}
                  {showAssessForm && (
                    <div className="rounded-xl p-4 mb-3" style={{background:'rgba(43,108,176,0.06)',border:'1px solid rgba(43,108,176,0.2)'}}>
                      <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-widest mb-3">Clinical Assessment</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Date</label>
                          <input type="date" value={assessForm.recorded_at||new Date().toISOString().split('T')[0]}
                            onChange={e=>setAssessForm((p:any)=>({...p,recorded_at:e.target.value}))}
                            className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                        </div>
                        {/* Ortho */}
                        {modules.pain_scale && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Pain Scale (0-10)</label>
                            <div className="flex items-center gap-2">
                              <input type="range" min="0" max="10" value={assessForm.pain_scale||0}
                                onChange={e=>setAssessForm((p:any)=>({...p,pain_scale:e.target.value}))} className="flex-1"/>
                              <span className="font-bold text-[14px] w-6" style={{color:Number(assessForm.pain_scale||0)>7?'#dc2626':Number(assessForm.pain_scale||0)>4?'#d97706':'#16a34a'}}>{assessForm.pain_scale||0}</span>
                            </div>
                          </div>
                        )}
                        {modules.rom && (<>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">ROM Flexion (°)</label>
                            <input type="text" placeholder="e.g. 120" value={assessForm.rom_flexion||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,rom_flexion:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">ROM Extension (°)</label>
                            <input type="text" placeholder="e.g. 0" value={assessForm.rom_extension||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,rom_extension:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Affected Joint</label>
                            <select value={assessForm.affected_joint||''} onChange={e=>setAssessForm((p:any)=>({...p,affected_joint:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold">
                              <option value="">Select...</option>
                              {['Right Knee','Left Knee','Both Knees','Right Hip','Left Hip','Right Shoulder','Left Shoulder','Spine (Cervical)','Spine (Lumbar)','Right Ankle','Left Ankle','Other'].map(j=><option key={j}>{j}</option>)}
                            </select>
                          </div>
                        </>)}
                        {/* GP */}
                        {modules.bmi_calc && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">BMI</label>
                            <input type="number" placeholder="e.g. 24.5" value={assessForm.bmi||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,bmi:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {/* Gyne */}
                        {modules.anc_record && (<>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Fundal Height (cm)</label>
                            <input type="text" placeholder="e.g. 28" value={assessForm.fundal_height||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,fundal_height:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Fetal Heart Rate (bpm)</label>
                            <input type="text" placeholder="e.g. 140" value={assessForm.fhr||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,fhr:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Gestational Age</label>
                            <input type="text" placeholder="e.g. 28 weeks" value={assessForm.gestational_age||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,gestational_age:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        </>)}
                        {/* Orthopedic — Surgical History */}
                        {modules.surgical_history && (
                          <div className="col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Surgical History</label>
                            <textarea placeholder="e.g. Right knee ACL repair 2021, Appendectomy 2018..." rows={2} value={assessForm.surgical_history||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,surgical_history:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold resize-none"/>
                          </div>
                        )}
                        {/* Orthopedic — Implant Tracking */}
                        {modules.implant_tracking && (<>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Implant / Prosthesis Type</label>
                            <input type="text" placeholder="e.g. Total Knee Replacement, DHS" value={assessForm.implant_type||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,implant_type:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Implant Date</label>
                            <input type="date" value={assessForm.implant_date||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,implant_date:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        </>)}
                        {/* Gynecology — LMP / EDD */}
                        {modules.lmp_edd && (<>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">LMP Date</label>
                            <input type="date" value={assessForm.lmp_date||''}
                              onChange={e=>{
                                const lmp = e.target.value;
                                const edd = lmp ? new Date(new Date(lmp).getTime() + 280*24*60*60*1000).toISOString().split('T')[0] : '';
                                setAssessForm((p:any)=>({...p,lmp_date:lmp,edd_date:edd}));
                              }}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">EDD (auto-calculated)</label>
                            <input type="date" value={assessForm.edd_date||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,edd_date:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        </>)}
                        {/* Gynecology — Obstetric History */}
                        {modules.obstetric_history && (<>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">G / P / A</label>
                            <input type="text" placeholder="e.g. G3 P2 A1" value={assessForm.gpa||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,gpa:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Obstetric History Details</label>
                            <input type="text" placeholder="e.g. 2 NVD, 1 LSCS, 1 miscarriage" value={assessForm.obstetric_history||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,obstetric_history:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        </>)}
                        {/* GP / Medicine — Chronic Conditions */}
                        {modules.chronic_conditions && (
                          <div className="col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Chronic Conditions</label>
                            <input type="text" placeholder="e.g. HTN, DM Type 2, CKD Stage 3, Hypothyroidism" value={assessForm.chronic_conditions||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,chronic_conditions:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {/* GP / Medicine — BP History */}
                        {modules.bp_history && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">BP Reading</label>
                            <input type="text" placeholder="e.g. 140/90" value={assessForm.bp_reading||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,bp_reading:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {/* GP / Medicine — Family / Social History */}
                        {modules.family_history && (
                          <div className="col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Family / Social History</label>
                            <textarea placeholder="e.g. Father: DM, IHD. Mother: HTN. Smoker 10 pack-years. Non-alcoholic." rows={2} value={assessForm.family_history||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,family_history:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold resize-none"/>
                          </div>
                        )}
                        {/* Cardiology */}
                        {modules.ecg_findings && (
                          <div className="col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">ECG Findings</label>
                            <input type="text" placeholder="e.g. Normal sinus rhythm, ST elevation..." value={assessForm.ecg_findings||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,ecg_findings:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.ejection_fraction && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Ejection Fraction (EF%)</label>
                            <input type="number" placeholder="e.g. 55" value={assessForm.ejection_fraction||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,ejection_fraction:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.cardiac_risk && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Cardiac Risk Score</label>
                            <input type="text" placeholder="e.g. TIMI 3, GRACE 120" value={assessForm.cardiac_risk||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,cardiac_risk:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        {/* Pulmonology */}
                        {modules.spo2_tracking && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">SpO2 (%)</label>
                            <input type="number" placeholder="e.g. 98" min="0" max="100" value={assessForm.spo2||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,spo2:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.peak_flow && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Peak Flow Rate (L/min)</label>
                            <input type="number" placeholder="e.g. 450" value={assessForm.peak_flow||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,peak_flow:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.spirometry && (
                          <div className="col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Spirometry Results</label>
                            <input type="text" placeholder="e.g. FEV1 2.1L (75%), FVC 2.8L, FEV1/FVC 0.75" value={assessForm.spirometry||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,spirometry:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        {/* Neurology */}
                        {modules.gcs_score && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">GCS Score (3-15)</label>
                            <input type="number" placeholder="e.g. 15" min="3" max="15" value={assessForm.gcs_score||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,gcs_score:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.nihss_score && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">NIHSS Score</label>
                            <input type="number" placeholder="e.g. 4" min="0" max="42" value={assessForm.nihss_score||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,nihss_score:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.seizure_log && (
                          <div className="col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Seizure Log</label>
                            <input type="text" placeholder="e.g. 2 episodes, tonic-clonic, 2 min duration" value={assessForm.seizure_log||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,seizure_log:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        {/* Endocrinology */}
                        {modules.hba1c_tracking && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">HbA1c (%)</label>
                            <input type="number" placeholder="e.g. 7.2" step="0.1" value={assessForm.hba1c||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,hba1c:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.glucose_log && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Blood Glucose (mg/dL)</label>
                            <input type="number" placeholder="e.g. 126" value={assessForm.blood_glucose||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,blood_glucose:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        {/* Psychiatry */}
                        {modules.phq9_score && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">PHQ-9 Score (0-27)</label>
                            <input type="number" placeholder="e.g. 12" min="0" max="27" value={assessForm.phq9||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,phq9:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.gad7_score && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">GAD-7 Score (0-21)</label>
                            <input type="number" placeholder="e.g. 8" min="0" max="21" value={assessForm.gad7||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,gad7:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        {/* Nephrology */}
                        {modules.gfr_tracking && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">eGFR (mL/min)</label>
                            <input type="number" placeholder="e.g. 45" value={assessForm.egfr||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,egfr:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.fluid_balance && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Fluid Balance (mL)</label>
                            <input type="text" placeholder="e.g. +500 / -200" value={assessForm.fluid_balance||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,fluid_balance:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        {/* Oncology */}
                        {modules.cancer_staging && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Cancer Stage (TNM)</label>
                            <input type="text" placeholder="e.g. T2N1M0 Stage IIB" value={assessForm.cancer_stage||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,cancer_stage:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.ecog_status && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">ECOG Status (0-5)</label>
                            <select value={assessForm.ecog_status||''} onChange={e=>setAssessForm((p:any)=>({...p,ecog_status:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold">
                              <option value="">Select...</option>
                              <option value="0">0 — Fully active</option>
                              <option value="1">1 — Restricted but ambulatory</option>
                              <option value="2">2 — Ambulatory, self-care only</option>
                              <option value="3">3 — Limited self-care</option>
                              <option value="4">4 — Completely disabled</option>
                              <option value="5">5 — Dead</option>
                            </select>
                          </div>
                        )}

                        {/* Rheumatology */}
                        {modules.das28_score && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">DAS28 Score</label>
                            <input type="number" placeholder="e.g. 3.2" step="0.1" value={assessForm.das28||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,das28:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        {/* Ophthalmology */}
                        {modules.visual_acuity && (<>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">VA Right Eye</label>
                            <input type="text" placeholder="e.g. 6/6" value={assessForm.va_right||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,va_right:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">VA Left Eye</label>
                            <input type="text" placeholder="e.g. 6/9" value={assessForm.va_left||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,va_left:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        </>)}
                        {modules.iop_tracking && (<>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">IOP Right (mmHg)</label>
                            <input type="number" placeholder="e.g. 16" value={assessForm.iop_right||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,iop_right:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">IOP Left (mmHg)</label>
                            <input type="number" placeholder="e.g. 18" value={assessForm.iop_left||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,iop_left:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        </>)}

                        {/* ENT */}
                        {modules.audiogram && (
                          <div className="col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Audiogram / PTA Results</label>
                            <input type="text" placeholder="e.g. Mild SNHL bilateral, 35dB HL" value={assessForm.audiogram||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,audiogram:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.tympanometry && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Tympanometry</label>
                            <input type="text" placeholder="e.g. Type B bilateral" value={assessForm.tympanometry||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,tympanometry:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        {/* Urology */}
                        {modules.psa_tracking && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">PSA (ng/mL)</label>
                            <input type="number" placeholder="e.g. 4.5" step="0.1" value={assessForm.psa||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,psa:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.urine_flow && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Urine Flow Rate (mL/s)</label>
                            <input type="number" placeholder="e.g. 15" value={assessForm.urine_flow||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,urine_flow:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        {/* Surgery */}
                        {modules.wound_care && (
                          <div className="col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Wound Assessment</label>
                            <input type="text" placeholder="e.g. Clean, healing well, no discharge" value={assessForm.wound_assessment||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,wound_assessment:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}
                        {modules.drain_output && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Drain Output (mL)</label>
                            <input type="number" placeholder="e.g. 50" value={assessForm.drain_output||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,drain_output:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        {/* Vascular */}
                        {modules.abpi && (<>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">ABPI Right</label>
                            <input type="number" placeholder="e.g. 0.9" step="0.01" value={assessForm.abpi_right||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,abpi_right:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">ABPI Left</label>
                            <input type="number" placeholder="e.g. 0.85" step="0.01" value={assessForm.abpi_left||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,abpi_left:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        </>)}

                        {/* Dermatology */}
                        {modules.skin_scoring && (
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">PASI / SCORAD Score</label>
                            <input type="text" placeholder="e.g. PASI 12, SCORAD 45" value={assessForm.skin_score||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,skin_score:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        {/* Hematology */}
                        {modules.cbc_trend && (
                          <div className="col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">CBC Summary</label>
                            <input type="text" placeholder="e.g. Hb 9.2, WBC 3.2, Plt 120" value={assessForm.cbc_summary||''}
                              onChange={e=>setAssessForm((p:any)=>({...p,cbc_summary:e.target.value}))}
                              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
                          </div>
                        )}

                        <div className="col-span-2">
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Notes</label>
                          <textarea placeholder="Clinical notes..." value={assessForm.notes||''}
                            onChange={e=>setAssessForm((p:any)=>({...p,notes:e.target.value}))} rows={2}
                            className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold resize-none"/>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={saveAssessment} className="btn-gold text-[11px] py-1.5 px-4 gap-1"><Save size={11}/> Save Assessment</button>
                        <button onClick={()=>setShowAssessForm(false)} className="btn-outline text-[11px] py-1.5 px-3">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Assessment History */}
                  {assessments.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-2">Assessment History</div>
                      <div className="space-y-2">
                        {assessments.map((a,i)=>(
                          <div key={i} className="rounded-lg p-3 flex flex-wrap gap-2 text-[11px]" style={{background:'#eff6ff',border:'1px solid rgba(59,130,246,0.15)'}}>
                            <span className="font-medium text-blue-800">{a.recorded_at}</span>
                            {i===0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{background:'#dbeafe',color:'#1d4ed8'}}>⭐ Latest</span>}
                            {a.pain_scale!=null && <span className="text-blue-600">🔴 Pain: {a.pain_scale}/10</span>}
                            {a.rom_flexion && <span className="text-blue-600">ROM F:{a.rom_flexion}°</span>}
                            {a.rom_extension && <span className="text-blue-600">E:{a.rom_extension}°</span>}
                            {a.affected_joint && <span className="text-blue-600">📍 {a.affected_joint}</span>}
                            {a.bmi && <span className="text-blue-600">BMI: {a.bmi}</span>}
                            {a.fundal_height && <span className="text-blue-600">FH: {a.fundal_height}cm</span>}
                            {a.fhr && <span className="text-blue-600">FHR: {a.fhr}bpm</span>}
                            {a.gestational_age && <span className="text-blue-600">GA: {a.gestational_age}</span>}
                            {a.ecg_findings && <span className="text-blue-600">ECG: {a.ecg_findings}</span>}
                            {a.ejection_fraction!=null && <span className="text-blue-600">EF: {a.ejection_fraction}%</span>}
                            {a.spo2!=null && <span className="text-blue-600">SpO2: {a.spo2}%</span>}
                            {a.peak_flow!=null && <span className="text-blue-600">PFR: {a.peak_flow}L/min</span>}
                            {a.gcs_score!=null && <span className="text-blue-600">GCS: {a.gcs_score}/15</span>}
                            {a.nihss_score!=null && <span className="text-blue-600">NIHSS: {a.nihss_score}</span>}
                            {a.hba1c!=null && <span className="text-blue-600">HbA1c: {a.hba1c}%</span>}
                            {a.blood_glucose!=null && <span className="text-blue-600">Glucose: {a.blood_glucose}mg/dL</span>}
                            {a.phq9!=null && <span className="text-blue-600">PHQ-9: {a.phq9}</span>}
                            {a.gad7!=null && <span className="text-blue-600">GAD-7: {a.gad7}</span>}
                            {a.egfr!=null && <span className="text-blue-600">eGFR: {a.egfr}</span>}
                            {a.cancer_stage && <span className="text-blue-600">Stage: {a.cancer_stage}</span>}
                            {a.das28!=null && <span className="text-blue-600">DAS28: {a.das28}</span>}
                            {a.va_right && <span className="text-blue-600">VA R:{a.va_right} L:{a.va_left}</span>}
                            {a.iop_right!=null && <span className="text-blue-600">IOP R:{a.iop_right} L:{a.iop_left}mmHg</span>}
                            {a.audiogram && <span className="text-blue-600">Audio: {a.audiogram}</span>}
                            {a.psa!=null && <span className="text-blue-600">PSA: {a.psa}ng/mL</span>}
                            {a.wound_assessment && <span className="text-blue-600">Wound: {a.wound_assessment}</span>}
                            {a.abpi_right!=null && <span className="text-blue-600">ABPI R:{a.abpi_right} L:{a.abpi_left}</span>}
                            {a.skin_score && <span className="text-blue-600">Skin: {a.skin_score}</span>}
                            {a.cbc_summary && <span className="text-blue-600">CBC: {a.cbc_summary}</span>}
                            {a.notes && <span className="text-gray-500 italic">{a.notes}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allVitals.length > 0 ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-2">Vitals History</div>
                      <div className="space-y-2">
                        {allVitals.map((v,i)=>(
                          <div key={i} className="rounded-lg p-3 flex flex-wrap gap-3 text-[12px]" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.1)'}}>
                            <span className="font-medium text-navy">{formatUSDate(v.recordedAt)}</span>
                            {(v as any).createdAt === allVitals.reduce((max,x) => ((x as any).createdAt||'') > ((max as any).createdAt||'') ? x : max, allVitals[0])?.createdAt && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{background:'#dbeafe',color:'#1d4ed8'}}>⭐ Latest</span>
                            )}
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
                  <WHOGrowthChart vitals={allVitals} gender={(health as any).gender || selected.gender} ageMonths={selected.age ? Math.round(parseFloat(selected.age.toString().replace(/[^0-9.]/g,''))*12) : undefined}/>
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
                              await supabase.from('procedures').insert([{...row, clinic_id: clinicId || null}]);
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
                  <ConsentForms childName={selected.name} parentName={selected.parentName} childAge={selected.age} mrNumber={selected.mrNumber} clinicName={clinicSettings?.clinic_name||"MediPlex"} doctorName={clinicSettings?.doctor_name||"Doctor"}/>
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