'use client';
import { useState } from 'react';
import { Loader2, Stethoscope, Pill, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface Props {
  chiefComplaint: string;
  signsSymptoms: string;
  patientAge: string;
  patientName: string;
  vitals?: any;
  onSelectDiagnosis: (diagnosis: string) => void;
  onSelectMedicines: (medicines: any[]) => void;
  onSelectAdvice: (advice: string) => void;
}

export default function AIDiagnosisAssist({
  chiefComplaint, signsSymptoms, patientAge, patientName,
  vitals, onSelectDiagnosis, onSelectMedicines, onSelectAdvice
}: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [expanded, setExpanded] = useState(true);
  const [selectedDx, setSelectedDx] = useState('');

  const suggest = async () => {
    if (!chiefComplaint && !signsSymptoms) return;
    setLoading(true);
    setResult(null);
    const prompt = `You are an expert clinical decision support AI.
Patient: ${patientAge ? patientAge + ' year old' : ''} ${patientName || ''}
Chief Complaint: ${chiefComplaint || 'Not specified'}
Signs & Symptoms: ${signsSymptoms || 'Not specified'}
${vitals?.weight ? 'Weight: ' + vitals.weight + ' kg' : ''}
${vitals?.temperature ? 'Temp: ' + vitals.temperature + 'C' : ''}

Respond ONLY with valid JSON (no markdown):
{
  "differentialDiagnosis": [
    {"diagnosis": "name", "probability": "High|Medium|Low", "reasoning": "brief"},
    {"diagnosis": "name", "probability": "Medium", "reasoning": "brief"},
    {"diagnosis": "name", "probability": "Low", "reasoning": "brief"}
  ],
  "treatmentProtocol": {
    "firstLine": [{"drug": "name", "dose": "dose", "frequency": "freq", "duration": "dur", "notes": "notes"}],
    "supportive": ["measure1", "measure2"],
    "redFlags": ["warning1", "warning2"]
  },
  "investigations": ["test1", "test2"],
  "patientAdvice": "advice text",
  "followUp": "follow up text"
}`;
    try {
      const res = await fetch('/api/anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      setResult(JSON.parse(text.replace(/```json|```/g, '').trim()));
      setExpanded(true);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const probColor = (p: string) => p === 'High' ? {bg:'#fef2f2',color:'#dc2626',border:'#fecaca'} : p === 'Medium' ? {bg:'#fffbeb',color:'#d97706',border:'#fde68a'} : {bg:'#f0fdf4',color:'#16a34a',border:'#bbf7d0'};

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{border:'1px solid rgba(59,130,246,0.3)',background:'rgba(59,130,246,0.04)'}}>
      <div className="flex items-center justify-between px-4 py-3" style={{borderBottom:result?'1px solid rgba(59,130,246,0.15)':'none'}}>
        <div className="flex items-center gap-2">
          <Stethoscope size={14} style={{color:'#3b82f6'}}/>
          <span className="text-[13px] font-semibold text-navy">AI Clinical Decision Support</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'rgba(59,130,246,0.1)',color:'#3b82f6'}}>Differential Dx + Treatment</span>
        </div>
        <div className="flex items-center gap-2">
          {result && <button onClick={()=>setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">{expanded?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>}
          <button onClick={suggest} disabled={loading||(!chiefComplaint&&!signsSymptoms)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-40"
            style={{background:'#3b82f6',color:'#fff'}}>
            {loading?<><Loader2 size={12} className="animate-spin"/>Analyzing...</>:'🧠 AI Suggest'}
          </button>
        </div>
      </div>
      {result && expanded && (
        <div className="p-4 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-2">Differential Diagnosis — Click to Select</div>
            <div className="space-y-2">
              {result.differentialDiagnosis?.map((dx:any,i:number)=>{
                const cl = probColor(dx.probability);
                const isSel = selectedDx===dx.diagnosis;
                return (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                    style={{background:isSel?'rgba(59,130,246,0.1)':cl.bg,border:isSel?'2px solid #3b82f6':`1px solid ${cl.border}`}}
                    onClick={()=>{setSelectedDx(dx.diagnosis);onSelectDiagnosis(dx.diagnosis);}}>
                    <div className="flex-shrink-0 mt-0.5">
                      {isSel?<div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><Check size={11} color="white"/></div>:<div className="w-5 h-5 rounded-full border-2" style={{borderColor:cl.color}}/>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-navy">{i+1}. {dx.diagnosis}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:cl.bg,color:cl.color,border:`1px solid ${cl.border}`}}>{dx.probability}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{dx.reasoning}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {result.treatmentProtocol && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">Evidence-Based Treatment</div>
                {result.treatmentProtocol.firstLine?.length>0&&(
                  <button onClick={()=>{
                    const meds=result.treatmentProtocol.firstLine.map((m:any)=>({id:'m-'+Math.random().toString(36).slice(2,7),name:m.drug,dose:m.dose,frequency:m.frequency,duration:m.duration,notes:m.notes||''}));
                    onSelectMedicines(meds);
                    if(result.patientAdvice)onSelectAdvice(result.patientAdvice);
                  }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                    style={{background:'rgba(22,163,74,0.1)',color:'#16a34a',border:'1px solid rgba(22,163,74,0.3)'}}>
                    <Pill size={11}/> Use This Protocol
                  </button>
                )}
              </div>
              <div className="rounded-xl overflow-hidden" style={{border:'1px solid #e5e7eb'}}>
                {result.treatmentProtocol.firstLine?.length>0&&(
                  <div className="p-3" style={{borderBottom:'1px solid #f3f4f6'}}>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">First-Line Medications</div>
                    {result.treatmentProtocol.firstLine.map((m:any,i:number)=>(
                      <div key={i} className="text-[12px] text-navy mb-1">
                        <strong>{m.drug}</strong> · {m.dose} · {m.frequency} · {m.duration}{m.notes?` (${m.notes})`:''}
                      </div>
                    ))}
                  </div>
                )}
                {result.treatmentProtocol.supportive?.length>0&&(
                  <div className="p-3" style={{background:'#f0fdf4',borderBottom:'1px solid #f3f4f6'}}>
                    <div className="text-[10px] text-emerald-600 uppercase tracking-widest mb-1">Supportive</div>
                    <div className="text-[12px] text-gray-600">{result.treatmentProtocol.supportive.join(' · ')}</div>
                  </div>
                )}
                {result.treatmentProtocol.redFlags?.length>0&&(
                  <div className="p-3" style={{background:'#fef2f2'}}>
                    <div className="text-[10px] text-red-500 uppercase tracking-widest mb-1">⚠ Red Flags</div>
                    <div className="text-[12px] text-red-600">{result.treatmentProtocol.redFlags.join(' · ')}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          {result.investigations?.length>0&&(
            <div>
              <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-1">Suggested Investigations</div>
              <div className="flex flex-wrap gap-2">
                {result.investigations.map((inv:string,i:number)=>(
                  <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg" style={{background:'rgba(201,168,76,0.1)',color:'#92400e',border:'1px solid rgba(201,168,76,0.3)'}}>🔬 {inv}</span>
                ))}
              </div>
            </div>
          )}
          {result.followUp&&<div className="text-[12px] text-blue-600 px-3 py-2 rounded-lg" style={{background:'#eff6ff',border:'1px solid #bfdbfe'}}>📅 Follow-up: {result.followUp}</div>}
          <div className="text-[10px] text-gray-400 text-center">⚠ AI suggestions are for clinical decision support only. Always apply clinical judgment.</div>
        </div>
      )}
    </div>
  );
}
