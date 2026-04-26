'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Plus, FlaskConical, Scan, Clock, CheckCircle2, AlertTriangle, ChevronDown,
  ChevronUp, Download, Printer, X, Loader2, TrendingUp, FileText, Image as ImageIcon,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import toast from 'react-hot-toast';

// ── Test catalogue ────────────────────────────────────────────────────────────
const LAB_TESTS = {
  'CBC': ['Hemoglobin', 'WBC', 'Platelets', 'Hematocrit', 'MCV', 'MCH', 'MCHC', 'Neutrophils', 'Lymphocytes', 'Eosinophils', 'Monocytes'],
  'LFT': ['ALT', 'AST', 'ALP', 'GGT', 'Total Bilirubin', 'Direct Bilirubin', 'Albumin', 'Total Protein'],
  'RFT': ['Creatinine', 'BUN', 'Urea', 'Uric Acid', 'eGFR'],
  'Blood Sugar': ['Fasting Blood Sugar', 'RBS', 'PPBS', 'HbA1c'],
  'Lipids': ['Total Cholesterol', 'LDL', 'HDL', 'Triglycerides'],
  'Electrolytes': ['Sodium', 'Potassium', 'Chloride', 'Bicarbonate', 'Calcium', 'Magnesium', 'Phosphorus'],
  'Thyroid': ['TSH', 'T3', 'T4', 'Free T4', 'Free T3'],
  'Iron Studies': ['Serum Iron', 'TIBC', 'Ferritin'],
  'Inflammation': ['CRP', 'ESR'],
  'Coagulation': ['PT', 'INR', 'APTT'],
  'Cardiac': ['Troponin I', 'CK-MB'],
  'Vitamins': ['Vitamin D', 'Vitamin B12', 'Folate'],
  'Urine R/E': ['Urine Protein', 'Urine Creatinine'],
};

const RADIOLOGY_TESTS = {
  'X-Ray':     ['Chest X-Ray', 'Abdomen X-Ray', 'Spine X-Ray', 'Wrist X-Ray', 'Knee X-Ray', 'Hip X-Ray', 'Skull X-Ray', 'Hand X-Ray', 'Foot X-Ray'],
  'Ultrasound':['Abdominal Ultrasound', 'Pelvic Ultrasound', 'Renal Ultrasound', 'Liver Ultrasound', 'Thyroid Ultrasound', 'Neck Ultrasound', 'Scrotal Ultrasound'],
  'Echo':      ['Echocardiography', '2D Echo', 'Doppler Echo', 'Fetal Echo'],
  'CT Scan':   ['CT Chest', 'CT Abdomen', 'CT Head', 'CT Spine', 'CT Pelvis', 'CT Neck', 'CT KUB', 'CT Angiography'],
  'MRI':       ['MRI Brain', 'MRI Spine', 'MRI Knee', 'MRI Shoulder', 'MRI Abdomen', 'MRI Pelvis', 'MRI Chest', 'MRI Wrist'],
};

// ── Flag colours ──────────────────────────────────────────────────────────────
const FLAG_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  normal:        { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', label: 'Normal' },
  high:          { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', label: '↑ HIGH' },
  low:           { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', label: '↓ LOW' },
  critical_high: { bg: 'rgba(239,68,68,0.2)',   color: '#f87171', label: '🔴 CRITICAL HIGH' },
  critical_low:  { bg: 'rgba(239,68,68,0.2)',   color: '#f87171', label: '🔴 CRITICAL LOW' },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface LabOrder {
  id: string; mr_number: string; patient_name: string; order_type: string;
  tests: { name: string; category: string }[];
  clinical_notes: string; ordered_by: string; ordered_at: string;
  qr_token: string; qr_expires_at: string; status: string; clinic_id: string;
}

interface ResultValue {
  id: string; test_name: string; value: number | null; value_text: string;
  unit: string; reference_low: number | null; reference_high: number | null;
  flag: string; created_at: string;
}

interface Props {
  mrNumber:    string;
  patientName: string;
  dob?:        string;
  clinicId?:   string;
}

// ── TRENDABLE TESTS ───────────────────────────────────────────────────────────
const TREND_TESTS = ['Hemoglobin', 'Hb', 'HbA1c', 'Fasting Blood Sugar', 'FBS', 'RBS', 'Total Cholesterol', 'TSH', 'Creatinine', 'WBC', 'Platelets', 'CRP', 'Vitamin D', 'Ferritin', 'ALT', 'Sodium', 'Potassium'];

export default function LabOrdersTab({ mrNumber, patientName, dob, clinicId }: Props) {
  const [orders,      setOrders]      = useState<LabOrder[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [activeOrder, setActiveOrder] = useState<string | null>(null);
  const [resultMap,   setResultMap]   = useState<Record<string, ResultValue[]>>({});
  const [view,        setView]        = useState<'orders' | 'trends'>('orders');

  // New order form state
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
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await sb.from('lab_result_values').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    setResultMap(prev => ({ ...prev, [orderId]: data || [] }));
  };

  const toggleOrder = (id: string) => {
    const next = activeOrder === id ? null : id;
    setActiveOrder(next);
    if (next) loadResults(next);
  };

  const toggleTest = (name: string, category: string) => {
    setSelected(prev =>
      prev.find(t => t.name === name)
        ? prev.filter(t => t.name !== name)
        : [...prev, { name, category }]
    );
  };

  const selectGroup = (category: string, tests: string[]) => {
    const allSelected = tests.every(t => selected.find(s => s.name === t));
    if (allSelected) {
      setSelected(prev => prev.filter(t => !tests.includes(t.name)));
    } else {
      const toAdd = tests.filter(t => !selected.find(s => s.name === t)).map(name => ({ name, category }));
      setSelected(prev => [...prev, ...toAdd]);
    }
  };

  const submitOrder = async () => {
    if (!selected.length) { toast.error('Select at least one test'); return; }
    setSubmitting(true);
    const res  = await fetch('/api/lab/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mrNumber, patientName, dob, orderType, tests: selected, clinicalNotes: notes }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { toast.error(data.error || 'Failed to create order'); return; }
    setNewOrder({ qrToken: data.qrToken, expiresAt: data.expiresAt });
    toast.success('Order created!');
    await loadOrders();
  };

  const uploadUrl = (token: string) => `${window.location.origin}/lab-upload/${token}`;

  const printQr = (token: string) => {
    const url = uploadUrl(token);
    const w = window.open('', '_blank')!;
    w.document.write(`<!DOCTYPE html><html><head><title>Lab Order QR</title>
    <style>body{font-family:Arial;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
    h1{color:#0a1628;font-size:18px;margin-bottom:4px}.sub{color:#666;font-size:13px;margin-bottom:20px}
    img{border:1px solid #e5e7eb;padding:12px;border-radius:8px}.url{font-size:11px;color:#888;margin-top:12px;word-break:break-all;text-align:center;max-width:300px}
    @media print{button{display:none}}</style></head>
    <body><h1>MediPlex Lab Order</h1><div class="sub">Patient: ${patientName} · MR: ${mrNumber}</div>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}" />
    <div class="url">${url}</div>
    <button onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#0a1628;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Print</button>
    </body></html>`);
    w.document.close();
  };

  // Trend data aggregation
  const trendData = (() => {
    const allResults: ResultValue[] = Object.values(resultMap).flat();
    const byTest: Record<string, { date: string; value: number }[]> = {};
    allResults.forEach(r => {
      if (r.value === null || !TREND_TESTS.some(t => r.test_name.toLowerCase().includes(t.toLowerCase()))) return;
      if (!byTest[r.test_name]) byTest[r.test_name] = [];
      byTest[r.test_name].push({ date: r.created_at.slice(0, 10), value: r.value });
    });
    return byTest;
  })();

  const statusColor: Record<string, string> = {
    pending:  'rgba(245,158,11,0.15)',
    complete: 'rgba(16,185,129,0.15)',
    partial:  'rgba(59,130,246,0.15)',
  };
  const statusTextColor: Record<string, string> = {
    pending:  '#fbbf24',
    complete: '#34d399',
    partial:  '#60a5fa',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['orders', 'trends'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={{ background: view === v ? 'rgba(201,168,76,0.15)' : 'transparent', color: view === v ? '#c9a84c' : 'rgba(255,255,255,0.4)' }}>
              {v === 'orders' ? <><FlaskConical size={11} className="inline mr-1" />Orders</> : <><TrendingUp size={11} className="inline mr-1" />Trends</>}
            </button>
          ))}
        </div>
        {view === 'orders' && (
          <button onClick={() => { setShowForm(true); setNewOrder(null); setSelected([]); setNotes(''); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}>
            <Plus size={13} /> New Order
          </button>
        )}
      </div>

      {/* ── ORDER FORM ─────────────────────────────────────────────────────── */}
      {showForm && view === 'orders' && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">New {orderType === 'lab' ? 'Lab' : 'Radiology'} Order</h3>
            <button onClick={() => { setShowForm(false); setNewOrder(null); }} className="text-white/30 hover:text-white/60"><X size={14} /></button>
          </div>

          {/* Type toggle */}
          <div className="flex gap-2">
            {(['lab', 'radiology'] as const).map(t => (
              <button key={t} onClick={() => { setOrderType(t); setSelected([]); }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                style={{ background: orderType === t ? (t === 'lab' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)') : 'rgba(255,255,255,0.05)', color: orderType === t ? (t === 'lab' ? '#34d399' : '#60a5fa') : 'rgba(255,255,255,0.4)', border: `1px solid ${orderType === t ? (t === 'lab' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)') : 'rgba(255,255,255,0.08)'}` }}>
                {t === 'lab' ? <><FlaskConical size={11} className="inline mr-1" />Lab</> : <><Scan size={11} className="inline mr-1" />Radiology</>}
              </button>
            ))}
          </div>

          {/* Test selection */}
          {!newOrder ? (
            <>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {Object.entries(catalogue).map(([cat, tests]) => {
                  const allSel = tests.every(t => selected.find(s => s.name === t));
                  return (
                    <div key={cat}>
                      <button onClick={() => selectGroup(cat, tests)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left mb-1"
                        style={{ background: allSel ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${allSel ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                        <span className="text-xs font-semibold" style={{ color: allSel ? '#c9a84c' : 'rgba(255,255,255,0.6)' }}>{cat}</span>
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Select all</span>
                      </button>
                      <div className="flex flex-wrap gap-1.5 pl-2">
                        {tests.map(t => {
                          const sel = !!selected.find(s => s.name === t);
                          return (
                            <button key={t} onClick={() => toggleTest(t, cat)}
                              className="text-[11px] px-2.5 py-1 rounded-full transition-all"
                              style={{ background: sel ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)', color: sel ? '#c9a84c' : 'rgba(255,255,255,0.5)', border: `1px solid ${sel ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                              {sel ? '✓ ' : ''}{t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1 p-3 rounded-xl" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
                  <span className="text-[10px] text-white/40 w-full mb-1">Selected ({selected.length}):</span>
                  {selected.map(t => (
                    <span key={t.name} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }}>
                      {t.name} <button onClick={() => toggleTest(t.name, t.category)} className="ml-1 opacity-60 hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
              )}

              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Clinical notes (optional)..."
                rows={2}
                className="w-full rounded-xl px-4 py-2.5 text-xs outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />

              <button onClick={submitOrder} disabled={submitting || !selected.length}
                className="w-full rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : `Create Order & Generate QR`}
              </button>
            </>
          ) : (
            /* QR display */
            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-white rounded-2xl inline-block">
                  <QRCodeSVG value={uploadUrl(newOrder.qrToken)} size={180} level="M" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">Show this QR code to the lab / radiology department</p>
                  <p className="text-white/30 text-[10px] mt-1">
                    <Clock size={10} className="inline mr-1" />
                    Expires {new Date(newOrder.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => printQr(newOrder.qrToken)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                  <Printer size={12} /> Print QR
                </button>
                <button onClick={() => { navigator.clipboard.writeText(uploadUrl(newOrder.qrToken)); toast.success('Link copied!'); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                  <Download size={12} /> Copy Link
                </button>
              </div>
              <button onClick={() => { setShowForm(false); setNewOrder(null); }}
                className="text-white/30 hover:text-white/60 text-xs">
                Done
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ORDER LIST ─────────────────────────────────────────────────────── */}
      {view === 'orders' && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-white/30" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-white/25">
              <FlaskConical size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No lab orders yet</p>
              <p className="text-xs mt-1">Click "New Order" to order labs or radiology</p>
            </div>
          ) : (
            orders.map(order => {
              const isOpen    = activeOrder === order.id;
              const results   = resultMap[order.id] || [];
              const abnormals = results.filter(r => r.flag !== 'normal');
              const expired   = new Date(order.qr_expires_at) < new Date();
              return (
                <div key={order.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  <button onClick={() => toggleOrder(order.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    style={{ background: isOpen ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.03)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: order.order_type === 'radiology' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)' }}>
                      {order.order_type === 'radiology' ? <Scan size={14} className="text-blue-400" /> : <FlaskConical size={14} className="text-emerald-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/80 text-xs font-semibold">
                          {(order.tests as any[]).slice(0, 4).map((t: any) => t.name).join(', ')}
                          {order.tests.length > 4 && ` +${order.tests.length - 4}`}
                        </span>
                        {abnormals.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                            ⚠️ {abnormals.length} abnormal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white/30 text-[10px]">{new Date(order.ordered_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: statusColor[order.status] || 'rgba(255,255,255,0.08)', color: statusTextColor[order.status] || 'rgba(255,255,255,0.5)' }}>
                          {order.status === 'pending' ? 'Awaiting Results' : order.status === 'complete' ? '✓ Results Received' : 'Partial'}
                        </span>
                        {expired && order.status === 'pending' && (
                          <span className="text-[10px] text-red-400/60">QR expired</span>
                        )}
                      </div>
                    </div>
                    {!expired && order.status === 'pending' && (
                      <div className="flex-shrink-0 p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} onClick={e => { e.stopPropagation(); printQr(order.qr_token); }}>
                        <Printer size={12} className="text-white/40" />
                      </div>
                    )}
                    {isOpen ? <ChevronUp size={14} className="text-white/30 flex-shrink-0" /> : <ChevronDown size={14} className="text-white/30 flex-shrink-0" />}
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                      {/* QR (if pending and not expired) */}
                      {order.status === 'pending' && !expired && (
                        <div className="flex items-center gap-4 p-3 rounded-xl mt-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <div className="p-2 bg-white rounded-lg flex-shrink-0">
                            <QRCodeSVG value={uploadUrl(order.qr_token)} size={80} level="M" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/60 text-xs mb-1">Share this QR with the lab for result upload</p>
                            <p className="text-white/30 text-[10px]">
                              Expires {new Date(order.qr_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => printQr(order.qr_token)}
                                className="text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1"
                                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                                <Printer size={10} /> Print
                              </button>
                              <button onClick={() => { navigator.clipboard.writeText(uploadUrl(order.qr_token)); toast.success('Copied!'); }}
                                className="text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1"
                                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                                <Download size={10} /> Copy Link
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Results */}
                      {results.length > 0 ? (
                        <div className="space-y-1 mt-2">
                          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Results</p>
                          {results.map(r => {
                            const fs = FLAG_STYLE[r.flag] || FLAG_STYLE.normal;
                            return (
                              <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                                style={{ background: fs.bg, border: `1px solid ${fs.color}22` }}>
                                <div>
                                  <span className="text-white/80 text-xs font-medium">{r.test_name}</span>
                                  {r.reference_low !== null && r.reference_high !== null && (
                                    <span className="text-white/25 text-[10px] ml-2">ref: {r.reference_low}–{r.reference_high} {r.unit}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-white/80 text-xs font-mono">{r.value_text} {r.unit}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${fs.color}22`, color: fs.color }}>
                                    {fs.label}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : order.status === 'complete' ? (
                        <p className="text-white/25 text-xs mt-2">Results uploaded — check lab files below.</p>
                      ) : null}

                      {/* Clinical notes */}
                      {order.clinical_notes && (
                        <p className="text-white/30 text-xs italic px-1">Note: {order.clinical_notes}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TREND CHARTS ───────────────────────────────────────────────────── */}
      {view === 'trends' && (
        <div className="space-y-4">
          {Object.entries(trendData).length === 0 ? (
            <div className="text-center py-12 text-white/25">
              <TrendingUp size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No trend data yet</p>
              <p className="text-xs mt-1">Trend graphs appear after results with numeric values are received</p>
            </div>
          ) : (
            Object.entries(trendData).map(([testName, points]) => {
              if (points.length < 2) return null;
              const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
              const vals   = sorted.map(p => p.value);
              const minVal = Math.min(...vals);
              const maxVal = Math.max(...vals);
              return (
                <div key={testName} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white/80 text-sm font-semibold">{testName}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-white/30">
                      <span>Min: {minVal}</span>
                      <span>Max: {maxVal}</span>
                      <span>{points.length} readings</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={sorted} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                        tickFormatter={d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} width={40} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                        itemStyle={{ color: '#c9a84c' }}
                        labelFormatter={d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                      <Line type="monotone" dataKey="value" stroke="#c9a84c" strokeWidth={2} dot={{ fill: '#c9a84c', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
