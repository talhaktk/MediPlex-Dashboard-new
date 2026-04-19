'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Save, CheckCircle, Heart, User, AlertTriangle } from 'lucide-react';

const BLOOD_GROUPS = ['','A+','A-','B+','B-','AB+','AB-','O+','O-'];
const GENDERS = ['','Male','Female','Other'];

interface Props {
  session: any;
}

export default function PreConsultClient({ session }: Props) {
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
    mr_number: session.mr_number || session.appointment_id || '',
  });

  const fi = (label: string, key: string, opts: { ph?: string; type?: string }) => (
    <div key={key}>
      <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">{label}</label>
      <input type={opts.type || 'text'} placeholder={opts.ph || ''}
        value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full border border-black/10 rounded-xl px-4 py-3 text-[14px] text-navy bg-white outline-none focus:border-amber-400 transition-all"/>
    </div>
  );

  const handleSubmit = async () => {
    if (!form.chief_complaint.trim()) { alert('Please enter your chief complaint'); return; }
    setSaving(true);
    try {
      // Update telehealth session
      await supabase.from('telehealth_sessions').update({
        chief_complaint: form.chief_complaint,
        symptoms: form.symptoms,
        duration: form.duration,
        vitals: { weight:form.weight, height:form.height, bp:form.bp, pulse:form.pulse, temperature:form.temperature, o2_sat:form.o2_sat },
        blood_group: form.blood_group,
        gender: form.gender,
        allergies: form.allergies,
        conditions: form.conditions,
        current_meds: form.current_meds,
        notes: form.notes,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }).eq('token', session.token);

      // Sync vitals to patient_vitals table
      if (form.weight || form.bp || form.pulse || form.temperature) {
        const identifier = form.mr_number;
        const vitalsRow: any = {
          child_name: session.child_name,
          weight: form.weight || null,
          height: form.height || null,
          bp: form.bp || null,
          pulse: form.pulse || null,
          temperature: form.temperature || null,
          recorded_at: new Date().toISOString().split('T')[0],
          source: 'telehealth_preconsult',
        };
        if (session.mr_number) vitalsRow.mr_number = session.mr_number;
        await supabase.from('patient_vitals').insert([vitalsRow]);
      }

      // Sync health record to patients table
      if (session.mr_number && (form.blood_group || form.allergies || form.conditions)) {
        await supabase.from('patients').update({
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

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{background:'linear-gradient(135deg,#f9f7f3,#fff)'}}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{background:'#dcfce7'}}>
            <CheckCircle size={40} style={{color:'#16a34a'}}/>
          </div>
          <div className="font-bold text-navy text-[22px]">Form Submitted!</div>
          <div className="text-gray-500 text-[14px]">Your pre-consultation information has been sent to the doctor. Please join the video call at your scheduled time.</div>
          <div className="rounded-xl p-4 text-[13px] text-amber-800 mt-4" style={{background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.3)'}}>
            <div className="font-semibold mb-1">MediPlex Pediatric Centre</div>
            <div className="text-amber-700">Your doctor will review your information before the consultation.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#f9f7f3,#fff)'}}>
      {/* Header */}
      <div className="px-5 py-5 border-b border-black/5" style={{background:'#0a1628'}}>
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(201,168,76,0.2)'}}>
            <Activity size={18} style={{color:'#c9a84c'}}/>
          </div>
          <div>
            <div className="font-bold text-white text-[16px]">MediPlex Pre-Consultation</div>
            <div className="text-[12px] text-white/50">Complete before your telehealth appointment</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">

        {/* Patient info banner */}
        <div className="rounded-xl p-4" style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.25)'}}>
          <div className="flex items-center gap-2 mb-1">
            <User size={14} style={{color:'#a07a2a'}}/>
            <span className="text-[13px] font-semibold text-navy">{session.child_name}</span>
          </div>
          <div className="text-[12px] text-gray-500">Parent: {session.parent_name}</div>
          {session.mr_number && <div className="text-[11px] font-mono text-amber-600 mt-0.5">MR# {session.mr_number}</div>}
        </div>

        {/* Chief Complaint */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:'#fee2e2'}}>
              <AlertTriangle size={12} style={{color:'#dc2626'}}/>
            </div>
            <div className="text-[13px] font-semibold text-navy">Chief Complaint</div>
          </div>
          {fi('Main reason for visit *', 'chief_complaint', {ph:'e.g. Fever, Cough, Rash...'})}
          {fi('Current Symptoms', 'symptoms', {ph:'Describe all symptoms'})}
          {fi('Duration', 'duration', {ph:'e.g. 3 days, 1 week'})}
        </div>

        {/* Vitals */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:'#dcfce7'}}>
              <Activity size={12} style={{color:'#16a34a'}}/>
            </div>
            <div className="text-[13px] font-semibold text-navy">Vitals (if available at home)</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {l:'Weight (kg)',k:'weight',ph:'e.g. 25'},
              {l:'Height (cm)',k:'height',ph:'e.g. 110'},
              {l:'Blood Pressure',k:'bp',ph:'e.g. 110/70'},
              {l:'Pulse (bpm)',k:'pulse',ph:'e.g. 88'},
              {l:'Temperature (°C)',k:'temperature',ph:'e.g. 37.2'},
              {l:'O2 Saturation (%)',k:'o2_sat',ph:'e.g. 98'},
            ].map(f=>(
              <div key={f.k}>
                <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">{f.l}</label>
                <input type="text" placeholder={f.ph} value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-4 py-3 text-[14px] text-navy bg-white outline-none focus:border-amber-400"/>
              </div>
            ))}
          </div>
        </div>

        {/* Health Record */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:'#fee2e2'}}>
              <Heart size={12} style={{color:'#dc2626'}}/>
            </div>
            <div className="text-[13px] font-semibold text-navy">Health Information</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Blood Group</label>
              <select value={form.blood_group} onChange={e=>setForm(p=>({...p,blood_group:e.target.value}))}
                className="w-full border border-black/10 rounded-xl px-4 py-3 text-[14px] text-navy bg-white outline-none focus:border-amber-400">
                {BLOOD_GROUPS.map(g=><option key={g} value={g}>{g||'Select...'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Gender</label>
              <select value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))}
                className="w-full border border-black/10 rounded-xl px-4 py-3 text-[14px] text-navy bg-white outline-none focus:border-amber-400">
                {GENDERS.map(g=><option key={g} value={g}>{g||'Select...'}</option>)}
              </select>
            </div>
          </div>
          {fi('Known Allergies', 'allergies', {ph:'e.g. Penicillin, Peanuts, None'})}
          {fi('Medical Conditions', 'conditions', {ph:'e.g. Asthma, Diabetes, None'})}
          {fi('Current Medications', 'current_meds', {ph:'List any medicines being taken'})}
          <div>
            <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Additional Notes</label>
            <textarea rows={3} placeholder="Any other information for the doctor..." value={form.notes}
              onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
              className="w-full border border-black/10 rounded-xl px-4 py-3 text-[14px] text-navy bg-white outline-none focus:border-amber-400 resize-none"/>
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={saving||!form.chief_complaint}
          className="w-full py-4 rounded-xl text-[15px] font-bold disabled:opacity-40 flex items-center justify-center gap-2 mb-8"
          style={{background:'linear-gradient(135deg,#0a1628,#142240)',color:'#c9a84c',border:'2px solid rgba(201,168,76,0.4)'}}>
          {saving?'Submitting...':(<><Save size={16}/>Submit Pre-Consultation Form</>)}
        </button>
      </div>
    </div>
  );
}
