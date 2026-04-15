'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic, MicOff, FileText, ClipboardList, Pill, Copy, Download,
  RefreshCw, ChevronRight, Loader2, Check, Search, User,
  Heart, AlertTriangle, Activity, X, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Appointment } from '@/types';
import { getHealth, getLatestVitals, patientKey } from '@/lib/store';
import { saveScribeOutput } from '@/lib/scribeStore';

type Mode = 'soap' | 'prescription' | 'discharge';
type Status = 'idle' | 'recording' | 'processing' | 'done';

interface SelectedPatient {
  name: string;
  age: string;
  parentName: string;
  whatsapp: string;
}

function buildPatientContext(patient: SelectedPatient): string {
  const key = patientKey(patient.name);
  const health = getHealth(key);
  const vitals = getLatestVitals(key);

  const parts: string[] = [
    `Patient: ${patient.name}`,
    patient.age ? `Age: ${patient.age} years` : '',
    patient.parentName ? `Parent/Guardian: ${patient.parentName}` : '',
    health.bloodGroup ? `Blood Group: ${health.bloodGroup}` : '',
    health.allergies ? `⚠️ ALLERGIES: ${health.allergies}` : 'No known allergies',
    health.conditions ? `Medical History: ${health.conditions}` : '',
    health.notes ? `Previous Notes: ${health.notes}` : '',
  ];

  if (vitals) {
    const vitalParts = [
      vitals.weight ? `Weight: ${vitals.weight}kg` : '',
      vitals.height ? `Height: ${vitals.height}cm` : '',
      vitals.bp ? `BP: ${vitals.bp}` : '',
      vitals.pulse ? `Pulse: ${vitals.pulse}bpm` : '',
      vitals.temperature ? `Temp: ${vitals.temperature}°C` : '',
    ].filter(Boolean);
    if (vitalParts.length) parts.push(`Latest Vitals (${vitals.recordedAt}): ${vitalParts.join(', ')}`);
  }

  return parts.filter(Boolean).join('\n');
}

const MODES = [
  {
    id: 'soap' as Mode,
    label: 'SOAP Note',
    icon: FileText,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.3)',
    desc: 'Structured clinical note from consultation',
    prompt: (text: string, ctx: string) => `You are a clinical documentation AI for a pediatric clinic. Convert this consultation into a professional SOAP note.

PATIENT CONTEXT (auto-loaded from records):
${ctx}

CONSULTATION NOTES:
${text}

Output EXACTLY in this format:
**SUBJECTIVE**
Chief Complaint: [1 line]
History of Presenting Complaint: [2-4 lines]
Past Medical History: [from patient records above]
Current Medications: [list]
Allergies: [from patient records — flag if present]
Social History: [brief]
Review of Systems: [relevant positives/negatives]

**OBJECTIVE**
Vital Signs: [from patient records above if available]
Examination: [findings from notes]
Investigations: [if mentioned]

**ASSESSMENT**
Primary Diagnosis: [diagnosis with ICD-10 code]
Differential Diagnoses: [2-3 differentials]

**PLAN**
Investigations: [ordered]
Management: [medications/procedures]
Follow-up: [timing]
Patient Education: [key points]

Be concise and professional. Use pediatric medical terminology.`
  },
  {
    id: 'prescription' as Mode,
    label: 'Prescription Writer',
    icon: Pill,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.3)',
    desc: 'Generate prescription from clinical details',
    prompt: (text: string, ctx: string) => `You are a pediatric prescribing AI. Generate a safe, evidence-based prescription.

PATIENT CONTEXT (auto-loaded from records):
${ctx}

CLINICAL DETAILS:
${text}

Output EXACTLY in this format:
**PATIENT SUMMARY**
[Brief 2-line summary including age, weight if available]

**PRESCRIPTION**
| Drug | Dose | Route | Frequency | Duration | Instructions |
|------|------|-------|-----------|----------|--------------|
[Fill table — use PEDIATRIC weight-based dosing where possible]

**PRESCRIBING NOTES**
- Allergy considerations: [check against patient allergies above — flag ⚠️ if conflict]
- Weight-based dosing notes: [if weight available]
- Drug interactions to monitor: [key interactions]
- Counselling points: [parent/patient instructions]

**MONITORING**
[What to monitor and when]

**FOLLOW-UP**
[Recommended follow-up]

Base on BNF for Children / WHO pediatric guidelines. Flag ANY safety concerns with ⚠️`
  },
  {
    id: 'discharge' as Mode,
    label: 'Discharge Summary',
    icon: ClipboardList,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    desc: 'Generate discharge summary from admission',
    prompt: (text: string, ctx: string) => `You are a clinical documentation AI. Generate a comprehensive pediatric discharge summary.

PATIENT CONTEXT (auto-loaded from records):
${ctx}

ADMISSION DETAILS:
${text}

Output EXACTLY in this format:
**DISCHARGE SUMMARY**
Patient: [from context]
Age: [from context]
Admission Date: [if mentioned]
Discharge Date: [if mentioned]

**REASON FOR ADMISSION**
[1-2 sentences]

**PRESENTING COMPLAINT**
[Brief description]

**RELEVANT HISTORY**
[From patient records + admission notes]

**CLINICAL FINDINGS**
[Key examination and investigation findings]

**DIAGNOSIS**
Primary: [diagnosis]
Secondary: [other active diagnoses]

**TREATMENT DURING ADMISSION**
[What was done, procedures, medications given]

**DISCHARGE MEDICATIONS**
| Drug | Dose | Frequency | Duration | Change |
|------|------|-----------|----------|--------|
[NEW/CHANGED/CONTINUED/STOPPED for each]

**OUTSTANDING RESULTS**
[Pending investigations]

**FOLLOW-UP PLAN**
[Appointments, referrals]

**ADVICE TO PARENT/PATIENT**
[Key instructions in simple language]

**GP/PRIMARY CARE ACTIONS REQUIRED**
[What needs to be done]

Be thorough and professional.`
  }
];

export default function ScribeClient({ data }: { data: Appointment[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('soap');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [copied, setCopied] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Patient selector
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [patientContext, setPatientContext] = useState('');

  const currentMode = MODES.find(m => m.id === mode)!;

  // Build unique patients from appointments
  const uniquePatients = Array.from(
    new Map(
      data
        .filter(a => a.childName?.trim())
        .map(a => [
          a.childName.toLowerCase().trim(),
          { name: a.childName, age: a.childAge, parentName: a.parentName, whatsapp: a.whatsapp }
        ])
    ).values()
  );

  const filteredPatients = patientSearch
    ? uniquePatients.filter(p =>
        p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.parentName.toLowerCase().includes(patientSearch.toLowerCase())
      )
    : uniquePatients.slice(0, 8);

  const selectPatient = (p: SelectedPatient) => {
    setSelectedPatient(p);
    const ctx = buildPatientContext(p);
    setPatientContext(ctx);
    setShowPatientSearch(false);
    setPatientSearch('');
    // Pre-fill input with patient context
    setInput(prev => prev ? prev : `Patient: ${p.name}, Age: ${p.age}`);
    toast.success(`Loaded ${p.name}'s records`);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setPatientContext('');
  };

  // Patient health data for display
  const patientHealth = selectedPatient ? getHealth(patientKey(selectedPatient.name)) : null;
  const patientVitals = selectedPatient ? getLatestVitals(patientKey(selectedPatient.name)) : null;

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Speech recognition not supported in this browser'); return; }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.onresult = (e: any) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => { setStatus('idle'); toast.error('Microphone error'); };
    recognition.onend = () => setStatus((prev: Status) => prev === 'recording' ? 'idle' : prev);
    recognition.start();
    recognitionRef.current = recognition;
    setStatus('recording');
    toast.success('Listening... speak now');
  };

  const stopRecording = () => { recognitionRef.current?.stop(); setStatus('idle'); };

  const generate = async () => {
    if (!input.trim()) { toast.error('Please enter or speak clinical notes first'); return; }
    setStatus('processing');
    setOutput('');
    try {
      const res = await fetch('/api/scribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: currentMode.prompt(input, patientContext) }]
        })
      });
      const data = await res.json();
      const text = data.content?.map((c: any) => c.text || '').join('') || 'No output generated';
      setOutput(text);
      setStatus('done');
      // Save to shared store so Prescription tab can read it
      if (selectedPatient) {
        saveScribeOutput({
          patientName: selectedPatient.name,
          patientAge: selectedPatient.age,
          parentName: selectedPatient.parentName,
          mode,
          output: text,
          generatedAt: new Date().toISOString(),
        });
      }
    } catch {
      toast.error('Generation failed — check API route');
      setStatus('idle');
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode}-${selectedPatient?.name || 'patient'}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  const sendToPrescription = () => {
    if (!output || !selectedPatient) { toast.error('Generate output and select a patient first'); return; }
    saveScribeOutput({
      patientName: selectedPatient.name,
      patientAge: selectedPatient.age,
      parentName: selectedPatient.parentName,
      mode,
      output,
      generatedAt: new Date().toISOString(),
    });
    toast.success('Sent to Prescription tab!');
    router.push('/dashboard/prescription');
  };

  const reset = () => { setInput(''); setOutput(''); setStatus('idle'); };

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
          <p className="text-white/50 text-sm">Clinical documentation powered by AI — patient data auto-merged</p>
        </div>
        {output && selectedPatient && (
          <button onClick={sendToPrescription}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <ExternalLink size={14} /> Send to Prescription
          </button>
        )}
      </div>

      {/* Patient Selector */}
      <div className="mb-5 rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(201,168,76,0.25)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-white/80">👤 Patient</span>
          {selectedPatient && (
            <button onClick={clearPatient} className="text-white/30 hover:text-white/60 transition-all">
              <X size={14} />
            </button>
          )}
        </div>

        {!selectedPatient ? (
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search patient by name or parent..."
              value={patientSearch}
              onChange={e => { setPatientSearch(e.target.value); setShowPatientSearch(true); }}
              onFocus={() => setShowPatientSearch(true)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30"
            />
            {showPatientSearch && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-white/10 overflow-hidden z-10"
                style={{ background: '#1e293b' }}>
                {filteredPatients.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-white/40">No patients found</div>
                ) : (
                  filteredPatients.map(p => (
                    <button key={p.name} onClick={() => selectPatient(p)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-all text-left">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{p.name}</div>
                        <div className="text-xs text-white/40">Parent: {p.parentName} · Age {p.age}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Selected patient banner */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                {selectedPatient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{selectedPatient.name}</div>
                <div className="text-xs text-white/50">Parent: {selectedPatient.parentName} · Age {selectedPatient.age}</div>
              </div>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                ✓ Records loaded
              </span>
            </div>

            {/* Health summary pills */}
            <div className="flex flex-wrap gap-2">
              {patientHealth?.bloodGroup && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(220,38,38,0.1)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <Heart size={10} /> {patientHealth.bloodGroup}
                </span>
              )}
              {patientHealth?.allergies && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(234,88,12,0.1)', color: '#fb923c', border: '1px solid rgba(234,88,12,0.2)' }}>
                  <AlertTriangle size={10} /> {patientHealth.allergies}
                </span>
              )}
              {patientVitals?.weight && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Activity size={10} /> {patientVitals.weight}kg {patientVitals.height ? `· ${patientVitals.height}cm` : ''} {patientVitals.bp ? `· BP ${patientVitals.bp}` : ''}
                </span>
              )}
              {patientHealth?.conditions && (
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                  Hx: {patientHealth.conditions.slice(0, 40)}{patientHealth.conditions.length > 40 ? '...' : ''}
                </span>
              )}
              {!patientHealth?.bloodGroup && !patientHealth?.allergies && !patientVitals && (
                <span className="text-xs text-white/30">No health records on file — add in Patients tab</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {MODES.map(m => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button key={m.id} onClick={() => { setMode(m.id); setOutput(''); setStatus('idle'); }}
              className="p-4 rounded-2xl border text-left transition-all"
              style={{
                background: active ? m.bg : 'rgba(255,255,255,0.03)',
                borderColor: active ? m.border : 'rgba(255,255,255,0.08)',
                transform: active ? 'scale(1.02)' : 'scale(1)'
              }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: active ? m.bg : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? m.border : 'transparent'}` }}>
                  <Icon size={16} style={{ color: active ? m.color : 'rgba(255,255,255,0.4)' }} />
                </div>
                {active && <ChevronRight size={12} style={{ color: m.color }} />}
              </div>
              <div className="text-sm font-semibold" style={{ color: active ? m.color : 'rgba(255,255,255,0.7)' }}>{m.label}</div>
              <div className="text-[11px] mt-0.5" style={{ color: active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)' }}>{m.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input Panel */}
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white/70">Clinical Input</span>
            <div className="flex gap-2">
              <button onClick={status === 'recording' ? stopRecording : startRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: status === 'recording' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${status === 'recording' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.15)'}`,
                  color: status === 'recording' ? '#ef4444' : 'rgba(255,255,255,0.7)'
                }}>
                {status === 'recording' ? <><MicOff size={12} />Stop</> : <><Mic size={12} />Voice</>}
              </button>
              {input && <button onClick={reset} className="px-2 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70">Clear</button>}
            </div>
          </div>

          {status === 'recording' && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400">Recording... speak clearly</span>
            </div>
          )}

          {selectedPatient && patientContext && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'rgba(52,211,153,0.8)' }}>
              ✓ Patient records auto-merged into prompt
            </div>
          )}

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={selectedPatient
              ? `Add consultation notes for ${selectedPatient.name}... e.g. "presenting with 3 days of fever and cough, O/E: reduced air entry right base, temp 38.5°C..."`
              : `Select a patient above, then describe the consultation...`
            }
            rows={14}
            className="w-full bg-transparent text-white/80 text-sm resize-none outline-none placeholder-white/20 leading-relaxed"
          />

          <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className="text-xs text-white/30">{input.length} chars</span>
            <button onClick={generate} disabled={status === 'processing' || !input.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: currentMode.color, color: '#fff' }}>
              {status === 'processing'
                ? <><Loader2 size={14} className="animate-spin" />Generating...</>
                : <>Generate {currentMode.label}</>}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white/70">Generated Output</span>
            {output && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={copy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                  {copied ? <><Check size={12} />Copied</> : <><Copy size={12} />Copy</>}
                </button>
                <button onClick={download}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                  <Download size={12} />Save
                </button>
                {selectedPatient && (
                  <button onClick={sendToPrescription}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399' }}>
                    <ExternalLink size={12} />→ Prescription
                  </button>
                )}
                <button onClick={() => { setOutput(''); setStatus('idle'); }}
                  className="px-2 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70">
                  <RefreshCw size={12} />
                </button>
              </div>
            )}
          </div>

          {status === 'processing' && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 size={32} className="animate-spin" style={{ color: currentMode.color }} />
              <span className="text-sm text-white/50">Generating {currentMode.label}...</span>
              {selectedPatient && <span className="text-xs text-white/30">Including {selectedPatient.name}'s records</span>}
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
                <div className="text-xs text-white/30 mt-1">
                  {selectedPatient ? 'Enter notes and click Generate' : 'Select a patient first'}
                </div>
              </div>
            </div>
          )}

          {output && (
            <div className="overflow-y-auto max-h-[520px] pr-1">
              <div className="text-sm text-white/80 leading-relaxed">
                {output.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <div key={i} className="font-bold text-sm mt-4 mb-1.5 pb-1 border-b"
                      style={{ color: currentMode.color, borderColor: 'rgba(255,255,255,0.06)' }}>
                      {line.replace(/\*\*/g, '')}
                    </div>;
                  }
                  if (line.startsWith('|')) {
                    return <div key={i} className="text-xs font-mono text-white/70 border-b"
                      style={{ borderColor: 'rgba(255,255,255,0.05)' }}>{line}</div>;
                  }
                  if (line.startsWith('- ') || line.startsWith('• ')) {
                    return <div key={i} className="text-xs text-white/70 ml-2 my-0.5">{line}</div>;
                  }
                  if (line.includes('⚠️')) {
                    return <div key={i} className="text-xs font-medium my-1 px-2 py-1 rounded"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{line}</div>;
                  }
                  return <div key={i} className="text-[13px] text-white/75 my-0.5">{line}</div>;
                })}
              </div>
            </div>
          )}

          {output && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: currentMode.bg, color: currentMode.color, border: `1px solid ${currentMode.border}` }}>
                AI Generated
              </span>
              {selectedPatient && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {selectedPatient.name}'s records merged
                </span>
              )}
              <span className="text-xs text-white/30">Always verify before use. Clinical judgement required.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
