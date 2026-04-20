'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const BLOOD_GROUPS = ['','A+','A-','B+','B-','AB+','AB-','O+','O-'];
const GENDERS = ['','Male','Female','Other'];

export default function PreConsultClient({ session }: { session: any }) {
  const [submitted, setSubmitted] = useState(session.status === 'submitted');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    chief_complaint: session.chief_complaint || '',
    symptoms: session.symptoms || '',
    duration: session.duration || '',
    weight: session.vitals?.weight || '',
    height: session.vitals?.height || '',
    bp: session.vitals?.bp || '',
    pulse: session.vitals?.pulse || '',
    temperature: session.vitals?.temperature || '',
    o2_sat: session.vitals?.o2_sat || '',
    blood_group: session.blood_group || '',
    gender: session.gender || '',
    allergies: session.allergies || '',
    conditions: session.conditions || '',
    current_meds: session.current_meds || '',
    notes: session.notes || '',
  });

  const handleSubmit = async () => {
    if (!form.chief_complaint.trim()) { alert('Please enter your chief complaint'); return; }
    setSaving(true);
    try {
      // 1. Update telehealth_sessions — clinical info + o2_sat only (NOT vitals/health)
      await sb.from('telehealth_sessions').update({
        chief_complaint: form.chief_complaint,
        symptoms: form.symptoms,
        duration: form.duration,
        current_meds: form.current_meds,
        notes: form.notes,
        vitals: { o2_sat: form.o2_sat }, // only O2 sat stored here
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }).eq('token', session.token);

      // 2. Save vitals to appointments table ONLY (same as physical checkin)
      if (session.appointment_id && (form.weight || form.height || form.bp || form.pulse || form.temperature)) {
        await sb.from('appointments').update({
          visit_weight: form.weight || null,
          visit_height: form.height || null,
          visit_bp: form.bp || null,
          visit_pulse: form.pulse || null,
          visit_temperature: form.temperature || null,
        }).eq('id', session.appointment_id);
      }

      // 3. Save blood group, allergies, conditions, gender to patients table ONLY (same as physical checkin)
      if (session.mr_number && (form.blood_group || form.allergies || form.conditions || form.gender)) {
        await sb.from('patients').update({
          blood_group: form.blood_group || null,
          allergies: form.allergies || null,
          conditions: form.conditions || null,
          gender: form.gender || null,
        }).eq('mr_number', session.mr_number);
      }

      setSubmitted(true);
    } catch (err: any) {
      alert('Failed to submit: ' + err.message);
    }
    setSaving(false);
  };

  const inp = (label: string, key: string, ph: string) => (
    <div key={key}>
      <label style={{display:'block',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',color:'#6b7280',marginBottom:6}}>{label}</label>
      <input type="text" placeholder={ph} value={(form as any)[key]}
        onChange={e => setForm(p => ({...p, [key]: e.target.value}))}
        style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',fontSize:14,color:'#0a1628',background:'#fff',outline:'none',boxSizing:'border-box'}}/>
    </div>
  );

  if (submitted) {
    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,background:'linear-gradient(135deg,#f9f7f3,#fff)'}}>
        <div style={{width:80,height:80,borderRadius:'50%',background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,fontSize:36}}>✅</div>
        <div style={{fontSize:22,fontWeight:700,color:'#0a1628',marginBottom:8}}>Form Submitted!</div>
        <div style={{fontSize:14,color:'#6b7280',textAlign:'center',maxWidth:300}}>Your pre-consultation information has been sent to the doctor. Please join the video call at your scheduled time.</div>
        <div style={{marginTop:20,background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.3)',borderRadius:12,padding:'12px 20px',textAlign:'center'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#92400e'}}>MediPlex Pediatric Centre</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#f9f7f3,#fff)',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#0a1628',padding:'16px 20px'}}>
        <div style={{maxWidth:480,margin:'0 auto',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:12,background:'rgba(201,168,76,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🏥</div>
          <div>
            <div style={{fontWeight:700,color:'#fff',fontSize:16}}>MediPlex Pre-Consultation</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>Complete before your telehealth appointment</div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:480,margin:'0 auto',padding:'20px 16px'}}>
        {/* Patient info */}
        <div style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.25)',borderRadius:12,padding:'12px 16px',marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:600,color:'#0a1628'}}>{session.child_name}</div>
          <div style={{fontSize:12,color:'#6b7280'}}>Parent: {session.parent_name}</div>
          {session.mr_number && <div style={{fontSize:11,fontFamily:'monospace',color:'#d97706',marginTop:2}}>MR# {session.mr_number}</div>}
        </div>

        {/* Chief Complaint */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <div style={{width:24,height:24,borderRadius:8,background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>⚠️</div>
            <div style={{fontSize:14,fontWeight:700,color:'#0a1628'}}>Chief Complaint</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {inp('Main reason for visit *','chief_complaint','e.g. Fever, Cough, Rash')}
            {inp('Current Symptoms','symptoms','Describe all symptoms')}
            {inp('Duration','duration','e.g. 3 days, 1 week')}
            {inp('Current Medications','current_meds','Any medicines being taken')}
          </div>
        </div>

        {/* Vitals */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <div style={{width:24,height:24,borderRadius:8,background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>📊</div>
            <div style={{fontSize:14,fontWeight:700,color:'#0a1628'}}>Vitals (if available at home)</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[{l:'Weight (kg)',k:'weight',p:'e.g. 25'},{l:'Height (cm)',k:'height',p:'e.g. 110'},{l:'Blood Pressure',k:'bp',p:'e.g. 110/70'},{l:'Pulse (bpm)',k:'pulse',p:'e.g. 88'},{l:'Temperature °C',k:'temperature',p:'e.g. 37.2'},{l:'O2 Saturation %',k:'o2_sat',p:'e.g. 98'}].map(f=>(
              <div key={f.k}>
                <label style={{display:'block',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',color:'#6b7280',marginBottom:6}}>{f.l}</label>
                <input type="text" placeholder={f.p} value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}
                  style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',fontSize:14,color:'#0a1628',background:'#fff',outline:'none',boxSizing:'border-box'}}/>
              </div>
            ))}
          </div>
        </div>

        {/* Health Record */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <div style={{width:24,height:24,borderRadius:8,background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>❤️</div>
            <div style={{fontSize:14,fontWeight:700,color:'#0a1628'}}>Health Information</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',color:'#6b7280',marginBottom:6}}>Blood Group</label>
                <select value={form.blood_group} onChange={e=>setForm(p=>({...p,blood_group:e.target.value}))}
                  style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',fontSize:14,color:'#0a1628',background:'#fff',outline:'none'}}>
                  {BLOOD_GROUPS.map(g=><option key={g} value={g}>{g||'Select...'}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',color:'#6b7280',marginBottom:6}}>Gender</label>
                <select value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))}
                  style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',fontSize:14,color:'#0a1628',background:'#fff',outline:'none'}}>
                  {GENDERS.map(g=><option key={g} value={g}>{g||'Select...'}</option>)}
                </select>
              </div>
            </div>
            {inp('Known Allergies','allergies','e.g. Penicillin, Peanuts, None')}
            {inp('Medical Conditions','conditions','e.g. Asthma, Diabetes, None')}
            <div>
              <label style={{display:'block',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',color:'#6b7280',marginBottom:6}}>Additional Notes for Doctor</label>
              <textarea rows={3} placeholder="Any other information the doctor should know..." value={form.notes}
                onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',fontSize:14,color:'#0a1628',background:'#fff',outline:'none',resize:'none',boxSizing:'border-box'}}/>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={saving||!form.chief_complaint}
          style={{width:'100%',padding:'16px',borderRadius:16,fontSize:16,fontWeight:700,border:'2px solid rgba(201,168,76,0.4)',background:'linear-gradient(135deg,#0a1628,#142240)',color:'#c9a84c',cursor:saving||!form.chief_complaint?'not-allowed':'pointer',opacity:saving||!form.chief_complaint?0.5:1,marginBottom:32}}>
          {saving ? 'Submitting...' : '✅ Submit Pre-Consultation Form'}
        </button>
      </div>
    </div>
  );
}
