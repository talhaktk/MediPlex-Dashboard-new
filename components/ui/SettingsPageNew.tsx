'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/lib/clinicContext';
import toast from 'react-hot-toast';
import {
  Building2, User, Calendar, CreditCard, FileText, Bell,
  Shield, Plug, Users, Save, Upload, Plus, X, ChevronDown, Palette
} from 'lucide-react';

const TABS = [
  { key:'clinic',      label:'Clinic Profile',   icon:Building2 },
  { key:'branding',    label:'Branding',          icon:Palette   },
  { key:'providers',   label:'Providers',         icon:User      },
  { key:'scheduling',  label:'Scheduling',        icon:Calendar  },
  { key:'billing',     label:'Billing',           icon:CreditCard},
  { key:'templates',   label:'Templates',         icon:FileText  },
  { key:'reminders',   label:'Reminders',         icon:Bell      },
  { key:'security',    label:'Security',          icon:Shield    },
  { key:'integrations',label:'Integrations',      icon:Plug      },
  { key:'users',       label:'User Management',   icon:Users     },
];

const Input = ({ label, value, onChange, type='text', placeholder='', hint='' }: any) => (
  <div>
    <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">{label}</label>
    <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy bg-white outline-none focus:border-gold transition-all"/>
    {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

const Toggle = ({ label, value, onChange, hint='' }: any) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <div className="text-[13px] font-medium text-navy">{label}</div>
      {hint && <div className="text-[11px] text-gray-400">{hint}</div>}
    </div>
    <button onClick={()=>onChange(!value)}
      className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
      style={{background:value?'#c9a84c':'#e2e8f0'}}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{left:value?'22px':'2px'}}/>
    </button>
  </div>
);

export default function SettingsPageNew() {
  const { data: session } = useSession();
  const { clinicId, role, isSuperAdmin } = useClinic();
  const [tab, setTab] = useState('clinic');
  const [form, setForm] = useState<Record<string,any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({name:'',email:'',password:'',role:'receptionist'});
  const logoRef        = useRef<HTMLInputElement>(null);
  const sigRef         = useRef<HTMLInputElement>(null);
  const rxLogoRef      = useRef<HTMLInputElement>(null);
  const camPhotoRef    = useRef<HTMLInputElement>(null); // camera capture — doctor photo
  const camSigRef      = useRef<HTMLInputElement>(null); // camera capture — signature
  const camLogoRef     = useRef<HTMLInputElement>(null); // camera capture — clinic logo

  const isAdmin = ['super_admin','doctor_admin','admin'].includes(role);

  useEffect(() => {
    if(!clinicId) return;
    // Run DB migration to ensure all settings columns exist
    fetch('/api/settings/migrate', { method: 'POST' })
      .then(r => r.json())
      .then(d => { if(!d.ok && d.sql) console.info('Run in Supabase SQL Editor:\n', d.sql); });
    supabase.from('clinic_settings').select('*').eq('clinic_id', clinicId).maybeSingle()
      .then(({data}) => { if(data) setForm(data); setLoading(false); });
    supabase.from('logins').select('id,name,email,user_role,is_active').eq('clinic_id', clinicId)
      .then(({data}) => setUsers(data||[]));
  }, [clinicId]);

  const f = (k:string) => form[k] ?? '';
  const set = (k:string, v:any) => setForm(p=>({...p,[k]:v}));

  const save = async () => {
    setSaving(true);
    try {
      const { data: ex, error: fetchErr } = await supabase
        .from('clinic_settings').select('id').eq('clinic_id', clinicId||'').maybeSingle();
      if (fetchErr) throw fetchErr;

      // Exclude 'id' from payload — primary key must not be in the update data
      const { id: _id, created_at: _ca, ...rest } = form as any;
      const payload = { ...rest, clinic_id: clinicId, updated_at: new Date().toISOString() };

      let saveError;
      if (ex?.id) {
        ({ error: saveError } = await supabase.from('clinic_settings').update(payload).eq('id', ex.id));
      } else {
        ({ error: saveError } = await supabase.from('clinic_settings').insert([payload]));
      }
      if (saveError) throw saveError;

      window.dispatchEvent(new Event('clinic-settings-saved'));
      toast.success('Settings saved!');

      // Reload from DB to confirm persisted values
      const { data: refreshed } = await supabase
        .from('clinic_settings').select('*').eq('clinic_id', clinicId||'').maybeSingle();
      if (refreshed) setForm(refreshed);

    } catch (err: any) {
      toast.error('Save failed: ' + (err?.message || 'Unknown error'));
      console.error('Settings save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const {error} = await supabase.storage.from('clinic-assets').upload(path, file, {upsert:true});
    if(error) throw error;
    const {data} = supabase.storage.from('clinic-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return;
    try {
      const url = await uploadFile(file, `${clinicId}/logo.${file.name.split('.').pop()}`);
      set('logo_url', url); toast.success('Logo uploaded!');
    } catch { toast.error('Upload failed - check storage bucket'); }
  };

  if(loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"/></div>;

  return (
    <div className="flex gap-6 min-h-full">
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0">
        <div className="bg-white rounded-2xl p-2 border border-black/5 sticky top-0">
          {TABS.filter(t=>t.key!=='users'||(isAdmin||isSuperAdmin)).map(t=>{
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={()=>setTab(t.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all mb-0.5"
                style={{background:tab===t.key?'#0a1628':'transparent',color:tab===t.key?'#c9a84c':'#64748b'}}>
                <Icon size={14}/>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-5">

        {/* ── CLINIC PROFILE ── */}
        {tab==='clinic' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Clinic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Clinic Name" value={f('clinic_name')} onChange={(v:string)=>set('clinic_name',v)} placeholder="e.g. RMI Pediatrics"/>
                <Input label="Speciality" value={f('speciality')} onChange={(v:string)=>set('speciality',v)} placeholder="e.g. Pediatrics"/>
                <Input label="Phone" value={f('clinic_phone')} onChange={(v:string)=>set('clinic_phone',v)} placeholder="+92 91 5000000"/>
                <Input label="WhatsApp Number" value={f('whatsapp_number')} onChange={(v:string)=>set('whatsapp_number',v)} placeholder="+92 300 0000000"/>
                <Input label="Email" value={f('clinic_email')} onChange={(v:string)=>set('clinic_email',v)} type="email" placeholder="clinic@email.com"/>
                <Input label="Website" value={f('clinic_website')} onChange={(v:string)=>set('clinic_website',v)} placeholder="www.clinic.com"/>
                <div className="col-span-2">
                  <Input label="Address" value={f('clinic_address')} onChange={(v:string)=>set('clinic_address',v)} placeholder="Street, Area"/>
                </div>
                <Input label="City" value={f('clinic_city')} onChange={(v:string)=>set('clinic_city',v)} placeholder="Peshawar"/>
                <Input label="Province" value={f('clinic_province')} onChange={(v:string)=>set('clinic_province',v)} placeholder="KPK"/>
                <Input label="Country" value={f('clinic_country')||'Pakistan'} onChange={(v:string)=>set('clinic_country',v)} placeholder="Pakistan"/>
                <Input label="NPI / Registration #" value={f('npi_number')} onChange={(v:string)=>set('npi_number',v)} placeholder="License/NPI number"/>
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">MR Number Pattern</label>
                  <div className="flex items-center gap-2">
                    <input value={f('mr_prefix')||'MR'} onChange={e=>set('mr_prefix',e.target.value)}
                      className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold" placeholder="MR"/>
                    <span className="text-gray-400">-</span>
                    <select value={f('mr_digits')||'4'} onChange={e=>set('mr_digits',e.target.value)}
                      className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold">
                      {['3','4','5','6'].map(d=><option key={d} value={d}>{d} digits</option>)}
                    </select>
                    <span className="text-[12px] text-gray-400">→ Preview: <strong>{f('mr_prefix')||'MR'}-{'0'.repeat(Number(f('mr_digits')||4)-1)}1</strong></span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">e.g. RMI-0001, AMC-00001</p>
                </div>
                <Input label="Tax ID / GST #" value={f('tax_id')} onChange={(v:string)=>set('tax_id',v)} placeholder="Tax/GST number"/>
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Timezone</label>
                  <select value={f('timezone')||'Asia/Karachi'} onChange={e=>set('timezone',e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy bg-white outline-none focus:border-gold">
                    {['Asia/Karachi','Asia/Dubai','Europe/London','America/New_York','America/Los_Angeles','Asia/Kolkata'].map(tz=><option key={tz}>{tz}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Currency</label>
                  <select value={f('currency')||'PKR'} onChange={e=>set('currency',e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy bg-white outline-none focus:border-gold">
                    {['PKR','USD','GBP','AED','EUR','INR','SAR'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Clinic Logo</h3>
              <div className="flex items-center gap-4">
                {f('logo_url') ? (
                  <img src={f('logo_url')} alt="Logo" className="w-20 h-20 rounded-xl object-contain border border-gray-200"/>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                    <Building2 size={28}/>
                  </div>
                )}
                <div>
                  <div className="flex gap-2">
                    <button onClick={()=>logoRef.current?.click()} className="btn-gold text-[12px] px-4 py-2 flex items-center gap-2">
                      <Upload size={13}/> Upload Logo
                    </button>
                    <button onClick={()=>camLogoRef.current?.click()} className="btn-outline text-[12px] px-3 py-2 flex items-center gap-2">
                      📷 Camera
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">PNG, JPG · Max 2MB · Recommended 200×200px</p>
                  <input ref={logoRef}    type="file" accept="image/*"                   className="hidden" onChange={handleLogoUpload}/>
                  <input ref={camLogoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleLogoUpload}/>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BRANDING ── */}
        {tab==='branding' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-1">Header & Footer Images</h3>
              <p className="text-[12px] text-gray-400 mb-4">Upload your clinic's pre-designed header and footer images. These appear on <strong>all prescriptions, invoices, WhatsApp PDFs</strong> — fully branded per clinic.</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[12px] font-semibold text-navy mb-2">Header Image <span className="text-gray-400 font-normal">(top of document)</span></div>
                  <p className="text-[11px] text-gray-400 mb-3">Recommended: 794×150px (A4 width) · PNG/JPG</p>
                  {f('prescription_header_img') ? (
                    <div className="relative mb-2">
                      <img src={f('prescription_header_img')} alt="Header" className="w-full rounded-xl border border-gray-200 object-contain max-h-28"/>
                      <button onClick={()=>set('prescription_header_img','')} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"><X size={11}/></button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-300 mb-2">
                      <Upload size={24} className="mx-auto mb-1"/>
                      <p className="text-[11px]">No header uploaded</p>
                    </div>
                  )}
                  <button onClick={()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async(e:any)=>{const file=e.target.files[0];if(!file)return;try{const url=await uploadFile(file,clinicId+'/rx_header.'+file.name.split('.').pop());set('prescription_header_img',url);toast.success('Header uploaded!');}catch{toast.error('Upload failed - check storage bucket');}};i.click();}}
                    className="btn-outline text-[12px] px-4 py-2 flex items-center gap-2">
                    <Upload size={12}/> {f('prescription_header_img')?'Replace':'Upload'} Header
                  </button>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-navy mb-2">Footer Image <span className="text-gray-400 font-normal">(bottom of document)</span></div>
                  <p className="text-[11px] text-gray-400 mb-3">Recommended: 794×80px · PNG/JPG</p>
                  {f('prescription_footer_img') ? (
                    <div className="relative mb-2">
                      <img src={f('prescription_footer_img')} alt="Footer" className="w-full rounded-xl border border-gray-200 object-contain max-h-16"/>
                      <button onClick={()=>set('prescription_footer_img','')} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"><X size={11}/></button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center text-gray-300 mb-2">
                      <Upload size={20} className="mx-auto mb-1"/>
                      <p className="text-[11px]">No footer uploaded</p>
                    </div>
                  )}
                  <button onClick={()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async(e:any)=>{const file=e.target.files[0];if(!file)return;try{const url=await uploadFile(file,clinicId+'/rx_footer.'+file.name.split('.').pop());set('prescription_footer_img',url);toast.success('Footer uploaded!');}catch{toast.error('Upload failed - check storage bucket');}};i.click();}}
                    className="btn-outline text-[12px] px-4 py-2 flex items-center gap-2">
                    <Upload size={12}/> {f('prescription_footer_img')?'Replace':'Upload'} Footer
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-1">Print Layout Settings</h3>
              <p className="text-[12px] text-gray-400 mb-4">Configure how prescriptions print. Use <strong>Pre-printed Pad</strong> mode to skip digital header/footer and align text to your pre-printed letterhead areas.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-2">Print Mode</label>
                  <div className="flex gap-3">
                    {[
                      {val:'full',label:'Full Print',desc:'Show header image + content + footer image (plain paper)'},
                      {val:'preprinted',label:'Pre-printed Pad',desc:'Hide header/footer, leave margins for pre-printed areas'},
                    ].map(opt=>(
                      <button key={opt.val} onClick={()=>set('print_mode',opt.val)}
                        className="flex-1 p-3 rounded-xl text-left transition-all"
                        style={{border:(f('print_mode')||'full')===opt.val?'2px solid #c9a84c':'1px solid #e5e7eb',
                          background:(f('print_mode')||'full')===opt.val?'rgba(201,168,76,0.06)':'#fafafa'}}>
                        <div className="text-[13px] font-semibold text-navy">{opt.label}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Paper Size</label>
                    <select value={f('paper_size')||'A4'} onChange={e=>set('paper_size',e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold">
                      {['A4','A5','Letter (8.5x11in)','Half Letter'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Print Font Size</label>
                    <select value={f('print_font_size')||'12'} onChange={e=>set('print_font_size',e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold">
                      {['10','11','12','13','14'].map(s=><option key={s}>{s}px</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">
                      Top Margin (mm) {(f('print_mode')||'full')==='preprinted'?'— space for pre-printed header':''}
                    </label>
                    <input type="number" value={f('print_margin_top')||((f('print_mode')||'full')==='preprinted'?40:10)} onChange={e=>set('print_margin_top',Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">
                      Bottom Margin (mm) {(f('print_mode')||'full')==='preprinted'?'— space for pre-printed footer':''}
                    </label>
                    <input type="number" value={f('print_margin_bottom')||((f('print_mode')||'full')==='preprinted'?25:10)} onChange={e=>set('print_margin_bottom',Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Left Margin (mm)</label>
                    <input type="number" value={f('print_margin_left')||15} onChange={e=>set('print_margin_left',Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Right Margin (mm)</label>
                    <input type="number" value={f('print_margin_right')||15} onChange={e=>set('print_margin_right',Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold"/>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Invoice & Document Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Invoice Number Prefix" value={f('invoice_prefix')||'INV'} onChange={(v:string)=>set('invoice_prefix',v)} placeholder="INV" hint="e.g. RMI → RMI-2026-001"/>
                <div/>
                <div className="col-span-2">
                  <Input label="Invoice Footer Text" value={f('invoice_footer')} onChange={(v:string)=>set('invoice_footer',v)}
                    placeholder="Thank you for choosing our clinic · Payment due within 30 days"
                    hint="Shown below invoice if no footer image uploaded"/>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-2">WhatsApp Message Preview</h3>
              <p className="text-[12px] text-gray-400 mb-3">All messages automatically use your clinic name, phone, and branding.</p>
              <div className="rounded-xl p-4 text-[13px]" style={{background:'#f0fdf4',border:'1px solid #bbf7d0'}}>
                <div className="font-semibold text-emerald-800 mb-2">Sample Reminder:</div>
                <div className="text-emerald-700 whitespace-pre-line">{`Dear Ahmad Ali,

Reminder from ${f('clinic_name')||'Your Clinic'}.
Appointment: Tomorrow at 10:00 AM

For queries: ${f('clinic_phone')||'+92-XXX-XXXXXXX'}

Thank you,
${f('clinic_name')||'Your Clinic'}`}</div>
              </div>
            </div>
          </div>
        )}

                {/* ── PROVIDERS ── */}
        {tab==='providers' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Doctor / Provider Profile</h3>
              <div className="flex items-start gap-5 mb-5">
                <div className="flex-shrink-0">
                  {f('doctor_photo_url') ? (
                    <img src={f('doctor_photo_url')} alt="Doctor" className="w-20 h-20 rounded-2xl object-cover border border-gray-200"/>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-300 border border-gray-200">
                      <User size={32}/>
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-2 justify-center">
                    <button onClick={()=>sigRef.current?.click()} className="text-[11px] text-gold hover:underline">
                      Upload
                    </button>
                    <span className="text-gray-300 text-[11px]">·</span>
                    <button onClick={()=>camPhotoRef.current?.click()} className="text-[11px] text-blue-500 hover:underline">
                      📷 Camera
                    </button>
                  </div>
                  <input ref={sigRef} type="file" accept="image/*" className="hidden" onChange={async e=>{
                    const file=e.target.files?.[0]; if(!file) return;
                    try { const url=await uploadFile(file,`${clinicId}/doctor_photo.${file.name.split('.').pop()}`); set('doctor_photo_url',url); toast.success('Photo uploaded!'); } catch { toast.error('Failed'); }
                  }}/>
                  <input ref={camPhotoRef} type="file" accept="image/*" capture="user" className="hidden" onChange={async e=>{
                    const file=e.target.files?.[0]; if(!file) return;
                    try { const url=await uploadFile(file,`${clinicId}/doctor_photo.${file.name.split('.').pop()}`); set('doctor_photo_url',url); toast.success('Photo captured!'); } catch { toast.error('Failed'); }
                  }}/>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <Input label="Doctor Name" value={f('doctor_name')} onChange={(v:string)=>set('doctor_name',v)} placeholder="Dr. Ahmad Khan"/>
                  <Input label="Qualification" value={f('doctor_qualification')} onChange={(v:string)=>set('doctor_qualification',v)} placeholder="MBBS, FCPS, MD"/>
                  <Input label="License / PMDC #" value={f('doctor_license')} onChange={(v:string)=>set('doctor_license',v)} placeholder="PMDC-12345"/>
                  <Input label="Speciality" value={f('speciality')} onChange={(v:string)=>set('speciality',v)} placeholder="Pediatrics"/>
                  <div className="col-span-2">
                    <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Doctor Bio / About</label>
                    <textarea value={f('doctor_bio')||''} onChange={e=>set('doctor_bio',e.target.value)} rows={3}
                      placeholder="Brief professional bio shown on prescriptions and patient portal..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold resize-none"/>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Doctor Signature</h3>
              <p className="text-[12px] text-gray-400 mb-3">Upload a scanned signature to appear on prescriptions automatically.</p>
              <div className="flex items-center gap-4">
                {f('doctor_signature_url') ? (
                  <img src={f('doctor_signature_url')} alt="Signature" className="h-16 rounded-lg border border-gray-200 object-contain bg-white px-3"/>
                ) : (
                  <div className="h-16 w-40 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-[11px]">No signature</div>
                )}
                <button onClick={()=>{
                  const input=document.createElement('input');input.type='file';input.accept='image/*';
                  input.onchange=async(e:any)=>{
                    const file=e.target.files[0];if(!file)return;
                    try{const url=await uploadFile(file,`${clinicId}/signature.${file.name.split('.').pop()}`);set('doctor_signature_url',url);toast.success('Signature uploaded!');}catch{toast.error('Failed');}
                  };input.click();
                }} className="btn-outline text-[12px] px-3 py-2 flex items-center gap-2">
                  <Upload size={12}/> Upload
                </button>
                <button onClick={()=>camSigRef.current?.click()} className="btn-outline text-[12px] px-3 py-2 flex items-center gap-2">
                  📷 Scan Signature
                </button>
                <input ref={camSigRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={async e=>{
                  const file=e.target.files?.[0];if(!file)return;
                  try{const url=await uploadFile(file,`${clinicId}/signature.${file.name.split('.').pop()}`);set('doctor_signature_url',url);toast.success('Signature captured!');}catch{toast.error('Failed');}
                }}/>
                {f('doctor_signature_url') && <button onClick={()=>set('doctor_signature_url','')} className="text-[12px] text-red-400 hover:text-red-600">Remove</button>}
              </div>
            </div>
          </div>
        )}

        {/* ── SCHEDULING ── */}
        {tab==='scheduling' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Working Days</h3>
              <div className="flex gap-2 flex-wrap">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=>{
                  const days = (f('working_days')||'Mon,Tue,Wed,Thu,Fri,Sat').split(',');
                  const active = days.includes(day);
                  return (
                    <button key={day} onClick={()=>{
                      const updated = active ? days.filter((d:string)=>d!==day) : [...days,day];
                      set('working_days', updated.join(','));
                    }} className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
                      style={{background:active?'#0a1628':'#f9f7f3',color:active?'#fff':'#6b7280',border:active?'1px solid #0a1628':'1px solid #e5e7eb'}}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Session Times</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="text-[13px] font-semibold text-navy flex items-center gap-2">🌅 Morning Session</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Start</label>
                      <input type="time" value={f('morning_start')||'09:00'} onChange={e=>set('morning_start',e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold"/>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">End</label>
                      <input type="time" value={f('morning_end')||'13:00'} onChange={e=>set('morning_end',e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold"/>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-[13px] font-semibold text-navy flex items-center gap-2">🌆 Evening Session</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Start</label>
                      <input type="time" value={f('evening_start')||'14:00'} onChange={e=>set('evening_start',e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold"/>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">End</label>
                      <input type="time" value={f('evening_end')||'18:00'} onChange={e=>set('evening_end',e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Appointment Settings</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-2">Slot Duration (minutes)</label>
                  <div className="flex gap-2 flex-wrap">
                    {[5,10,15,20,25,30,45,60].map(m=>(
                      <button key={m} onClick={()=>set('slot_duration',m)}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                        style={{background:(f('slot_duration')||15)===m?'#c9a84c':'#f9f7f3',color:(f('slot_duration')||15)===m?'#fff':'#6b7280',border:(f('slot_duration')||15)===m?'1px solid #c9a84c':'1px solid #e5e7eb'}}>
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-2">Max Patients Per Slot</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>set('max_per_slot',n)}
                        className="w-10 h-10 rounded-xl text-[14px] font-semibold transition-all"
                        style={{background:(f('max_per_slot')||1)===n?'#0a1628':'#f9f7f3',color:(f('max_per_slot')||1)===n?'#fff':'#6b7280',border:(f('max_per_slot')||1)===n?'1px solid #0a1628':'1px solid #e5e7eb'}}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-2">Buffer Time Between Appointments</label>
                  <select value={f('buffer_time')||0} onChange={e=>set('buffer_time',Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold">
                    {[0,5,10,15,20,30].map(m=><option key={m} value={m}>{m===0?'No buffer':`${m} min`}</option>)}
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <Toggle label="Online Booking" value={f('online_booking')||false} onChange={(v:boolean)=>set('online_booking',v)} hint="Allow patients to book via patient portal"/>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Appointment Types</h3>
              <p className="text-[12px] text-gray-400 mb-3">Define types of appointments with custom duration and fees.</p>
              <div className="space-y-2 mb-3">
                {(f('appointment_types')||[]).map((apt:any, i:number)=>(
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                    <span className="flex-1 text-[13px] text-navy">{apt.name}</span>
                    <span className="text-[11px] text-gray-400">{apt.duration} min</span>
                    <span className="text-[11px] font-medium text-navy">{f('currency')||'PKR'} {apt.fee}</span>
                    <button onClick={()=>set('appointment_types',(f('appointment_types')||[]).filter((_:any,j:number)=>j!==i))} className="text-gray-300 hover:text-red-400"><X size={13}/></button>
                  </div>
                ))}
              </div>
              <AddAppointmentType currency={f('currency')||'PKR'} onAdd={(apt:any)=>set('appointment_types',[...(f('appointment_types')||[]),apt])}/>
            </div>
          </div>
        )}

                {/* ── BILLING ── */}
        {tab==='billing' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Billing Defaults</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Default Consultation Fee" value={f('default_consultation_fee')||''} onChange={(v:string)=>set('default_consultation_fee',v)} type="number" placeholder="1500" hint="Auto-filled when creating invoices"/>
                <Input label="Tax / GST Percentage" value={f('tax_percentage')||''} onChange={(v:string)=>set('tax_percentage',v)} type="number" placeholder="0" hint="0 for tax-exempt"/>
                <Input label="Invoice Prefix" value={f('invoice_prefix')||'INV'} onChange={(v:string)=>set('invoice_prefix',v)} placeholder="INV" hint="e.g. RMI-2026-001"/>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Accepted Payment Methods</h3>
              <div className="flex flex-wrap gap-2">
                {['Cash','Card','Online','Bank Transfer','Insurance','JazzCash','Easypaisa','Cheque'].map(method=>{
                  const current = f('accepted_payment_methods')||['Cash','Card','Online'];
                  const active = current.includes(method);
                  return (
                    <button key={method} onClick={()=>set('accepted_payment_methods',active?current.filter((m:string)=>m!==method):[...current,method])}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                      style={{background:active?'#0a1628':'#f9fafb',color:active?'#c9a84c':'#6b7280',border:active?'1px solid #0a1628':'1px solid #e5e7eb'}}>
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Insurance Providers</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {(f('insurance_providers')||[]).map((ins:string,i:number)=>(
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-blue-50 text-blue-700 border border-blue-200">
                    {ins}<button onClick={()=>set('insurance_providers',(f('insurance_providers')||[]).filter((_:any,j:number)=>j!==i))} className="text-blue-400 hover:text-red-400"><X size={10}/></button>
                  </span>
                ))}
              </div>
              <AddInsurance onAdd={(ins:string)=>set('insurance_providers',[...(f('insurance_providers')||[]),ins])}/>
            </div>
          </div>
        )}

        {/* ── TEMPLATES ── */}
        {tab==='templates' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">SOAP Note Templates</h3>
              <p className="text-[12px] text-gray-400 mb-3">Pre-fill common SOAP notes for quick documentation.</p>
              <TemplateList label="SOAP Template" field="soap_templates" form={form} set={set}/>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Referral Letter Templates</h3>
              <TemplateList label="Referral Template" field="referral_templates" form={form} set={set}/>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Consent Form Templates</h3>
              <TemplateList label="Consent Template" field="consent_templates" form={form} set={set}/>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Custom Patient Fields</h3>
              <p className="text-[12px] text-gray-400 mb-3">Add extra fields to patient health records specific to your clinic.</p>
              <CustomFields form={form} set={set}/>
            </div>
          </div>
        )}

        {/* ── REMINDERS ── */}
        {tab==='reminders' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Reminder Channels</h3>
              <div className="space-y-1 divide-y divide-gray-100">
                <Toggle label="WhatsApp Reminders" value={f('whatsapp_reminders')!==false} onChange={(v:boolean)=>set('whatsapp_reminders',v)} hint="Send appointment reminders via WhatsApp"/>
                <Toggle label="SMS Reminders" value={f('sms_reminders')||false} onChange={(v:boolean)=>set('sms_reminders',v)} hint="Send via SMS (requires SMS gateway)"/>
                <Toggle label="Email Reminders" value={f('email_reminders')||false} onChange={(v:boolean)=>set('email_reminders',v)} hint="Send via Email"/>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Reminder Timing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Send Reminder Before</label>
                  <select value={f('reminder_hours')||24} onChange={e=>set('reminder_hours',Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold">
                    {[1,2,4,8,12,24,48,72].map(h=><option key={h} value={h}>{h<24?`${h} hour${h>1?'s':''}`:h===24?'1 day':h===48?'2 days':'3 days'}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Custom Reminder Message</h3>
              <p className="text-[12px] text-gray-400 mb-3">Customize the reminder message. Use {'{name}'}, {'{date}'}, {'{time}'}, {'{clinic}'} as placeholders.</p>
              <textarea value={f('reminder_message')||''} onChange={e=>set('reminder_message',e.target.value)} rows={4}
                placeholder={`Dear {name},\n\nThis is a reminder from ${f('clinic_name')||'{clinic}'}.\nYour appointment is on {date} at {time}.\n\nThank you.`}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold resize-none"/>
              <div className="mt-3 p-3 rounded-xl text-[12px]" style={{background:'#f0fdf4',border:'1px solid #bbf7d0'}}>
                <strong className="text-emerald-800">Preview:</strong>
                <div className="text-emerald-700 mt-1 whitespace-pre-line">
                  {(f('reminder_message')||`Dear {name},\n\nReminder from ${f('clinic_name')||'Your Clinic'}.\nAppointment on {date} at {time}.`)
                    .replace('{name}','Ahmad Ali').replace('{date}','May 1, 2026').replace('{time}','10:00 AM').replace('{clinic}',f('clinic_name')||'Your Clinic')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECURITY ── */}
        {tab==='security' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Session & Access</h3>
              <div className="space-y-1 divide-y divide-gray-100">
                <Toggle label="Two-Factor Authentication" value={f('two_factor_enabled')||false} onChange={(v:boolean)=>set('two_factor_enabled',v)} hint="Require 2FA for all logins (coming soon)"/>
              </div>
              <div className="mt-4">
                <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Session Timeout (minutes)</label>
                <select value={f('session_timeout')||60} onChange={e=>set('session_timeout',Number(e.target.value))}
                  className="w-48 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold">
                  {[15,30,60,120,240,480].map(m=><option key={m} value={m}>{m<60?`${m} min`:m===60?'1 hour':m===120?'2 hours':m===240?'4 hours':'8 hours'}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Change Password</h3>
              <ChangePassword/>
            </div>
          </div>
        )}

        {/* ── INTEGRATIONS ── */}
        {tab==='integrations' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-1">WhatsApp Business API</h3>
              <p className="text-[12px] text-gray-400 mb-4">Connect your WhatsApp Business account for automated reminders and notifications.</p>
              <Input label="WhatsApp API Key" value={f('whatsapp_api_key')} onChange={(v:string)=>set('whatsapp_api_key',v)} placeholder="Your WhatsApp Business API key" hint="Get from Meta Business Manager or N8N"/>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-1">Lab Integration</h3>
              <p className="text-[12px] text-gray-400 mb-4">Connect with lab partners for direct result delivery.</p>
              <Input label="Lab Integration Key" value={f('lab_integration_key')} onChange={(v:string)=>set('lab_integration_key',v)} placeholder="API key from Chughtai Lab / Excel Lab" hint="Coming soon: Direct result delivery"/>
              <div className="mt-3 p-3 rounded-xl text-[12px] bg-amber-50 border border-amber-200 text-amber-700">
                ⚡ QR-based lab upload is active. Direct API integration with Chughtai Lab, Excel Lab coming soon.
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-1">Pharmacy Integration</h3>
              <p className="text-[12px] text-gray-400 mb-4">Connect with pharmacy networks for ePrescribing.</p>
              <Input label="Pharmacy API Key" value={f('pharmacy_integration_key')} onChange={(v:string)=>set('pharmacy_integration_key',v)} placeholder="Pharmacy network API key" hint="ePrescribing coming soon"/>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-semibold text-navy mb-4">Payment Gateway</h3>
              <p className="text-[12px] text-gray-400 mb-3">Connect Safepay for online patient payments.</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Safepay API Key" value={f('safepay_key')||''} onChange={(v:string)=>set('safepay_key',v)} placeholder="Sandbox or live API key"/>
                <Input label="Safepay Secret" value={f('safepay_secret')||''} onChange={(v:string)=>set('safepay_secret',v)} placeholder="Secret key"/>
              </div>
              <div className="mt-3 p-3 rounded-xl text-[12px] bg-blue-50 border border-blue-200 text-blue-700">
                💳 Safepay integration for subscription payments. Patient payment via portal coming soon.
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab==='users' && (isAdmin||isSuperAdmin) && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-navy">Clinic Staff</h3>
                <button onClick={()=>setShowAddUser(!showAddUser)} className="btn-gold text-[12px] px-3 py-2 flex items-center gap-1.5">
                  <Plus size={13}/> Add User
                </button>
              </div>
              {showAddUser && (
                <div className="rounded-xl p-4 mb-4 space-y-3" style={{background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.2)'}}>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Full Name" value={newUser.name} onChange={(v:string)=>setNewUser(p=>({...p,name:v}))} placeholder="Dr. Ahmad"/>
                    <Input label="Email" value={newUser.email} onChange={(v:string)=>setNewUser(p=>({...p,email:v}))} placeholder="email@clinic.com"/>
                    <Input label="Password" value={newUser.password} onChange={(v:string)=>setNewUser(p=>({...p,password:v}))} type="password" placeholder="Min 6 chars"/>
                    <div>
                      <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Role</label>
                      <select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold">
                        {['doctor_admin','doctor','admin','receptionist'].map(r=><option key={r} value={r}>{r.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async()=>{
                      if(!newUser.name||!newUser.email||!newUser.password){toast.error('All fields required');return;}
                      const {error}=await supabase.from('logins').insert([{
                        name:newUser.name, email:newUser.email.toLowerCase(), password_hash:newUser.password,
                        user_role:newUser.role, clinic_id:clinicId, is_active:true, is_super_admin:false,
                        initials:newUser.name.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2),
                      }]);
                      if(error)toast.error(error.message);
                      else{toast.success('User added!');setShowAddUser(false);setNewUser({name:'',email:'',password:'',role:'receptionist'});
                        supabase.from('logins').select('id,name,email,user_role,is_active').eq('clinic_id',clinicId||'').then(({data})=>setUsers(data||[]));
                      }
                    }} className="btn-gold text-[12px] px-4 py-2">Save</button>
                    <button onClick={()=>setShowAddUser(false)} className="px-4 py-2 rounded-lg text-[12px] text-gray-500 border">Cancel</button>
                  </div>
                </div>
              )}
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  {['Name','Email','Role','Status','Action'].map(h=>(
                    <th key={h} className="pb-2 text-left text-[10px] text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {users.map(u=>(
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 font-medium text-navy text-[13px]">{u.name}</td>
                      <td className="py-3 text-[12px] text-gray-500">{u.email}</td>
                      <td className="py-3 text-[12px]">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-navy/10 text-navy">
                          {(u.user_role||'').replace('_',' ').replace(/\b\w/g,(l:string)=>l.toUpperCase())}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{background:u.is_active?'#f0fdf4':'#fef2f2',color:u.is_active?'#16a34a':'#dc2626'}}>
                          {u.is_active?'Active':'Inactive'}
                        </span>
                      </td>
                      <td className="py-3">
                        <button onClick={async()=>{
                          await supabase.from('logins').update({is_active:!u.is_active}).eq('id',u.id);
                          setUsers(prev=>prev.map(x=>x.id===u.id?{...x,is_active:!x.is_active}:x));
                        }} className="text-[11px] text-blue-500 hover:text-blue-700 mr-3">
                          {u.is_active?'Deactivate':'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Save Button */}
        {tab!=='users' && (
          <div className="flex justify-end">
            <button onClick={save} disabled={saving}
              className="btn-gold px-6 py-3 flex items-center gap-2 text-[13px] font-semibold">
              {saving?<span className="w-4 h-4 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin"/>:<><Save size={15}/> Save Settings</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function AddAppointmentType({ currency, onAdd }: any) {
  const [form, setForm] = useState({name:'',duration:'15',fee:''});
  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Name</label>
        <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Follow-up" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"/>
      </div>
      <div className="w-24">
        <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Duration</label>
        <select value={form.duration} onChange={e=>setForm(p=>({...p,duration:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-[12px] outline-none focus:border-gold">
          {['5','10','15','20','30','45','60'].map(m=><option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="w-28">
        <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Fee ({currency})</label>
        <input value={form.fee} onChange={e=>setForm(p=>({...p,fee:e.target.value}))} type="number" placeholder="1500" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"/>
      </div>
      <button onClick={()=>{if(!form.name)return;onAdd({name:form.name,duration:Number(form.duration),fee:Number(form.fee)});setForm({name:'',duration:'15',fee:''}); }}
        className="btn-gold text-[12px] px-3 py-2 flex items-center gap-1"><Plus size={12}/>Add</button>
    </div>
  );
}

function AddInsurance({ onAdd }: any) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <input value={val} onChange={e=>setVal(e.target.value)} placeholder="e.g. State Life, Jubilee, SEHAT Card"
        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-gold"/>
      <button onClick={()=>{if(!val.trim())return;onAdd(val.trim());setVal('');}} className="btn-gold text-[12px] px-3 py-2 flex items-center gap-1"><Plus size={12}/>Add</button>
    </div>
  );
}

function TemplateList({ label, field, form, set }: any) {
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  return (
    <div className="space-y-2">
      {(form[field]||[]).map((t:any,i:number)=>(
        <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-medium text-navy">{t.name}</span>
            <button onClick={()=>set(field,(form[field]||[]).filter((_:any,j:number)=>j!==i))} className="text-gray-300 hover:text-red-400"><X size={13}/></button>
          </div>
          <p className="text-[11px] text-gray-500 line-clamp-2">{t.content}</p>
        </div>
      ))}
      <div className="space-y-2 mt-2">
        <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder={label+" name"}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-gold"/>
        <textarea value={newContent} onChange={e=>setNewContent(e.target.value)} rows={3} placeholder="Template content..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-gold resize-none"/>
        <button onClick={()=>{if(!newName||!newContent)return;set(field,[...(form[field]||[]),{name:newName,content:newContent}]);setNewName('');setNewContent('');}}
          className="btn-gold text-[12px] px-3 py-2 flex items-center gap-1"><Plus size={12}/>Add {label}</button>
      </div>
    </div>
  );
}

function CustomFields({ form, set }: any) {
  const [newField, setNewField] = useState({name:'',type:'text'});
  return (
    <div className="space-y-2">
      {(form.custom_patient_fields||[]).map((f:any,i:number)=>(
        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
          <span className="flex-1 text-[13px] text-navy">{f.name}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-200 text-gray-600">{f.type}</span>
          <button onClick={()=>set('custom_patient_fields',(form.custom_patient_fields||[]).filter((_:any,j:number)=>j!==i))} className="text-gray-300 hover:text-red-400"><X size={13}/></button>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input value={newField.name} onChange={e=>setNewField(p=>({...p,name:e.target.value}))} placeholder="Field name e.g. Caste, Religion"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-gold"/>
        <select value={newField.type} onChange={e=>setNewField(p=>({...p,type:e.target.value}))}
          className="w-28 border border-gray-200 rounded-xl px-2 py-2 text-[12px] outline-none focus:border-gold">
          {['text','number','date','yes/no','dropdown'].map(t=><option key={t}>{t}</option>)}
        </select>
        <button onClick={()=>{if(!newField.name)return;set('custom_patient_fields',[...(form.custom_patient_fields||[]),newField]);setNewField({name:'',type:'text'});}}
          className="btn-gold text-[12px] px-3 py-2"><Plus size={12}/></button>
      </div>
    </div>
  );
}

function ChangePassword() {
  const [form, setForm] = useState({current:'',newPw:'',confirm:''});
  const [saving, setSaving] = useState(false);
  const { data: session } = useSession();
  const save = async () => {
    if(!form.current||!form.newPw){toast.error('Fill all fields');return;}
    if(form.newPw!==form.confirm){toast.error('Passwords do not match');return;}
    if(form.newPw.length<6){toast.error('Min 6 characters');return;}
    setSaving(true);
    const user = session?.user as any;
    const { data: match } = await supabase.from('logins').select('id').eq('email',user?.email||'').eq('password_hash',form.current).maybeSingle();
    if(!match){ setSaving(false); toast.error('Current password is incorrect'); return; }
    const {error} = await supabase.from('logins').update({password_hash:form.newPw}).eq('email',user?.email||'');
    setSaving(false);
    if(error) toast.error('Update failed: ' + error.message);
    else { toast.success('Password changed!'); setForm({current:'',newPw:'',confirm:''}); }
  };
  return (
    <div className="grid grid-cols-2 gap-3 max-w-md">
      <div className="col-span-2">
        <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Current Password</label>
        <input type="password" value={form.current} onChange={e=>setForm(p=>({...p,current:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold"/>
      </div>
      <div>
        <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">New Password</label>
        <input type="password" value={form.newPw} onChange={e=>setForm(p=>({...p,newPw:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold"/>
      </div>
      <div>
        <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium block mb-1.5">Confirm New Password</label>
        <input type="password" value={form.confirm} onChange={e=>setForm(p=>({...p,confirm:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-navy outline-none focus:border-gold"/>
      </div>
      <button onClick={save} disabled={saving} className="btn-gold text-[12px] px-4 py-2 flex items-center gap-2 col-span-2 w-fit">
        {saving?<span className="w-3 h-3 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin"/>:<><Save size={13}/> Change Password</>}
      </button>
    </div>
  );
}
