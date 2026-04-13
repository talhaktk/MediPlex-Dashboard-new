'use client';
import { useState, useRef } from 'react';
import { Mic, MicOff, FileText, ClipboardList, Pill, Copy, Download, RefreshCw, ChevronRight, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

type Mode = 'soap' | 'prescription' | 'discharge';
type Status = 'idle' | 'recording' | 'processing' | 'done';

const MODES = [
  {
    id: 'soap' as Mode,
    label: 'SOAP Note',
    icon: FileText,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.3)',
    desc: 'Generate structured clinical note from consultation',
    placeholder: 'Describe the consultation... e.g. "35 year old male presenting with 3 days of productive cough, fever 38.5°C, reduced air entry right base, on no regular medications, no allergies..."',
    prompt: (text: string) => `You are a clinical documentation AI. Convert this consultation note into a professional SOAP format clinical note.

Input: ${text}

Output EXACTLY in this format:
**SUBJECTIVE**
Chief Complaint: [1 line]
History of Presenting Complaint: [2-4 lines]
Past Medical History: [bullet points]
Medications: [list]
Allergies: [list]
Social History: [brief]
Review of Systems: [relevant positives/negatives]

**OBJECTIVE**
Vital Signs: [if mentioned]
Examination: [findings]
Investigations: [if mentioned]

**ASSESSMENT**
Primary Diagnosis: [diagnosis with ICD code if possible]
Differential Diagnoses: [2-3 differentials]

**PLAN**
Investigations: [ordered]
Management: [medications/procedures]
Follow-up: [timing]
Patient Education: [key points]

Be concise and professional. Use medical terminology.`
  },
  {
    id: 'prescription' as Mode,
    label: 'Prescription Writer',
    icon: Pill,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.3)',
    desc: 'Generate complete prescription from clinical details',
    placeholder: 'Describe the patient and condition... e.g. "65 year old diabetic with hypertension and new UTI, eGFR 45, on metformin and amlodipine, penicillin allergic, needs treatment for uncomplicated lower UTI..."',
    prompt: (text: string) => `You are a clinical prescribing AI. Generate a safe, evidence-based prescription from this clinical information.

Input: ${text}

Output EXACTLY in this format:
**PATIENT SUMMARY**
[Brief 2-line summary]

**PRESCRIPTION**
| Drug | Dose | Route | Frequency | Duration | Instructions |
|------|------|-------|-----------|----------|--------------|
[Fill table with all medications]

**PRESCRIBING NOTES**
- Allergy considerations: [notes]
- Renal/hepatic adjustments: [if applicable]
- Drug interactions to monitor: [key interactions]
- Counselling points: [patient instructions]

**MONITORING**
[What to monitor and when]

**FOLLOW-UP**
[Recommended follow-up]

Base on BNF guidelines. Flag any safety concerns clearly with ⚠️`
  },
  {
    id: 'discharge' as Mode,
    label: 'Discharge Summary',
    icon: ClipboardList,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    desc: 'Generate discharge summary from admission notes',
    placeholder: 'Describe the admission... e.g. "75 year old female admitted with NSTEMI, troponin peaked at 850, echo showed EF 40%, treated with DAPT and LMWH, PCI performed day 2 with DES to LAD, discharged day 5 on new medications..."',
    prompt: (text: string) => `You are a clinical documentation AI. Generate a comprehensive discharge summary from this admission information.

Input: ${text}

Output EXACTLY in this format:
**DISCHARGE SUMMARY**

Admission Date: [if mentioned, else leave blank]
Discharge Date: [if mentioned]
Consultant: [if mentioned]
Ward: [if mentioned]

**REASON FOR ADMISSION**
[1-2 sentences]

**PRESENTING COMPLAINT**
[Brief description]

**RELEVANT HISTORY**
[PMH, medications on admission, allergies]

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

**ADVICE TO PATIENT**
[Key instructions]

**GP ACTIONS REQUIRED**
[What GP needs to do]

Be thorough and professional.`
  }
];

export default function ScribeClient() {
  const [mode, setMode] = useState<Mode>('soap');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [copied, setCopied] = useState(false);
  const recognitionRef = useRef<any>(null);
  const currentMode = MODES.find(m => m.id === mode)!;

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Speech recognition not supported in this browser'); return; }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.onresult = (e: any) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = () => { setStatus('idle'); toast.error('Microphone error'); };
    recognition.onend = () => setStatus((prev: Status) => prev === 'recording' ? 'idle' : prev);
    recognition.start();
    recognitionRef.current = recognition;
    setStatus('recording');
    toast.success('Listening... speak now');
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setStatus('idle');
  };

  const generate = async () => {
    if (!input.trim()) { toast.error('Please enter or speak clinical notes first'); return; }
    setStatus('processing');
    setOutput('');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: currentMode.prompt(input) }]
        })
      });
      const data = await res.json();
      const text = data.content?.map((c: any) => c.text || '').join('') || 'No output generated';
      setOutput(text);
      setStatus('done');
    } catch {
      toast.error('Generation failed');
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
    a.download = `${mode}-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
  };

  const reset = () => { setInput(''); setOutput(''); setStatus('idle'); };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🤖</span>
          <h1 className="text-xl font-bold text-white">AI Scribe</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 ml-2">Beta</span>
        </div>
        <p className="text-white/50 text-sm">Clinical documentation powered by AI — Voice or text input</p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-3 mb-6">
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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: active ? m.bg : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? m.border : 'transparent'}` }}>
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
              {input && <button onClick={reset} className="px-2 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 transition-all">Clear</button>}
            </div>
          </div>

          {status === 'recording' && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400">Recording... speak clearly</span>
            </div>
          )}

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={currentMode.placeholder}
            rows={12}
            className="w-full bg-transparent text-white/80 text-sm resize-none outline-none placeholder-white/20 leading-relaxed"
          />

          <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className="text-xs text-white/30">{input.length} characters</span>
            <button onClick={generate} disabled={status === 'processing' || !input.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: currentMode.color, color: '#fff' }}>
              {status === 'processing' ? <><Loader2 size={14} className="animate-spin" />Generating...</> : <>Generate {currentMode.label}</>}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white/70">Generated Output</span>
            {output && (
              <div className="flex gap-2">
                <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                  {copied ? <><Check size={12} />Copied</> : <><Copy size={12} />Copy</>}
                </button>
                <button onClick={download} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                  <Download size={12} />Save
                </button>
                <button onClick={() => { setOutput(''); setStatus('idle'); }} className="px-2 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70">
                  <RefreshCw size={12} />
                </button>
              </div>
            )}
          </div>

          {status === 'processing' && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 size={32} className="animate-spin" style={{ color: currentMode.color }} />
              <span className="text-sm text-white/50">Generating {currentMode.label}...</span>
            </div>
          )}

          {!output && status !== 'processing' && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: currentMode.bg, border: `1px solid ${currentMode.border}` }}>
                {(() => { const Icon = currentMode.icon; return <Icon size={28} style={{ color: currentMode.color }} />; })()}
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-white/50">No output yet</div>
                <div className="text-xs text-white/30 mt-1">Enter clinical notes and click Generate</div>
              </div>
            </div>
          )}

          {output && (
            <div className="overflow-y-auto max-h-[500px] pr-1">
              <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-mono">
                {output.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <div key={i} className="font-bold text-sm mt-4 mb-1" style={{ color: currentMode.color }}>{line.replace(/\*\*/g, '')}</div>;
                  }
                  if (line.startsWith('|')) {
                    return <div key={i} className="text-xs font-mono text-white/70 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>{line}</div>;
                  }
                  if (line.startsWith('- ') || line.startsWith('• ')) {
                    return <div key={i} className="text-xs text-white/70 ml-2">{line}</div>;
                  }
                  return <div key={i} className="text-[13px] text-white/75">{line}</div>;
                })}
              </div>
            </div>
          )}

          {output && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: currentMode.bg, color: currentMode.color, border: `1px solid ${currentMode.border}` }}>AI Generated</span>
              <span className="text-xs text-white/30">Always verify before use. Clinical judgement required.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
