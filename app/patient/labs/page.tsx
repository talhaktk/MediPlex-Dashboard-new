'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, Scan, Calendar, FileText, ExternalLink, ChevronDown, ChevronUp, TrendingUp, Clock, Eye, X, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url); }
function isPdf(url: string)   { return /\.pdf(\?|$)/i.test(url); }

const FLAG: Record<string, { bg: string; border: string; color: string; label: string }> = {
  normal:        { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', label: 'Normal' },
  high:          { bg: '#fefce8', border: '#fde047', color: '#a16207', label: '↑ HIGH' },
  low:           { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: '↓ LOW' },
  critical_high: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', label: '🔴 CRITICAL HIGH' },
  critical_low:  { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', label: '🔴 CRITICAL LOW' },
};

const TREND_TESTS = ['Hemoglobin', 'Hb', 'HbA1c', 'Fasting Blood Sugar', 'FBS', 'RBS', 'Total Cholesterol', 'TSH', 'Creatinine', 'WBC', 'Platelets', 'CRP', 'Vitamin D', 'Ferritin', 'ALT'];

export default function PatientLabs() {
  const [orders,       setOrders]       = useState<any[]>([]);
  const [resultValues, setResultValues] = useState<any[]>([]);
  const [legacy,       setLegacy]       = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeOrder,  setActiveOrder]  = useState<string | null>(null);
  const [view,         setView]         = useState<'orders' | 'trends'>('orders');
  const [lightbox,     setLightbox]     = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/patient/labs')
      .then(r => r.json())
      .then(d => {
        setOrders(d.orders || []);
        setResultValues(d.resultValues || []);
        setLegacy(d.legacyResults || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const resultsForOrder = (orderId: string) => resultValues.filter(r => r.order_id === orderId);

  const uploadUrl = (token: string) => `${window.location.origin}/lab-upload/${token}`;

  // Trend data
  const trendData = (() => {
    const map: Record<string, { date: string; value: number }[]> = {};
    resultValues.forEach(r => {
      if (r.value === null || !TREND_TESTS.some(t => r.test_name.toLowerCase().includes(t.toLowerCase()))) return;
      if (!map[r.test_name]) map[r.test_name] = [];
      map[r.test_name].push({ date: r.created_at.slice(0, 10), value: r.value });
    });
    return map;
  })();

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-7 h-7 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.88)' }} onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white opacity-70 hover:opacity-100 z-10" onClick={() => setLightbox(null)}>
            <X size={28} />
          </button>
          <img src={lightbox} alt="Report" className="max-w-full max-h-full rounded-xl"
            style={{ maxHeight: '90vh', maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0a1628]">Labs & Reports</h1>
          <p className="text-slate-500 text-sm">Your test orders, results, and trend graphs</p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
          {(['orders', 'trends'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{ background: view === v ? '#fff' : 'transparent', color: view === v ? '#0a1628' : '#64748b', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {v === 'orders' ? <><FlaskConical size={11} className="inline mr-1" />Orders</> : <><TrendingUp size={11} className="inline mr-1" />Trends</>}
            </button>
          ))}
        </div>
      </div>

      {/* Orders view */}
      {view === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 && legacy.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl" style={{ border: '1px solid #e2e8f0' }}>
              <FlaskConical size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">No lab orders on file</p>
              <p className="text-slate-400 text-sm mt-1">Your doctor's orders will appear here</p>
            </div>
          ) : (
            <>
              {orders.map(order => {
                const isOpen   = activeOrder === order.id;
                const results  = resultsForOrder(order.id);
                const abnormal = results.filter(r => r.flag !== 'normal');
                const expired  = new Date(order.qr_expires_at) < new Date();
                const isPending = order.status === 'pending';

                return (
                  <div key={order.id} className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <button onClick={() => setActiveOrder(isOpen ? null : order.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: order.order_type === 'radiology' ? '#eff6ff' : '#f0fdf4' }}>
                        {order.order_type === 'radiology'
                          ? <Scan size={18} className="text-blue-500" />
                          : <FlaskConical size={18} className="text-emerald-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#0a1628] font-semibold text-sm">
                            {(order.tests as any[]).slice(0, 3).map((t: any) => t.name).join(', ')}
                            {order.tests.length > 3 && ` +${order.tests.length - 3} more`}
                          </span>
                          {abnormal.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
                              ⚠️ {abnormal.length} abnormal
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-slate-400 text-xs flex items-center gap-1">
                            <Calendar size={10} />{new Date(order.ordered_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: order.status === 'complete' ? '#dcfce7' : '#fef9c3', color: order.status === 'complete' ? '#15803d' : '#a16207' }}>
                            {order.status === 'complete' ? '✓ Results Ready' : 'Awaiting Results'}
                          </span>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid #f1f5f9' }}>

                        {/* QR + test names side by side — patient shows at lab */}
                        {isPending && !expired && (
                          <div className="mt-3 p-4 rounded-2xl bg-slate-50 flex gap-4 items-start" style={{ border: '1px solid #e2e8f0' }}>
                            <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                              <div className="p-2 bg-white rounded-xl" style={{ border: '1px solid #e2e8f0' }}>
                                <QRCodeSVG value={uploadUrl(order.qr_token)} size={90} level="M" />
                              </div>
                              <p className="text-slate-400 text-[9px] text-center">Show at lab</p>
                              <p className="text-slate-400 text-[9px] flex items-center gap-0.5">
                                <Clock size={8} />Exp {new Date(order.qr_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#0a1628] font-semibold text-sm mb-1">
                                {order.order_type === 'radiology' ? '🔬 Studies Ordered' : '🧪 Tests Ordered'}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {(order.tests as any[]).map((t: any) => (
                                  <span key={t.name} className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                                    style={{ background: order.order_type === 'radiology' ? '#dbeafe' : '#dcfce7', color: order.order_type === 'radiology' ? '#1e40af' : '#15803d' }}>
                                    {t.name}
                                  </span>
                                ))}
                              </div>
                              <p className="text-slate-500 text-xs mt-2">The lab scans this QR to upload your results directly to your record.</p>
                            </div>
                          </div>
                        )}

                        {/* Result values */}
                        {results.length > 0 && (
                          <div className="space-y-2 mt-2">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Your Results</p>
                            {results.map(r => {
                              const fs = FLAG[r.flag] || FLAG.normal;
                              return (
                                <div key={r.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                                  style={{ background: fs.bg, border: `1px solid ${fs.border}` }}>
                                  <div>
                                    <span className="text-[#0a1628] text-sm font-medium">{r.test_name}</span>
                                    {r.reference_low !== null && r.reference_high !== null && (
                                      <span className="text-slate-400 text-xs ml-2">Normal: {r.reference_low}–{r.reference_high} {r.unit}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[#0a1628] font-bold text-sm font-mono">{r.value_text} {r.unit}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: fs.color, background: `${fs.color}18` }}>{fs.label}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {order.clinical_notes && (
                          <p className="text-slate-400 text-xs italic">Doctor's note: {order.clinical_notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Legacy uploaded files */}
              {legacy.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-2 px-1">Uploaded Reports</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {legacy.map(l => (
                      <div key={l.id} className="bg-white rounded-2xl p-4" style={{ border: '1px solid #e2e8f0' }}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fef9c3' }}>
                            <FileText size={16} className="text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#0a1628] text-sm truncate">{l.test_name}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{l.visit_date || l.uploaded_at?.slice(0, 10)}</p>
                            {l.has_abnormal && <span className="text-[10px] text-red-500 font-semibold">⚠️ Abnormal values</span>}
                            {l.notes && <p className="text-slate-600 text-xs mt-1.5 line-clamp-2">{l.notes}</p>}
                            {(l.file_urls || []).length > 0 && (
                              <div className="mt-3 space-y-2">
                                {/* Image thumbnails */}
                                {(l.file_urls as string[]).some(isImage) && (
                                  <div className="flex flex-wrap gap-2">
                                    {(l.file_urls as string[]).filter(isImage).map((url, i) => (
                                      <button key={i} onClick={() => setLightbox(url)}
                                        className="relative group rounded-lg overflow-hidden"
                                        style={{ width: 72, height: 72, border: '1px solid #e2e8f0' }}>
                                        <img src={url} alt={`${l.test_name} ${i + 1}`}
                                          className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                          style={{ background: 'rgba(0,0,0,0.45)' }}>
                                          <Eye size={18} className="text-white" />
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {/* PDF / other file links */}
                                {(l.file_urls as string[]).filter(u => !isImage(u)).map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                                    style={{ background: isPdf(url) ? '#fef2f2' : '#fef9c3', color: isPdf(url) ? '#dc2626' : '#a16207', border: `1px solid ${isPdf(url) ? '#fecaca' : '#fde047'}` }}>
                                    <FileText size={13} />
                                    {isPdf(url) ? 'View PDF' : 'Open File'}
                                    {(l.file_urls as string[]).filter(u => !isImage(u)).length > 1 ? ` ${i + 1}` : ''}
                                    <Download size={11} className="ml-auto" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Trends view */}
      {view === 'trends' && (
        <div className="space-y-4">
          {Object.entries(trendData).filter(([, pts]) => pts.length >= 2).length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl" style={{ border: '1px solid #e2e8f0' }}>
              <TrendingUp size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">No trend data yet</p>
              <p className="text-slate-400 text-sm mt-1">Trend graphs appear after 2+ results for the same test</p>
            </div>
          ) : Object.entries(trendData).map(([testName, points]) => {
            if (points.length < 2) return null;
            const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
            return (
              <div key={testName} className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e2e8f0' }}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[#0a1628] font-semibold">{testName}</h4>
                  <span className="text-slate-400 text-xs">{points.length} readings</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={sorted} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickFormatter={d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={35} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                      labelFormatter={d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                    <Line type="monotone" dataKey="value" stroke="#c9a84c" strokeWidth={2.5} dot={{ fill: '#c9a84c', r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
