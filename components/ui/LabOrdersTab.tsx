'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Plus, FlaskConical, Scan, Clock, ChevronDown, ChevronUp,
  Printer, X, Loader2, TrendingUp, MessageCircle, Mail, Copy,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

const LAB_TESTS: Record<string, string[]> = {
  'CBC':          ['Hemoglobin', 'WBC', 'Platelets', 'Hematocrit', 'MCV', 'MCH', 'MCHC', 'Neutrophils', 'Lymphocytes', 'Eosinophils', 'Monocytes'],
  'LFT':          ['ALT', 'AST', 'ALP', 'GGT', 'Total Bilirubin', 'Direct Bilirubin', 'Albumin', 'Total Protein'],
  'RFT':          ['Creatinine', 'BUN', 'Urea', 'Uric Acid', 'eGFR'],
  'Blood Sugar':  ['Fasting Blood Sugar', 'RBS', 'PPBS', 'HbA1c'],
  'Lipids':       ['Total Cholesterol', 'LDL', 'HDL', 'Triglycerides'],
  'Electrolytes': ['Sodium', 'Potassium', 'Chloride', 'Calcium', 'Magnesium', 'Phosphorus'],
  'Thyroid':      ['TSH', 'T3', 'T4', 'Free T4', 'Free T3'],
  'Iron Studies': ['Serum Iron', 'TIBC', 'Ferritin'],
  'Inflammation': ['CRP', 'ESR'],
  'Coagulation':  ['PT', 'INR', 'APTT'],
  'Vitamins':     ['Vitamin D', 'Vitamin B12', 'Folate'],
};

const RADIOLOGY_TESTS: Record<string, string[]> = {
  'X-Ray':      ['Chest X-Ray', 'Abdomen X-Ray', 'Spine X-Ray', 'Wrist X-Ray', 'Knee X-Ray', 'Skull X-Ray'],
  'Ultrasound': ['Abdominal Ultrasound', 'Pelvic Ultrasound', 'Renal Ultrasound', 'Thyroid Ultrasound', 'Neck Ultrasound'],
  'Echo':       ['Echocardiography', '2D Echo', 'Doppler Echo'],
  'CT Scan':    ['CT Chest', 'CT Abdomen', 'CT Head', 'CT Spine', 'CT KUB', 'CT Angiography'],
  'MRI':        ['MRI Brain', 'MRI Spine', 'MRI Knee', 'MRI Shoulder', 'MRI Abdomen', 'MRI Pelvis'],
};

const FLAG: Record<string, { bg: string; color: string; label: string }> = {
  normal:        { bg: '#dcfce7',   color: '#16a34a', label: 'Normal' },
  high:          { bg: '#fef9c3',   color: '#a16207', label: '↑ HIGH' },
  low:           { bg: '#dbeafe',   color: '#1d4ed8', label: '↓ LOW' },
  critical_high: { bg: '#fee2e2',   color: '#dc2626', label: '🔴 CRIT HIGH' },
  critical_low:  { bg: '#fee2e2',   color: '#dc2626', label: '🔴 CRIT LOW' },
};

const TREND_TESTS = ['Hemoglobin', 'Hb', 'HbA1c', 'Fasting Blood Sugar', 'FBS', 'RBS', 'Total Cholesterol', 'TSH', 'Creatinine', 'WBC', 'Platelets', 'CRP', 'Vitamin D', 'Ferritin', 'ALT'];

interface LabOrder {
  id: string; mr_number: string; patient_name: string; order_type: string;
  tests: { name: string; category: string }[];
  clinical_notes: string; ordered_by: string; ordered_at: string;
  qr_token: string; qr_expires_at: string; status: string;
}
interface ResultValue {
  id: string; test_name: string; value: number | null; value_text: string;
  unit: string; reference_low: number | null; reference_high: number | null;
  flag: string; created_at: string;
}

interface Props {
  mrNumber:    string;
  patientName: string;
  phone?:      string;
  clinicId?:   string;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function LabOrdersTab({ mrNumber, patientName, phone, clinicId }: Props) {
  const [orders,      setOrders]      = useState<LabOrder[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [activeOrder, setActiveOrder] = useState<string | null>(null);
  const [resultMap,   setResultMap]   = useState<Record<string, ResultValue[]>>({});
  const [view,        setView]        = useState<'orders' | 'trends'>('orders');

  const [orderType,  setOrderType]  = useState<'lab' | 'radiology'>('lab');
  const [selected,   setSelected]   = useState<{ name: string; category: string }[]>([]);
  const [notes,      setNotes]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newOrder,   setNewOrder]   = useState<{ qrToken: string; expiresAt: string } | null>(null);

  const catalogue = orderType === 'lab' ? LAB_TESTS : RADIOLOGY_TESTS;

  const loadOrders = useCallback(async () => {
    const res = await fetch(`/api/lab/order?mr=${encodeURIComponent(mrNumber)}`);
    const { data } = await res.json();
    setOrders(data || []);
    setLoading(false);
  }, [mrNumber]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const loadResults = async (orderId: string) => {
    if (resultMap[orderId]) return;
    const sb = getSupabase();
    const { data } = await sb.from('lab_result_values').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    setResultMap(prev => ({ ...prev, [orderId]: data || [] }));
  };

  const toggleOrder = (id: string) => {
    const next = activeOrder === id ? null : id;
    setActiveOrder(next);
    if (next) loadResults(next);
  };

  const toggleTest = (name: string, category: string) =>
    setSelected(prev => prev.find(t => t.name === name) ? prev.filter(t => t.name !== name) : [...prev, { name, category }]);

  const selectGroup = (category: string, tests: string[]) => {
    const allSel = tests.every(t => selected.find(s => s.name === t));
    if (allSel) setSelected(prev => prev.filter(t => !tests.includes(t.name)));
    else setSelected(prev => [...prev, ...tests.filter(t => !prev.find(s => s.name === t)).map(name => ({ name, category }))]);
  };

  const submitOrder = async () => {
    if (!selected.length) { toast.error('Select at least one test'); return; }
    setSubmitting(true);
    const res = await fetch('/api/lab/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mrNumber, patientName, phone, orderType, tests: selected, clinicalNotes: notes }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { toast.error(data.error || 'Failed'); return; }
    setNewOrder({ qrToken: data.qrToken, expiresAt: data.expiresAt });
    toast.success('Order created!');
    await loadOrders();
  };

  const uploadUrl = (token: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/lab-upload/${token}` : `/lab-upload/${token}`;

  const shareWhatsApp = (token: string) => {
    const url = uploadUrl(token);
    const msg = encodeURIComponent(`Please upload lab results for ${patientName} using this secure link:\n${url}`);
    const wa  = phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(wa, '_blank');
  };

  const shareEmail = (token: string) => {
    const url = uploadUrl(token);
    const subject = encodeURIComponent(`Lab Results Upload — ${patientName}`);
    const body    = encodeURIComponent(`Please upload the lab results using this secure link:\n\n${url}\n\nThis link expires in 7 days.`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const printQr = (order: LabOrder) => {
    const url  = uploadUrl(order.qr_token);
    const tests = (order.tests as any[]).map(t => t.name).join(', ');
    const w = window.open('', '_blank')!;
    w.document.write(`<!DOCTYPE html><html><head><title>Lab Order QR</title>
    <style>body{font-family:Arial;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
    h2{color:#0a1628;margin-bottom:4px}p{color:#666;font-size:13px;margin:2px 0}img{margin:16px 0;border:1px solid #e5e7eb;padding:10px;border-radius:8px}
    .url{font-size:10px;color:#aaa;word-break:break-all;max-width:280px}.tests{font-size:11px;color:#444;margin-bottom:4px}
    button{margin-top:16px;padding:10px 28px;background:#0a1628;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px}
    @media print{button{display:none}}</style></head>
    <body><h2>MediPlex Lab Order</h2>
    <p>Patient: <strong>${patientName}</strong> · MR: ${mrNumber}</p>
    <p class="tests">${tests}</p>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}" width="220" height="220" />
    <p class="url">${url}</p>
    <button onclick="window.print()">Print</button></body></html>`);
    w.document.close();
  };

  // Trend data
  const trendData = (() => {
    const all = Object.values(resultMap).flat();
    const map: Record<string, { date: string; value: number }[]> = {};
    all.forEach(r => {
      if (r.value === null || !TREND_TESTS.some(t => r.test_name.toLowerCase().includes(t.toLowerCase()))) return;
      if (!map[r.test_name]) map[r.test_name] = [];
      map[r.test_name].push({ date: r.created_at.slice(0, 10), value: r.value });
    });
    return map;
  })();

  const stBadge: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: '#fef9c3', color: '#a16207', label: 'Awaiting' },
    complete: { bg: '#dcfce7', color: '#15803d', label: '✓ Received' },
    partial:  { bg: '#dbeafe', color: '#1d4ed8', label: 'Partial' },
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
          {(['orders', 'trends'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{ background: view === v ? '#fff' : 'transparent', color: view === v ? '#0a1628' : '#64748b', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {v === 'orders' ? <><FlaskConical size={11} className="inline mr-1" />Orders</> : <><TrendingUp size={11} className="inline mr-1" />Trends</>}
            </button>
          ))}
        </div>
        {view === 'orders' && (
          <button onClick={() => { setShowForm(true); setNewOrder(null); setSelected([]); setNotes(''); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#0a1628,#142240)' }}>
            <Plus size={13} /> New Order
          </button>
        )}
      </div>

      {/* Order Form */}
      {showForm && view === 'orders' && (
        <div className="rounded-2xl p-5 space-y-4 bg-white" style={{ border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-[#0a1628] font-semibold text-sm">New {orderType === 'lab' ? 'Lab' : 'Radiology'} Order</h3>
            <button onClick={() => { setShowForm(false); setNewOrder(null); }} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
          </div>

          {/* Type toggle */}
          <div className="flex gap-2">
            {(['lab', 'radiology'] as const).map(t => (
              <button key={t} onClick={() => { setOrderType(t); setSelected([]); }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                style={{ background: orderType === t ? (t === 'lab' ? '#dcfce7' : '#dbeafe') : '#f8fafc', color: orderType === t ? (t === 'lab' ? '#15803d' : '#1d4ed8') : '#64748b', border: `1px solid ${orderType === t ? (t === 'lab' ? '#bbf7d0' : '#bfdbfe') : '#e2e8f0'}` }}>
                {t === 'lab' ? <><FlaskConical size={11} className="inline mr-1" />Lab</> : <><Scan size={11} className="inline mr-1" />Radiology</>}
              </button>
            ))}
          </div>

          {!newOrder ? (
            <>
              {/* Test grid */}
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {Object.entries(catalogue).map(([cat, tests]) => {
                  const allSel = tests.every(t => selected.find(s => s.name === t));
                  return (
                    <div key={cat}>
                      <button onClick={() => selectGroup(cat, tests)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg mb-1 text-left"
                        style={{ background: allSel ? '#fef9c3' : '#f8fafc', border: `1px solid ${allSel ? '#fde047' : '#e2e8f0'}` }}>
                        <span className="text-xs font-bold" style={{ color: allSel ? '#a16207' : '#475569' }}>{cat}</span>
                        <span className="text-[10px] text-slate-400">Select all</span>
                      </button>
                      <div className="flex flex-wrap gap-1.5 pl-2">
                        {tests.map(t => {
                          const sel = !!selected.find(s => s.name === t);
                          return (
                            <button key={t} onClick={() => toggleTest(t, cat)}
                              className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
                              style={{ background: sel ? '#0a1628' : '#f1f5f9', color: sel ? '#c9a84c' : '#475569', border: `1px solid ${sel ? '#0a1628' : '#e2e8f0'}` }}>
                              {sel ? '✓ ' : ''}{t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected summary */}
              {selected.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50" style={{ border: '1px solid #fde68a' }}>
                  <span className="text-[10px] text-amber-600 font-bold uppercase block mb-1">Selected ({selected.length})</span>
                  <div className="flex flex-wrap gap-1">
                    {selected.map(t => (
                      <span key={t.name} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                        {t.name} <button onClick={() => toggleTest(t.name, t.category)} className="ml-0.5 opacity-60">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Clinical notes (optional)..." rows={2}
                className="w-full rounded-xl px-4 py-2.5 text-xs outline-none resize-none border bg-white text-slate-700"
                style={{ borderColor: '#e2e8f0' }} />

              <button onClick={submitOrder} disabled={submitting || !selected.length}
                className="w-full rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 text-white"
                style={{ background: 'linear-gradient(135deg,#0a1628,#142240)' }}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : 'Create Order & Generate QR'}
              </button>
            </>
          ) : (
            /* QR display */
            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-2xl inline-block" style={{ border: '1px solid #e2e8f0' }}>
                <QRCodeSVG value={uploadUrl(newOrder.qrToken)} size={160} level="M" />
              </div>
              <div>
                <p className="text-slate-600 text-xs">Share this QR with the lab / radiology dept</p>
                <p className="text-slate-400 text-[10px] mt-0.5 flex items-center justify-center gap-1">
                  <Clock size={10} />Expires {new Date(newOrder.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              {/* Share buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => shareWhatsApp(newOrder.qrToken)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white"
                  style={{ background: '#25d366' }}>
                  <MessageCircle size={13} /> WhatsApp
                </button>
                <button onClick={() => shareEmail(newOrder.qrToken)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: '#f1f5f9', color: '#0a1628' }}>
                  <Mail size={13} /> Email
                </button>
                <button onClick={() => printQr(orders.find(o => o.qr_token === newOrder.qrToken) || orders[0])}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: '#f1f5f9', color: '#0a1628' }}>
                  <Printer size={13} /> Print QR
                </button>
                <button onClick={() => { navigator.clipboard.writeText(uploadUrl(newOrder.qrToken)); toast.success('Link copied!'); }}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: '#f1f5f9', color: '#0a1628' }}>
                  <Copy size={13} /> Copy Link
                </button>
              </div>
              <button onClick={() => { setShowForm(false); setNewOrder(null); }} className="text-slate-400 hover:text-slate-600 text-xs">Done</button>
            </div>
          )}
        </div>
      )}

      {/* Order list */}
      {view === 'orders' && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 rounded-2xl bg-white" style={{ border: '1px solid #e2e8f0' }}>
              <FlaskConical size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-slate-500 text-sm font-medium">No lab orders yet</p>
              <p className="text-slate-400 text-xs mt-1">Click "New Order" to order labs or radiology</p>
            </div>
          ) : orders.map(order => {
            const isOpen    = activeOrder === order.id;
            const results   = resultMap[order.id] || [];
            const abnormals = results.filter(r => r.flag !== 'normal');
            const expired   = new Date(order.qr_expires_at) < new Date();
            const st        = stBadge[order.status] || stBadge.pending;
            return (
              <div key={order.id} className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #e2e8f0' }}>
                <button onClick={() => toggleOrder(order.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: order.order_type === 'radiology' ? '#dbeafe' : '#dcfce7' }}>
                    {order.order_type === 'radiology' ? <Scan size={14} className="text-blue-600" /> : <FlaskConical size={14} className="text-emerald-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#0a1628] text-xs font-semibold">
                        {(order.tests as any[]).slice(0,4).map((t: any) => t.name).join(', ')}
                        {order.tests.length > 4 && ` +${order.tests.length - 4}`}
                      </span>
                      {abnormals.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
                          ⚠️ {abnormals.length} abnormal
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-slate-400 text-[10px]">{new Date(order.ordered_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      {expired && order.status === 'pending' && <span className="text-[10px] text-red-400">QR expired</span>}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid #f1f5f9' }}>

                    {/* QR for pending orders */}
                    {order.status === 'pending' && !expired && (
                      <div className="flex items-center gap-4 p-3 rounded-xl mt-3 bg-slate-50" style={{ border: '1px solid #e2e8f0' }}>
                        <div className="p-2 bg-white rounded-lg flex-shrink-0" style={{ border: '1px solid #e2e8f0' }}>
                          <QRCodeSVG value={uploadUrl(order.qr_token)} size={72} level="M" />
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-600 text-xs mb-1">Share for lab result upload</p>
                          <p className="text-slate-400 text-[10px]">Exp: {new Date(order.qr_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            <button onClick={() => shareWhatsApp(order.qr_token)}
                              className="text-[10px] px-2 py-1 rounded-lg font-semibold text-white flex items-center gap-1"
                              style={{ background: '#25d366' }}>
                              <MessageCircle size={9} /> WhatsApp
                            </button>
                            <button onClick={() => shareEmail(order.qr_token)}
                              className="text-[10px] px-2 py-1 rounded-lg text-slate-600 flex items-center gap-1 bg-white border border-slate-200">
                              <Mail size={9} /> Email
                            </button>
                            <button onClick={() => printQr(order)}
                              className="text-[10px] px-2 py-1 rounded-lg text-slate-600 flex items-center gap-1 bg-white border border-slate-200">
                              <Printer size={9} /> Print
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    {results.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Results</p>
                        {results.map(r => {
                          const fs = FLAG[r.flag] || FLAG.normal;
                          return (
                            <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                              style={{ background: fs.bg, border: `1px solid ${fs.color}33` }}>
                              <div>
                                <span className="text-[#0a1628] text-xs font-medium">{r.test_name}</span>
                                {r.reference_low !== null && r.reference_high !== null && (
                                  <span className="text-slate-400 text-[10px] ml-2">ref: {r.reference_low}–{r.reference_high} {r.unit}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[#0a1628] text-xs font-mono">{r.value_text} {r.unit}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ color: fs.color }}>{fs.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {order.clinical_notes && <p className="text-slate-400 text-xs italic">{order.clinical_notes}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Trend charts */}
      {view === 'trends' && (
        <div className="space-y-4">
          {Object.entries(trendData).filter(([, pts]) => pts.length >= 2).length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-white" style={{ border: '1px solid #e2e8f0' }}>
              <TrendingUp size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-slate-500 text-sm">No trend data yet</p>
              <p className="text-slate-400 text-xs mt-1">Appears after 2+ numeric results for the same test</p>
            </div>
          ) : Object.entries(trendData).map(([testName, points]) => {
            if (points.length < 2) return null;
            const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
            return (
              <div key={testName} className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #e2e8f0' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[#0a1628] text-sm font-semibold">{testName}</h4>
                  <span className="text-slate-400 text-xs">{points.length} readings</span>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={sorted} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickFormatter={d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={35} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                      labelFormatter={d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                    <Line type="monotone" dataKey="value" stroke="#c9a84c" strokeWidth={2} dot={{ fill: '#c9a84c', r: 4 }} activeDot={{ r: 6 }} />
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
