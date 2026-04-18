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
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────
interface Medicine {
  id: string; name: string; dose: string;
  frequency: string; duration: string; notes: string;
}
interface Prescription {
  id: string; appointmentId: string; childName: string;
  parentName: string; childAge: string; date: string;
  diagnosis: string; medicines: Medicine[]; advice: string;
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
function printPrescription(rx: Prescription, clinicName: string, doctorName: string, clinicPhone: string, clinicAddress: string) {
  const key = patientKey(rx.childName);
  const health = getHealth(key);
  const vitals = getLatestVitals(key);

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
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#0a1628;font-size:13px}.page{max-width:800px;margin:0 auto;padding:30px}.header{background:linear-gradient(135deg,#0a1628,#142240);color:white;padding:20px 28px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center}.clinic-name{font-size:20px;font-weight:700}.clinic-sub{font-size:11px;color:rgba(255,255,255,0.6);margin-top:3px}.rx-badge{background:rgba(201,168,76,0.2);border:1px solid rgba(201,168,76,0.4);color:#c9a84c;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600}.body{border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px 28px}.patient-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;padding:14px;background:#f9f7f3;border-radius:8px}.field-label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:2px}.field-val{font-size:13px;font-weight:600;color:#0a1628}.section-title{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;font-weight:600;margin:16px 0 8px}.diagnosis-box{background:#fff9e6;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:14px;font-weight:500;color:#92400e;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#0a1628;color:white;padding:9px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase}.advice-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;font-size:13px;color:#166534;margin-bottom:16px}.followup-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 16px;font-size:13px;color:#1e40af}.footer{margin-top:24px;padding-top:16px;border-top:2px dashed #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end}.sig-line{border-top:1px solid #374151;width:180px;padding-top:4px;font-size:11px;color:#6b7280;text-align:center}@media print{body{padding:0}.page{padding:20px}}</style>
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
      ${rx.advice ? `<div class="section-title">💡 Advice</div><div class="advice-box">${rx.advice}</div>` : ''}
      ${rx.followUp ? `<div class="section-title">📅 Follow-up</div><div class="followup-box">Please visit again: <strong>${rx.followUp}</strong></div>` : ''}
      <div class="footer"><div style="font-size:11px;color:#9ca3af">Valid for 30 days from issue date.</div><div class="sig-line">${doctorName}<br>Signature & Stamp</div></div>
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
  const [activeMode, setActiveMode] = useState<'soap' | 'prescription' | 'discharge'>(scribeData.mode);
  const [generating, setGenerating] = useState(false);
  const [outputs, setOutputs] = useState<Record<string, string>>({
    [scribeData.mode]: scribeData.output
  });

  const modeColors = {
    soap: '#3b82f6',
    prescription: '#10b981',
    discharge: '#f59e0b'
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
  const [search, setSearch] = useState('');
  const [aptSearch, setAptSearch] = useState('');
  const [form, setForm] = useState<Partial<Prescription>>({});
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMed()]);

  // AI Scribe panel state
  const [scribeData, setScribeData] = useState<ScribeOutput | null>(null);
  const [showScribePanel, setShowScribePanel] = useState(false);

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
      diagnosis: '', advice: 'Drink plenty of water. Rest well. Avoid cold drinks.',
      followUp: '', createdAt: new Date().toISOString(),
    });
    setMedicines([emptyMed()]);
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

  const addMedicine = () => setMedicines(prev => [...prev, emptyMed()]);
  const removeMedicine = (id: string) => setMedicines(prev => prev.filter(m => m.id !== id));
  const updateMed = (id: string, field: keyof Medicine, val: string) =>
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));

  const saveRxForm = async () => {
    if (!form.childName) { toast.error('Select a patient first'); return; }
    if (medicines.filter(m => m.name).length === 0) { toast.error('Add at least one medicine'); return; }
    const rx: Prescription = { ...form as Prescription, medicines: medicines.filter(m => m.name) };
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
        diagnosis: rx.diagnosis || '', medicines: rx.medicines,
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
          <button onClick={() => setShowScribePanel(!showScribePanel)}
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
      <div className={`grid gap-5 transition-all ${showScribePanel ? 'grid-cols-1 lg:grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>

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
                const vitals = getLatestVitals(key);
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

              {/* Diagnosis */}
              <div className="mb-4">
                <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Diagnosis</label>
                <input type="text" placeholder="e.g. Acute upper respiratory tract infection"
                  value={form.diagnosis || ''}
                  onChange={e => setForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
              </div>

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
                          <input type="text" placeholder="e.g. Paracetamol 500mg" value={m.name}
                            onChange={e => updateMed(m.id, 'name', e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Dose</label>
                          <input type="text" placeholder="e.g. 5ml, 250mg" value={m.dose}
                            onChange={e => updateMed(m.id, 'dose', e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Frequency</label>
                          <select value={m.frequency} onChange={e => updateMed(m.id, 'frequency', e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                            {FREQ.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
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
                <button onClick={saveRxForm} className="btn-gold text-[12px] py-2 px-4 gap-1.5"><Save size={13} /> Save Prescription</button>
                <button onClick={() => {
                  saveRxForm();
                  const rx: Prescription = { ...form as Prescription, medicines: medicines.filter(m => m.name) };
                  setTimeout(() => printPrescription(rx, clinicName, doctorName, clinicPhone, clinicAddress), 300);
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
                          <button onClick={() => printPrescription(rx, clinicName, doctorName, clinicPhone, clinicAddress)}
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
