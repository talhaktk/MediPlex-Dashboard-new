'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, X, Plus, Loader2 } from 'lucide-react';

interface OrderInfo {
  orderId:      string;
  patientName:  string;
  orderType:    'lab' | 'radiology';
  tests:        { name: string; category: string }[];
  clinicalNotes:string;
  status:       string;
  expiresAt:    string;
  hasDob:       boolean;
}

interface ResultRow { testName: string; value: string; unit: string; }

export default function UploadClient({ token }: { token: string }) {
  const [order,      setOrder]      = useState<OrderInfo | null>(null);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [step,       setStep]       = useState<'dob' | 'upload' | 'done'>('dob');
  const [dob,        setDob]        = useState('');
  const [verifying,  setVerifying]  = useState(false);
  const [files,      setFiles]      = useState<File[]>([]);
  const [results,    setResults]    = useState<ResultRow[]>([]);
  const [reportText, setReportText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadRes,  setUploadRes]  = useState<{ filesUploaded: number; resultValues: number; hasAbnormal: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/lab/upload?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setOrder(d);
        setLoading(false);
        // Pre-fill result rows with the ordered tests
        if (d.orderType === 'lab' && d.tests?.length) {
          setResults(d.tests.map((t: any) => ({ testName: t.name, value: '', unit: '' })));
        }
        // Skip DOB step if not required
        if (!d.hasDob) setStep('upload');
      })
      .catch(() => { setError('Failed to load order. Please check your link.'); setLoading(false); });
  }, [token]);

  const handleVerifyDob = async () => {
    if (!dob) return;
    setVerifying(true);
    // DOB verification happens on submit — just proceed to upload step
    setStep('upload');
    setVerifying(false);
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
  };

  const handleSubmit = async () => {
    if (!order) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append('token', token);
    if (dob) fd.append('dob', dob);
    const filledResults = results.filter(r => r.value.trim() !== '');
    if (filledResults.length > 0) fd.append('results', JSON.stringify(filledResults));
    if (reportText.trim()) fd.append('reportText', reportText.trim());
    files.forEach(f => fd.append('files', f));

    const res  = await fetch('/api/lab/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || 'Upload failed'); return; }
    setUploadRes(data);
    setStep('done');
  };

  const inp  = "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all";
  const iStyle: React.CSSProperties = { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b' };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0a1628 0%,#142240 100%)' }}>
      <div className="w-8 h-8 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
    </div>
  );

  if (error && step !== 'done') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg,#0a1628 0%,#142240 100%)' }}>
      <div className="text-center max-w-sm">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
        <h2 className="text-white font-bold text-xl mb-2">Link Error</h2>
        <p className="text-white/60 text-sm">{error}</p>
      </div>
    </div>
  );

  if (step === 'done') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg,#0a1628 0%,#142240 100%)' }}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)' }}>
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <h2 className="text-white font-bold text-2xl mb-2">Results Uploaded!</h2>
        <p className="text-white/50 text-sm mb-4">The doctor has been notified and results are now attached to the patient record.</p>
        {uploadRes?.hasAbnormal && (
          <div className="rounded-xl p-3 mb-4 text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            ⚠️ Abnormal values were detected. The doctor will review them.
          </div>
        )}
        <div className="flex gap-3 justify-center text-white/40 text-xs">
          {uploadRes?.filesUploaded ? <span>✓ {uploadRes.filesUploaded} file(s) uploaded</span> : null}
          {uploadRes?.resultValues  ? <span>✓ {uploadRes.resultValues} test values recorded</span> : null}
        </div>
        <p className="text-white/25 text-xs mt-6">You may close this tab.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: 'linear-gradient(135deg,#0a1628 0%,#142240 100%)' }}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
            <span className="text-[#0a1628] font-bold text-xl">M+</span>
          </div>
          <h1 className="text-white font-bold text-2xl">MediPlex Lab Portal</h1>
          <p className="text-white/40 text-sm mt-1">Secure result upload for {order?.patientName}</p>
        </div>

        {/* Order info card */}
        {order && (
          <div className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg"
                style={{ background: order.orderType === 'radiology' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)', color: order.orderType === 'radiology' ? '#60a5fa' : '#34d399' }}>
                {order.orderType === 'radiology' ? 'Radiology Order' : 'Lab Order'}
              </span>
              <span className="text-white/30 text-xs">Expires {new Date(order.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {order.tests.map((t, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                  {t.name}
                </span>
              ))}
            </div>
            {order.clinicalNotes && (
              <p className="text-white/30 text-xs mt-3 italic">Note: {order.clinicalNotes}</p>
            )}
          </div>
        )}

        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Step: DOB verification */}
          {step === 'dob' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white font-semibold mb-1">Verify Identity</h2>
                <p className="text-white/40 text-sm">Please enter the patient's date of birth to continue.</p>
              </div>
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest block mb-1.5">Date of Birth</label>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                  className={inp} style={iStyle} />
              </div>
              <button onClick={handleVerifyDob} disabled={!dob || verifying}
                className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}>
                {verifying ? 'Verifying…' : 'Continue →'}
              </button>
            </div>
          )}

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-white font-semibold mb-1">Upload Results</h2>
                <p className="text-white/40 text-sm">Enter test values and/or attach report files.</p>
              </div>

              {/* Result values */}
              {order?.orderType === 'lab' && results.length > 0 && (
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-widest block mb-2">Test Values</label>
                  <div className="space-y-2">
                    {results.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-white/60 text-xs w-36 flex-shrink-0 truncate">{r.testName}</span>
                        <input value={r.value} onChange={e => setResults(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                          placeholder="Value" className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={iStyle} />
                        <input value={r.unit} onChange={e => setResults(prev => prev.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                          placeholder="Unit" className="w-16 rounded-lg px-2 py-2 text-xs outline-none" style={iStyle} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Radiologist / report text */}
              {order?.orderType === 'radiology' && (
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-widest block mb-1.5">Radiologist Report</label>
                  <textarea value={reportText} onChange={e => setReportText(e.target.value)}
                    rows={5} placeholder="Type the radiologist's findings here..."
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={iStyle} />
                </div>
              )}

              {/* File upload */}
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest block mb-1.5">
                  Attach Files (PDF, Images)
                </label>
                <div className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer"
                  style={{ borderColor: 'rgba(255,255,255,0.12)' }}
                  onClick={() => fileRef.current?.click()}>
                  <Upload size={24} className="mx-auto mb-2 text-white/30" />
                  <p className="text-white/40 text-sm">Click to attach files</p>
                  <p className="text-white/20 text-xs mt-0.5">PDF, JPG, PNG — max 10MB each</p>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.tiff,.dcm"
                    onChange={handleFileAdd} className="hidden" />
                </div>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <FileText size={12} className="text-white/40 flex-shrink-0" />
                        <span className="text-white/60 text-xs flex-1 truncate">{f.name}</span>
                        <span className="text-white/30 text-[10px]">{(f.size/1024).toFixed(0)}KB</span>
                        <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                          className="text-white/30 hover:text-red-400">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  <AlertCircle size={13} /> {error}
                </div>
              )}

              <button onClick={handleSubmit} disabled={submitting || (files.length === 0 && results.every(r => !r.value.trim()) && !reportText.trim())}
                className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}>
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : 'Submit Results'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-5">Powered by MediPlex · Secure encrypted upload</p>
      </div>
    </div>
  );
}
