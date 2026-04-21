'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatUSDate } from '@/lib/sheets';
import { Plus, Upload, X, FileText, Image, Eye, Trash2, Save, Loader2, Printer, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

interface LabResult {
  id: string; mr_number?: string; child_name: string;
  appointment_id?: string; visit_date?: string;
  test_name?: string; notes?: string; file_urls: string[];
  uploaded_at?: string;
}

interface Props {
  childName: string; mrNumber?: string;
  patientAge?: string; parentName?: string;
  appointmentId?: string; visitDate?: string;
}

function genId() { return `LAB-${Date.now().toString(36).toUpperCase()}`; }

export default function LabResultsWithPrint({ childName, mrNumber, patientAge, parentName, appointmentId, visitDate }: Props) {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ test_name: '', notes: '', visit_date: visitDate || new Date().toISOString().split('T')[0] });
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchResults(); }, [childName, mrNumber]);

  const fetchResults = async () => {
    setLoading(true);
    const q = mrNumber
      ? supabase.from('lab_results').select('*').eq('mr_number', mrNumber)
      : supabase.from('lab_results').select('*').ilike('child_name', childName);
    const { data } = await q.order('uploaded_at', { ascending: false });
    setResults(data || []);
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
  };

  const uploadFiles = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${mrNumber || childName}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('lab-results').upload(path, file, { upsert: true });
      if (error) { toast.error(`Upload failed: ${file.name}`); continue; }
      const { data: urlData } = supabase.storage.from('lab-results').getPublicUrl(path);
      if (urlData?.publicUrl) urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const saveResult = async () => {
    if (!form.test_name && files.length === 0) { toast.error('Enter test name or upload files'); return; }
    setUploading(true);
    try {
      const fileUrls = files.length > 0 ? await uploadFiles() : [];
      const record: LabResult = {
        id: genId(), mr_number: mrNumber || undefined, child_name: childName,
        appointment_id: appointmentId || undefined, visit_date: form.visit_date,
        test_name: form.test_name, notes: form.notes, file_urls: fileUrls,
      };
      const { error } = await supabase.from('lab_results').insert([record]);
      if (error) throw error;
      setResults(prev => [record, ...prev]);
      setForm({ test_name: '', notes: '', visit_date: visitDate || new Date().toISOString().split('T')[0] });
      setFiles([]); setShowForm(false);
      toast.success('Lab result saved');
    } catch (err: any) { toast.error('Failed: ' + err.message); }
    finally { setUploading(false); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const printSelected = () => {
    const toPrint = results.filter(r => selected.has(r.id));
    if (toPrint.length === 0) { toast.error('Select at least one report'); return; }
    const w = window.open('', '_blank'); if (!w) return;
    const rows = toPrint.map(r => `
      <div class="report">
        <div class="report-header">
          <div class="report-name">${r.test_name || 'Lab Result'}</div>
          <div class="report-date">${r.visit_date ? formatUSDate(r.visit_date) : ''}</div>
        </div>
        ${r.notes ? `<div class="report-notes">${r.notes}</div>` : ''}
        ${r.file_urls?.length > 0 ? `<div class="report-files">
          ${r.file_urls.map((url, i) => {
            const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
            return isImg
              ? `<div class="file-item"><img src="${url}" style="max-width:100%;max-height:300px;border-radius:8px;border:1px solid #e5e7eb"/></div>`
              : `<div class="file-item"><a href="${url}" target="_blank" style="color:#3b82f6">📄 View File ${i+1}</a></div>`;
          }).join('')}
        </div>` : ''}
      </div>
    `).join('');

    w.document.write(`<!DOCTYPE html><html><head><title>Lab Reports — ${childName}</title>
    <style>body{font-family:Arial;padding:30px;max-width:800px;margin:0 auto;color:#0a1628}
    .header{background:#0a1628;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;margin-bottom:0}
    .patient-bar{background:#f9f7f3;border:1px solid rgba(201,168,76,0.3);border-top:none;padding:10px 20px;margin-bottom:24px;border-radius:0 0 8px 8px;font-size:12px}
    .report{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px}
    .report-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .report-name{font-size:15px;font-weight:700;color:#0a1628}
    .report-date{font-size:12px;color:#6b7280}
    .report-notes{font-size:13px;color:#374151;margin-bottom:8px;padding:8px;background:#f9f7f3;border-radius:6px}
    .report-files{margin-top:8px}.file-item{margin:4px 0}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
    @media print{body{padding:10px}}</style></head><body>
    <div class="header"><div style="font-size:18px;font-weight:700">MediPlex Pediatric Centre</div><div style="font-size:11px;opacity:0.6">Lab Reports Summary</div></div>
    <div class="patient-bar"><strong>${childName}</strong>${patientAge ? ` · Age ${patientAge}` : ''}${mrNumber ? ` · MR# ${mrNumber}` : ''}${parentName ? ` · Parent: ${parentName}` : ''} · ${toPrint.length} report(s)</div>
    ${rows}
    <div class="footer">MediPlex Pediatric Centre · Generated ${new Date().toLocaleString()}</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const deleteResult = async (id: string) => {
    if (!confirm('Delete this lab result?')) return;
    await supabase.from('lab_results').delete().eq('id', id);
    setResults(prev => prev.filter(r => r.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    toast.success('Deleted');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium text-navy">Lab Results & Reports</div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={printSelected} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{background:'rgba(59,130,246,0.1)',color:'#1d4ed8',border:'1px solid rgba(59,130,246,0.25)'}}>
              <Printer size={12}/> Print {selected.size} Selected
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-gold text-[11px] py-1.5 px-3 gap-1"><Plus size={11}/> Add Result</button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl p-4 space-y-3" style={{background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.25)'}}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Test Name</label>
              <input type="text" placeholder="e.g. CBC, CRP, Chest X-Ray" value={form.test_name}
                onChange={e => setForm(p => ({...p, test_name: e.target.value}))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Visit Date</label>
              <input type="date" value={form.visit_date}
                onChange={e => setForm(p => ({...p, visit_date: e.target.value}))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Notes / Results</label>
              <textarea rows={2} placeholder="Enter results or interpretation..." value={form.notes}
                onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[12px] text-navy bg-white outline-none focus:border-gold resize-none"/>
            </div>
          </div>
          <div className="border-2 border-dashed border-black/10 rounded-xl p-4 text-center cursor-pointer hover:border-gold transition-all"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setFiles(p => [...p, ...Array.from(e.dataTransfer.files)]); }}>
            <Upload size={20} className="mx-auto mb-2 text-gray-300"/>
            <div className="text-[12px] text-gray-400">Click or drag & drop PDFs and images</div>
            <input ref={fileRef} type="file" multiple accept=".pdf,image/*" className="hidden" onChange={handleFileSelect}/>
          </div>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.2)'}}>
                  {file.type.startsWith('image/') ? <Image size={11} className="text-blue-500"/> : <FileText size={11} className="text-red-500"/>}
                  <span className="text-navy max-w-[120px] truncate">{file.name}</span>
                  <button onClick={() => setFiles(p => p.filter((_,j) => j !== i))} className="text-gray-400 hover:text-red-400"><X size={11}/></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={saveResult} disabled={uploading} className="btn-gold text-[11px] py-1.5 px-4 gap-1">
              {uploading ? <><Loader2 size={11} className="animate-spin"/>Uploading...</> : <><Save size={11}/>Save Result</>}
            </button>
            <button onClick={() => { setShowForm(false); setFiles([]); }} className="btn-outline text-[11px] py-1.5 px-3">Cancel</button>
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl text-[12px]" style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.2)'}}>
          <span className="text-blue-700">{selected.size} report(s) selected for printing</span>
          <button onClick={() => setSelected(new Set())} className="text-blue-400 hover:text-blue-600 text-[11px]">Clear selection</button>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-400 text-[13px]">Loading...</div>
      : results.length === 0 ? <div className="text-center py-8 text-gray-400 text-[13px]">No lab results yet</div>
      : results.map(r => (
        <div key={r.id} className="rounded-xl overflow-hidden" style={{background:selected.has(r.id)?'rgba(59,130,246,0.04)':'#f9f7f3',border:`1px solid ${selected.has(r.id)?'rgba(59,130,246,0.3)':'rgba(201,168,76,0.12)'}`}}>
          <div className="flex items-start justify-between px-4 py-3" style={{background:selected.has(r.id)?'rgba(59,130,246,0.08)':'rgba(201,168,76,0.06)',borderBottom:'1px solid rgba(201,168,76,0.1)'}}>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleSelect(r.id)} className="flex-shrink-0">
                {selected.has(r.id) ? <CheckSquare size={16} style={{color:'#1d4ed8'}}/> : <Square size={16} className="text-gray-300"/>}
              </button>
              <div>
                <div className="text-[13px] font-semibold text-navy">{r.test_name || 'Lab Result'}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{r.visit_date ? formatUSDate(r.visit_date) : ''} · {r.file_urls?.length || 0} file(s)</div>
              </div>
            </div>
            <button onClick={() => deleteResult(r.id)} className="text-gray-300 hover:text-red-400"><Trash2 size={13}/></button>
          </div>
          {r.notes && <div className="px-4 py-2 text-[12px] text-gray-700">{r.notes}</div>}
          {r.file_urls?.length > 0 && (
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {r.file_urls.map((url, i) => {
                const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                    style={{background:'#fff',border:'1px solid rgba(201,168,76,0.25)',color:'#a07a2a'}}>
                    {isImg ? <Image size={12}/> : <FileText size={12}/>}
                    {isImg ? `Image ${i+1}` : `File ${i+1}`}
                    <Eye size={11}/>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
