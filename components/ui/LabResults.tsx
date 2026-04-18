'use client';
// Lab Results Component — linked to patient tab
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatUSDate } from '@/lib/sheets';
import { Plus, Upload, X, FileText, Image, Eye, Trash2, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface LabResult {
  id: string; mr_number?: string; child_name: string;
  appointment_id?: string; visit_date?: string;
  test_name?: string; notes?: string; file_urls: string[];
  uploaded_at?: string;
}

interface Props {
  childName: string; mrNumber?: string;
  appointmentId?: string; visitDate?: string;
}

function genId() { return `LAB-${Date.now().toString(36).toUpperCase()}`; }

export default function LabResults({ childName, mrNumber, appointmentId, visitDate }: Props) {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ test_name: '', notes: '', visit_date: visitDate || new Date().toISOString().split('T')[0] });
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
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
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
    selected.forEach(f => {
      const url = URL.createObjectURL(f);
      setPreviewUrls(prev => [...prev, url]);
    });
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_,i) => i !== idx));
    setPreviewUrls(prev => prev.filter((_,i) => i !== idx));
  };

  const uploadFiles = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${mrNumber || childName}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from('lab-results').upload(path, file, { upsert: true });
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
      setFiles([]); setPreviewUrls([]); setShowForm(false);
      toast.success('Lab result saved');
    } catch (err: any) { toast.error('Failed: ' + err.message); }
    finally { setUploading(false); }
  };

  const deleteResult = async (id: string) => {
    if (!confirm('Delete this lab result?')) return;
    await supabase.from('lab_results').delete().eq('id', id);
    setResults(prev => prev.filter(r => r.id !== id));
    toast.success('Deleted');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium text-navy">Lab Results & Reports</div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold text-[11px] py-1.5 px-3 gap-1"><Plus size={11}/> Add Result</button>
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

          {/* File upload */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-2">Upload Files (PDF, Images)</label>
            <div className="border-2 border-dashed border-black/10 rounded-xl p-4 text-center cursor-pointer hover:border-gold transition-all"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = Array.from(e.dataTransfer.files); setFiles(p => [...p,...f]); f.forEach(file => setPreviewUrls(p => [...p, URL.createObjectURL(file)])); }}>
              <Upload size={20} className="mx-auto mb-2 text-gray-300"/>
              <div className="text-[12px] text-gray-400">Click or drag & drop — PDFs and images</div>
              <div className="text-[11px] text-gray-300 mt-1">Multiple files supported</div>
              <input ref={fileRef} type="file" multiple accept=".pdf,image/*" className="hidden" onChange={handleFileSelect}/>
            </div>
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.2)'}}>
                    {file.type.startsWith('image/') ? <Image size={11} className="text-blue-500"/> : <FileText size={11} className="text-red-500"/>}
                    <span className="text-navy max-w-[120px] truncate">{file.name}</span>
                    <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-400"><X size={11}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={saveResult} disabled={uploading} className="btn-gold text-[11px] py-1.5 px-4 gap-1">
              {uploading ? <><Loader2 size={11} className="animate-spin"/> Uploading...</> : <><Save size={11}/> Save Result</>}
            </button>
            <button onClick={() => {setShowForm(false); setFiles([]); setPreviewUrls([]);}} className="btn-outline text-[11px] py-1.5 px-3">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-400 text-[13px]">Loading...</div>
      : results.length === 0 ? <div className="text-center py-8 text-gray-400 text-[13px]">No lab results yet</div>
      : results.map(r => (
        <div key={r.id} className="rounded-xl overflow-hidden" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.12)'}}>
          <div className="flex items-start justify-between px-4 py-3" style={{background:'rgba(201,168,76,0.06)',borderBottom:'1px solid rgba(201,168,76,0.12)'}}>
            <div>
              <div className="text-[13px] font-semibold text-navy">{r.test_name || 'Lab Result'}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{r.visit_date ? formatUSDate(r.visit_date) : ''} · {r.file_urls?.length || 0} file(s)</div>
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-105"
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
