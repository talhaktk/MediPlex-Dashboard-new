'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useClinic, withClinicFilter, withClinicId } from '@/lib/clinicContext';
import { formatUSDate } from '@/lib/sheets';
import { Search, Plus, Upload, X, FileText, Image, Eye, Trash2, Save, Loader2, CheckCircle, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

interface LabResult {
  id: string; mr_number?: string; child_name: string;
  appointment_id?: string; visit_date?: string;
  test_name?: string; notes?: string; file_urls: string[];
  uploaded_at?: string;
}

const CONSENT_FORMS = {
  treatment: {
    title: 'General Consent for Medical Treatment',
    subtitle: 'HIPAA Compliant · Standard of Care',
    color: '#3b82f6',
  },
  procedure: {
    title: 'Informed Consent for Medical Procedure',
    subtitle: 'Informed Consent · FDA Compliant',
    color: '#10b981',
  },
  privacy: {
    title: 'HIPAA Notice of Privacy Practices',
    subtitle: 'Privacy Authorization · Required by Law',
    color: '#8b5cf6',
  },
};

function genId() { return `LAB-${Date.now().toString(36).toUpperCase()}`; }

function getConsentContent(key: string, patient: string, parent: string, age: string, mr: string, clinic: string, doctor: string): string {
  const date = new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
  if (key === 'treatment') return `CONSENT FOR MEDICAL TREATMENT\n\nPatient: ${patient} | Age: ${age} | MR#: ${mr}\nParent/Guardian: ${parent}\nDate: ${date}\n\nI, ${parent}, as the parent/legal guardian of ${patient}, hereby consent to and authorize the physicians, nurses, and other healthcare providers at ${clinic} under the direction of ${doctor} to perform examination, diagnostic procedures, medical treatment, and therapeutic services deemed necessary.\n\n1. MEDICAL TREATMENT: I consent to examination, diagnostic procedures, medical treatment, and therapeutic services deemed necessary by the attending physician(s).\n\n2. EMERGENCY TREATMENT: In the event of an emergency, additional procedures may be performed as deemed necessary by the physician(s).\n\n3. RELEASE OF INFORMATION: I authorize ${clinic} to release medical information necessary for treatment, payment, or healthcare operations in accordance with HIPAA Privacy Regulations (45 CFR Parts 160 and 164).\n\n4. FINANCIAL RESPONSIBILITY: I understand I am financially responsible for all charges not covered by insurance.\n\n5. PATIENT RIGHTS: I acknowledge I have been informed of my rights as a patient, including the right to refuse treatment.\n\nParent/Guardian Signature: ___________________________    Date: _______________\n\nWitness: ___________________________    Date: _______________\n\n${doctor} | ${clinic}`;
  if (key === 'procedure') return `INFORMED CONSENT FOR MEDICAL PROCEDURE\n\nPatient: ${patient} | Age: ${age} | MR#: ${mr}\nParent/Guardian: ${parent}\nDate: ${date}\n\nPROCEDURE: _______________________________________________\nDIAGNOSIS: _______________________________________________\n\nI, ${parent}, as parent/legal guardian of ${patient}, provide informed consent for the procedure recommended by ${doctor} at ${clinic}.\n\n1. DESCRIPTION: I have been informed of the nature, purpose, and description of the proposed procedure.\n\n2. RISKS: I understand potential risks including pain, bleeding, infection, adverse reactions to medication or anesthesia.\n\n3. BENEFITS: The expected benefits have been explained to me.\n\n4. ALTERNATIVES: I have been informed of alternative procedures or treatments.\n\n5. REFUSAL: I have the right to refuse or withdraw consent at any time.\n\n6. ANESTHESIA: If sedation or local anesthesia is required, I consent to its use.\n\n7. BLOOD PRODUCTS: [ ] I consent  [ ] I do not consent to blood products if necessary.\n\n8. PHOTOGRAPHY: I consent to clinical photography for medical records purposes.\n\nParent/Guardian Signature: ___________________________    Date: _______________\n\nPhysician Signature: ___________________________    Date: _______________\n\n${doctor} | ${clinic}\nComplies with HIPAA Privacy Rule (45 CFR §164.508)`;
  return `NOTICE OF PRIVACY PRACTICES AND AUTHORIZATION\n\nPatient: ${patient} | Age: ${age} | MR#: ${mr}\nParent/Guardian: ${parent}\nDate: ${date}\n\n${clinic} | ${doctor}\n\nNOTICE: This notice describes how medical information about your child may be used and disclosed. PLEASE REVIEW CAREFULLY.\n\nHOW WE MAY USE YOUR CHILD'S HEALTH INFORMATION:\n\nFOR TREATMENT: We may use health information to provide treatment or coordinate care.\n\nFOR PAYMENT: We may use information to bill and collect payment.\n\nFOR HEALTHCARE OPERATIONS: Including quality improvement, training, and accreditation.\n\nYOUR RIGHTS:\n• Right to inspect and copy (45 CFR §164.524)\n• Right to request amendment (45 CFR §164.526)\n• Right to request restrictions (45 CFR §164.522)\n• Right to receive confidential communications\n• Right to file a complaint\n\nAUTHORIZATION FOR RELEASE:\nI authorize ${clinic} to release records of ${patient} to:\nName/Organization: _______________________________________________\nPurpose: [ ] Continued care  [ ] Insurance  [ ] School  [ ] Other\n\nParent/Guardian Signature: ___________________________    Date: _______________\n\nComplies with HIPAA Privacy Rule (45 CFR Parts 160 and 164)`;
}

export default function PatientPortalPage({ appointments }: { appointments: any[] }) {
  const { clinicId, isSuperAdmin } = useClinic();
  const [activeSection, setActiveSection] = useState<'labs'|'consent'>('labs');
  const [search, setSearch] = useState('');
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ child_name:'', mr_number:'', test_name:'', notes:'', visit_date: new Date().toISOString().split('T')[0] });
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedConsent, setSelectedConsent] = useState<string|null>(null);
  const [consentPatient, setConsentPatient] = useState({ name:'', parent:'', age:'', mr:'' });

  // Unique patients from appointments
  const patients = Array.from(new Map(appointments.filter(a=>a.childName).map(a=>[a.childName.toLowerCase(), { name:a.childName, parent:a.parentName, age:a.childAge, mr:(a as any).mr_number||'' }])).values());
  const filteredPatients = search ? patients.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.mr.toLowerCase().includes(search.toLowerCase())) : patients;

  useEffect(() => { fetchLabs(); }, []);

  const fetchLabs = async () => {
    setLoading(true);
    const { data } = await supabase.from('lab_results').select('*').order('uploaded_at', { ascending: false });
    setLabResults(data || []);
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(prev => [...prev, ...Array.from(e.target.files||[])]);
  };

  const uploadFiles = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${form.mr_number||form.child_name}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('lab-results').upload(path, file, { upsert: true });
      if (error) { toast.error(`Upload failed: ${file.name} — ${error.message}`); continue; }
      const { data: urlData } = supabase.storage.from('lab-results').getPublicUrl(path);
      if (urlData?.publicUrl) urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const saveResult = async () => {
    if (!form.child_name) { toast.error('Select a patient'); return; }
    setUploading(true);
    try {
      const fileUrls = files.length > 0 ? await uploadFiles() : [];
      const record = { id:genId(), mr_number:form.mr_number||null, child_name:form.child_name, visit_date:form.visit_date, test_name:form.test_name, notes:form.notes, file_urls:fileUrls };
      const { error } = await supabase.from('lab_results').insert([record]);
      if (error) throw error;
      setLabResults(prev => [record as LabResult, ...prev]);
      setForm({ child_name:'', mr_number:'', test_name:'', notes:'', visit_date:new Date().toISOString().split('T')[0] });
      setFiles([]); setShowForm(false);
      toast.success('Lab result saved');
    } catch(err:any) { toast.error('Failed: '+err.message); }
    finally { setUploading(false); }
  };

  const printConsent = (key: string) => {
    const form_data = CONSENT_FORMS[key as keyof typeof CONSENT_FORMS];
    const content = getConsentContent(key, consentPatient.name, consentPatient.parent, consentPatient.age, consentPatient.mr, 'MediPlex Pediatric Centre', 'Dr. Talha');
    const w = window.open('','_blank'); if(!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${form_data.title}</title><style>body{font-family:Arial;padding:40px;max-width:800px;margin:0 auto;color:#0a1628;font-size:12px;line-height:1.8}h1{font-size:16px;color:${form_data.color};border-bottom:2px solid ${form_data.color};padding-bottom:8px}pre{white-space:pre-wrap;font-family:Arial;font-size:12px;line-height:1.8}.footer{margin-top:30px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}@media print{body{padding:20px}}</style></head><body><h1>${form_data.title}</h1><pre>${content}</pre><div class="footer">HIPAA Compliant · MediPlex Pediatric Centre · ${new Date().toLocaleDateString()}</div></body></html>`);
    w.document.close(); setTimeout(()=>w.print(),400);
  };

  const saveConsent = async (key: string) => {
    if (!consentPatient.name) { toast.error('Select a patient first'); return; }
    const content = getConsentContent(key, consentPatient.name, consentPatient.parent, consentPatient.age, consentPatient.mr, 'MediPlex Pediatric Centre', 'Dr. Talha');
    await supabase.from('consent_forms').insert([{ id:`CF-${Date.now().toString(36).toUpperCase()}`, mr_number:consentPatient.mr||null, child_name:consentPatient.name, form_type:key, signed_by:consentPatient.parent, content }]);
    toast.success('Consent form saved to records');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-navy text-[22px]">Patient Portal</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Lab Results · Consent Forms · Document Management</p>
        </div>
        <div className="flex gap-2">
          {[{key:'labs',label:'Lab Results'},{key:'consent',label:'Consent Forms'}].map(s=>(
            <button key={s.key} onClick={()=>setActiveSection(s.key as any)}
              className={`px-4 py-2 rounded-xl text-[12px] font-medium transition-all ${activeSection===s.key?'bg-navy text-white':'btn-outline'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* LAB RESULTS */}
      {activeSection==='labs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" placeholder="Search by patient or test..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full border border-black/10 rounded-lg pl-8 pr-3 py-2 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
            </div>
            <button onClick={()=>setShowForm(!showForm)} className="btn-gold text-[12px] py-2 px-4 gap-1.5"><Plus size={13}/> Add Lab Result</button>
          </div>

          {showForm && (
            <div className="card p-5 space-y-4" style={{border:'2px solid rgba(201,168,76,0.3)'}}>
              <div className="text-[14px] font-semibold text-navy">New Lab Result</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Patient *</label>
                  <select value={form.child_name} onChange={e=>{const p=patients.find(pt=>pt.name===e.target.value);setForm(prev=>({...prev,child_name:e.target.value,mr_number:p?.mr||''}));}} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                    <option value="">Select patient...</option>
                    {patients.map(p=><option key={p.name} value={p.name}>{p.name} {p.mr?`(${p.mr})`:''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Test Name</label>
                  <input type="text" placeholder="e.g. CBC, CRP, Chest X-Ray" value={form.test_name} onChange={e=>setForm(p=>({...p,test_name:e.target.value}))} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Visit Date</label>
                  <input type="date" value={form.visit_date} onChange={e=>setForm(p=>({...p,visit_date:e.target.value}))} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Notes / Results</label>
                  <textarea rows={2} placeholder="Enter results or interpretation..." value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold resize-none"/>
                </div>
              </div>
              <div className="border-2 border-dashed border-black/10 rounded-xl p-4 text-center cursor-pointer hover:border-gold transition-all" onClick={()=>fileRef.current?.click()}
                onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();setFiles(p=>[...p,...Array.from(e.dataTransfer.files)]);}} >
                <Upload size={20} className="mx-auto mb-2 text-gray-300"/>
                <div className="text-[12px] text-gray-400">Click or drag & drop files here</div>
                <div className="text-[11px] text-gray-300 mt-1">PDFs and images supported · Multiple files allowed</div>
                <input ref={fileRef} type="file" multiple accept=".pdf,image/*" className="hidden" onChange={handleFileSelect}/>
              </div>
              {files.length>0&&(
                <div className="flex flex-wrap gap-2">
                  {files.map((file,i)=>(
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.2)'}}>
                      {file.type.startsWith('image/')?<Image size={11} className="text-blue-500"/>:<FileText size={11} className="text-red-500"/>}
                      <span className="text-navy max-w-[120px] truncate">{file.name}</span>
                      <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} className="text-gray-400 hover:text-red-400"><X size={11}/></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={saveResult} disabled={uploading} className="btn-gold text-[12px] py-2 px-4 gap-1.5">
                  {uploading?<><Loader2 size={13} className="animate-spin"/>Uploading...</>:<><Save size={13}/>Save Result</>}
                </button>
                <button onClick={()=>{setShowForm(false);setFiles([]);}} className="btn-outline text-[12px] py-2 px-4">Cancel</button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[{label:'Total Results',val:labResults.length,color:'#0a1628'},{label:'With Files',val:labResults.filter(r=>r.file_urls?.length>0).length,color:'#1a7f5e'},{label:'This Month',val:labResults.filter(r=>r.uploaded_at?.startsWith(new Date().toISOString().slice(0,7))).length,color:'#c9a84c'}].map(s=>(
              <div key={s.label} className="kpi-card">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">{s.label}</div>
                <div className="text-[28px] font-semibold" style={{color:s.color}}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Lab results table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Lab Results</div>
            {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
            :labResults.length===0?<div className="text-center py-10 text-gray-400 text-[13px]">No lab results yet</div>
            :(
              <div className="divide-y divide-black/5">
                {(search?labResults.filter(r=>r.child_name?.toLowerCase().includes(search.toLowerCase())||r.test_name?.toLowerCase().includes(search.toLowerCase())):labResults).map(r=>(
                  <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-[13px] font-semibold text-navy">{r.child_name}</div>
                        {r.mr_number&&<span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{r.mr_number}</span>}
                        {r.test_name&&<span className="text-[12px] text-gray-600">· {r.test_name}</span>}
                      </div>
                      {r.notes&&<div className="text-[12px] text-gray-500 mt-1">{r.notes}</div>}
                      {r.file_urls?.length>0&&(
                        <div className="flex flex-wrap gap-2 mt-2">
                          {r.file_urls.map((url,i)=>{
                            const isImg=/\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                            return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium" style={{background:'#f0fdf4',color:'#166534',border:'1px solid #bbf7d0'}}>
                              {isImg?<Image size={11}/>:<FileText size={11}/>}{isImg?`Image ${i+1}`:`File ${i+1}`}<Eye size={10}/>
                            </a>;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[11px] text-gray-400">{r.visit_date?formatUSDate(r.visit_date):''}</div>
                      <div className="text-[10px] text-gray-300 mt-0.5">{r.file_urls?.length||0} file(s)</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONSENT FORMS */}
      {activeSection==='consent' && (
        <div className="space-y-4">
          {/* Patient selector */}
          <div className="card p-5">
            <div className="text-[13px] font-medium text-navy mb-3">Select Patient for Consent Form</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Patient</label>
                <select value={consentPatient.name} onChange={e=>{const p=patients.find(pt=>pt.name===e.target.value);setConsentPatient({name:e.target.value,parent:p?.parent||'',age:p?.age||'',mr:p?.mr||''}); }} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                  <option value="">Select patient...</option>
                  {patients.map(p=><option key={p.name} value={p.name}>{p.name} {p.mr?`(${p.mr})`:''}</option>)}
                </select>
              </div>
              {consentPatient.name&&(
                <div className="rounded-xl p-3 flex items-center gap-3" style={{background:'#e8f7f2',border:'1px solid #6ee7b7'}}>
                  <div>
                    <div className="text-[13px] font-semibold text-navy">{consentPatient.name}</div>
                    <div className="text-[11px] text-gray-500">Parent: {consentPatient.parent} · Age: {consentPatient.age} {consentPatient.mr&&`· ${consentPatient.mr}`}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Consent form cards */}
          <div className="grid grid-cols-1 gap-4">
            {(Object.entries(CONSENT_FORMS) as [string, any][]).map(([key, form_data])=>(
              <div key={key} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${form_data.color}15`}}>
                      <FileText size={18} style={{color:form_data.color}}/>
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-navy">{form_data.title}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{form_data.subtitle}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>setSelectedConsent(selectedConsent===key?null:key)} className="btn-outline text-[11px] py-1.5 px-3">
                      {selectedConsent===key?'Hide':'Preview'}
                    </button>
                    <button onClick={()=>printConsent(key)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{background:`${form_data.color}15`,color:form_data.color,border:`1px solid ${form_data.color}33`}}>
                      <Printer size={12}/> Print & Sign
                    </button>
                    <button onClick={()=>saveConsent(key)} className="btn-gold text-[11px] py-1.5 px-3 gap-1"><CheckCircle size={12}/> Save to Records</button>
                  </div>
                </div>
                {selectedConsent===key&&(
                  <div className="mt-4 rounded-xl p-4 font-mono text-[11px] text-gray-600 whitespace-pre-wrap max-h-64 overflow-y-auto" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.15)'}}>
                    {getConsentContent(key, consentPatient.name||'[Patient Name]', consentPatient.parent||'[Parent Name]', consentPatient.age||'[Age]', consentPatient.mr||'[MR#]', 'MediPlex Pediatric Centre', 'Dr. Talha')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
