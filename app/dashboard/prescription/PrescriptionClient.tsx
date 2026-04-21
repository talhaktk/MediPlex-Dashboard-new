'use client';

import { useState, useMemo, useEffect } from 'react';
import { Appointment } from '@/types';
import { formatUSDate } from '@/lib/sheets';
import {
  Plus, Trash2, Printer, Save, Search, X, FileText,
  Activity, AlertTriangle, Heart, Bot, ChevronRight,
  ChevronLeft, Copy, Check, ExternalLink, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getHealth, getLatestVitals, getPrescriptionsByPatient,
  savePrescription as storeSavePrescription,
  patientKey, HealthRecord, VitalSigns, PrescriptionRecord as StorePrescription
} from '@/lib/store';
import { getScribeOutput, clearScribeOutput, ScribeOutput } from '@/lib/scribeStore';
import LabInvestigations, { LabRequest } from '@/components/ui/LabInvestigations';
import { searchDrugs, checkInteractions as bnfCheckInteractions } from '@/lib/bnf';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────
interface Medicine {
  id: string; name: string; dose: string;
  frequency: string; duration: string; notes: string;
}
interface Prescription {
  id: string; appointmentId: string; childName: string;
  parentName: string; childAge: string; date: string;
  diagnosis: string; chiefComplaint: string; signsSymptoms: string; medicines: Medicine[]; advice: string;
  followUp: string; createdAt: string;
}

const LS_KEY = 'mediplex_prescriptions';
const FREQ = ['Once daily','Twice daily','Three times daily','Four times daily','Every 6 hours','Every 8 hours','Every 12 hours','As needed','Before meals','After meals','At bedtime'];
const DURATION = ['1 day','2 days','3 days','5 days','7 days','10 days','14 days','1 month','2 months','3 months','Until finished'];

function loadRx(): Prescription[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveRxLS(data: Prescription[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}
function genId() { return `RX-${Date.now().toString(36).toUpperCase()}`; }
function medId() { return `m-${Math.random().toString(36).slice(2, 7)}`; }
function emptyMed(): Medicine { return { id: medId(), name: '', dose: '', frequency: 'Twice daily', duration: '5 days', notes: '' }; }

// ── Print ──────────────────────────────────────────────────────────────────
function printPrescription(rx: Prescription, clinicName: string, doctorName: string, clinicPhone: string, clinicAddress: string, dbVitals?: any) {
  const key = patientKey(rx.childName);
  const health = getHealth(key);
  const vitals = getLatestVitals(key) || dbVitals;

  const vitalsHTML = vitals ? `
    <div class="section">
      <div class="section-title">Vital Signs</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
        ${vitals.weight ? `<div><div class="field-label">Weight</div><div class="field-val">${vitals.weight} kg</div></div>` : ''}
        ${vitals.height ? `<div><div class="field-label">Height</div><div class="field-val">${vitals.height} cm</div></div>` : ''}
        ${vitals.bp ? `<div><div class="field-label">BP</div><div class="field-val">${vitals.bp}</div></div>` : ''}
        ${vitals.pulse ? `<div><div class="field-label">Pulse</div><div class="field-val">${vitals.pulse} bpm</div></div>` : ''}
        ${vitals.temperature ? `<div><div class="field-label">Temp</div><div class="field-val">${vitals.temperature}°C</div></div>` : ''}
      </div>
    </div>` : '';

  const alertHTML = (health.bloodGroup || health.allergies) ? `
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;margin-bottom:16px;display:flex;gap:20px">
      ${health.bloodGroup ? `<div><span style="font-size:11px;color:#9ca3af;text-transform:uppercase">Blood Group</span><br><span style="font-size:20px;font-weight:700;color:#dc2626">${health.bloodGroup}</span></div>` : ''}
      ${health.allergies ? `<div><span style="font-size:11px;color:#9ca3af;text-transform:uppercase">⚠ Allergies</span><br><span style="font-size:13px;font-weight:600;color:#ea580c">${health.allergies}</span></div>` : ''}
    </div>` : '';

  const medRows = rx.medicines.map((m, i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top">
        <div style="font-weight:600;color:#0a1628;font-size:14px">${i + 1}. ${m.name}</div>
        ${m.dose ? `<div style="color:#555;font-size:12px;margin-top:2px">Dose: ${m.dose}</div>` : ''}
        ${m.notes ? `<div style="color:#888;font-size:11px;font-style:italic;margin-top:2px">${m.notes}</div>` : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#374151;font-size:13px">${m.frequency}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#374151;font-size:13px">${m.duration}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Prescription ${rx.id}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#0a1628;font-size:13px}.page{max-width:210mm;margin:0 auto;padding:12px 16px;font-size:11px}.header{background:linear-gradient(135deg,#0a1628,#142240);color:white;padding:10px 16px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center}.clinic-name{font-size:15px;font-weight:700}.clinic-sub{font-size:9px;color:rgba(255,255,255,0.6);margin-top:2px}.rx-badge{background:rgba(201,168,76,0.2);border:1px solid rgba(201,168,76,0.4);color:#c9a84c;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}.body{border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px}.patient-row{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:8px;padding:8px 10px;background:#f9f7f3;border-radius:6px}.field-label{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:1px}.field-val{font-size:11px;font-weight:600;color:#0a1628}.section-title{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;font-weight:700;margin:8px 0 4px;border-bottom:1px solid #f0f0f0;padding-bottom:2px}.cc-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px}.cc-box{background:#fff9e6;border:1px solid #fde68a;border-radius:6px;padding:5px 10px;font-size:11px}.diagnosis-box{background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;color:#856404;margin-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:6px}th{background:#0a1628;color:white;padding:5px 8px;text-align:left;font-size:9px;font-weight:600;text-transform:uppercase}td{padding:4px 8px;border-bottom:1px solid #f5f5f5;font-size:11px}.advice-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:5px 10px;font-size:10px;color:#166534;margin-bottom:6px}.followup-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:5px 10px;font-size:10px;color:#1e40af;margin-bottom:6px}.footer{margin-top:8px;padding-top:8px;border-top:1px dashed #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end}.sig-line{border-top:1px solid #374151;width:150px;padding-top:3px;font-size:9px;color:#6b7280;text-align:center}@media print{body{padding:0;margin:0}.page{padding:8px 12px}}</style>
  </head><body><div class="page">
    <div class="header">
      <div><div class="clinic-name">🏥 ${clinicName}</div><div class="clinic-sub">${clinicAddress}</div><div class="clinic-sub" style="margin-top:4px">📞 ${clinicPhone} · 👨‍⚕️ ${doctorName}</div></div>
      <div><div class="rx-badge">${rx.id}</div><div style="color:rgba(255,255,255,0.5);font-size:11px;text-align:right;margin-top:6px">${formatUSDate(rx.date)}</div></div>
    </div>
    <div class="body">
      <div class="patient-row">
        <div><div class="field-label">Patient</div><div class="field-val">${rx.childName}</div></div>
        <div><div class="field-label">Age</div><div class="field-val">${rx.childAge ? rx.childAge + ' yrs' : '—'}</div></div>
        <div><div class="field-label">Parent</div><div class="field-val">${rx.parentName}</div></div>
        <div><div class="field-label">Date</div><div class="field-val">${formatUSDate(rx.date)}</div></div>
      </div>
      ${alertHTML}${vitalsHTML}
      ${rx.diagnosis ? `<div class="section-title">🔍 Diagnosis</div><div class="diagnosis-box">${rx.diagnosis}</div>` : ''}
      <div class="section-title">℞ Medicines</div>
      <table><thead><tr><th>Medicine / Dosage</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>${medRows}</tbody></table>
      ${(rx as any).labs?.length > 0 ? `<div class="section-title">🔬 Lab Investigations</div><table width="100%" style="border-collapse:collapse;margin-bottom:16px"><thead><tr><th style="background:#0a1628;color:#fff;padding:8px 12px;text-align:left;font-size:11px">Investigation</th><th style="background:#0a1628;color:#fff;padding:8px 12px;text-align:left;font-size:11px">Urgency</th><th style="background:#0a1628;color:#fff;padding:8px 12px;text-align:left;font-size:11px">Instructions</th></tr></thead><tbody>${(rx as any).labs.map((l:any) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#0a1628">${l.name}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px"><span style="padding:2px 8px;border-radius:10px;font-weight:600;background:${l.urgency==='STAT'?'#fee2e2':l.urgency==='Urgent'?'#fff7ed':'#f0fdf4'};color:${l.urgency==='STAT'?'#991b1b':l.urgency==='Urgent'?'#92400e':'#166534'}">${l.urgency}</span></td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6b7280">${l.instructions||'—'}</td></tr>`).join('')}</tbody></table>` : ''}
      ${rx.advice ? `<div class="section-title">💡 Advice</div><div class="advice-box">${rx.advice}</div>` : ''}
      ${rx.followUp ? `<div class="section-title">📅 Follow-up</div><div class="followup-box">Please visit again: <strong>${rx.followUp}</strong></div>` : ''}
      <div class="footer" style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:8px">Valid for 30 days from issue date.</div>
          <div class="sig-line">${doctorName}<br>Signature & Stamp</div>
        </div>
        <div style="text-align:center">
          <div id="qrcode" style="width:100px;height:100px;border:1px solid #e5e7eb;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#9ca3af">QR</div>
          <div style="font-size:9px;color:#9ca3af;margin-top:4px">Scan for Rx details</div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <script>try{new QRCode(document.getElementById("qrcode"),{text:"Patient: ${rx.childName} | Rx: ${rx.id} | Date: ${rx.date} | "+${JSON.stringify(rx.medicines.map(m=>m.name+' '+m.dose+' '+m.frequency).join(', '))},width:100,height:100,colorDark:"#0a1628",colorLight:"#ffffff"});}catch(e){}</script>
        </div>
      </div>
    </div>
  </div></body></html>`;

  const w = window.open('', '_blank');
  if (!w) { toast.error('Allow popups to print'); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ── AI Scribe Panel (right side) ──────────────────────────────────────────
function ScribePanel({
  scribeData, onClose, onUseInPrescription
}: {
  scribeData: ScribeOutput;
  onClose: () => void;
  onUseInPrescription: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activeMode, setActiveMode] = useState<'soap' | 'prescription' | 'discharge' | 'referral'>(scribeData.mode as any);
  const [generating, setGenerating] = useState(false);
  const [outputs, setOutputs] = useState<Record<string, string>>({
    [scribeData.mode]: scribeData.output
  });

  const modeColors: Record<string,string> = {
    soap: '#3b82f6',
    prescription: '#10b981',
    discharge: '#f59e0b',
    referral: '#8b5cf6'
  };
  const color = modeColors[activeMode];

  const copy = () => {
    navigator.clipboard.writeText(outputs[activeMode] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentOutput = outputs[activeMode] || '';

  return (
    <div className="h-full flex flex-col rounded-2xl border overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderColor: 'rgba(255,255,255,0.1)' }}>

      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <Bot size={15} style={{ color: '#c9a84c' }} />
          <span className="text-sm font-semibold text-white">AI Scribe</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>
            {scribeData.patientName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
            {copied ? <><Check size={11} />Copied</> : <><Copy size={11} />Copy</>}
          </button>
          <button onClick={onClose} className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 px-3 py-2 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {(['soap', 'prescription', 'discharge'] as const).map(m => (
          <button key={m} onClick={() => setActiveMode(m)}
            className="px-3 py-1 rounded-lg text-[11px] font-medium transition-all capitalize"
            style={{
              background: activeMode === m ? `${modeColors[m]}22` : 'transparent',
              color: activeMode === m ? modeColors[m] : 'rgba(255,255,255,0.4)',
              border: activeMode === m ? `1px solid ${modeColors[m]}44` : '1px solid transparent'
            }}>
            {m === 'soap' ? 'SOAP' : m === 'prescription' ? 'Rx' : 'Discharge'}
            {outputs[m] && <span className="ml-1 w-1.5 h-1.5 rounded-full inline-block" style={{ background: modeColors[m] }} />}
          </button>
        ))}
      </div>

      {/* Patient info strip */}
      <div className="px-3 py-2 flex-shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">{scribeData.patientName} · Age {scribeData.patientAge} · {scribeData.parentName}</span>
          <span className="text-white/30">{new Date(scribeData.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!currentOutput && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Bot size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
            <div className="text-sm text-white/30">No {activeMode} generated yet</div>
            <div className="text-xs text-white/20">Go to AI Scribe tab to generate</div>
            <a href="/dashboard/scribe"
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>
              <ExternalLink size={11} /> Open AI Scribe
            </a>
          </div>
        )}
        {currentOutput && (
          <div className="text-sm leading-relaxed">
            {currentOutput.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return <div key={i} className="font-bold text-xs mt-4 mb-1.5 pb-1 border-b uppercase tracking-wider"
                  style={{ color, borderColor: 'rgba(255,255,255,0.06)' }}>
                  {line.replace(/\*\*/g, '')}
                </div>;
              }
              if (line.startsWith('|')) {
                return <div key={i} className="text-[10px] font-mono text-white/60 border-b py-0.5"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}>{line}</div>;
              }
              if (line.startsWith('- ') || line.startsWith('• ')) {
                return <div key={i} className="text-xs text-white/65 ml-2 my-0.5">{line}</div>;
              }
              if (line.includes('⚠️')) {
                return <div key={i} className="text-xs font-medium my-1 px-2 py-1 rounded"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{line}</div>;
              }
              return <div key={i} className="text-[12px] text-white/70 my-0.5">{line}</div>;
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      {currentOutput && (
        <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button onClick={() => onUseInPrescription(currentOutput)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}>
            <FileText size={14} /> Use in Prescription
          </button>
          <div className="mt-2 text-center text-[10px] text-white/25">
            AI Generated · Always verify before use
          </div>
        </div>
      )}
    </div>
  );
}


// ── Clinical Drug Input with autocomplete ─────────────────────────────────
function ClinicalDrugInput({ value, onChange, placeholder }: { value:string; onChange:(v:string)=>void; placeholder:string }) {
  const [results, setResults] = useState<any[]>([]);
  const search = (q: string) => {
    onChange(q);
    if (q.length < 2) { setResults([]); return; }
    const data = searchDrugs(q).slice(0, 6).map((d:any) => ({name: d.name}));
    setResults(data);
  };
  return (
    <div className="relative mb-2">
      <input type="text" placeholder={placeholder} value={value} onChange={e=>search(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none focus:border-blue-500/50"/>
      {results.length>0&&(
        <div className="absolute top-full left-0 right-0 z-50 mt-0.5 rounded-xl border border-white/10 overflow-hidden" style={{background:'#1e293b'}}>
          {results.map((d:any)=>(
            <button key={d.name} onClick={()=>{onChange(d.name);setResults([]);}} className="w-full text-left px-3 py-2 hover:bg-white/10 text-[12px] text-white border-b border-white/5 last:border-0">{d.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function PrescriptionClient({
  data, clinicName, doctorName, clinicPhone, clinicAddress
}: {
  data: Appointment[];
  clinicName: string; doctorName: string;
  clinicPhone: string; clinicAddress: string;
}) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [drugSearch, setDrugSearch] = useState<Record<string,string>>({});
  const [drugSuggestions, setDrugSuggestions] = useState<Record<string,any[]>>({});
  const [interactionWarnings, setInteractionWarnings] = useState<string[]>([]);
  const [doseWarnings, setDoseWarnings] = useState<Record<string,string>>({});
  const [recommendedDoses, setRecommendedDoses] = useState<Record<string,{dose:string;min:number;max:number;unit:string;frequency:string;weight:number}>>({});
  const [search, setSearch] = useState('');
  const [aptSearch, setAptSearch] = useState('');
  const [form, setForm] = useState<Partial<Prescription>>({});
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMed()]);
  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [patientLabResults, setPatientLabResults] = useState<any[]>([]);
  const [showLabResults, setShowLabResults] = useState(false);

  // AI Scribe panel state
  const [scribeData, setScribeData] = useState<ScribeOutput | null>(null);
  const [showScribePanel, setShowScribePanel] = useState(false);
  // Clinical panel state
  const [showClinicalPanel, setShowClinicalPanel] = useState(false);
  const [dbPatientVitals, setDbPatientVitals] = useState<any>(null);
  const [clinicalSearch, setClinicalSearch] = useState('');
  const [clinicalResults, setClinicalResults] = useState<any[]>([]);
  const [clinicalSelected, setClinicalSelected] = useState<any|null>(null);
  const [clinicalIxDrug1, setClinicalIxDrug1] = useState('');
  const [clinicalIxDrug2, setClinicalIxDrug2] = useState('');
  const [clinicalIxResult, setClinicalIxResult] = useState<any[]>([]);
  const [clinicalSearching, setClinicalSearching] = useState(false);
  const [clinicalTab, setClinicalTab] = useState<'dose'|'interaction'>('dose');

  const searchClinical = (q: string) => {
    setClinicalSearch(q);
    if (q.length < 2) { setClinicalResults([]); return; }
    const results = searchDrugs(q).slice(0, 8);
    setClinicalResults(results);
  };

  const checkClinicalInteraction = async () => {
    if (!clinicalIxDrug1 || !clinicalIxDrug2) { toast.error('Enter both drug names'); return; }
    const bnfResults = bnfCheckInteractions([clinicalIxDrug1, clinicalIxDrug2]);
    setClinicalIxResult(bnfResults as any[]);
    if (bnfResults.length === 0) { toast('No interactions found', {icon:'✅'}); return; }
    toast.error(bnfResults.length + ' interaction(s) found');
    return;
    const results = (data||[]).filter((ix:any) => {
      const a = ix.drug_a?.toLowerCase()||''; const b = ix.drug_b?.toLowerCase()||'';
      const d2 = clinicalIxDrug2.toLowerCase();
      return (a.includes(clinicalIxDrug1.toLowerCase()) && b.includes(d2)) ||
             (b.includes(clinicalIxDrug1.toLowerCase()) && a.includes(d2));
    });
    setClinicalIxResult(results);
    if (results.length === 0) toast('No interactions found between these drugs', {icon:'✅'});
  };

  useEffect(() => {
    setPrescriptions(loadRx());
    supabase.from('prescriptions').select('*').order('created_at', { ascending: false }).then(({ data: rows }) => {
      if (rows && rows.length > 0) {
        const dbRx = rows.map((r:any) => ({
          id: r.id, appointmentId: r.appointment_id || '',
          childName: r.child_name || '', parentName: r.parent_name || '',
          childAge: r.child_age || '', date: r.date || '',
          diagnosis: r.diagnosis || '', medicines: Array.isArray(r.medicines) ? r.medicines : [],
          advice: r.advice || '', followUp: r.follow_up || '', createdAt: r.created_at || '',
        }));
        setPrescriptions(prev => {
          const ids = new Set(prev.map((r:any) => r.id));
          const merged = [...prev, ...dbRx.filter((r:any) => !ids.has(r.id))];
          merged.sort((a:any,b:any) => b.createdAt.localeCompare(a.createdAt));
          saveRxLS(merged);
          return merged;
        });
      }
    });
    const saved = getScribeOutput();
    if (saved) {
      setScribeData(saved);
      setShowScribePanel(true);
    }
  }, []);

  // Poll for new scribe output every 3 seconds (when panel is closed)
  useEffect(() => {
    if (showScribePanel) return;
    const interval = setInterval(() => {
      const saved = getScribeOutput();
      if (saved && (!scribeData || saved.generatedAt !== scribeData?.generatedAt)) {
        setScribeData(saved);
        setShowScribePanel(true);
        toast('AI Scribe output ready! →', { icon: '🤖' });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [showScribePanel, scribeData]);

  const filtered = useMemo(() => {
    if (!search) return prescriptions;
    const q = search.toLowerCase();
    return prescriptions.filter(r =>
      r.childName.toLowerCase().includes(q) ||
      r.parentName.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  }, [prescriptions, search]);

  const todayApts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return data.filter(a =>
      (a.status === 'Confirmed' || a.status === 'Rescheduled') &&
      a.appointmentDate >= today
    ).sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));
  }, [data]);

  const aptFiltered = todayApts.filter(a =>
    !aptSearch || a.childName.toLowerCase().includes(aptSearch.toLowerCase()) ||
    a.parentName.toLowerCase().includes(aptSearch.toLowerCase())
  );

  const openNew = (apt?: Appointment) => {
    setForm({
      id: genId(), appointmentId: apt?.id || '',
      childName: apt?.childName || '', parentName: apt?.parentName || '',
      childAge: apt?.childAge || '',
      date: apt?.appointmentDate || new Date().toISOString().split('T')[0],
      diagnosis: '', chiefComplaint: '', signsSymptoms: '', advice: 'Drink plenty of water. Rest well. Avoid cold drinks.',
      followUp: '', createdAt: new Date().toISOString(),
    });
    setMedicines([emptyMed()]);
    setLabRequests([]);
    setAptSearch('');
    setShowForm(true);
  };

  // Pre-fill form from scribe output
  const useScribeInPrescription = (text: string) => {
    if (!scribeData) return;
    // Pre-populate patient info from scribe
    setForm(prev => ({
      ...prev,
      id: prev.id || genId(),
      childName: prev.childName || scribeData.patientName,
      parentName: prev.parentName || scribeData.parentName,
      childAge: prev.childAge || scribeData.patientAge,
      date: prev.date || new Date().toISOString().split('T')[0],
      createdAt: prev.createdAt || new Date().toISOString(),
      // Extract diagnosis if SOAP
      diagnosis: prev.diagnosis || extractDiagnosis(text),
      advice: prev.advice || extractAdvice(text) || 'Drink plenty of water. Rest well.',
    }));
    // Try to extract medicines from prescription output
    const extractedMeds = extractMedicines(text);
    if (extractedMeds.length > 0) setMedicines(extractedMeds);
    setShowForm(true);
    toast.success('AI Scribe data loaded into prescription!');
  };

  // ── Drug Safety Functions ─────────────────────────────────────────────────
  // Fetch DB vitals when patient changes
  useEffect(() => {
    if (!form.childName) { setDbPatientVitals(null); return; }
    const apt = data.find((a:any) => a.childName?.toLowerCase() === form.childName?.toLowerCase());
    const mr = (apt as any)?.mr_number;
    console.log('Vitals fetch - patient:', form.childName, 'mr:', mr);
    // Fetch vitals by MR or by name
    const pvQ = mr
      ? supabase.from('patient_vitals').select('*').eq('mr_number', mr)
      : supabase.from('patient_vitals').select('*').ilike('child_name', form.childName || '');
    pvQ.order('recorded_at',{ascending:false}).limit(1).then(({data:rows}) => {
      if (rows?.[0]) { setDbPatientVitals(rows[0]); return; }
      const aptQ = mr
        ? supabase.from('appointments').select('visit_weight,visit_height,visit_bp,visit_pulse,visit_temperature').eq('mr_number', mr)
        : supabase.from('appointments').select('visit_weight,visit_height,visit_bp,visit_pulse,visit_temperature').ilike('child_name', form.childName || '');
      aptQ.not('visit_weight','is',null).order('appointment_date',{ascending:false}).limit(1)
        .then(({data:r}) => { if(r?.[0]) setDbPatientVitals({weight:r[0].visit_weight,height:r[0].visit_height,bp:r[0].visit_bp,pulse:r[0].visit_pulse,temperature:r[0].visit_temperature}); });
    });
  }, [form.childName]);


  // Fetch patient uploaded lab results when patient changes
  useEffect(() => {
    if (!form.childName) { setPatientLabResults([]); return; }
    const apt = data.find((a:any) => a.childName?.toLowerCase() === form.childName?.toLowerCase());
    const mr = (apt as any)?.mr_number;
    const q = mr
      ? supabase.from('lab_results').select('*').eq('mr_number', mr)
      : supabase.from('lab_results').select('*').ilike('child_name', form.childName || '');
    q.order('uploaded_at', {ascending:false}).then(({data:rows}) => { if(rows) setPatientLabResults(rows); });
  }, [form.childName]);

  // When vitals load, recalculate doses for already-selected medicines
  useEffect(() => {
    if (!dbPatientVitals) return;
    const weightKg = parseFloat(dbPatientVitals.weight || '0');
    if (!weightKg) return;
    medicines.forEach(m => {
      if (!m.name) return;
      supabase.from('drugs').select('*').ilike('name', m.name).limit(1).then(({data}) => {
        if (data?.[0]) selectDrug(m.id, data[0]);
      });
    });
  }, [dbPatientVitals]);

  const searchDrug = async (medId: string, query: string) => {
    setDrugSearch(p => ({...p, [medId]: query}));
    if (query.length < 2) { setDrugSuggestions(p => ({...p, [medId]: []})); return; }
    const { data } = await supabase.from('drugs').select('*').ilike('name', `%${query}%`).limit(6);
    setDrugSuggestions(p => ({...p, [medId]: data || []}));
  };

  const selectDrug = (medId: string, drug: any) => {
    const _apt = data.find((a:any) => a.childName?.toLowerCase() === form.childName?.toLowerCase());
    const _mr = (_apt as any)?.mr_number;
    const vitals = dbPatientVitals || null;
    if (!dbPatientVitals && _mr) { supabase.from('appointments').select('visit_weight,visit_height,visit_bp,visit_pulse,visit_temperature').eq('mr_number', _mr).not('visit_weight','is',null).order('appointment_date',{ascending:false}).limit(1).then(({data:r}) => { if(r?.[0]) setDbPatientVitals({weight:r[0].visit_weight,height:r[0].visit_height,bp:r[0].visit_bp,pulse:r[0].visit_pulse,temperature:r[0].visit_temperature}); }); }
    const health = form.childName ? getHealth(patientKey(form.childName)) : null;
    const ageYears = parseFloat((form.childAge || '0').replace(/[^0-9.]/g, ''));
    const weightKg = parseFloat(vitals?.weight || '0');
    const pd = drug.paediatric || {};

    // Auto-calculate dose
    let autoDose = '';
    let warning = '';
    if (pd.mgPerKg && weightKg > 0) {
      const calc = pd.mgPerKg * weightKg;
      const final = pd.maxDose ? Math.min(calc, pd.maxDose) : calc;
      autoDose = `${Math.round(final)}mg`;
      if (calc > (pd.maxDose || 9999)) warning = `⚠️ Dose capped at max ${pd.maxDose}mg`;
    } else if (ageYears < 2 && pd.age1to4y) autoDose = pd.age1to4y;
    else if (ageYears < 5 && pd.age1to4y) autoDose = pd.age1to4y;
    else if (ageYears < 12 && pd.age5to11y) autoDose = pd.age5to11y;
    else if (pd.age12to17y) autoDose = pd.age12to17y;

    // Allergy check
    const allergies = (health?.allergies || '').toLowerCase();
    const drugName = (drug.generic || drug.name || '').toLowerCase();
    const drugCategory = (drug.category || '').toLowerCase();
    const allergyWords = allergies.split(/[,;\s]+/).filter((w:string) => w.length > 3);
    const allergyMatch = allergyWords.some((w:string) => drugName.includes(w) || drugCategory.includes(w));
    if (allergies && allergyMatch) {
      warning = `🚨 ALLERGY ALERT: Patient has allergy (${health?.allergies}) — may cross-react with ${drug.name}`;
    }

    if (pd.warning) warning = warning || pd.warning;
    const contras = (drug.contraindications||[]).join('; ');
    if (!warning && contras) warning = `⚠️ Contraindications: ${contras}`;
    if (warning) setDoseWarnings(p => ({...p, [medId]: warning}));
    else setDoseWarnings(p => { const n = {...p}; delete n[medId]; return n; });

    // Store recommended dose + frequency for override checking
    if (pd.mgPerKg && weightKg > 0) {
      const minDose = Math.round(pd.mgPerKg * weightKg * 0.8);
      const maxDose2 = pd.maxDose ? Math.min(Math.round(pd.mgPerKg * weightKg * 1.2), pd.maxDose) : Math.round(pd.mgPerKg * weightKg * 1.2);
      setRecommendedDoses(p => ({...p, [medId]: { dose: autoDose, min: minDose, max: maxDose2, unit: 'mg', frequency: pd.frequency||'', weight: weightKg }}));
    } else if (autoDose) {
      setRecommendedDoses(p => ({...p, [medId]: { dose: autoDose, min: 0, max: 0, unit: '', frequency: pd.frequency||'', weight: weightKg }}));
    }
    updateMed(medId, 'name', drug.name);
    updateMed(medId, 'dose', autoDose);
    updateMed(medId, 'frequency', pd.frequency || 'Twice daily');
    setDrugSearch(p => ({...p, [medId]: drug.name}));
    setDrugSuggestions(p => ({...p, [medId]: []}));
    setDoseWarnings(p => { const n={...p}; delete n[`${medId}_freq`]; return n; });
  };

  const checkInteractions = async (meds: Medicine[]) => {
    const names = meds.map(m => m.name.toLowerCase()).filter(Boolean);
    if (names.length < 2) { setInteractionWarnings([]); return; }
    const orFilter = [...names.map(n=>`drug_a.ilike.%${n}%`),...names.map(n=>`drug_b.ilike.%${n}%`)].join(',');
    const { data } = await supabase.from('drug_interactions').select('*').or(orFilter);
    const warnings: string[] = [];
    const seen = new Set<string>();
    (data || []).forEach((ix: any) => {
      const a = (ix.drug_a||'').toLowerCase().split(' ')[0];
      const b = (ix.drug_b||'').toLowerCase().split(' ')[0];
      const aMatch = a.length > 3 && names.some(n => n.startsWith(a) || a.startsWith(n.split(' ')[0]));
      const bMatch = b.length > 3 && names.some(n => n.startsWith(b) || b.startsWith(n.split(' ')[0]));
      const key = [ix.drug_a,ix.drug_b].sort().join('||');
      if (aMatch && bMatch && !seen.has(key)) { seen.add(key);
        warnings.push(`${ix.severity === 'Contraindicated' ? '🚫' : ix.severity === 'Severe' ? '⛔' : '⚠️'} ${ix.drug_a} + ${ix.drug_b}: ${ix.effect}. ${ix.action}`);
      }
    });
    setInteractionWarnings(warnings);
  };

  const validateAndSave = async () => {
    if (!form.childName) { toast.error('Select a patient first'); return; }
    if (medicines.filter(m => m.name).length === 0) { toast.error('Add at least one medicine'); return; }
    const warnings = [...interactionWarnings, ...Object.values(doseWarnings)];
    if (warnings.length > 0) {
      const msg = warnings.join('\n\n') + '\n\nProceed anyway?';
      if (!window.confirm(msg)) return;
    }
    await saveRxForm();
  };

  const addMedicine = () => setMedicines(prev => [...prev, emptyMed()]);
  const removeMedicine = (id: string) => setMedicines(prev => prev.filter(m => m.id !== id));
  const updateMed = (id: string, field: keyof Medicine, val: string) =>
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));

  const saveRxForm = async () => {
    if (!form.childName) { toast.error('Select a patient first'); return; }
    if (medicines.filter(m => m.name).length === 0) { toast.error('Add at least one medicine'); return; }
    const rx: Prescription = { ...form as Prescription, medicines: medicines.filter(m => m.name), labs: labRequests } as any;
    const updated = [rx, ...prescriptions.filter(r => r.id !== rx.id)];
    setPrescriptions(updated);
    saveRxLS(updated);
    storeSavePrescription({
      id: rx.id, appointmentId: rx.appointmentId, childName: rx.childName,
      parentName: rx.parentName, childAge: rx.childAge, date: rx.date,
      diagnosis: rx.diagnosis, medicines: rx.medicines, advice: rx.advice,
      followUp: rx.followUp, createdAt: rx.createdAt,
    });
    // Sync to Supabase
    try {
      const apt = data.find((a:any) => a.id === rx.appointmentId || a.childName.toLowerCase() === rx.childName.toLowerCase());
      const mrNumber = (apt as any)?.mr_number || null;
      await supabase.from('prescriptions').upsert([{
        id: rx.id, mr_number: mrNumber,
        child_name: rx.childName, parent_name: rx.parentName,
        child_age: rx.childAge || '', date: rx.date || '',
        diagnosis: rx.diagnosis || '', chief_complaint: (rx as any).chiefComplaint||'', signs_symptoms: (rx as any).signsSymptoms||'', medicines: rx.medicines,
        advice: rx.advice || '', follow_up: rx.followUp || '',
      }], { onConflict: 'id' });
      toast.success(`Prescription ${rx.id} saved to database`);
    } catch (err: any) {
      toast.success(`Prescription ${rx.id} saved locally`);
    }
    setShowForm(false);
  };

  const deleteRx = (id: string) => {
    if (!confirm('Delete this prescription?')) return;
    const updated = prescriptions.filter(r => r.id !== id);
    setPrescriptions(updated);
    saveRxLS(updated);
    toast.success('Deleted');
  };

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Prescriptions', value: prescriptions.length, color: '#0a1628', bg: '#f9f7f3' },
          { label: 'This Month', value: prescriptions.filter(r => r.date.startsWith(new Date().toISOString().slice(0, 7))).length, color: '#1a7f5e', bg: '#e8f7f2' },
          { label: "Today's Appointments", value: todayApts.length, color: '#c9a84c', bg: '#fef9e7' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
              <FileText size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">{s.label}</div>
              <div className="text-[24px] font-semibold text-navy leading-tight">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search prescriptions..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-black/10 rounded-lg pl-8 pr-3 py-2 text-[12px] text-navy bg-white outline-none focus:border-gold" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* AI Scribe toggle button */}
          <button onClick={() => { setShowClinicalPanel(!showClinicalPanel); if(showScribePanel) setShowScribePanel(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all border"
            style={{
              background: showClinicalPanel ? 'rgba(59,130,246,0.1)' : 'rgba(0,0,0,0.03)',
              borderColor: showClinicalPanel ? 'rgba(59,130,246,0.4)' : 'rgba(0,0,0,0.1)',
              color: showClinicalPanel ? '#3b82f6' : '#6b7280'
            }}>
            <Activity size={13} />
            Clinical
          </button>
          <button onClick={() => { setShowScribePanel(!showScribePanel); if(showClinicalPanel) setShowClinicalPanel(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all border"
            style={{
              background: showScribePanel ? 'rgba(201,168,76,0.1)' : 'rgba(0,0,0,0.03)',
              borderColor: showScribePanel ? 'rgba(201,168,76,0.4)' : 'rgba(0,0,0,0.1)',
              color: showScribePanel ? '#c9a84c' : '#6b7280'
            }}>
            <Bot size={13} />
            AI Scribe
            {scribeData && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
          </button>
          <button onClick={() => openNew()} className="btn-gold text-[12px] py-2 px-4 gap-1.5">
            <Plus size={13} /> New Prescription
          </button>
        </div>
      </div>

      {/* Main layout — splits when scribe panel is open */}
      <div className={`grid gap-5 transition-all ${(showScribePanel||showClinicalPanel) ? 'grid-cols-1 lg:grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>

        {/* LEFT: Prescription content */}
        <div className="space-y-5 min-w-0">

          {/* New Prescription Form */}
          {showForm && (
            <div className="card p-6 animate-in" style={{ border: '2px solid rgba(201,168,76,0.3)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="font-display font-semibold text-navy text-[16px]">℞ {form.id} — New Prescription</div>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>

              {/* AI Scribe data loaded banner */}
              {scribeData && form.childName === scribeData.patientName && (
                <div className="mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669' }}>
                  <Bot size={14} />
                  AI Scribe data loaded from {scribeData.patientName}'s {scribeData.mode} note
                </div>
              )}

              {/* Patient selector */}
              {!form.childName && (
                <div className="mb-5 rounded-xl p-4" style={{ background: '#f9f7f3', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <div className="text-[12px] font-medium text-navy mb-3">Select Patient from Appointments</div>
                  <div className="relative mb-3">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search patient..." value={aptSearch}
                      onChange={e => setAptSearch(e.target.value)}
                      className="w-full border border-black/10 rounded-lg pl-8 pr-3 py-2 text-[12px] bg-white outline-none focus:border-gold" />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {aptFiltered.slice(0, 15).map(a => (
                      <button key={a.id} onClick={() => setForm(prev => ({
                        ...prev, appointmentId: a.id, childName: a.childName,
                        parentName: a.parentName, childAge: a.childAge, date: a.appointmentDate,
                      }))}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white text-[12px] transition-colors flex items-center justify-between">
                        <div>
                          <span className="font-medium text-navy">{a.childName}</span>
                          <span className="text-gray-400 ml-2">Parent: {a.parentName}</span>
                        </div>
                        <span className="text-gray-400">{formatUSDate(a.appointmentDate)}</span>
                      </button>
                    ))}
                    {aptFiltered.length === 0 && <div className="text-[12px] text-gray-400 text-center py-2">No appointments found</div>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-black/5">
                    <div className="text-[11px] text-gray-400 mb-2">Or enter manually:</div>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ label: 'Child Name', key: 'childName' }, { label: 'Parent Name', key: 'parentName' }, { label: 'Age', key: 'childAge' }].map(f => (
                        <input key={f.key} type="text" placeholder={f.label}
                          value={(form as Record<string, string>)[f.key] || ''}
                          onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full border border-black/10 rounded-lg px-3 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold" />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Patient selected */}
              {form.childName && (
                <div className="mb-5 rounded-xl p-3 flex items-center justify-between"
                  style={{ background: '#e8f7f2', border: '1px solid #6ee7b7' }}>
                  <div>
                    <div className="font-semibold text-navy text-[14px]">{form.childName}</div>
                    <div className="text-[12px] text-gray-500">Parent: {form.parentName} · Age: {form.childAge || '—'} · {formatUSDate(form.date || '')}</div>
                  </div>
                  <button onClick={() => setForm(prev => ({ ...prev, childName: '', parentName: '', childAge: '', appointmentId: '' }))}
                    className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
              )}

              {/* Health panel */}
              {form.childName && (() => {
                const key = patientKey(form.childName);
                const h = getHealth(key);
                const vitals = getLatestVitals(key) || dbPatientVitals;
                if (!h.bloodGroup && !h.allergies && !h.conditions && !vitals) return null;
                return (
                  <div className="rounded-xl p-4 space-y-3 mb-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="text-[11px] uppercase tracking-widest text-emerald-700 font-medium">Patient Health Summary</div>
                    <div className="grid grid-cols-2 gap-3">
                      {h.bloodGroup && <div className="flex items-center gap-2"><Heart size={13} style={{ color: '#dc2626' }} /><span className="text-[12px] text-navy">Blood Group: <strong>{h.bloodGroup}</strong></span></div>}
                      {h.allergies && <div className="flex items-center gap-2"><AlertTriangle size={13} style={{ color: '#ea580c' }} /><span className="text-[12px] text-navy truncate">Allergies: <strong>{h.allergies}</strong></span></div>}
                      {vitals?.weight && <div className="text-[12px] text-gray-600">⚖ Weight: <strong>{vitals.weight} kg</strong></div>}
                      {vitals?.height && <div className="text-[12px] text-gray-600">📏 Height: <strong>{vitals.height} cm</strong></div>}
                      {vitals?.bp && <div className="text-[12px] text-gray-600">❤ BP: <strong>{vitals.bp}</strong></div>}
                      {vitals?.pulse && <div className="text-[12px] text-gray-600">💓 Pulse: <strong>{vitals.pulse} bpm</strong></div>}
                      {vitals?.temperature && <div className="text-[12px] text-gray-600">🌡 Temp: <strong>{vitals.temperature}°C</strong></div>}
                    </div>
                    {h.conditions && <div className="text-[12px] text-gray-600">Conditions: <strong>{h.conditions}</strong></div>}
                  </div>
                );
              })()}

              {/* Chief Complaint & Signs */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Chief Complaint</label>
                  <input type="text" placeholder="e.g. Fever, Cough, Rash"
                    value={form.chiefComplaint || ''}
                    onChange={e => setForm(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Signs & Symptoms</label>
                  <input type="text" placeholder="e.g. Fever 3 days, dry cough"
                    value={form.signsSymptoms || ''}
                    onChange={e => setForm(prev => ({ ...prev, signsSymptoms: e.target.value }))}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="mb-4">
                <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Diagnosis</label>
                <input type="text" placeholder="e.g. Acute upper respiratory tract infection"
                  value={form.diagnosis || ''}
                  onChange={e => setForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
              </div>

              {/* Interaction Warnings */}
              {interactionWarnings.length > 0 && (
                <div className="mb-4 rounded-xl p-4 space-y-2" style={{background:'#fff7ed',border:'2px solid #fed7aa'}}>
                  <div className="text-[12px] font-bold text-amber-800 flex items-center gap-2">⚠️ Drug Interaction Warnings</div>
                  {interactionWarnings.map((w,i) => <div key={i} className="text-[12px] text-amber-900">{w}</div>)}
                </div>
              )}

              {/* Medicines */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">℞ Medicines</label>
                  <button onClick={addMedicine} className="text-[11px] text-gold hover:text-amber-700 font-medium flex items-center gap-1">
                    <Plus size={11} /> Add Medicine
                  </button>
                </div>
                <div className="space-y-3">
                  {medicines.map((m, i) => (
                    <div key={m.id} className="rounded-xl p-4" style={{ background: '#f9f7f3', border: '1px solid rgba(201,168,76,0.15)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[11px] font-semibold text-navy">Medicine {i + 1}</div>
                        {medicines.length > 1 && (
                          <button onClick={() => removeMedicine(m.id)} className="text-gray-300 hover:text-red-400"><Trash2 size={13} /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Medicine Name</label>
                          <div className="relative">
                            {form.childName && !dbPatientVitals && <div className="text-[10px] text-amber-600 mb-1">⏳ Loading patient vitals...</div>}
                          {form.childName && !dbPatientVitals && <div className="text-[10px] text-amber-600 mb-1">⏳ Loading patient vitals...</div>}
                          <input type="text" placeholder="Type to search BNF drugs..." 
                              value={drugSearch[m.id] !== undefined ? drugSearch[m.id] : m.name}
                              onChange={e => { updateMed(m.id, 'name', e.target.value); searchDrug(m.id, e.target.value); checkInteractions(medicines); }}
                              className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                            {(drugSuggestions[m.id]||[]).length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-black/10 bg-white shadow-lg overflow-hidden">
                                {(drugSuggestions[m.id]||[]).map((drug:any) => (
                                  <button key={drug.id} onClick={() => selectDrug(m.id, drug)}
                                    className="w-full text-left px-3 py-2.5 hover:bg-amber-50 border-b border-black/5 last:border-0">
                                    <div className="text-[13px] font-medium text-navy">{drug.name}</div>
                                    <div className="text-[11px] text-gray-400">{drug.category} · {(drug.paediatric?.mgPerKg) ? `${drug.paediatric.mgPerKg}mg/kg` : 'See dosing'}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {doseWarnings[m.id] && (
                            <div className="mt-1.5 px-3 py-2 rounded-lg text-[11px] font-medium" style={{background:doseWarnings[m.id].includes('🚨')?'#fee2e2':'#fff7ed',color:doseWarnings[m.id].includes('🚨')?'#991b1b':'#92400e'}}>
                              {doseWarnings[m.id]}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Dose</label>
                          <input type="text" placeholder="e.g. 5ml, 250mg" value={m.dose}
                            onChange={e => {
                              updateMed(m.id, 'dose', e.target.value);
                              // Dose override/underride warning
                              const rec = recommendedDoses[m.id];
                              if (rec && rec.min > 0) {
                                const entered = parseFloat(e.target.value.replace(/[^0-9.]/g,''));
                                if (!isNaN(entered)) {
                                  if (entered > rec.max * 1.3) {
                                    setDoseWarnings(p => ({...p, [m.id]: `🔺 Dose Override: ${entered}mg exceeds recommended maximum ${rec.max}mg for this patient`}));
                                  } else if (entered < rec.min * 0.7) {
                                    setDoseWarnings(p => ({...p, [m.id]: `🔻 Sub-therapeutic Dose: ${entered}mg is below recommended minimum ${rec.min}mg — may be ineffective`}));
                                  } else {
                                    setDoseWarnings(p => { const n={...p}; delete n[m.id]; return n; });
                                  }
                                }
                              }
                            }}
                            className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                          {recommendedDoses[m.id] && (
                            <div className="mt-1 px-2 py-1 rounded-lg text-[10px]" style={{background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#166534'}}>
                              {recommendedDoses[m.id].min > 0
                                ? <>✓ Recommended for {recommendedDoses[m.id].weight}kg: <strong>{recommendedDoses[m.id].min}–{recommendedDoses[m.id].max}mg</strong>{recommendedDoses[m.id].frequency ? <> · <strong>{recommendedDoses[m.id].frequency}</strong></> : ''}</>
                                : <>✓ Age-based dose: <strong>{recommendedDoses[m.id].dose}</strong>{recommendedDoses[m.id].frequency ? <> · <strong>{recommendedDoses[m.id].frequency}</strong></> : ''}</>
                              }
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Frequency</label>
                          <select value={m.frequency} onChange={e => {
                            updateMed(m.id, 'frequency', e.target.value);
                            // Frequency override warning
                            const rec = recommendedDoses[m.id];
                            if (rec?.frequency) {
                              const freqMap: Record<string,number> = {'Once daily':1,'Twice daily':2,'Three times daily':3,'Four times daily':4,'Every 6 hours':4,'Every 8 hours':3,'Every 12 hours':2,'Every 4 hours':6,'As needed':0,'Before meals':3,'After meals':3,'At bedtime':1};
                              const recCount = freqMap[rec.frequency] || 0;
                              const newCount = freqMap[e.target.value] || 0;
                              if (recCount > 0 && newCount > recCount * 1.5) {
                                setDoseWarnings(p => ({...p, [`${m.id}_freq`]: `🔺 Frequency Override: "${e.target.value}" selected — drug recommended "${rec.frequency}". Review total daily dose.`}));
                              } else if (recCount > 0 && newCount < recCount * 0.5) {
                                setDoseWarnings(p => ({...p, [`${m.id}_freq`]: `🔻 Reduced Frequency: "${e.target.value}" selected — drug recommended "${rec.frequency}". May reduce efficacy.`}));
                              } else {
                                setDoseWarnings(p => { const n={...p}; delete n[`${m.id}_freq`]; return n; });
                              }
                            }
                          }} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                            {FREQ.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                          {doseWarnings[`${m.id}_freq`] && (
                            <div className="mt-1 px-2 py-1 rounded-lg text-[10px] font-medium" style={{background:'#fff7ed',color:'#92400e',border:'1px solid #fed7aa'}}>
                              {doseWarnings[`${m.id}_freq`]}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Duration</label>
                          <select value={m.duration} onChange={e => updateMed(m.id, 'duration', e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                            {DURATION.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Special Instructions</label>
                          <input type="text" placeholder="e.g. After meals" value={m.notes}
                            onChange={e => updateMed(m.id, 'notes', e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Investigations */}
              <LabInvestigations labs={labRequests} onChange={setLabRequests}/>

              {/* Browse Uploaded Lab Reports */}
              {patientLabResults.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">📋 Uploaded Lab Reports</label>
                    <button onClick={() => setShowLabResults(!showLabResults)} className="text-[11px] text-gold hover:text-amber-700 font-medium">
                      {showLabResults ? 'Hide' : `View ${patientLabResults.length} Report(s)`}
                    </button>
                  </div>
                  {showLabResults && (
                    <div className="space-y-2 rounded-xl p-3" style={{background:'rgba(59,130,246,0.04)',border:'1px solid rgba(59,130,246,0.2)'}}>
                      <div className="text-[11px] text-blue-600 mb-2">Open a report → copy values → paste into lab notes above</div>
                      {patientLabResults.map((r:any) => (
                        <div key={r.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)'}}>
                          <div>
                            <div className="text-[12px] font-medium text-navy">{r.test_name || 'Lab Result'}</div>
                            <div className="text-[10px] text-gray-400">{r.visit_date ? new Date(r.visit_date).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}) : ''} · {r.file_urls?.length || 0} file(s)</div>
                          </div>
                          <div className="flex gap-1">
                            {(r.file_urls||[]).map((url:string, i:number) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium"
                                style={{background:'rgba(59,130,246,0.1)',color:'#1d4ed8',border:'1px solid rgba(59,130,246,0.2)'}}>
                                {/\.(jpg|jpeg|png|gif|webp)$/i.test(url) ? '🖼' : '📄'} View {i+1}
                              </a>
                            ))}
                            {r.notes && (
                              <button onClick={() => { navigator.clipboard.writeText(r.notes); toast.success('Notes copied!'); }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium"
                                style={{background:'rgba(201,168,76,0.1)',color:'#a07a2a',border:'1px solid rgba(201,168,76,0.25)'}}>
                                📋 Copy Notes
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Advice & Follow-up */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Advice & Instructions</label>
                  <textarea rows={3} placeholder="General advice..."
                    value={form.advice || ''}
                    onChange={e => setForm(prev => ({ ...prev, advice: e.target.value }))}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold resize-none" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Follow-up</label>
                  <textarea rows={3} placeholder="e.g. After 7 days if not improved..."
                    value={form.followUp || ''}
                    onChange={e => setForm(prev => ({ ...prev, followUp: e.target.value }))}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold resize-none" />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-black/5">
                <button onClick={validateAndSave} className="btn-gold text-[12px] py-2 px-4 gap-1.5"><Save size={13} /> Save Prescription</button>
                <button onClick={() => {
                  saveRxForm();
                  const rx: Prescription = { ...form as Prescription, medicines: medicines.filter(m => m.name), labs: labRequests } as any;
                  setTimeout(() => printPrescription(rx, clinicName, doctorName, clinicPhone, clinicAddress, dbPatientVitals), 300);
                }} className="btn-outline text-[12px] py-2 px-4 gap-1.5"><Printer size={13} /> Save & Print</button>
                <button onClick={() => setShowForm(false)} className="btn-outline text-[12px] py-2 px-3">Cancel</button>
              </div>
            </div>
          )}

          {/* Prescriptions list */}
          <div className="card overflow-hidden animate-in">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
              <div className="font-medium text-navy text-[14px]">Prescriptions</div>
              <div className="text-[12px] text-gray-400">{filtered.length} records</div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Rx #</th><th>Patient</th><th>Date</th><th>Diagnosis</th><th>Medicines</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-[13px]">
                      No prescriptions yet — click "New Prescription" to write one
                    </td></tr>
                  )}
                  {filtered.map(rx => (
                    <tr key={rx.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="font-mono text-[11px] text-gray-500 font-medium">{rx.id}</td>
                      <td>
                        <div className="font-medium text-navy text-[13px]">{rx.childName}</div>
                        <div className="text-[11px] text-gray-400">Parent: {rx.parentName} · {rx.childAge ? rx.childAge + ' yrs' : '—'}</div>
                      </td>
                      <td className="text-[12px] text-navy whitespace-nowrap">{formatUSDate(rx.date)}</td>
                      <td className="text-[12px] text-gray-600 max-w-[160px] truncate">{rx.diagnosis || '—'}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {rx.medicines.slice(0, 3).map(m => (
                            <span key={m.id} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium truncate max-w-[100px]">{m.name}</span>
                          ))}
                          {rx.medicines.length > 3 && <span className="text-[10px] text-gray-400">+{rx.medicines.length - 3} more</span>}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => printPrescription(rx, clinicName, doctorName, clinicPhone, clinicAddress, dbPatientVitals)}
                            className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-50 transition-colors" title="Print">
                            <Printer size={12} className="text-gray-600" />
                          </button>
                          <button onClick={() => { setForm(rx); setMedicines(rx.medicines); setShowForm(true); }}
                            className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-amber-50 transition-colors" title="Edit">
                            <FileText size={12} className="text-gray-600" />
                          </button>
                          <button onClick={() => deleteRx(rx.id)}
                            className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-50 transition-colors" title="Delete">
                            <X size={12} className="text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: Clinical Reference Panel */}
        {showClinicalPanel && (
          <div className="lg:sticky lg:top-4" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="h-full flex flex-col rounded-2xl border overflow-hidden" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',borderColor:'rgba(255,255,255,0.1)'}}>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{borderColor:'rgba(255,255,255,0.08)'}}>
                <div className="flex items-center gap-2">
                  <Activity size={15} style={{color:'#3b82f6'}}/>
                  <span className="text-sm font-semibold text-white">Clinical Reference</span>
                </div>
                <button onClick={()=>setShowClinicalPanel(false)} className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X size={12}/></button>
              </div>

              {/* Tab buttons */}
              <div className="flex gap-1 px-3 py-2 border-b flex-shrink-0" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                <button onClick={()=>setClinicalTab('dose')} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{background:clinicalTab==='dose'?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.05)',color:clinicalTab==='dose'?'#60a5fa':'rgba(255,255,255,0.4)',border:clinicalTab==='dose'?'1px solid rgba(59,130,246,0.4)':'1px solid transparent'}}>Drug Doses</button>
                <button onClick={()=>setClinicalTab('interaction')} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{background:clinicalTab==='interaction'?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.05)',color:clinicalTab==='interaction'?'#60a5fa':'rgba(255,255,255,0.4)',border:clinicalTab==='interaction'?'1px solid rgba(59,130,246,0.4)':'1px solid transparent'}}>Interactions</button>
              </div>

              {/* DOSE TAB */}
              {clinicalTab==='dose' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="px-3 py-3 border-b flex-shrink-0" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                    <div className="text-[10px] uppercase tracking-widest text-white/40 font-medium mb-2">Search Drug</div>
                    <div className="relative">
                      <input type="text" placeholder="Type drug name..." value={clinicalSearch} onChange={e=>searchClinical(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none focus:border-blue-500/50"/>
                      {clinicalSearching && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 animate-spin"/>}
                    </div>
                    {clinicalResults.length > 0 && !clinicalSelected && (
                      <div className="mt-1 rounded-xl border border-white/10 overflow-hidden">
                        {clinicalResults.map((drug:any) => (
                          <button key={drug.id} onClick={()=>{setClinicalSelected(drug);setClinicalSearch(drug.name);setClinicalResults([]);}}
                            className="w-full text-left px-3 py-2 hover:bg-white/5 border-b border-white/5 last:border-0">
                            <div className="text-[12px] font-medium text-white">{drug.name}</div>
                            <div className="text-[10px] text-white/40">{drug.category}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 py-3">
                    {clinicalSelected ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[13px] font-bold text-white">{clinicalSelected.name}</div>
                          <button onClick={()=>{setClinicalSelected(null);setClinicalSearch('');}} className="text-white/30 hover:text-white/60"><X size={12}/></button>
                        </div>
                        <div className="text-[10px] px-2 py-0.5 rounded-full inline-block" style={{background:'rgba(59,130,246,0.2)',color:'#60a5fa'}}>{clinicalSelected.category}</div>
                        {[
                          {label:'Paediatric Dosing', val: (() => { const pd=clinicalSelected.paediatric||{}; const parts=[]; if(pd.neonatal)parts.push(`Neonate: ${pd.neonatal}`); if(pd.age1to11m)parts.push(`1-11m: ${pd.age1to11m}`); if(pd.age1to4y)parts.push(`1-4yr: ${pd.age1to4y}`); if(pd.age5to11y)parts.push(`5-11yr: ${pd.age5to11y}`); if(pd.age12to17y)parts.push(`12-17yr: ${pd.age12to17y}`); if(pd.mgPerKg)parts.push(`${pd.mgPerKg}mg/kg/dose`); if(pd.maxDose)parts.push(`Max: ${pd.maxDose}mg`); if(pd.frequency)parts.push(pd.frequency); if(pd.route)parts.push(pd.route); return parts.join(' · ')||'See BNF'; })()},
                          {label:'Adult Dose', val: (() => { const a=clinicalSelected.adult||{}; return [a.standard,a.max?`Max: ${a.max}`:'',a.frequency,a.route].filter(Boolean).join(' · ')||'-'; })()},
                          {label:'Contraindications', val:(clinicalSelected.contraindications||[]).join(', ')||'None'},
                          {label:'Cautions', val:(clinicalSelected.cautions||[]).join(', ')||'None'},
                          {label:'Side Effects', val:(clinicalSelected.side_effects||[]).join(', ')||'None'},
                          {label:'Monitoring', val:clinicalSelected.monitoring||'-'},
                          {label:'Renal Dose', val:clinicalSelected.renal_dose||'No adjustment'},
                          {label:'Hepatic Dose', val:clinicalSelected.hepatic_dose||'No adjustment'},
                        ].map(({label,val})=>(
                          <div key={label} className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
                            <div className="text-[9px] uppercase tracking-widest text-white/30 font-medium mb-1">{label}</div>
                            <div className="text-[11px] text-white/80 leading-relaxed">{val}</div>
                          </div>
                        ))}
                        {clinicalSelected.paediatric?.warning && (
                          <div className="rounded-lg p-2.5" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)'}}>
                            <div className="text-[10px] text-red-400 font-medium">⚠️ Warning</div>
                            <div className="text-[11px] text-red-300 mt-0.5">{clinicalSelected.paediatric.warning}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-white/20 text-[11px] mt-8">Search a drug above to see full BNF reference</div>
                    )}
                  </div>
                </div>
              )}

              {/* INTERACTION TAB */}
              {clinicalTab==='interaction' && (
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
                  <div className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Check Drug Interaction</div>
                  <ClinicalDrugInput value={clinicalIxDrug1} onChange={setClinicalIxDrug1} placeholder="Drug 1 (e.g. Ibuprofen)"/>
                  <ClinicalDrugInput value={clinicalIxDrug2} onChange={setClinicalIxDrug2} placeholder="Drug 2 (e.g. Warfarin)"/>
                  <button onClick={checkClinicalInteraction} className="w-full py-2 rounded-xl text-[12px] font-semibold" style={{background:'rgba(59,130,246,0.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)'}}>
                    Check Interaction
                  </button>
                  {clinicalIxResult.length > 0 && (
                    <div className="space-y-2">
                      {clinicalIxResult.map((ix:any,i:number) => (
                        <div key={i} className="rounded-lg p-2.5" style={{background:ix.severity==='Contraindicated'?'rgba(239,68,68,0.15)':ix.severity==='Severe'?'rgba(239,68,68,0.1)':'rgba(245,158,11,0.1)',border:`1px solid ${ix.severity==='Contraindicated'?'rgba(239,68,68,0.3)':ix.severity==='Severe'?'rgba(239,68,68,0.2)':'rgba(245,158,11,0.2)'}`}}>
                          <div className="text-[10px] font-bold mb-1" style={{color:ix.severity==='Contraindicated'?'#f87171':ix.severity==='Severe'?'#fca5a5':'#fcd34d'}}>{ix.severity==='Contraindicated'?'🚫':ix.severity==='Severe'?'⛔':'⚠️'} {ix.severity}</div>
                          <div className="text-[11px] text-white/80">{ix.effect}</div>
                          <div className="text-[10px] text-white/50 mt-0.5">→ {ix.action}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {clinicalIxResult.length === 0 && clinicalIxDrug1 && clinicalIxDrug2 && (
                    <div className="text-center text-white/20 text-[11px]">Click Check Interaction to search</div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

                {/* RIGHT: AI Scribe Panel (like Claude artifacts) */}
        {showScribePanel && (
          <div className="lg:sticky lg:top-4" style={{ height: 'calc(100vh - 120px)' }}>
            {scribeData ? (
              <ScribePanel
                scribeData={scribeData}
                onClose={() => setShowScribePanel(false)}
                onUseInPrescription={useScribeInPrescription}
              />
            ) : (
              <div className="h-full rounded-2xl border flex flex-col items-center justify-center gap-4 p-6 text-center"
                style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <Bot size={40} style={{ color: 'rgba(201,168,76,0.5)' }} />
                <div>
                  <div className="text-white font-semibold mb-1">AI Scribe</div>
                  <div className="text-white/40 text-sm">Generate a SOAP note, prescription, or discharge summary in the AI Scribe tab and it will appear here automatically.</div>
                </div>
                <a href="/dashboard/scribe"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>
                  <ExternalLink size={14} /> Open AI Scribe
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers to extract data from AI output ────────────────────────────────
function extractDiagnosis(text: string): string {
  const match = text.match(/Primary Diagnosis:\s*(.+)/i) ||
    text.match(/Primary:\s*(.+)/i) ||
    text.match(/Diagnosis:\s*(.+)/i);
  return match ? match[1].trim().slice(0, 100) : '';
}

function extractAdvice(text: string): string {
  const match = text.match(/(?:ADVICE TO PATIENT|Patient Education|ADVICE)[\s\S]*?(?:\n)([\s\S]*?)(?=\n\*\*|\n\n\*\*|$)/i);
  if (!match) return '';
  return match[1].replace(/^[-•]\s*/gm, '').trim().slice(0, 300);
}

function extractMedicines(text: string): Medicine[] {
  const medicines: Medicine[] = [];
  // Match markdown table rows: | Drug | Dose | Route | Frequency | Duration |
  const tableRows = text.match(/^\|(?![-\s]*\|[-\s]*\|)(.+)\|$/gm);
  if (!tableRows) return medicines;

  for (const row of tableRows) {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 2 && !cells[0].toLowerCase().includes('drug') && !cells[0].match(/^[-\s]+$/)) {
      medicines.push({
        id: medId(),
        name: cells[0] || '',
        dose: cells[1] || '',
        frequency: cells[3] || 'Twice daily',
        duration: cells[4] || '5 days',
        notes: cells[5] || '',
      });
    }
  }
  return medicines;
}
