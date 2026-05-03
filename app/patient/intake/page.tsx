'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { ClipboardList, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientIntakeForm() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const mrNumber = user?.mrNumber;
  const clinicId = user?.clinicId;
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedApt, setSelectedApt] = useState('');
  const [form, setForm] = useState({ chiefComplaint:'', symptoms:'', weight:'', height:'', bp:'', pulse:'', temperature:'', allergies:'', currentMeds:'', notes:'' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mrNumber) return;
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 2);
    supabase.from('appointments').select('id,appointment_date,appointment_time,reason')
      .eq('mr_number', mrNumber).eq('clinic_id', clinicId||'')
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .lte('appointment_date', tomorrow.toISOString().split('T')[0])
      .order('appointment_date').then(({data}) => setAppointments(data||[]));
  }, [mrNumber, clinicId]);

  const submit = async () => {
    if (!form.chiefComplaint) { toast.error('Please enter chief complaint'); return; }
    setLoading(true);
    const { error } = await supabase.from('patient_intake_forms').insert([{
      mr_number: mrNumber, clinic_id: clinicId, appointment_id: selectedApt||null,
      chief_complaint: form.chiefComplaint, symptoms: form.symptoms,
      weight: form.weight||null, height: form.height||null, bp: form.bp||null,
      pulse: form.pulse||null, temperature: form.temperature||null,
      allergies: form.allergies, current_medications: form.currentMeds,
      notes: form.notes, submitted_at: new Date().toISOString(),
    }]);
    setLoading(false);
    if (error) toast.error(error.message);
    else { setSubmitted(true); toast.success('Intake form submitted!'); }
  };

  if (submitted) return (
    <div className="max-w-lg mx-auto p-8 text-center">
      <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500"/>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Form Submitted!</h2>
      <p className="text-slate-500">Your intake form has been sent to the clinic. The doctor will review it before your visit.</p>
    </div>
  );

  const Input = ({label, field, type='text', placeholder=''}:any) => (
    <div>
      <label className="text-xs text-slate-500 uppercase tracking-widest font-medium block mb-1">{label}</label>
      <input type={type} placeholder={placeholder} value={(form as any)[field]}
        onChange={e=>setForm(p=>({...p,[field]:e.target.value}))}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400"/>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-5 p-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pre-Visit Intake Form</h1>
        <p className="text-slate-500 text-sm mt-1">Fill this before your appointment to save time</p>
      </div>

      {appointments.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <label className="text-xs text-slate-500 uppercase tracking-widest font-medium block mb-2">Select Appointment</label>
          <select value={selectedApt} onChange={e=>setSelectedApt(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400">
            <option value="">Select appointment...</option>
            {appointments.map(a=><option key={a.id} value={a.id}>{new Date(a.appointment_date).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})} at {a.appointment_time} — {a.reason||'Visit'}</option>)}
          </select>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4">
        <h2 className="font-semibold text-slate-800">Chief Complaint *</h2>
        <div>
          <textarea placeholder="Main reason for visit..." value={form.chiefComplaint}
            onChange={e=>setForm(p=>({...p,chiefComplaint:e.target.value}))} rows={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 resize-none"/>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-widest font-medium block mb-1">Other Symptoms</label>
          <textarea placeholder="Any other symptoms..." value={form.symptoms}
            onChange={e=>setForm(p=>({...p,symptoms:e.target.value}))} rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 resize-none"/>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4">
        <h2 className="font-semibold text-slate-800">Self-Reported Vitals</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Weight (kg)" field="weight" type="number" placeholder="65"/>
          <Input label="Height (cm)" field="height" type="number" placeholder="170"/>
          <Input label="Blood Pressure" field="bp" placeholder="120/80"/>
          <Input label="Pulse (bpm)" field="pulse" type="number" placeholder="72"/>
          <Input label="Temperature (°C)" field="temperature" type="number" placeholder="37.0"/>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4">
        <h2 className="font-semibold text-slate-800">Medical History</h2>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-widest font-medium block mb-1">Known Allergies</label>
          <input value={form.allergies} onChange={e=>setForm(p=>({...p,allergies:e.target.value}))}
            placeholder="e.g. Penicillin, Sulfa drugs..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"/>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-widest font-medium block mb-1">Current Medications</label>
          <textarea value={form.currentMeds} onChange={e=>setForm(p=>({...p,currentMeds:e.target.value}))}
            placeholder="List any medications you are currently taking..." rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none"/>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-widest font-medium block mb-1">Additional Notes</label>
          <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
            placeholder="Anything else the doctor should know..." rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none"/>
        </div>
      </div>

      <button onClick={submit} disabled={loading}
        className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2"
        style={{background:'linear-gradient(135deg,#0a1628,#1e3a5f)'}}>
        {loading?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<ClipboardList size={16}/>}
        Submit Intake Form
      </button>
    </div>
  );
}
