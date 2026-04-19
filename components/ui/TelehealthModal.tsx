'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getHealth, getLatestVitals, patientKey } from '@/lib/store';
import { formatUSDate } from '@/lib/sheets';
import { X, Video, Copy, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Appointment } from '@/types';

interface Props { appointment: Appointment; onClose: () => void; }

const PLATFORMS = [
  { key:'jitsi', label:'Jitsi Meet', auto:true, icon:'🎥', hint:'Auto-generated — no setup needed' },
  { key:'zoom',  label:'Zoom',       auto:false, icon:'💙', hint:'Paste your Zoom link' },
  { key:'meet',  label:'Google Meet',auto:false, icon:'📹', hint:'Paste your Google Meet link' },
];

export default function TelehealthModal({ appointment, onClose }: Props) {
  const [step, setStep] = useState<'platform'|'preconsult'|'ready'>('platform');
  const [platform, setPlatform] = useState('jitsi');
  const [manualLink, setManualLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [patientLinkCopied, setPatientLinkCopied] = useState(false);
  const [sessionToken] = useState(() => Math.random().toString(36).slice(2) + Date.now().toString(36));
  const [patientSubmitted, setPatientSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preConsult, setPreConsult] = useState({
    chief_complaint:'', symptoms:'', duration:'',
    weight:'', bp:'', pulse:'', temperature:'', o2_sat:'',
    allergies_confirmed:'', current_meds:'', blood_group:'', notes:'',
  });
  const [billing, setBilling] = useState<any[]>([]);
  const [dbRx, setDbRx] = useState<any[]>([]);

  const jitsiLink = `https://meet.jit.si/MediPlex-${appointment.id.toString().replace(/[^a-zA-Z0-9]/g,'').slice(0,12)}`;
  const patientLink = typeof window !== 'undefined' ? `${window.location.origin}/preconsult/${sessionToken}` : `/preconsult/${sessionToken}`;

  // Poll for patient submission every 5s
  useEffect(() => {
    if (step !== 'ready') return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('telehealth_sessions').select('status').eq('token', sessionToken).maybeSingle();
      if (data?.status === 'submitted') { setPatientSubmitted(true); clearInterval(interval); }
    }, 5000);
    return () => clearInterval(interval);
  }, [step, sessionToken]);
  const finalLink = platform==='jitsi' ? jitsiLink : manualLink;

  useEffect(() => {
    const h = getHealth(patientKey(appointment.childName));
    const v = getLatestVitals(patientKey(appointment.childName));
    setPreConsult(p => ({...p, allergies_confirmed:h.allergies||'', blood_group:h.bloodGroup||'', weight:v?.weight||'', bp:v?.bp||'', pulse:v?.pulse||'', temperature:v?.temperature||''}));
    const mr = (appointment as any).mr_number;
    if (mr) {
      supabase.from('billing').select('*').eq('mr_number',mr).then(({data})=>{ if(data) setBilling(data); });
      supabase.from('prescriptions').select('*').eq('mr_number',mr).order('created_at',{ascending:false}).limit(3).then(({data})=>{ if(data) setDbRx(data); });
    }
  }, [appointment]);

  const outstanding = billing.reduce((s,i) => s+Math.max(0,(Number(i.consultation_fee)||0)-(Number(i.discount)||0)-(Number(i.amount_paid)||0)), 0);

  const saveAndProceed = async () => {
    setLoading(true);
    try { await supabase.from('telehealth_sessions').insert([{
      token: sessionToken,
      appointment_id: appointment.id, mr_number:(appointment as any).mr_number||null,
      child_name:appointment.childName, parent_name:appointment.parentName,
      platform, link:finalLink,
      chief_complaint:preConsult.chief_complaint, symptoms:preConsult.symptoms,
      duration:preConsult.duration,
      vitals:{weight:preConsult.weight,bp:preConsult.bp,pulse:preConsult.pulse,temperature:preConsult.temperature,o2_sat:preConsult.o2_sat},
      allergies:preConsult.allergies_confirmed, current_meds:preConsult.current_meds,
      blood_group:preConsult.blood_group, notes:preConsult.notes,
    }]); } catch {}
    setLoading(false);
    setStep('ready');
  };

  const copyLink = () => { navigator.clipboard.writeText(finalLink); setCopied(true); setTimeout(()=>setCopied(false),2000); toast.success('Link copied!'); };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" style={{background:'#0a1628'}} onClick={e=>e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{borderColor:'rgba(255,255,255,0.08)'}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'rgba(59,130,246,0.2)'}}><Video size={16} style={{color:'#60a5fa'}}/></div>
            <div>
              <div className="font-semibold text-white text-[14px]">Telehealth Consultation</div>
              <div className="text-[11px] text-white/40">{appointment.childName} · {formatUSDate(appointment.appointmentDate)}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X size={13}/></button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {step==='platform' && (
            <div className="p-5 space-y-3">
              <div className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Select Video Platform</div>
              {PLATFORMS.map(pl=>(
                <div key={pl.key} onClick={()=>setPlatform(pl.key)} className="rounded-xl p-4 cursor-pointer transition-all" style={{background:platform===pl.key?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.04)',border:`1px solid ${platform===pl.key?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.08)'}`}}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{pl.icon}</span>
                      <div><div className="text-[13px] font-semibold text-white">{pl.label}</div><div className="text-[11px] text-white/40">{pl.hint}</div></div>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{borderColor:platform===pl.key?'#60a5fa':'rgba(255,255,255,0.2)'}}>
                      {platform===pl.key&&<div className="w-2 h-2 rounded-full bg-blue-400"/>}
                    </div>
                  </div>
                  {platform===pl.key && !pl.auto && (
                    <input type="text" placeholder={`Paste ${pl.label} link...`} value={manualLink} onChange={e=>{e.stopPropagation();setManualLink(e.target.value);}} onClick={e=>e.stopPropagation()}
                      className="mt-3 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none"/>
                  )}
                  {platform===pl.key && pl.auto && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-blue-400 truncate" style={{background:'rgba(255,255,255,0.04)'}}>{jitsiLink}</div>
                  )}
                </div>
              ))}
              <button onClick={()=>setStep('preconsult')} disabled={platform!=='jitsi'&&!manualLink}
                className="w-full py-3 rounded-xl text-[13px] font-semibold mt-2 disabled:opacity-40" style={{background:'rgba(59,130,246,0.8)',color:'#fff'}}>
                Continue → Pre-Consultation
              </button>
            </div>
          )}

          {step==='preconsult' && (
            <div className="p-5 space-y-3">
              <div className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Pre-Consultation Information</div>
              {outstanding>0&&<div className="px-3 py-2 rounded-lg text-[12px] text-red-400" style={{background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)'}}>⚠ Outstanding Balance: PKR {outstanding.toLocaleString()}</div>}
              {dbRx.length>0&&<div className="px-3 py-2 rounded-lg text-[11px] text-white/50" style={{background:'rgba(255,255,255,0.04)'}}>Last Rx: {(dbRx[0].medicines||[]).slice(0,3).map((m:any)=>m.name).join(', ')}</div>}
              <div className="grid grid-cols-2 gap-3">
                {([{l:'Chief Complaint *',k:'chief_complaint',ph:'Main reason for visit',span:true},{l:'Symptoms',k:'symptoms',ph:'Describe current symptoms',span:true},{l:'Duration',k:'duration',ph:'e.g. 3 days'},{l:'Current Medications',k:'current_meds',ph:'Any medications being taken'}] as any[]).map((f:any)=>(
                  <div key={f.k} className={f.span?'col-span-2':''}>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium block mb-1">{f.l}</label>
                    <input type="text" placeholder={f.ph} value={(preConsult as any)[f.k]} onChange={e=>setPreConsult(p=>({...p,[f.k]:e.target.value}))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/20 outline-none focus:border-blue-500/50"/>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Vitals (Patient Self-Reports at Home)</div>
              <div className="grid grid-cols-3 gap-2">
                {([{l:'Weight kg',k:'weight'},{l:'BP',k:'bp'},{l:'Pulse bpm',k:'pulse'},{l:'Temp °C',k:'temperature'},{l:'O2 Sat %',k:'o2_sat'},{l:'Blood Group',k:'blood_group'}] as any[]).map((f:any)=>(
                  <div key={f.k}>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium block mb-1">{f.l}</label>
                    <input type="text" value={(preConsult as any)[f.k]} onChange={e=>setPreConsult(p=>({...p,[f.k]:e.target.value}))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[12px] text-white outline-none focus:border-blue-500/50"/>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium block mb-1">Allergies (Confirm)</label>
                <input type="text" value={preConsult.allergies_confirmed} onChange={e=>setPreConsult(p=>({...p,allergies_confirmed:e.target.value}))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-blue-500/50"/>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setStep('platform')} className="px-4 py-2 rounded-xl text-[12px] text-white/50">← Back</button>
                <button onClick={saveAndProceed} disabled={loading||!preConsult.chief_complaint}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2" style={{background:'rgba(59,130,246,0.8)',color:'#fff'}}>
                  {loading?<><Loader2 size={13} className="animate-spin"/>Saving...</>:'Continue → Start Session'}
                </button>
              </div>
            </div>
          )}

          {step==='ready' && (
            <div className="p-5 space-y-4">
              <div className="rounded-xl p-4 text-center" style={{background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)'}}>
                <div className="text-2xl mb-1">✅</div>
                <div className="text-[14px] font-semibold text-white">Session Ready</div>
                <div className="text-[11px] text-white/40 mt-0.5">Share link with patient, then join below</div>
              </div>
              <div className="rounded-xl p-4 space-y-2" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <div className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Doctor Summary</div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div><span className="text-white/40">Patient: </span><span className="text-white font-medium">{appointment.childName}</span></div>
                  <div><span className="text-white/40">Age: </span><span className="text-white">{appointment.childAge} yrs</span></div>
                  {preConsult.chief_complaint&&<div className="col-span-2"><span className="text-white/40">Complaint: </span><span className="text-white">{preConsult.chief_complaint}</span></div>}
                  {preConsult.symptoms&&<div className="col-span-2"><span className="text-white/40">Symptoms: </span><span className="text-white">{preConsult.symptoms} {preConsult.duration&&`(${preConsult.duration})`}</span></div>}
                  {preConsult.blood_group&&<div><span className="text-white/40">Blood Group: </span><span className="text-red-400 font-bold">{preConsult.blood_group}</span></div>}
                  {preConsult.allergies_confirmed&&<div><span className="text-white/40">Allergies: </span><span className="text-orange-400">{preConsult.allergies_confirmed}</span></div>}
                </div>
                {(preConsult.weight||preConsult.bp||preConsult.pulse)&&(
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                    {preConsult.weight&&<span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'rgba(16,185,129,0.2)',color:'#6ee7b7'}}>⚖ {preConsult.weight}kg</span>}
                    {preConsult.bp&&<span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'rgba(16,185,129,0.2)',color:'#6ee7b7'}}>BP {preConsult.bp}</span>}
                    {preConsult.pulse&&<span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'rgba(16,185,129,0.2)',color:'#6ee7b7'}}>💓 {preConsult.pulse}bpm</span>}
                    {preConsult.temperature&&<span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'rgba(16,185,129,0.2)',color:'#6ee7b7'}}>🌡 {preConsult.temperature}°C</span>}
                    {preConsult.o2_sat&&<span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'rgba(16,185,129,0.2)',color:'#6ee7b7'}}>O2 {preConsult.o2_sat}%</span>}
                  </div>
                )}
                {outstanding>0&&<div className="text-[11px] text-red-400">⚠ Outstanding: PKR {outstanding.toLocaleString()}</div>}
              </div>
              {/* Patient pre-consult link */}
              <div className="rounded-xl p-3 space-y-2" style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.3)'}}>
                <div className="text-[10px] text-amber-400 uppercase tracking-widest font-medium">Send to Patient (WhatsApp)</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-white/50 flex-1 truncate">{patientLink}</span>
                  <button onClick={()=>{navigator.clipboard.writeText(patientLink);setPatientLinkCopied(true);setTimeout(()=>setPatientLinkCopied(false),2000);}} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] flex-shrink-0" style={{background:'rgba(201,168,76,0.2)',color:'#c9a84c'}}>
                    {patientLinkCopied?<Check size={10}/>:<Copy size={10}/>} {patientLinkCopied?'Copied':'Copy'}
                  </button>
                </div>
                {patientSubmitted
                  ? <div className="text-[11px] text-emerald-400 font-medium">✅ Patient form submitted — data synced to records</div>
                  : <div className="text-[11px] text-white/30">⏳ Waiting for patient to complete form...</div>
                }
              </div>

              {/* Doctor join link */}
              <div className="rounded-xl p-3 flex items-center gap-2" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <span className="font-mono text-[11px] text-blue-400 flex-1 truncate">{finalLink}</span>
                <button onClick={copyLink} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] flex-shrink-0" style={{background:'rgba(59,130,246,0.2)',color:'#60a5fa'}}>
                  {copied?<Check size={11}/>:<Copy size={11}/>} {copied?'Copied':'Copy'}
                </button>
              </div>
              <button onClick={()=>window.open(finalLink,'_blank')}
                className="w-full py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2" style={{background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:'#fff'}}>
                <Video size={16}/> Join Consultation Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
