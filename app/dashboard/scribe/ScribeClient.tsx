'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic, MicOff, FileText, ClipboardList, Pill, Copy, Download,
  RefreshCw, ChevronRight, Loader2, Check, Search,
  Heart, AlertTriangle, Activity, X, ExternalLink, Save, Mail, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Appointment } from '@/types';
import { getHealth, setHealth, getLatestVitals, patientKey } from '@/lib/store';
import { saveScribeOutput } from '@/lib/scribeStore';
import { supabase } from '@/lib/supabase';
import { useClinic, withClinicFilter, withClinicId } from '@/lib/clinicContext';

type Mode = 'soap' | 'prescription' | 'discharge' | 'referral' | 'preauth';
type Status = 'idle' | 'recording' | 'processing' | 'done';

interface SelectedPatient {
  name: string; age: string; parentName: string; whatsapp: string; mrNumber?: string;
}

function buildPatientContext(patient: SelectedPatient, dbVitals?: any): string {
  const key = patientKey(patient.name);
  const health = getHealth(key);
  const localVitals = getLatestVitals(key);
  // Use DB vitals if more recent, otherwise local
  const vitals = dbVitals || localVitals;
  const parts = [
    `Patient: ${patient.name}`,
    patient.age ? `Age: ${patient.age} years` : '',
    patient.parentName ? `Parent/Guardian: ${patient.parentName}` : '',
    patient.mrNumber ? `MR Number: ${patient.mrNumber}` : '',
    health.bloodGroup ? `Blood Group: ${health.bloodGroup}` : '',
    health.allergies ? `⚠️ KNOWN ALLERGIES: ${health.allergies}` : 'No known allergies',
    health.conditions ? `Medical Conditions/History: ${health.conditions}` : '',
    health.notes ? `Clinical Notes: ${health.notes}` : '',
  ];
  if (vitals) {
    const w = vitals.weight || vitals.visit_weight || '';
    const h = vitals.height || vitals.visit_height || '';
    const bp = vitals.bp || vitals.visit_bp || '';
    const pulse = vitals.pulse || vitals.visit_pulse || '';
    const temp = vitals.temperature || vitals.visit_temperature || '';
    const date = vitals.recordedAt || vitals.recorded_at || vitals.appointment_date || '';
    const vp = [
      w ? `Weight: ${w}kg` : '',
      h ? `Height: ${h}cm` : '',
      bp ? `BP: ${bp}` : '',
      pulse ? `Pulse: ${pulse}bpm` : '',
      temp ? `Temperature: ${temp}°C` : '',
    ].filter(Boolean);
    if (vp.length) parts.push(`Latest Vitals${date ? ` (${date})` : ''}: ${vp.join(', ')}`);
  }
  return parts.filter(Boolean).join('\n');
}

const MODES = [
  {
    id: 'soap' as Mode, label: 'SOAP Note', icon: FileText,
    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)',
    desc: 'Structured clinical note',
    prompt: (text: string, ctx: string) => `You are a clinical documentation AI for a pediatric clinic.
PATIENT CONTEXT:\n${ctx}\nCONSULTATION NOTES:\n${text}

Output in this format:
**SUBJECTIVE**
Chief Complaint: [1 line]
History of Presenting Complaint: [2-4 lines]
Past Medical History: [from records]
Current Medications: [list]
Allergies: [flag if present]
Review of Systems: [relevant]

**OBJECTIVE**
Vital Signs: [from records]
Examination: [findings]
Investigations: [if mentioned]

**ASSESSMENT**
Primary Diagnosis: [with ICD-10]
Differential Diagnoses: [2-3]

**PLAN**
Investigations: [ordered]
Management: [medications]
Follow-up: [timing]
Patient Education: [key points]`
  },
  {
    id: 'prescription' as Mode, label: 'Prescription Writer', icon: Pill,
    color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)',
    desc: 'Generate prescription',
    prompt: (text: string, ctx: string) => `You are a pediatric prescribing AI.
PATIENT CONTEXT:\n${ctx}\nCLINICAL DETAILS:\n${text}

Output in this format:
**PATIENT SUMMARY**
[Brief 2-line summary]

**PRESCRIPTION**
| Drug | Dose | Route | Frequency | Duration | Instructions |
|------|------|-------|-----------|----------|--------------|
[Weight-based pediatric dosing]

**PRESCRIBING NOTES**
- Allergy check: [flag ⚠️ if conflict]
- Drug interactions: [key interactions]
- Counselling: [parent instructions]

**MONITORING**
[What to monitor]

**FOLLOW-UP**
[Timing]`
  },
  {
    id: 'discharge' as Mode, label: 'Discharge Summary', icon: ClipboardList,
    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)',
    desc: 'Discharge documentation',
    prompt: (text: string, ctx: string) => `You are a clinical documentation AI.
PATIENT CONTEXT:\n${ctx}\nADMISSION DETAILS:\n${text}

Output in this format:
**DISCHARGE SUMMARY**
Patient: [name] · Age: [age] · MR#: [if available]
Admission Date: [if mentioned] · Discharge Date: [if mentioned]

**REASON FOR ADMISSION**
[1-2 sentences]

**DIAGNOSIS**
Primary: [diagnosis]
Secondary: [others]

**TREATMENT DURING ADMISSION**
[Procedures and medications]

**DISCHARGE MEDICATIONS**
| Drug | Dose | Frequency | Duration | Change |
|------|------|-----------|----------|--------|

**FOLLOW-UP PLAN**
[Appointments and referrals]

**ADVICE TO PARENT/PATIENT**
[Simple instructions]

**GP ACTIONS REQUIRED**
[What GP needs to do]`
  },
  {
    id: 'insurance' as Mode, label: 'Insurance Preauth',
    icon: FileText, color: '#059669', bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.3)',
    desc: 'Insurance pre-authorization letter',
    prompt: (text: string, ctx: string) => `You are a medical documentation AI helping with insurance pre-authorization.
PATIENT CONTEXT:
${ctx}
CLINICAL DETAILS:
${text}
Generate a formal insurance pre-authorization request letter:
**INSURANCE PRE-AUTHORIZATION REQUEST**
Date: ${new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}
**PATIENT INFORMATION**
Name: [from context]
Date of Birth: [if available]
Policy/Member ID: [if mentioned]
**TREATING PHYSICIAN**
[Doctor details]
**DIAGNOSIS**
Primary: [with ICD-10]
**REQUESTED PROCEDURE/TREATMENT**
[Specific procedure or medication requiring authorization]
**CLINICAL JUSTIFICATION**
[Medical necessity — why this treatment is required]
**SUPPORTING EVIDENCE**
[Lab results, imaging, failed conservative treatments]
**URGENCY**
[Routine/Urgent/Emergency]
**REQUESTED AUTHORIZATION**
[Specific request — procedure code if known, duration, quantity]
Thank you for your prompt consideration.`
  },
  {
    id: 'sick_cert' as Mode, label: 'Sick Certificate',
    icon: FileText, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.3)',
    desc: 'Medical sick leave certificate',
    prompt: (text: string, ctx: string) => `You are a medical documentation AI.
PATIENT CONTEXT:
${ctx}
DETAILS:
${text}
Generate a formal medical sick leave certificate:
**MEDICAL CERTIFICATE**
Date: ${new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}
TO WHOM IT MAY CONCERN,
This is to certify that **[Patient Name]**, aged [age], has been examined and found to be suffering from:
**Diagnosis:** [condition]
The patient is advised rest and is unfit for duty/work/school from **[start date]** to **[end date]** (inclusive), a total of **[X] days**.
They may resume normal duties on **[return date]** subject to satisfactory recovery.
This certificate is issued on patient's request for official purposes.
Yours sincerely,
[Doctor Name]
[Qualification]
[Clinic Name]`
  },
  {
    id: 'referral' as Mode, label: 'Referral Letter', icon: Mail,
    color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)',
    desc: 'Specialist referral letter',
    prompt: (text: string, ctx: string) => `You are a pediatric doctor writing a formal specialist referral letter.
PATIENT CONTEXT:\n${ctx}\nREFERRAL DETAILS:\n${text}

Output in this format:
**REFERRAL LETTER**
Date: ${new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}

Dear [Specialist/Department],

**RE: [Patient Name] — Age: [age] — MR#: [if available]**

I am writing to refer this [age]-year-old patient under the care of [parent name] for specialist assessment and management.

**REASON FOR REFERRAL**
[Clear clinical reason — 2-4 lines]

**PRESENTING COMPLAINT**
[Current symptoms and duration]

**RELEVANT HISTORY**
[From patient records — medical conditions, allergies, medications]

**EXAMINATION FINDINGS**
[From notes]

**INVESTIGATIONS TO DATE**
[Tests already done and results]

**CURRENT MEDICATIONS**
[List with doses]

**ALLERGIES**
[From records — flag prominently]

**CLINICAL IMPRESSION**
[Working diagnosis or concern]

**SPECIFIC REQUEST**
[What you need from the specialist]

Thank you for seeing this patient.

Yours sincerely,
Dr. [Doctor Name]
[Clinic]`
  },
  {
    id: 'preauth' as Mode, label: 'Pre-Auth Insurance', icon: Shield,
    color: '#0369a1', bg: 'rgba(3,105,161,0.1)', border: 'rgba(3,105,161,0.3)',
    desc: 'Insurance pre-authorization',
    prompt: (text: string, ctx: string) => `You are a medical documentation AI generating an insurance pre-authorization request for a pediatric clinic.
PATIENT CONTEXT:\n${ctx}\nCLINICAL DETAILS:\n${text}

Output in this format:
**PRE-AUTHORIZATION REQUEST**
Date: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
Provider / Clinic: [Clinic Name]

**PATIENT INFORMATION**
Name: [Patient Name] · Age: [age] · MR#: [if available]
Parent/Guardian: [parent name]
Insurance ID: [if mentioned, else leave blank]

**DIAGNOSIS**
Primary Diagnosis: [with ICD-10 code]
Secondary Diagnoses: [if applicable]

**CLINICAL JUSTIFICATION**
[3-5 sentences: why this treatment/procedure is medically necessary based on patient history, symptoms, and exam findings]

**REQUESTED TREATMENT / PROCEDURE**
[Specific treatment, procedure, or medication with CPT/item code if known]

**SUPPORTING CLINICAL EVIDENCE**
- Relevant History: [from records]
- Relevant Investigations: [labs / imaging already done]
- Failed Conservative Treatment: [if applicable]

**REQUESTED DURATION / QUANTITY**
[e.g. 5-day course, 1 procedure, 30-day supply]

**ATTENDING PHYSICIAN**
Dr. [Doctor Name], [Qualification]
[Clinic Name]

**URGENCY**
☐ Routine  ☐ Urgent  ☐ Emergency — [indicate if mentioned]`
  },
];

// Usage display component
function UsageDisplay({ clinicId }: { clinicId: string }) {
  const [usage, setUsage] = useState<{used:number,limit:number}|null>(null);
  useEffect(() => {
    supabase.from('subscriptions').select('ai_scribe_limit,ai_scribe_used').eq('clinic_id', clinicId).maybeSingle()
      .then(({data}) => { if(data?.ai_scribe_limit) setUsage({used:data.ai_scribe_used||0,limit:data.ai_scribe_limit}); });
  }, [clinicId]);
  if (!usage) return null;
  const pct = Math.round((usage.used/usage.limit)*100);
  const color = pct>=100?'#dc2626':pct>=80?'#d97706':'#1a7f5e';
  return (
    <div className="rounded-xl p-3 mb-4 flex items-center gap-3" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)'}}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-white/50">AI Scribe Usage This Month</span>
          <span className="text-[12px] font-semibold" style={{color}}>{usage.used}/{usage.limit} calls</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{width:`${Math.min(pct,100)}%`,background:color}}/>
        </div>
      </div>
      {pct>=80 && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{background:pct>=100?'rgba(220,38,38,0.2)':'rgba(217,119,6,0.2)',color}}>
        {pct>=100?'Limit Reached':'Near Limit'}
      </span>}
    </div>
  );
}

export default function ScribeClient({ data }: { data: Appointment[] }) {
  const router = useRouter();
  const { clinicId, isSuperAdmin } = useClinic();
  const [mode, setMode] = useState<Mode>('soap');
  const [input, setInput] = useState('');
  const [outputs, setOutputs] = useState<Partial<Record<Mode, string>>>({});
  const output = outputs[mode] || '';
  const [status, setStatus] = useState<Status>('idle');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [patientContext, setPatientContext] = useState('');
  const currentMode = MODES.find(m => m.id === mode)!;

  const uniquePatients = Array.from(
    new Map(
      data.filter(a => a.childName?.trim()).map(a => [
        a.childName.toLowerCase().trim(),
        { name: a.childName, age: a.childAge, parentName: a.parentName, whatsapp: a.whatsapp, mrNumber: (a as any).mr_number || '' }
      ])
    ).values()
  );

  const filteredPatients = patientSearch
    ? uniquePatients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.parentName.toLowerCase().includes(patientSearch.toLowerCase()))
    : uniquePatients.slice(0, 8);

  const selectPatient = async (p: SelectedPatient) => {
    setSelectedPatient(p);
    setShowPatientSearch(false);
    setPatientSearch('');
    setSavedToDb(false);

    // Fetch latest vitals from DB (appointments + patient_vitals)
    let dbVitals = null;
    try {
      // Try patient_vitals first
      const pvQ = p.mrNumber
        ? supabase.from('patient_vitals').select('*').eq('mr_number', p.mrNumber).order('recorded_at', {ascending:false}).limit(1)
        : supabase.from('patient_vitals').select('*').ilike('child_name', p.name).order('recorded_at', {ascending:false}).limit(1);
      const { data: pvRows } = await pvQ;

      // Also get latest visit vitals from appointments
      const aptQ = p.mrNumber
        ? supabase.from('appointments').select('appointment_date,visit_weight,visit_height,visit_bp,visit_pulse,visit_temperature').eq('mr_number', p.mrNumber).not('visit_weight','is',null).order('appointment_date',{ascending:false}).limit(1)
        : supabase.from('appointments').select('appointment_date,visit_weight,visit_height,visit_bp,visit_pulse,visit_temperature').ilike('child_name', p.name).not('visit_weight','is',null).order('appointment_date',{ascending:false}).limit(1);
      const { data: aptRows } = await aptQ;

      // Also fetch health from patients table
      if (p.mrNumber) {
        const { data: hRow } = await supabase.from('patients').select('blood_group,allergies,conditions,notes').eq('mr_number', p.mrNumber).maybeSingle();
        if (hRow) {
          const key = patientKey(p.name);
          const local = getHealth(key);
          if (hRow.blood_group) local.bloodGroup = hRow.blood_group;
          if (hRow.allergies)   local.allergies  = hRow.allergies;
          if (hRow.conditions)  local.conditions = hRow.conditions;
          if (hRow.notes)       local.notes      = hRow.notes;
          setHealth(key, local);
          setDbHealth(hRow);
        }
      }

      // Pick most recent vitals
      const pvDate = pvRows?.[0]?.recorded_at || '';
      const aptDate = aptRows?.[0]?.appointment_date || '';
      dbVitals = pvDate >= aptDate ? pvRows?.[0] : aptRows?.[0];
    } catch {}

    // Fetch last prescription
    let lastRx = null;
    try {
      const rxQ = p.mrNumber
        ? supabase.from('prescriptions').select('medicines,diagnosis,advice').eq('mr_number', p.mrNumber).order('created_at',{ascending:false}).limit(1)
        : supabase.from('prescriptions').select('medicines,diagnosis,advice').ilike('child_name', p.name).order('created_at',{ascending:false}).limit(1);
      const { data: rxRows } = await rxQ;
      lastRx = rxRows?.[0] || null;
    } catch {}

    // Fetch latest lab results
    let lastLab = null;
    try {
      const labQ = p.mrNumber
        ? supabase.from('lab_results').select('test_name,notes,uploaded_at,visit_date,file_urls').eq('mr_number', p.mrNumber).order('uploaded_at',{ascending:false}).limit(3)
        : supabase.from('lab_results').select('test_name,notes,uploaded_at,visit_date,file_urls').ilike('child_name', p.name).order('uploaded_at',{ascending:false}).limit(3);
      const { data: labRows } = await labQ;
      lastLab = labRows || [];
    } catch {}

    // Fetch latest telehealth pre-consult
    let lastTelehealth = null;
    try {
      const thQ = p.mrNumber
        ? supabase.from('telehealth_sessions').select('chief_complaint,symptoms,current_meds,notes').eq('mr_number', p.mrNumber).eq('status','submitted').order('submitted_at',{ascending:false}).limit(1)
        : supabase.from('telehealth_sessions').select('chief_complaint,symptoms,current_meds,notes').ilike('child_name', p.name).eq('status','submitted').order('submitted_at',{ascending:false}).limit(1);
      const { data: thRows } = await thQ;
      lastTelehealth = thRows?.[0] || null;
    } catch {}

    let ctx = buildPatientContext(p, dbVitals);
    // Override with DB health values
    if (dbHealth) {
      if (dbHealth.blood_group) ctx = ctx.replace('Blood Group: ', `Blood Group (DB): `);
      if (dbHealth.allergies) ctx += `
DB Allergies: ${dbHealth.allergies}`;
      if (dbHealth.conditions) ctx += `
DB Conditions: ${dbHealth.conditions}`;
    }
    if (lastRx) {
      const meds = (lastRx.medicines||[]).slice(0,5).map((m:any)=>`${m.name} ${m.dose} ${m.frequency}`).join(', ');
      ctx += `
Last Prescription — Diagnosis: ${lastRx.diagnosis||'N/A'} | Medicines: ${meds}`;
    }
    if (lastLab?.length) {
      ctx += `
Lab Results — ${lastLab.map((l:any)=>`${l.test_name} (${l.visit_date||l.uploaded_at?.slice(0,10)||''}): ${l.notes||'result on file'}`).join(' | ')}`;
    }
    if (lastTelehealth) {
      ctx += `
Pre-Consult — Complaint: ${lastTelehealth.chief_complaint||''} | Symptoms: ${lastTelehealth.symptoms||''} | Meds: ${lastTelehealth.current_meds||''}`;
    }

    // Fetch vaccinations
    try {
      const vaxQ = p.mrNumber
        ? supabase.from('vaccinations').select('vaccine_id,given_date').eq('mr_number', p.mrNumber)
        : supabase.from('vaccinations').select('vaccine_id,given_date').ilike('child_name', p.name);
      const { data: vaxRows } = await vaxQ;
      if (vaxRows?.length) {
        ctx += `
Vaccinations Given (${vaxRows.length}): ${vaxRows.map((v:any)=>v.vaccine_id).join(', ')}`;
      }
    } catch {}

    // Fetch growth data from patient_vitals for WHO percentile context
    try {
      const growthQ = p.mrNumber
        ? supabase.from('patient_vitals').select('weight,height,recorded_at').eq('mr_number', p.mrNumber).order('recorded_at',{ascending:false}).limit(3)
        : supabase.from('patient_vitals').select('weight,height,recorded_at').ilike('child_name', p.name).order('recorded_at',{ascending:false}).limit(3);
      const { data: growthRows } = await growthQ;
      if (growthRows?.length) {
        const latest = growthRows[0];
        ctx += `
Growth — Latest: Weight ${latest.weight||'N/A'}kg, Height ${latest.height||'N/A'}cm (${latest.recorded_at})`;
        if (growthRows.length > 1) {
          const prev = growthRows[1];
          ctx += ` | Previous: Weight ${prev.weight||'N/A'}kg, Height ${prev.height||'N/A'}cm`;
        }
      }
    } catch {}

    // Fetch previous SOAP notes from scribe_outputs
    try {
      const soQ = p.mrNumber
        ? supabase.from('scribe_outputs').select('output,generated_at').eq('mr_number', p.mrNumber).eq('mode','soap').order('generated_at',{ascending:false}).limit(2)
        : supabase.from('scribe_outputs').select('output,generated_at').ilike('child_name', p.name).eq('mode','soap').order('generated_at',{ascending:false}).limit(2);
      const { data: soRows } = await soQ;
      if (soRows?.length) {
        const assessMatch = soRows[0].output.match(/\*\*ASSESSMENT\*\*([\s\S]*?)(?=\*\*PLAN\*\*|\*\*|$)/i);
        const assess = assessMatch ? assessMatch[1].trim().slice(0, 300) : soRows[0].output.slice(0, 300);
        ctx += `\nPrevious SOAP Assessment (${soRows[0].generated_at?.slice(0,10)||''}): ${assess}`;
      }
    } catch {}

    setPatientContext(ctx);
    toast.success(`Loaded ${p.name}'s full records`);
  };

  const patientHealth = selectedPatient ? getHealth(patientKey(selectedPatient.name)) : null;
  const [dbHealth, setDbHealth] = useState<any>(null);
  const patientVitals = selectedPatient ? getLatestVitals(patientKey(selectedPatient.name)) : null;

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Speech recognition not supported'); return; }

    let accumulated = input;
    const maxTimer = setTimeout(() => stopRecording(), 3 * 60 * 1000);

    const makeRecognition = () => {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;
      r.lang = 'en-GB';

      r.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            accumulated += (accumulated ? ' ' : '') + e.results[i][0].transcript.trim();
          } else {
            interim = e.results[i][0].transcript;
          }
        }
        setInput(accumulated + (interim ? ' ' + interim : ''));
      };

      r.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          clearTimeout(maxTimer);
          setStatus('idle');
          toast.error('Mic error: ' + e.error);
        }
      };

      r.onend = () => {
        setStatus((prev: Status) => {
          if (prev === 'recording') {
            try { r.start(); } catch {}
          } else {
            clearTimeout(maxTimer);
          }
          return prev;
        });
      };

      r.start();
      return r;
    };

    recognitionRef.current = makeRecognition();
    setStatus('recording');
    toast.success('Listening… click Stop when done');
  };

  const stopRecording = () => { recognitionRef.current?.stop(); setStatus('idle'); };

  const generate = async () => {
    // Check AI Scribe usage limit
    if (clinicId && !isSuperAdmin) {
      const { data: sub } = await supabase.from('subscriptions').select('ai_scribe_limit,ai_scribe_used').eq('clinic_id', clinicId).maybeSingle();
      if (sub?.ai_scribe_limit) {
        const used = sub.ai_scribe_used || 0;
        const limit = sub.ai_scribe_limit;
        if (used >= limit) {
          toast.error(`AI Scribe limit reached (${used}/${limit}/month). Please upgrade your plan.`);
          // Create notification
          await supabase.from('notifications').insert([{
            clinic_id: clinicId,
            type: 'scribe_blocked',
            title: '🚫 AI Scribe Limit Reached',
            message: `You have used ${used}/${limit} AI Scribe calls this month. Upgrade to continue.`,
          }]);
          return;
        }
        // Warn at 80%
        if (used >= Math.floor(limit * 0.8) && used < limit) {
          const existing = await supabase.from('notifications').select('id').eq('clinic_id', clinicId).eq('type','scribe_warning').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()).maybeSingle();
          if (!existing.data) {
            await supabase.from('notifications').insert([{
              clinic_id: clinicId,
              type: 'scribe_warning',
              title: '⚠️ AI Scribe Usage at 80%',
              message: `You have used ${used}/${limit} AI Scribe calls this month. Consider upgrading your plan.`,
            }]);
          }
        }
        // Increment usage
        await supabase.from('subscriptions').update({ ai_scribe_used: used + 1 }).eq('clinic_id', clinicId);
      }
    }
    if (!input.trim()) { toast.error('Enter clinical notes first'); return; }
    setStatus('processing'); setSavedToDb(false);
    try {
      const res = await fetch('/api/scribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1500,
          messages: [{ role: 'user', content: currentMode.prompt(input, patientContext) }]
        })
      });
      const d = await res.json();
      const text = d.content?.map((c: any) => c.text || '').join('') || 'No output generated';
      setOutputs(prev => ({ ...prev, [mode]: text })); setStatus('done');
      if (selectedPatient) {
        saveScribeOutput({ patientName: selectedPatient.name, patientAge: selectedPatient.age, parentName: selectedPatient.parentName, mode, output: text, generatedAt: new Date().toISOString() });
      }
    } catch {
      toast.error('Generation failed'); setStatus('idle');
    }
  };

  const saveToDatabase = async () => {
    if (!output || !selectedPatient) { toast.error('Generate output and select a patient first'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('scribe_outputs').insert([{
        mr_number:    selectedPatient.mrNumber || null,
        child_name:   selectedPatient.name,
        clinic_id:    clinicId || null,
        parent_name:  selectedPatient.parentName,
        mode,
        output,
        generated_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      setSavedToDb(true);
      toast.success('Saved to database!');
    } catch (err: any) {
      toast.error('DB save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); toast.success('Copied'); setTimeout(() => setCopied(false), 2000); };
  const download = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${mode}-${selectedPatient?.name||'patient'}-${new Date().toISOString().slice(0,10)}.txt`; a.click();
  };
  const sendToPrescription = () => {
    if (!output || !selectedPatient) { toast.error('Generate output and select a patient first'); return; }
    saveScribeOutput({ patientName: selectedPatient.name, patientAge: selectedPatient.age, parentName: selectedPatient.parentName, mode, output, generatedAt: new Date().toISOString() });
    toast.success('Sent to Prescription tab!');
    router.push('/dashboard/prescription');
  };
  const reset = () => { setOutputs(prev => ({ ...prev, [mode]: '' })); setStatus('idle'); setSavedToDb(false); };
  const fullReset = () => { setInput(''); setOutputs({}); setStatus('idle'); setSavedToDb(false); };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🤖</span>
            <h1 className="text-xl font-bold text-white">AI Scribe</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 ml-2">Beta</span>
          </div>
          <p className="text-white/50 text-sm">Clinical documentation — SOAP · Prescription · Discharge · Referral</p>
        </div>
        {output && selectedPatient && (
          <button onClick={sendToPrescription}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <ExternalLink size={14} /> → Prescription
          </button>
        )}
      </div>

      {/* Patient Selector */}
      <div className="mb-5 rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(201,168,76,0.25)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-white/80">👤 Patient</span>
          {selectedPatient && <button onClick={() => { setSelectedPatient(null); setPatientContext(''); }} className="text-white/30 hover:text-white/60"><X size={14} /></button>}
        </div>
        {!selectedPatient ? (
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Search patient..." value={patientSearch}
              onChange={e => { setPatientSearch(e.target.value); setShowPatientSearch(true); }}
              onFocus={() => setShowPatientSearch(true)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30" />
            {showPatientSearch && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-white/10 overflow-hidden z-10" style={{ background: '#1e293b' }}>
                {filteredPatients.length === 0 ? <div className="px-4 py-3 text-sm text-white/40">No patients found</div>
                : filteredPatients.map(p => (
                  <button key={p.name} onClick={() => selectPatient(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{p.name}</div>
                      <div className="text-xs text-white/40">Parent: {p.parentName} · Age {p.age} {p.mrNumber ? `· ${p.mrNumber}` : ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                {selectedPatient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{selectedPatient.name}</div>
                <div className="text-xs text-white/50">Parent: {selectedPatient.parentName} · Age {selectedPatient.age}{selectedPatient.mrNumber ? ` · ${selectedPatient.mrNumber}` : ''}</div>
              </div>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>✓ Records loaded</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {patientHealth?.bloodGroup && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(220,38,38,0.1)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <Heart size={10} /> {patientHealth.bloodGroup}
                </span>
              )}
              {patientHealth?.allergies && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(234,88,12,0.1)', color: '#fb923c', border: '1px solid rgba(234,88,12,0.2)' }}>
                  <AlertTriangle size={10} /> {patientHealth.allergies}
                </span>
              )}
              {patientVitals?.weight && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Activity size={10} /> {patientVitals.weight}kg{patientVitals.height ? ` · ${patientVitals.height}cm` : ''}{patientVitals.bp ? ` · BP ${patientVitals.bp}` : ''}
                </span>
              )}
              {!patientHealth?.bloodGroup && !patientHealth?.allergies && !patientVitals && (
                <span className="text-xs text-white/30">No health records on file — add in Patients tab</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mode Selector — 4 modes in grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {MODES.map(m => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button key={m.id} onClick={() => { setMode(m.id); setSavedToDb(false); }}
              className="p-3 rounded-2xl border text-left transition-all"
              style={{ background: active ? m.bg : 'rgba(255,255,255,0.03)', borderColor: active ? m.border : 'rgba(255,255,255,0.08)', transform: active ? 'scale(1.02)' : 'scale(1)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: active ? m.bg : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? m.border : 'transparent'}` }}>
                  <Icon size={14} style={{ color: active ? m.color : 'rgba(255,255,255,0.4)' }} />
                </div>
                {active && <ChevronRight size={11} style={{ color: m.color }} />}
              </div>
              <div className="text-xs font-semibold" style={{ color: active ? m.color : 'rgba(255,255,255,0.7)' }}>{m.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: active ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)' }}>{m.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white/70">Clinical Input</span>
            <div className="flex gap-2">
              <button onClick={status === 'recording' ? stopRecording : startRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: status === 'recording' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)', border: `1px solid ${status === 'recording' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.15)'}`, color: status === 'recording' ? '#ef4444' : 'rgba(255,255,255,0.7)' }}>
                {status === 'recording' ? <><MicOff size={12} />Stop</> : <><Mic size={12} />Voice</>}
              </button>
              {input && <button onClick={reset} className="px-2 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70">Clear</button>}
            </div>
          </div>
          {status === 'recording' && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400">Recording... speak clearly</span>
            </div>
          )}
          {selectedPatient && patientContext && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'rgba(52,211,153,0.8)' }}>
              ✓ Patient records auto-merged into prompt
            </div>
          )}
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder={selectedPatient ? `Add ${currentMode.label.toLowerCase()} notes for ${selectedPatient.name}...` : 'Select a patient above, then describe the consultation...'}
            rows={14}
            className="w-full bg-transparent text-white/80 text-sm resize-none outline-none placeholder-white/20 leading-relaxed" />
          <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className="text-xs text-white/30">{input.length} chars</span>
            <button onClick={generate} disabled={status === 'processing' || !input.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
              style={{ background: currentMode.color, color: '#fff' }}>
              {status === 'processing' ? <><Loader2 size={14} className="animate-spin" />Generating...</> : <>Generate {currentMode.label}</>}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white/70">Generated Output</span>
            {output && (
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={copy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                  {copied ? <><Check size={11} />Copied</> : <><Copy size={11} />Copy</>}
                </button>
                <button onClick={download} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                  <Download size={11} />Save
                </button>
                {/* SAVE TO DATABASE BUTTON */}
                <button onClick={saveToDatabase} disabled={saving || savedToDb}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                  style={{ background: savedToDb ? 'rgba(16,185,129,0.2)' : 'rgba(139,92,246,0.2)', border: `1px solid ${savedToDb ? 'rgba(16,185,129,0.4)' : 'rgba(139,92,246,0.4)'}`, color: savedToDb ? '#34d399' : '#a78bfa' }}>
                  {saving ? <Loader2 size={11} className="animate-spin" /> : savedToDb ? <Check size={11} /> : <Save size={11} />}
                  {savedToDb ? 'Saved!' : saving ? 'Saving...' : 'Save to DB'}
                </button>
                {selectedPatient && (
                  <button onClick={sendToPrescription} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399' }}>
                    <ExternalLink size={11} />→ Rx
                  </button>
                )}
                <button onClick={reset} className="px-2 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70">
                  <RefreshCw size={11} />
                </button>
              </div>
            )}
          </div>

          {/* Usage display */}
      {clinicId && !isSuperAdmin && (
        <UsageDisplay clinicId={clinicId}/>
      )}
      {status === 'processing' && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 size={32} className="animate-spin" style={{ color: currentMode.color }} />
              <span className="text-sm text-white/50">Generating {currentMode.label}...</span>
            </div>
          )}

          {!output && status !== 'processing' && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: currentMode.bg, border: `1px solid ${currentMode.border}` }}>
                {(() => { const Icon = currentMode.icon; return <Icon size={28} style={{ color: currentMode.color }} />; })()}
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-white/50">No output yet</div>
                <div className="text-xs text-white/30 mt-1">{selectedPatient ? 'Enter notes and click Generate' : 'Select a patient first'}</div>
              </div>
            </div>
          )}

          {output && (
            <div className="overflow-y-auto max-h-[520px] pr-1">
              <div className="text-sm text-white/80 leading-relaxed">
                {output.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <div key={i} className="font-bold text-sm mt-4 mb-1.5 pb-1 border-b" style={{ color: currentMode.color, borderColor: 'rgba(255,255,255,0.06)' }}>{line.replace(/\*\*/g,'')}</div>;
                  }
                  if (line.startsWith('|')) return <div key={i} className="text-xs font-mono text-white/70 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>{line}</div>;
                  if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} className="text-xs text-white/70 ml-2 my-0.5">{line}</div>;
                  if (line.includes('⚠️')) return <div key={i} className="text-xs font-medium my-1 px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{line}</div>;
                  return <div key={i} className="text-[13px] text-white/75 my-0.5">{line}</div>;
                })}
              </div>
            </div>
          )}

          {output && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: currentMode.bg, color: currentMode.color, border: `1px solid ${currentMode.border}` }}>AI Generated</span>
              {savedToDb && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>✓ Saved to database</span>}
              <span className="text-xs text-white/30">Always verify before use.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
