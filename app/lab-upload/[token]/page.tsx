'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Upload, CheckCircle, AlertCircle, FlaskConical, Scan, X, FileText } from 'lucide-react';

export default function LabUploadPage() {
  const params = useParams();
  const token = params?.token as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [labName, setLabName] = useState('');
  const [techName, setTechName] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [phone, setPhone] = useState('');
  const [verified, setVerified] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/lab-upload/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setOrder(d.order); setLoading(false); })
      .catch(() => { setError('Failed to load order'); setLoading(false); });
  }, [token]);

  const verifyPhone = async () => {
    if (!phone.trim()) { setError('Please enter your registered phone number'); return; }
    const res = await fetch(`/api/lab-upload/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_phone', phone: phone.trim() }),
    });
    const d = await res.json();
    if (d.ok) { setVerified(true); setError(''); }
    else setError(d.error || 'Phone number does not match');
  };

  const handleUpload = async () => {
    if (!files.length) { setError('Please select at least one file'); return; }
    if (!labName.trim()) { setError('Please enter lab/center name'); return; }
    setUploading(true); setError('');
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('labName', labName);
    formData.append('techName', techName);
    formData.append('notes', notes);
    const res = await fetch(`/api/lab-upload/${token}`, { method: 'PUT', body: formData });
    const d = await res.json();
    setUploading(false);
    if (d.ok) setSuccess(true);
    else setError(d.error || 'Upload failed');
  };

  const cls = "w-full rounded-xl px-4 py-3 text-[13px] outline-none border border-slate-200 focus:border-[#c9a84c] transition-all bg-white text-[#0a1628]";

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'#f0f4f8'}}><div className="w-8 h-8 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin"/></div>;

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'#f0f4f8'}}>
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-lg">
        <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500"/>
        <h2 className="text-xl font-bold text-[#0a1628] mb-2">Results Uploaded!</h2>
        <p className="text-slate-500 text-sm mb-4">Results attached to patient record. Doctor has been notified.</p>
        <div className="p-3 rounded-xl text-sm" style={{background:'#f0fdf4',color:'#15803d'}}>
          Patient: <strong>{order?.child_name}</strong><br/>MR#: <strong>{order?.mr_number}</strong>
        </div>
      </div>
    </div>
  );

  if (error && !order) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'#f0f4f8'}}>
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-lg">
        <AlertCircle size={40} className="mx-auto mb-3 text-red-400"/>
        <h2 className="text-lg font-bold text-[#0a1628] mb-2">Invalid or Expired Link</h2>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4" style={{background:'#f0f4f8'}}>
      <div className="max-w-lg mx-auto space-y-4">
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3" style={{background:'linear-gradient(135deg,#0a1628,#142240)'}}>
            <span className="text-[#c9a84c] font-bold text-lg">M+</span>
          </div>
          <h1 className="text-xl font-bold text-[#0a1628]">MediPlex Results Upload</h1>
          <p className="text-slate-500 text-sm mt-1">Upload lab / radiology results for patient</p>
        </div>

        {order && (
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{border:'1px solid #e2e8f0'}}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: order.order_type==='radiology'?'#eff6ff':'#f0fdf4'}}>
                {order.order_type==='radiology' ? <Scan size={18} className="text-blue-500"/> : <FlaskConical size={18} className="text-emerald-500"/>}
              </div>
              <div>
                <div className="font-semibold text-[#0a1628]">{order.child_name}</div>
                <div className="text-xs text-slate-500">MR# {order.mr_number} · {order.order_type==='radiology'?'Radiology':'Lab'} Order · Ordered by {order.ordered_by||'Doctor'}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(order.tests||[]).map((t:any,i:number)=>(
                <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{background:order.order_type==='radiology'?'#dbeafe':'#dcfce7',color:order.order_type==='radiology'?'#1e40af':'#15803d'}}>
                  {(t.name||t).split('(')[0].trim()}{t.urgency&&t.urgency!=='Routine'?` • ${t.urgency}`:''}
                </span>
              ))}
            </div>
            {order.clinical_notes && <p className="text-xs text-slate-500 mt-2 p-2 rounded-lg bg-slate-50"><strong>Clinical info:</strong> {order.clinical_notes}</p>}
          </div>
        )}

        {order && !verified && (
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{border:'1px solid #e2e8f0'}}>
            <h3 className="font-semibold text-[#0a1628] mb-1">Security Verification</h3>
            <p className="text-slate-500 text-sm mb-4">Enter patient's registered WhatsApp/phone number to verify identity</p>
            {error && <div className="text-red-500 text-sm mb-3 flex items-center gap-1"><AlertCircle size={13}/> {error}</div>}
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+92 300 0000000" type="tel" className={cls+" mb-3"}
              onKeyDown={e=>e.key==='Enter'&&verifyPhone()}/>
            <button onClick={verifyPhone} className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{background:'linear-gradient(135deg,#0a1628,#142240)',color:'#c9a84c'}}>
              Verify & Continue →
            </button>
          </div>
        )}

        {order && verified && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4" style={{border:'1px solid #e2e8f0'}}>
            <h3 className="font-semibold text-[#0a1628]">Upload Results</h3>
            {error && <div className="text-red-500 text-sm flex items-center gap-1"><AlertCircle size={13}/> {error}</div>}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide font-medium block mb-2">Result Files * (PDF / Images)</label>
              <div onClick={()=>fileRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-[#c9a84c] transition-all"
                style={{borderColor:files.length?'#c9a84c':'#e2e8f0',background:files.length?'rgba(201,168,76,0.04)':'#fafafa'}}>
                <Upload size={24} className="mx-auto mb-2 text-slate-400"/>
                <p className="text-sm text-slate-500">Click to select files</p>
                <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG supported · Multiple files allowed</p>
                <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                  onChange={e=>setFiles(Array.from(e.target.files||[]))}/>
              </div>
              {files.length>0 && (
                <div className="mt-2 space-y-1">
                  {files.map((f,i)=>(
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-sm">
                      <FileText size={13} className="text-red-500"/>
                      <span className="flex-1 truncate text-slate-600">{f.name}</span>
                      <button onClick={()=>setFiles(files.filter((_,j)=>j!==i))}><X size={13} className="text-slate-400"/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide font-medium block mb-1.5">Lab / Radiology Center Name *</label>
              <input value={labName} onChange={e=>setLabName(e.target.value)} placeholder="e.g. Chughtai Lab, Shaukat Khanum, IDC" className={cls}/>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide font-medium block mb-1.5">Technician / Radiologist Name</label>
              <input value={techName} onChange={e=>setTechName(e.target.value)} placeholder="Optional" className={cls}/>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide font-medium block mb-1.5">Additional Notes</label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any findings, remarks..." rows={2} className={cls+" resize-none"}/>
            </div>
            <button onClick={handleUpload} disabled={uploading}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{background:'linear-gradient(135deg,#c9a84c,#e8c87a)',color:'#0a1628'}}>
              {uploading?<span className="w-4 h-4 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin"/>:<><Upload size={15}/> Submit Results</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
