'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getHealth, getLatestVitals, patientKey } from '@/lib/store';
import { formatUSDate } from '@/lib/sheets';
import { X, Video, Copy, Check, Loader2, ExternalLink, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Appointment } from '@/types';

interface Props { appointment: Appointment; onClose: () => void; }

const PLATFORMS = [
  { key:'jitsi', label:'Jitsi Meet', auto:true,  icon:'🎥', hint:'Auto-generated — no account needed' },
  { key:'zoom',  label:'Zoom',       auto:false, icon:'💙', hint:'Paste your Zoom meeting link' },
  { key:'meet',  label:'Google Meet',auto:false, icon:'📹', hint:'Paste your Google Meet link' },
];

export default function TelehealthModal({ appointment, onClose }: Props) {
  const [step, setStep] = useState<'platform'|'waiting'|'ready'>('platform');
  const [platform, setPlatform] = useState('jitsi');
  const [manualLink, setManualLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [patientLinkCopied, setPatientLinkCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [patientSubmitted, setPatientSubmitted] = useState(false);
  const [sessionToken] = useState(() => Math.random().toString(36).slice(2,10) + Date.now().toString(36));
  const [patientData, setPatientData] = useState<any>(null);
  const [billing, setBilling] = useState<any[]>([]);
  const [dbRx, setDbRx] = useState<any[]>([]);

  const jitsiLink = `https://meet.jit.si/MediPlex-${appointment.id.toString().replace(/[^a-zA-Z0-9]/g,'').slice(0,12)}`;
  const finalLink = platform === 'jitsi' ? jitsiLink : manualLink;
  const patientLink = typeof window !== 'undefined'
    ? `${window.location.origin}/preconsult/${sessionToken}`
    : `/preconsult/${sessionToken}`;

  useEffect(() => {
    const h = getHealth(patientKey(appointment.childName));
    const v = getLatestVitals(patientKey(appointment.childName));
    setPatientData({ health: h, vitals: v });
    const mr = (appointment as any).mr_number;
    if (mr) {
      supabase.from('billing').select('*').eq('mr_number', mr)
        .then(({ data }) => { if (data) setBilling(data); });
      supabase.from('prescriptions').select('*').eq('mr_number', mr)
        .order('created_at', { ascending: false }).limit(3)
        .then(({ data }) => { if (data) setDbRx(data); });
    }
  }, [appointment]);

  // Poll for patient submission every 5s when on waiting step
  useEffect(() => {
    if (step !== 'waiting') return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('telehealth_sessions')
        .select('status').eq('token', sessionToken).maybeSingle();
      if (data?.status === 'submitted') {
        setPatientSubmitted(true);
        clearInterval(interval);
        toast.success('Patient has submitted the pre-consultation form!');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [step, sessionToken]);

  const outstanding = billing.reduce((s, i) =>
    s + Math.max(0, (Number(i.consultation_fee)||0) - (Number(i.discount)||0) - (Number(i.amount_paid)||0)), 0);

  const createSession = async () => {
    if (platform !== 'jitsi' && !manualLink) { toast.error('Please paste your meeting link'); return; }
    setCreating(true);
    try {
      await supabase.from('telehealth_sessions').insert([{
        token: sessionToken,
        appointment_id: appointment.id,
        mr_number: (appointment as any).mr_number || null,
        child_name: appointment.childName,
        parent_name: appointment.parentName,
        platform,
        link: finalLink,
        status: 'pending',
      }]);
    } catch {}
    setCreating(false);
    setStep('waiting');
  };

  const copyPatientLink = () => {
    navigator.clipboard.writeText(patientLink);
    setPatientLinkCopied(true);
    setTimeout(() => setPatientLinkCopied(false), 2000);
    toast.success('Patient link copied!');
  };

  const copyJoinLink = () => {
    navigator.clipboard.writeText(finalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" style={{background:'#0a1628'}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{borderColor:'rgba(255,255,255,0.08)'}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'rgba(59,130,246,0.2)'}}>
              <Video size={16} style={{color:'#60a5fa'}}/>
            </div>
            <div>
              <div className="font-semibold text-white text-[14px]">Telehealth Consultation</div>
              <div className="text-[11px] text-white/40">{appointment.childName} · {formatUSDate(appointment.appointmentDate)} · {appointment.appointmentTime}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X size={13}/></button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* STEP 1: Select Platform */}
          {step==='platform' && (
            <div className="p-5 space-y-3">
              <div className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Step 1 — Select Video Platform</div>
              {PLATFORMS.map(pl => (
                <div key={pl.key} onClick={()=>setPlatform(pl.key)} className="rounded-xl p-4 cursor-pointer transition-all"
                  style={{background:platform===pl.key?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.04)',border:`1px solid ${platform===pl.key?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.08)'}`}}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{pl.icon}</span>
                      <div>
                        <div className="text-[13px] font-semibold text-white">{pl.label}</div>
                        <div className="text-[11px] text-white/40">{pl.hint}</div>
                      </div>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{borderColor:platform===pl.key?'#60a5fa':'rgba(255,255,255,0.2)'}}>
                      {platform===pl.key && <div className="w-2 h-2 rounded-full bg-blue-400"/>}
                    </div>
                  </div>
                  {platform===pl.key && pl.auto && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg font-mono text-[10px] text-blue-400 truncate" style={{background:'rgba(255,255,255,0.04)'}}>{jitsiLink}</div>
                  )}
                  {platform===pl.key && !pl.auto && (
                    <input type="text" placeholder={`Paste ${pl.label} link...`} value={manualLink}
                      onChange={e=>{e.stopPropagation();setManualLink(e.target.value);}} onClick={e=>e.stopPropagation()}
                      className="mt-3 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none"/>
                  )}
                </div>
              ))}
              <button onClick={createSession} disabled={creating||(platform!=='jitsi'&&!manualLink)}
                className="w-full py-3 rounded-xl text-[13px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                style={{background:'rgba(59,130,246,0.8)',color:'#fff'}}>
                {creating?<><Loader2 size={14} className="animate-spin"/>Creating...</>:'Create Session & Generate Patient Link →'}
              </button>
            </div>
          )}

          {/* STEP 2: Waiting for patient */}
          {step==='waiting' && (
            <div className="p-5 space-y-4">
              <div className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Step 2 — Share Link with Patient</div>

              {/* Patient pre-consult link */}
              <div className="rounded-xl p-4 space-y-3" style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.35)'}}>
                <div className="text-[12px] font-semibold text-amber-300">📱 Send this link to patient via WhatsApp</div>
                <div className="text-[11px] text-white/50">Patient fills: chief complaint, symptoms, vitals, blood group, allergies, conditions, medications</div>
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{background:'rgba(0,0,0,0.3)'}}>
                  <span className="font-mono text-[10px] text-amber-400 flex-1 truncate">{patientLink}</span>
                  <button onClick={copyPatientLink} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] flex-shrink-0 font-medium"
                    style={{background:'rgba(201,168,76,0.3)',color:'#c9a84c'}}>
                    {patientLinkCopied?<><Check size={11}/>Copied</>:<><Copy size={11}/>Copy</>}
                  </button>
                </div>
                <button onClick={()=>window.open(patientLink,'_blank')} className="flex items-center gap-1.5 text-[11px] text-amber-400/70 hover:text-amber-400">
                  <ExternalLink size={11}/> Preview form
                </button>
                <button onClick={()=>{
                    const ph=(appointment.whatsapp||'').replace(/\D/g,'');
                    const p=ph.startsWith('0')?'92'+ph.slice(1):ph;
                    const msg='Dear '+appointment.parentName+',\n\nPlease fill your pre-consultation form before your telehealth appointment with MediPlex Pediatric Centre.\n\nForm: '+patientLink+'\n\nThank you.';
                    window.open('https://wa.me/'+p+'?text='+encodeURIComponent(msg),'_blank');
                  }} className="flex items-center gap-1.5 text-[11px] text-emerald-400/70 hover:text-emerald-400">
                  📱 Send WhatsApp
                </button>
              </div>

              {/* Submission status */}
              <div className="rounded-xl p-4" style={{background:patientSubmitted?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.04)',border:`1px solid ${patientSubmitted?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.08)'}`}}>
                {patientSubmitted ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle size={20} style={{color:'#34d399'}}/>
                    <div>
                      <div className="text-[13px] font-semibold text-emerald-400">Patient form submitted!</div>
                      <div className="text-[11px] text-white/40">Vitals & health data synced to patient records</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Clock size={16} style={{color:'rgba(255,255,255,0.3)'}} className="animate-pulse"/>
                    <div className="text-[12px] text-white/40">Waiting for patient to complete form...</div>
                  </div>
                )}
              </div>

              {/* Patient on record summary */}
              {patientData && (
                <div className="rounded-xl p-4 space-y-2" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Patient on Record</div>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div><span className="text-white/40">Patient: </span><span className="text-white font-medium">{appointment.childName}</span></div>
                    <div><span className="text-white/40">Age: </span><span className="text-white">{appointment.childAge} yrs</span></div>
                    {patientData.health?.bloodGroup&&<div><span className="text-white/40">Blood Group: </span><span className="text-red-400 font-bold">{patientData.health.bloodGroup}</span></div>}
                    {patientData.health?.allergies&&<div><span className="text-white/40">Allergies: </span><span className="text-orange-400">{patientData.health.allergies}</span></div>}
                    {patientData.health?.conditions&&<div className="col-span-2"><span className="text-white/40">Conditions: </span><span className="text-white">{patientData.health.conditions}</span></div>}
                    {patientData.vitals?.weight&&<div><span className="text-white/40">Last Weight: </span><span className="text-emerald-400">{patientData.vitals.weight}kg</span></div>}
                  </div>
                  {dbRx.length>0&&<div className="text-[11px] text-white/30 pt-1 border-t border-white/5">Last Rx: {(dbRx[0].medicines||[]).slice(0,3).map((m:any)=>m.name).join(', ')}</div>}
                  {outstanding>0&&<div className="text-[11px] text-red-400">⚠ Outstanding: PKR {outstanding.toLocaleString()}</div>}
                </div>
              )}

              <button onClick={()=>setStep('ready')}
                className="w-full py-2.5 rounded-xl text-[12px] font-medium"
                style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)'}}>
                Skip waiting → Join directly
              </button>
            </div>
          )}

          {/* STEP 3: Ready to join */}
          {step==='ready' && (
            <div className="p-5 space-y-4">
              <div className="rounded-xl p-4 text-center" style={{background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)'}}>
                <div className="text-2xl mb-1">✅</div>
                <div className="text-[14px] font-semibold text-white">Ready to Join</div>
                <div className="text-[11px] text-white/40 mt-0.5">{patientSubmitted ? 'Patient form received' : 'Joining without patient form'}</div>
              </div>

              <div className="rounded-xl p-3 flex items-center gap-2" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <span className="font-mono text-[11px] text-blue-400 flex-1 truncate">{finalLink}</span>
                <button onClick={copyJoinLink} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] flex-shrink-0"
                  style={{background:'rgba(59,130,246,0.2)',color:'#60a5fa'}}>
                  {copied?<><Check size={11}/>Copied</>:<><Copy size={11}/>Copy</>}
                </button>
              </div>

              <button onClick={()=>window.open(finalLink,'_blank')}
                className="w-full py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2"
                style={{background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:'#fff'}}>
                <Video size={16}/> Join Consultation Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
