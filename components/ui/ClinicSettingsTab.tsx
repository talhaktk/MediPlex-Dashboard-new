'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const FIELDS = [
  { key:'clinic_name',          label:'Clinic Name',          ph:'e.g. Kids Care Clinic',        type:'text' },
  { key:'doctor_name',          label:'Doctor Name',          ph:'e.g. Dr. Ahmed Khan',           type:'text' },
  { key:'doctor_qualification', label:'Qualification',        ph:'e.g. MBBS, FCPS (Paeds)',       type:'text' },
  { key:'speciality',           label:'Speciality',           ph:'e.g. Pediatrics',               type:'text' },
  { key:'clinic_phone',         label:'Phone / WhatsApp',     ph:'e.g. 0300-1234567',             type:'text' },
  { key:'clinic_address',       label:'Clinic Address',       ph:'e.g. 123 Main Street, Lahore',  type:'text' },
  { key:'clinic_email',         label:'Email',                ph:'e.g. clinic@example.com',       type:'email' },
];

export default function ClinicSettingsTab() {
  const [form, setForm] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('clinic_settings').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => {
        if (data) setForm(data);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('clinic_settings').upsert([{ id:1, ...form, updated_at: new Date().toISOString() }], { onConflict:'id' });
    setSaving(false);
    if (error) { toast.error('Failed to save: ' + error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    toast.success('Clinic settings saved!');
    window.dispatchEvent(new Event('clinic-settings-saved'));
  };

  if (loading) return <div className="text-center py-10 text-gray-400 text-[13px]">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4 text-[12px]" style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.25)'}}>
        <div className="font-medium text-amber-800 mb-1">🏥 Clinic Branding</div>
        <div className="text-amber-700">These details appear in WhatsApp messages, public forms and internal dashboard. Prescription prints are blank — use your pre-printed letterhead.</div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="font-medium text-navy text-[15px] pb-3 border-b border-black/5">Clinic Information</div>
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map(f => (
            <div key={f.key} className={f.key==='clinic_address'?'col-span-2':''}>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{f.label}</label>
              <input type={f.type} placeholder={f.ph} value={form[f.key]||''}
                onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-black/5">
          <div className="text-[11px] text-gray-400 mb-3">Preview — Sidebar display:</div>
          <div className="rounded-xl p-4 w-fit" style={{background:'#0a1628'}}>
            <div className="text-[15px] font-bold text-white">MediPlex</div>
            <div className="text-[11px] mt-1" style={{color:'#c9a84c'}}>{form.doctor_name||'Dr. Name'}</div>
            <div className="text-[10px] text-white/40">{form.clinic_name||'My Clinic'} · {form.speciality||'Pediatrics'}</div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="btn-gold gap-2 text-[13px] py-2.5 px-6 flex items-center">
          {saving ? <><Loader2 size={14} className="animate-spin"/>Saving...</>
           : saved ? <><CheckCircle size={14}/>Saved!</>
           : <><Save size={14}/>Save Settings</>}
        </button>
      </div>

      <div className="rounded-xl p-4 text-[12px]" style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.2)'}}>
        <div className="font-medium text-blue-800 mb-1">💡 MediPlex Marketing</div>
        <div className="text-blue-700">All patient-facing pages automatically include: <span className="font-medium">"Powered by MediPlex — Pakistan's Smart Clinic Management System"</span></div>
      </div>
    </div>
  );
}
