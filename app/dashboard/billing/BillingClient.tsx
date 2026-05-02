'use client';

import { supabase } from '@/lib/supabase';
import { useClinic, withClinicFilter, withClinicId } from '@/lib/clinicContext';
import ExpensesTab from '@/components/ui/ExpensesTab';
import { useState, useMemo, useEffect } from 'react';
import { Appointment } from '@/types';
import { formatUSDate } from '@/lib/sheets';
import { Plus, FileText, Search, X, Save, Printer, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
type RecordType = 'consultation' | 'procedure';

type Invoice = {
  id:            string;
  appointmentId: string;
  mr_number:     string;
  childName:     string;
  parentName:    string;
  date:          string;
  visitType:     string;
  reason:        string;
  feeAmount:     number;
  discount:      number;
  paid:          number;
  paymentMethod: string;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Waived';
  notes:         string;
  createdAt:     string;
  recordType:    RecordType;
  procedureName: string;   // only used when recordType === 'procedure'
};

const METHODS = ['Cash', 'Card', 'Online Transfer', 'Insurance', 'Waived'];

function genId() {
  return `INV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

// ── Map DB row → Invoice ──────────────────────────────────────────────────────
function applyInvoicePrefix(id: string, prefix: string): string {
  if (!prefix || prefix === 'INV') return id;
  return id.replace(/^INV-/, prefix + '-');
}

function mapRow(r: any): Invoice {
  return {
    id:            String(r.invoice_number || r.id || ''),
    appointmentId: String(r.appointment_id ?? ''),
    mr_number:     r.mr_number     ?? '',
    childName:     r.child_name    ?? '',
    parentName:    r.parent_name   ?? '',
    date:          r.date          ?? r.created_at?.split('T')[0] ?? '',
    visitType:     r.visit_type    ?? '',
    reason:        r.reason        ?? '',
    feeAmount:     Number(r.consultation_fee) || 0,
    discount:      Number(r.discount)         || 0,
    paid:          Number(r.amount_paid)      || 0,
    paymentMethod: r.payment_method  ?? 'Cash',
    paymentStatus: (r.payment_status ?? 'Unpaid') as Invoice['paymentStatus'],
    notes:         r.notes          ?? '',
    createdAt:     r.created_at     ?? new Date().toISOString(),
    recordType:    (r.record_type   ?? 'consultation') as RecordType,
    procedureName: r.procedure_name ?? '',
  };
}

function computeStatus(fee: number, discount: number, paid: number): Invoice['paymentStatus'] {
  const net = fee - discount;
  if (paid >= net) return 'Paid';
  if (paid > 0)    return 'Partial';
  return 'Unpaid';
}

// ── Badges ────────────────────────────────────────────────────────────────────
function PayPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    Paid:    { bg: '#e8f7f2', color: '#1a7f5e' },
    Partial: { bg: '#fff9e6', color: '#b47a00' },
    Unpaid:  { bg: '#fff0f0', color: '#c53030' },
  };
  const c = cfg[status] || cfg.Unpaid;
  return <span className="pill" style={{ background: c.bg, color: c.color }}>{status}</span>;
}

function TypeBadge({ type }: { type: RecordType }) {
  return type === 'procedure'
    ? <span className="pill" style={{ background: '#ede9fe', color: '#6d28d9' }}>Procedure</span>
    : <span className="pill" style={{ background: '#e0f2fe', color: '#0369a1' }}>Consult</span>;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BillingClient({ clinicSettings = null, data }: { data: Appointment[]; clinicSettings?: any }) {
  const [invoices,   setInvoices]   = useState<Invoice[]>([]);
  const { clinicId, isSuperAdmin } = useClinic();
  const [search,     setSearch]     = useState('');
  const [filterPay,  setFilterPay]  = useState('all');
  const [filterType, setFilterType] = useState('all');   // 'all' | 'consultation' | 'procedure'
  const [showForm,   setShowForm]   = useState(false);
  const [formType,   setFormType]   = useState<RecordType>('consultation');
  const [form,       setForm]       = useState<Partial<Invoice>>({});
  const [aptSearch,  setAptSearch]  = useState('');
  const [prices, setPrices] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [priceForm, setPriceForm] = useState({procedure_name:'',price:'',discounted_price:'',category:'General',doctor_name:''});
  const [claimForm, setClaimForm] = useState({patient_name:'',mr_number:'',insurance_provider:'',policy_number:'',claim_number:'',claim_date:'',amount_claimed:'',notes:''});
  const [bulkDiscount, setBulkDiscount] = useState({mrNumber:'',discount:'',reason:''});
  const [showBulkDiscount, setShowBulkDiscount] = useState(false);
  const [cashDate, setCashDate] = useState(new Date().toISOString().split('T')[0]);
  const [billingTab, setBillingTab] = useState<'invoices'|'receipts'|'statements'|'pricelist'|'cashreport'|'claims'|'expenses'>('invoices');

  // ── Fetch + realtime ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      let bq = supabase.from('billing').select('*').order('created_at', { ascending: false });
      if (clinicId && !isSuperAdmin) bq = (bq as any).eq('clinic_id', clinicId);
      const { data: rows, error } = await bq;
      if (error) { toast.error('Could not load invoices: ' + error.message); return; }
      if (rows) setInvoices(rows.map(mapRow));
    };
    load();
    const ch = supabase
      .channel('billing-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clinicId, isSuperAdmin]);

  // ── Uninvoiced appointments ──────────────────────────────────────────────────
  const uninvoiced = useMemo(() => {
    const invoicedIds = new Set(invoices.map(i => i.appointmentId));
    return data
      .filter(a => a.childName && a.appointmentDate &&
        !invoicedIds.has(String(a.id)) &&
        (a.status === 'Confirmed' || a.status === 'Rescheduled'))
      .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));
  }, [data, invoices]);

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = invoices;
    if (filterPay  !== 'all') r = r.filter(i => i.paymentStatus === filterPay);
    if (filterType !== 'all') r = r.filter(i => i.recordType    === filterType);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(i =>
        i.childName.toLowerCase().includes(q)  ||
        i.parentName.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)         ||
        i.procedureName.toLowerCase().includes(q)
      );
    }
    return [...r].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [invoices, filterPay, filterType, search]);

  // ── Summary stats ────────────────────────────────────────────────────────────
  const consultInvoices   = invoices.filter(i => i.recordType !== 'procedure');
  const procedureInvoices = invoices.filter(i => i.recordType === 'procedure');

  const taxPct = Number(clinicSettings?.tax_percentage || 0);
  const totalRevenue  = invoices.reduce((s, i) => s + i.paid, 0);
  const totalPending  = invoices.reduce((s, i) => s + Math.max(0, i.feeAmount - i.discount - i.paid), 0);
  const paidCount     = invoices.filter(i => i.paymentStatus === 'Paid').length;

  // Cash report computed
  const cashReport = useMemo(() => {
    const dayInvoices = invoices.filter(i => i.date === cashDate);
    const totalBilled = dayInvoices.reduce((s,i) => s + i.feeAmount - i.discount, 0);
    const totalCollected = dayInvoices.reduce((s,i) => s + i.paid, 0);
    const totalDue = dayInvoices.reduce((s,i) => s + Math.max(0, i.feeAmount - i.discount - i.paid), 0);
    const cashCount = dayInvoices.filter(i => i.paymentMethod === 'Cash').length;
    const cardCount = dayInvoices.filter(i => i.paymentMethod === 'Card').length;
    const onlineCount = dayInvoices.filter(i => i.paymentMethod === 'Online').length;
    return { dayInvoices, totalBilled, totalCollected, totalDue, cashCount, cardCount, onlineCount };
  }, [invoices, cashDate]);
  const unpaidCount   = invoices.filter(i => i.paymentStatus === 'Unpaid').length;

  // Analytics computed
  const monthlyRevenue = useMemo(() => {
    const map: Record<string,{revenue:number,collected:number,count:number}> = {};
    invoices.forEach(inv => {
      const month = inv.date ? inv.date.slice(0,7) : new Date().toISOString().slice(0,7);
      if (!map[month]) map[month] = {revenue:0,collected:0,count:0};
      map[month].revenue += inv.feeAmount - inv.discount;
      map[month].collected += inv.paid;
      map[month].count += 1;
    });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);
  }, [invoices]);

  const revenueByType = useMemo(() => {
    const cons = consultInvoices.reduce((s,i)=>s+i.paid,0);
    const proc = procedureInvoices.reduce((s,i)=>s+i.paid,0);
    return { consultation: cons, procedure: proc };
  }, [consultInvoices, procedureInvoices]);

  const topServices = useMemo(() => {
    const map: Record<string,{count:number,revenue:number}> = {};
    invoices.forEach(inv => {
      const key = inv.recordType || 'Consultation';
      if (!map[key]) map[key] = {count:0,revenue:0};
      map[key].count += 1;
      map[key].revenue += inv.paid;
    });
    return Object.entries(map).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,8);
  }, [invoices]);

  // Aging report
  const agingBuckets = useMemo(() => {
    const now = new Date();
    const buckets = { current:[] as Invoice[], d30:[] as Invoice[], d60:[] as Invoice[], d90:[] as Invoice[], over90:[] as Invoice[] };
    invoices.filter(i=>(i.paymentStatus as string)!=='Paid'&&(i.paymentStatus as string)!=='Waived').forEach(inv => {
      const due = Math.max(0, inv.feeAmount - inv.discount - inv.paid);
      if (due <= 0) return;
      const days = inv.date ? Math.floor((now.getTime()-new Date(inv.date).getTime())/(1000*60*60*24)) : 0;
      if (days <= 30) buckets.current.push(inv);
      else if (days <= 60) buckets.d30.push(inv);
      else if (days <= 90) buckets.d60.push(inv);
      else if (days <= 120) buckets.d90.push(inv);
      else buckets.over90.push(inv);
    });
    return buckets;
  }, [invoices]);

  // ── Open form ────────────────────────────────────────────────────────────────
  const openForm = (type: RecordType, apt?: Appointment) => {
    setFormType(type);
    setForm({
      id:            genId(),
      appointmentId: apt ? String(apt.id) : '',
      mr_number:     (apt as any)?.mr_number ?? '',
      childName:     apt?.childName  ?? '',
      parentName:    apt?.parentName ?? '',
      date:          apt?.appointmentDate ?? new Date().toISOString().split('T')[0],
      visitType:     apt?.visitType  ?? '',
      reason:        apt?.reason     ?? '',
      feeAmount:     500,
      discount:      0,
      paid:          0,
      paymentMethod: 'Cash',
      paymentStatus: 'Unpaid',
      notes:         '',
      createdAt:     new Date().toISOString(),
      recordType:    type,
      procedureName: '',
      feeAmount: clinicSettings?.default_consultation_fee || 0,
    });
    setAptSearch('');
    setShowForm(true);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const saveInvoice = async () => {
    if (!form.childName?.trim()) { toast.error('Patient name is required'); return; }
    if (!form.feeAmount || form.feeAmount <= 0) { toast.error('Please enter a valid fee'); return; }
    if (formType === 'procedure' && !form.procedureName?.trim()) {
      toast.error('Procedure name is required'); return;
    }

    const status = computeStatus(form.feeAmount || 0, form.discount || 0, form.paid || 0);
    const invoiceId = (form.id && form.id.startsWith('INV-')) ? form.id : genId();

    const payload: Record<string, any> = {
      invoice_number:   invoiceId,
      appointment_id:   form.appointmentId || null,
      mr_number:        form.mr_number     || '',
      child_name:       form.childName.trim(),
      parent_name:      form.parentName    || '',
      date:             form.date          || new Date().toISOString().split('T')[0],
      visit_type:       form.visitType     || '',
      reason:           form.reason        || '',
      consultation_fee: form.feeAmount || clinicSettings?.default_consultation_fee || 0,
      discount:         form.discount      || 0,
      amount_paid:      form.paid          || 0,
      payment_method:   form.paymentMethod || 'Cash',
      payment_status:   status,
      notes:            form.notes         || '',
      record_type:      formType,
      procedure_name:   formType === 'procedure' ? (form.procedureName || '') : '',
    };

    // If editing an existing row that has a numeric DB id, include it
    if ((form as any).dbId != null) payload.id = (form as any).dbId;

    try {
      const { error } = await supabase.from('billing').upsert([{...payload, clinic_id: clinicId||null}], { onConflict: 'invoice_number' });
      if (error) throw error;
      setShowForm(false);
      toast.success(`${formType === 'procedure' ? 'Procedure' : 'Invoice'} ${invoiceId} saved!`);
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const deleteInvoice = async (inv: Invoice) => {
    if (!confirm('Delete this record?')) return;
    const { error } = await supabase.from('billing').delete().eq('invoice_number', inv.id);
    if (error) toast.error('Delete failed: ' + error.message);
    else toast.success('Record deleted');
  };

  // ── Print ────────────────────────────────────────────────────────────────────
  const printInvoice = (inv: Invoice) => {
    const net  = inv.feeAmount - inv.discount;
    const due  = Math.max(0, net - inv.paid);
    const isProcedure = inv.recordType === 'procedure';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${isProcedure ? 'Procedure' : 'Invoice'} ${inv.id}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;color:#0a1628;padding:40px;font-size:13px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #c9a84c}
      .clinic-name{font-size:22px;font-weight:700;color:#0a1628}
      .clinic-sub{font-size:11px;color:#6b7280;margin-top:3px}
      .invoice-id{font-size:28px;font-weight:700;color:#c9a84c;text-align:right}
      .invoice-label{font-size:11px;color:#6b7280;text-align:right}
      .section{margin-bottom:24px}
      .section-title{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;font-weight:600;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
      .field-label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:2px}
      .field-val{font-size:13px;font-weight:500;color:#0a1628}
      .fee-table{width:100%;border-collapse:collapse}
      .fee-table th{background:#f9f7f3;padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase}
      .fee-table td{padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px}
      .total-row td{font-weight:700;font-size:14px;background:#f9f7f3}
      .due-row td{font-weight:700;font-size:16px;color:${due>0?'#c53030':'#1a7f5e'}}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;
        background:${inv.paymentStatus==='Paid'?'#e8f7f2':inv.paymentStatus==='Partial'?'#fff9e6':'#fff0f0'};
        color:${inv.paymentStatus==='Paid'?'#1a7f5e':inv.paymentStatus==='Partial'?'#b47a00':'#c53030'}}
      .type-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;
        background:${isProcedure?'#ede9fe':'#e0f2fe'};color:${isProcedure?'#6d28d9':'#0369a1'};margin-left:8px}
      .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
    </style></head><body>
    <div class="header">
      <div>
        <div class="clinic-name">${clinicSettings?.clinic_name||'Clinic'}</div>
        <div class="clinic-sub">${clinicSettings?.clinic_address||''}</div>
        <div class="clinic-sub">${clinicSettings?.clinic_phone||''} · ${clinicSettings?.clinic_email||''}</div>
      </div>
      <div>
        <div class="invoice-label">${isProcedure?'PROCEDURE INVOICE':'INVOICE'}</div>
        <div class="invoice-id">${inv.id}</div>
        <div class="invoice-label" style="margin-top:4px">Date: ${formatUSDate(inv.date)}</div>
      </div>
    </div>
    <div class="grid2" style="margin-bottom:24px">
      <div class="section">
        <div class="section-title">Patient Details</div>
        <div class="field-label">Child Name</div><div class="field-val" style="margin-bottom:8px">${inv.childName}</div>
        <div class="field-label">Parent / Guardian</div><div class="field-val" style="margin-bottom:8px">${inv.parentName}</div>
        <div class="field-label">Visit Type</div><div class="field-val">${inv.visitType||'—'}</div>
      </div>
      <div class="section">
        <div class="section-title">Visit Details</div>
        <div class="field-label">Date</div><div class="field-val" style="margin-bottom:8px">${formatUSDate(inv.date)}</div>
        ${isProcedure?`<div class="field-label">Procedure</div><div class="field-val" style="margin-bottom:8px">${inv.procedureName||'—'}</div>`:`<div class="field-label">Reason</div><div class="field-val" style="margin-bottom:8px">${inv.reason||'—'}</div>`}
        <div class="field-label">Payment Status</div><div style="margin-top:4px"><span class="badge">${inv.paymentStatus}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Fee Breakdown</div>
      <table class="fee-table">
        <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          <tr><td>${isProcedure?`Procedure: ${inv.procedureName}`:'Consultation Fee'}</td><td style="text-align:right">PKR ${inv.feeAmount.toLocaleString()}</td></tr>
          ${inv.discount>0?`<tr><td style="color:#1a7f5e">Discount</td><td style="text-align:right;color:#1a7f5e">- PKR ${inv.discount.toLocaleString()}</td></tr>`:''}
          <tr class="total-row"><td>Net Amount</td><td style="text-align:right">PKR ${net.toLocaleString()}</td></tr>
          <tr><td>Amount Paid (${inv.paymentMethod})</td><td style="text-align:right;color:#1a7f5e">PKR ${inv.paid.toLocaleString()}</td></tr>
          <tr class="due-row"><td>Balance Due</td><td style="text-align:right">PKR ${due.toLocaleString()}</td></tr>
        </tbody>
      </table>
    </div>
    ${inv.notes?`<div class="section"><div class="section-title">Notes</div><div style="font-size:13px;color:#374151">${inv.notes}</div></div>`:''}
    <div class="footer">Thank you for visiting ${clinicSettings?.clinic_name||'our clinic'} · ${clinicSettings?.doctor_name||''}</div>
    </body></html>`;
    const w = window.open('','_blank');
    if (!w) { toast.error('Allow popups to print'); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const aptFiltered = uninvoiced.filter(a => {
    if (!aptSearch) return true;
    const q = aptSearch.toLowerCase();
    return a.childName.toLowerCase().includes(q) || a.parentName.toLowerCase().includes(q);
  });

  const formTitle = formType === 'procedure' ? 'New Procedure Invoice' : 'New Invoice';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Tab toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7 w-fit">
        {([['invoices','Invoices'],['receipts','Receipts'],['statements','Statements'],['pricelist','Price List'],['cashreport','Cash Report'],['claims','Insurance Claims'],['expenses','Expenses']] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setBillingTab(k)}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${billingTab===k?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
            {l}
          </button>
        ))}
      </div>
      {/* ── RECEIPTS TAB ── */}
      {billingTab==='receipts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-navy">Payment Receipts</div>
            <div className="text-[11px] text-gray-400">Click any paid invoice to print receipt</div>
          </div>
          {invoices.filter(i=>i.paid>0).map(inv=>(
            <div key={inv.id} className="bg-white rounded-2xl p-4 flex items-center gap-4" style={{border:'1px solid #e5e7eb'}}>
              <div className="flex-1">
                <div className="font-semibold text-navy text-[13px]">{inv.childName}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{inv.date} · {inv.appointmentId||'—'}</div>
                <div className="flex gap-3 mt-1 text-[12px]">
                  <span className="text-emerald-600 font-medium">Paid: PKR {inv.paid.toLocaleString()}</span>
                  {inv.paymentMethod && <span className="text-gray-400">{inv.paymentMethod}</span>}
                </div>
              </div>
              <button onClick={()=>{
                const w=window.open('','_blank');
                if(!w)return;
                w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:Arial;padding:20px;max-width:350px;margin:0 auto;color:#0a1628}.hdr{background:#0a1628;color:#fff;padding:12px 16px;border-radius:8px 8px 0 0;text-align:center}.body{border:1px solid #e5e7eb;border-top:none;padding:16px;border-radius:0 0 8px 8px}.row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}.divider{border-top:1px dashed #e5e7eb;margin:8px 0}.total{font-weight:700;font-size:15px}.stamp{text-align:center;margin-top:12px;font-size:11px;color:#9ca3af}@media print{button{display:none}}</style></head><body><div class="hdr"><div style="font-size:15px;font-weight:700">Payment Receipt</div><div style="font-size:10px;opacity:0.7">'+(clinicSettings?.clinic_name||'MediPlex')+'</</div></div><div class="body"><div class="row"><span>Patient</span><strong>${inv.childName}</strong></div><div class="row"><span>Date</span><span>${inv.date}</span></div><div class="row"><span>Receipt #</span><span>RCP-${inv.id?.slice(-6)||'000000'}</span></div><div class="divider"></div><div class="row"><span>Fee</span><span>PKR ${inv.feeAmount.toLocaleString()}</span></div>${inv.discount>0?'<div class="row"><span>Discount</span><span style="color:#16a34a">- PKR '+inv.discount.toLocaleString()+'</span></div>':''}<div class="row total"><span>Amount Paid</span><span style="color:#16a34a">PKR ${inv.paid.toLocaleString()}</span></div>${Math.max(0,inv.feeAmount-inv.discount-inv.paid)>0?'<div class="row"><span>Balance Due</span><span style="color:#dc2626">PKR '+Math.max(0,inv.feeAmount-inv.discount-inv.paid).toLocaleString()+'</span></div>':''}<div class="divider"></div><div class="row"><span>Payment Method</span><span>${inv.paymentMethod||'Cash'}</span></div><div class="stamp">Thank you for choosing our clinic<br/>This is a computer generated receipt</div></div><button onclick="window.print()" style="margin:12px auto;display:block;padding:8px 20px;background:#0a1628;color:#c9a84c;border:none;border-radius:8px;cursor:pointer">🖨️ Print Receipt</button></body></html>`);
                w.document.close();setTimeout(()=>w.print(),400);
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium flex-shrink-0"
                style={{background:'rgba(26,127,94,0.1)',color:'#1a7f5e',border:'1px solid rgba(26,127,94,0.2)'}}>
                🖨️ Receipt
              </button>
              <button onClick={async ()=>{
                // Get whatsapp from appointments if not in billing
                let waPhone = (inv as any).whatsapp || '';
                if (!waPhone && inv.mr_number) {
                  const {data:aptData} = await supabase.from('appointments').select('whatsapp_number').eq('mr_number', inv.mr_number).order('appointment_date',{ascending:false}).limit(1).maybeSingle();
                  waPhone = aptData?.whatsapp_number || '';
                }
                const p=(waPhone).replace(/\D/g,'');const ph=p.startsWith('0')?'92'+p.slice(1):p;
                const msg='Payment Receipt - '+(clinicSettings?.clinic_name||'Clinic')+'\n\nPatient: '+inv.childName+'\nDate: '+inv.date+'\nAmount Paid: PKR '+inv.paid.toLocaleString()+(Math.max(0,inv.feeAmount-inv.discount-inv.paid)>0?'\nBalance Due: PKR '+Math.max(0,inv.feeAmount-inv.discount-inv.paid).toLocaleString():' (PAID IN FULL)')+'\n\nThank you for choosing our clinic.';
                if(ph) window.open('https://wa.me/'+ph+'?text='+encodeURIComponent(msg),'_blank');
                else toast.error('No WhatsApp number on file');
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium flex-shrink-0"
                style={{background:'rgba(37,211,102,0.1)',color:'#16a34a',border:'1px solid rgba(37,211,102,0.2)'}}>
                💬 WA
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── STATEMENTS TAB ── */}
      {billingTab==='statements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-navy">Patient Statements</div>
            <div className="flex gap-2 items-center">
              {showBulkDiscount && (
                <div className="flex gap-2 items-center p-3 rounded-xl" style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.2)'}}>
                  <input value={bulkDiscount.mrNumber} onChange={e=>setBulkDiscount(p=>({...p,mrNumber:e.target.value}))}
                    placeholder="MR Number" className="border rounded-lg px-2 py-1.5 text-[12px] w-28 outline-none focus:border-gold"/>
                  <input value={bulkDiscount.discount} onChange={e=>setBulkDiscount(p=>({...p,discount:e.target.value}))}
                    placeholder="Discount PKR" type="number" className="border rounded-lg px-2 py-1.5 text-[12px] w-28 outline-none focus:border-gold"/>
                  <button onClick={async()=>{
                    if(!bulkDiscount.mrNumber||!bulkDiscount.discount){toast.error('Enter MR and discount');return;}
                    const {error}=await supabase.from('billing').update({discount:Number(bulkDiscount.discount)}).eq('mr_number',bulkDiscount.mrNumber).eq('clinic_id',clinicId||'').eq('payment_status','Unpaid');
                    if(error)toast.error(error.message);else{toast.success('Bulk discount applied');setBulkDiscount({mrNumber:'',discount:'',reason:''});setShowBulkDiscount(false);}
                  }} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{background:'#c9a84c',color:'#0a1628'}}>Apply</button>
                  <button onClick={()=>setShowBulkDiscount(false)} className="text-gray-400 hover:text-gray-600 text-[11px]">Cancel</button>
                </div>
              )}
              <button onClick={()=>setShowBulkDiscount(!showBulkDiscount)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                style={{background:'rgba(201,168,76,0.1)',color:'#c9a84c',border:'1px solid rgba(201,168,76,0.2)'}}>
                % Bulk Discount
              </button>
            </div>
          </div>
          {Array.from(new Set(invoices.map(i=>i.childName))).map(patient=>{
            const patInvoices = invoices.filter(i=>i.childName===patient);
            const totalBilled = patInvoices.reduce((s,i)=>s+i.feeAmount-i.discount,0);
            const totalPaid2 = patInvoices.reduce((s,i)=>s+i.paid,0);
            const balance = totalBilled - totalPaid2;
            return (
              <div key={patient} className="bg-white rounded-2xl p-4" style={{border:'1px solid #e5e7eb'}}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-navy">{patient}</div>
                    <div className="text-[11px] text-gray-400">{patInvoices.length} invoices · {patInvoices[0]?.mr_number||'—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-bold" style={{color:balance>0?'#dc2626':'#16a34a'}}>
                      {balance>0?`PKR ${balance.toLocaleString()} due`:'Settled ✓'}
                    </div>
                    <div className="text-[10px] text-gray-400">Total billed: PKR {totalBilled.toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>{
                    const w=window.open('','_blank');if(!w)return;
                    const rows=patInvoices.map(inv=>`<tr><td>${inv.date}</td><td>${inv.appointmentId||'Visit'}</td><td>PKR ${inv.feeAmount.toLocaleString()}</td><td>PKR ${inv.discount.toLocaleString()}</td><td>PKR ${inv.paid.toLocaleString()}</td><td style="color:${Math.max(0,inv.feeAmount-inv.discount-inv.paid)>0?'#dc2626':'#16a34a'}">${Math.max(0,inv.feeAmount-inv.discount-inv.paid)>0?'PKR '+Math.max(0,inv.feeAmount-inv.discount-inv.paid).toLocaleString():'Paid'}</td></tr>`).join('');
                    w.document.write(`<!DOCTYPE html><html><head><title>Statement</title><style>body{font-family:Arial;padding:20px;max-width:700px;margin:0 auto}h2{color:#0a1628}table{width:100%;border-collapse:collapse}th{background:#0a1628;color:#fff;padding:8px 12px;text-align:left;font-size:11px}td{padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px}.total-row{font-weight:700;background:#f9f7f3}.footer{margin-top:20px;font-size:11px;color:#9ca3af;text-align:center}@media print{button{display:none}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><div><h2 style="margin:0">Patient Statement</h2><div style="font-size:12px;color:#6b7280">${clinicSettings?.clinic_name||'MediPlex'} · ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div></div><div style="text-align:right"><div style="font-size:16px;font-weight:700;color:#0a1628">${patient}</div><div style="font-size:11px;color:#6b7280">MR# ${patInvoices[0]?.mr_number||'—'}</div></div></div><table><thead><tr><th>Date</th><th>Description</th><th>Fee</th><th>Discount</th><th>Paid</th><th>Balance</th></tr></thead><tbody>${rows}<tr class="total-row"><td colspan="2">TOTAL</td><td>PKR ${totalBilled.toLocaleString()}</td><td></td><td>PKR ${totalPaid2.toLocaleString()}</td><td style="color:${balance>0?'#dc2626':'#16a34a'}">${balance>0?'PKR '+balance.toLocaleString()+' DUE':'SETTLED'}</td></tr></tbody></table><div class="footer">This is a computer-generated statement. For queries contact the clinic.</div><div style="text-align:center;font-size:10px;color:#9ca3af;margin-top:10px;padding-top:8px;border-top:1px solid #f3f4f6">Powered by <a href="https://mediplex.io" style="color:#c9a84c;text-decoration:none;font-weight:600">MediPlex</a> — AI for Smart Healthcare</div><button onclick="window.print()" style="margin:16px auto;display:block;padding:8px 20px;background:#0a1628;color:#c9a84c;border:none;border-radius:8px;cursor:pointer">🖨️ Print Statement</button></body></html>`);
                    w.document.close();setTimeout(()=>w.print(),400);
                  }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium"
                    style={{background:'rgba(43,108,176,0.1)',color:'#2b6cb0',border:'1px solid rgba(43,108,176,0.2)'}}>
                    🖨️ Print Statement
                  </button>
                  {balance>0 && (
                    <button onClick={async ()=>{
                      let waPhone2 = (patInvoices[0] as any)?.whatsapp || '';
                      if (!waPhone2 && patInvoices[0]?.mr_number) {
                        const {data:aptData2} = await supabase.from('appointments').select('whatsapp_number').eq('mr_number', patInvoices[0].mr_number).order('appointment_date',{ascending:false}).limit(1).maybeSingle();
                        waPhone2 = aptData2?.whatsapp_number || '';
                      }
                      const p=(waPhone2).replace(/\D/g,'');const ph=p.startsWith('0')?'92'+p.slice(1):p;
                      const msg='Account Statement - '+(clinicSettings?.clinic_name||'Clinic')+'\n\nDear '+patient+',\n\nYour account summary:\nTotal Billed: PKR '+totalBilled.toLocaleString()+'\nTotal Paid: PKR '+totalPaid2.toLocaleString()+'\nBalance Due: PKR '+balance.toLocaleString()+'\n\nPlease clear your outstanding balance at your earliest convenience.\n\nThank you.';
                      if(ph) window.open('https://wa.me/'+ph+'?text='+encodeURIComponent(msg),'_blank');
                      else toast.error('No WhatsApp number on file');
                    }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium"
                      style={{background:'rgba(37,211,102,0.1)',color:'#16a34a',border:'1px solid rgba(37,211,102,0.2)'}}>
                      💬 Send via WA
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PRICE LIST TAB ── */}
      {billingTab==='pricelist' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-navy">Procedure Price List</div>
            <button onClick={()=>setShowPriceForm(!showPriceForm)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold btn-gold">
              + Add Procedure
            </button>
          </div>
          {showPriceForm && (
            <div className="bg-white rounded-2xl p-4 space-y-3" style={{border:'1px solid rgba(201,168,76,0.3)'}}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Procedure Name</label>
                  <input value={priceForm.procedure_name} onChange={e=>setPriceForm(p=>({...p,procedure_name:e.target.value}))}
                    placeholder="e.g. Consultation, X-Ray..." className="w-full border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Category</label>
                  <select value={priceForm.category} onChange={e=>setPriceForm(p=>({...p,category:e.target.value}))}
                    className="w-full border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold">
                    {['General','Consultation','Procedure','Lab','Radiology','Surgery','Other'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Standard Price (PKR)</label>
                  <input value={priceForm.price} onChange={e=>setPriceForm(p=>({...p,price:e.target.value}))}
                    type="number" placeholder="e.g. 1500" className="w-full border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Discounted Price (optional)</label>
                  <input value={priceForm.discounted_price} onChange={e=>setPriceForm(p=>({...p,discounted_price:e.target.value}))}
                    type="number" placeholder="e.g. 1200" className="w-full border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"/>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Doctor (leave blank for all)</label>
                  <input value={priceForm.doctor_name} onChange={e=>setPriceForm(p=>({...p,doctor_name:e.target.value}))}
                    placeholder="e.g. Dr. Ahmad Khan" className="w-full border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"/>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={async()=>{
                  if(!priceForm.procedure_name||!priceForm.price){toast.error('Name and price required');return;}
                  const {error}=await supabase.from('procedure_prices').insert([{
                    clinic_id:clinicId||null, procedure_name:priceForm.procedure_name,
                    price:Number(priceForm.price),
                    discounted_price:priceForm.discounted_price?Number(priceForm.discounted_price):null,
                    category:priceForm.category, doctor_name:priceForm.doctor_name||null, is_active:true,
                  }]);
                  if(error)toast.error(error.message);
                  else{toast.success('Procedure added');setPriceForm({procedure_name:'',price:'',discounted_price:'',category:'General',doctor_name:''});setShowPriceForm(false);
                    supabase.from('procedure_prices').select('*').eq('clinic_id',clinicId||'').eq('is_active',true).order('category').then(({data})=>setPrices(data||[]));
                  }
                }} className="btn-gold text-[11px] px-4 py-2">Save</button>
                <button onClick={()=>setShowPriceForm(false)} className="px-4 py-2 rounded-lg text-[11px] text-gray-500 border">Cancel</button>
              </div>
            </div>
          )}
          {['Consultation','Procedure','Lab','Radiology','Surgery','General','Other'].map(cat=>{
            const catPrices = prices.filter(p=>p.category===cat);
            if(!catPrices.length) return null;
            return (
              <div key={cat} className="bg-white rounded-2xl overflow-hidden" style={{border:'1px solid #e5e7eb'}}>
                <div className="px-4 py-2.5 font-semibold text-[12px] text-navy" style={{background:'#f9f7f3',borderBottom:'1px solid #e5e7eb'}}>{cat}</div>
                <table className="w-full">
                  <thead><tr style={{borderBottom:'1px solid #f3f4f6'}}>
                    {['Procedure','Doctor','Standard Price','Discounted Price',''].map(h=>(
                      <th key={h} className="px-4 py-2 text-left text-[10px] text-gray-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {catPrices.map(p=>(
                      <tr key={p.id} className="hover:bg-gray-50" style={{borderBottom:'1px solid #f9fafb'}}>
                        <td className="px-4 py-2.5 text-[13px] font-medium text-navy">{p.procedure_name}</td>
                        <td className="px-4 py-2.5 text-[12px] text-gray-500">{p.doctor_name||'All Doctors'}</td>
                        <td className="px-4 py-2.5 text-[13px] font-semibold text-navy">PKR {Number(p.price).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-[12px] text-emerald-600">{p.discounted_price?'PKR '+Number(p.discounted_price).toLocaleString():'—'}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={async()=>{
                            await supabase.from('procedure_prices').update({is_active:false}).eq('id',p.id);
                            setPrices(prev=>prev.filter(x=>x.id!==p.id));
                          }} className="text-[10px] text-red-400 hover:text-red-600">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {prices.length===0 && <div className="text-center py-12 text-gray-400 text-[13px]">No procedures added yet. Add your clinic fee schedule above.</div>}
        </div>
      )}

      {/* ── CASH REPORT TAB ── */}
      {billingTab==='cashreport' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="text-[13px] font-semibold text-navy">Daily Cash Report</div>
            <input type="date" value={cashDate} onChange={e=>setCashDate(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-gold"/>
            <button onClick={()=>{
              const w=window.open('','_blank');if(!w)return;
              const rows=cashReport.dayInvoices.map(inv=>`<tr><td>${inv.childName}</td><td>${inv.appointmentId||'—'}</td><td>PKR ${inv.feeAmount.toLocaleString()}</td><td>PKR ${inv.discount.toLocaleString()}</td><td>PKR ${inv.paid.toLocaleString()}</td><td>${inv.paymentMethod||'Cash'}</td><td style="color:${Math.max(0,inv.feeAmount-inv.discount-inv.paid)>0?'#dc2626':'#16a34a'}">${Math.max(0,inv.feeAmount-inv.discount-inv.paid)>0?'Due':'Paid'}</td></tr>`).join('');
              w.document.write(`<!DOCTYPE html><html><head><title>Cash Report</title><style>body{font-family:Arial;padding:20px;max-width:800px;margin:0 auto}h2{color:#0a1628}table{width:100%;border-collapse:collapse}th{background:#0a1628;color:#fff;padding:8px 12px;text-align:left;font-size:11px}td{padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.card{background:#f9f7f3;border-radius:8px;padding:12px;text-align:center}.card-val{font-size:18px;font-weight:700;color:#0a1628}.card-lbl{font-size:10px;color:#9ca3af;margin-top:2px}@media print{button{display:none}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:center"><div><h2 style="margin:0">Daily Cash Report</h2><div style="font-size:12px;color:#6b7280">${new Date(cashDate).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div></div><div class="summary"><div class="card"><div class="card-val">PKR ${cashReport.totalBilled.toLocaleString()}</div><div class="card-lbl">Total Billed</div></div><div class="card"><div class="card-val" style="color:#16a34a">PKR ${cashReport.totalCollected.toLocaleString()}</div><div class="card-lbl">Collected</div></div><div class="card"><div class="card-val" style="color:#dc2626">PKR ${cashReport.totalDue.toLocaleString()}</div><div class="card-lbl">Outstanding</div></div><div class="card"><div class="card-val">${cashReport.dayInvoices.length}</div><div class="card-lbl">Patients</div></div></div><table><thead><tr><th>Patient</th><th>Invoice</th><th>Fee</th><th>Discount</th><th>Paid</th><th>Method</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><button onclick="window.print()" style="margin:16px auto;display:block;padding:8px 20px;background:#0a1628;color:#c9a84c;border:none;border-radius:8px;cursor:pointer">🖨️ Print Report</button><div style="text-align:center;font-size:10px;color:#9ca3af;margin-top:10px;padding-top:8px;border-top:1px solid #f3f4f6">Powered by <a href="https://mediplex.io" style="color:#c9a84c;text-decoration:none;font-weight:600">MediPlex</a> — AI for Smart Healthcare</div></body></html>`);
              w.document.close();setTimeout(()=>w.print(),400);
            }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium btn-gold">
              🖨️ Print Report
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {label:'Total Billed',    value:`PKR ${cashReport.totalBilled.toLocaleString()}`,     color:'#2b6cb0'},
              {label:'Total Collected', value:`PKR ${cashReport.totalCollected.toLocaleString()}`,  color:'#1a7f5e'},
              {label:'Outstanding',     value:`PKR ${cashReport.totalDue.toLocaleString()}`,        color:'#c53030'},
              {label:'Patients Today',  value:cashReport.dayInvoices.length,                       color:'#c9a84c'},
            ].map(s=>(
              <div key={s.label} className="bg-white rounded-2xl p-4" style={{border:'1px solid #e5e7eb'}}>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{s.label}</div>
                <div className="text-[22px] font-bold" style={{color:s.color}}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4" style={{border:'1px solid #e5e7eb'}}>
            <div className="font-semibold text-navy text-[13px] mb-3">Payment Methods</div>
            <div className="flex gap-6">
              {[
                {label:'Cash',   count:cashReport.cashCount,   color:'#1a7f5e'},
                {label:'Card',   count:cashReport.cardCount,   color:'#2b6cb0'},
                {label:'Online', count:cashReport.onlineCount, color:'#9f7aea'},
              ].map(m=>(
                <div key={m.label} className="text-center">
                  <div className="text-[20px] font-bold" style={{color:m.color}}>{m.count}</div>
                  <div className="text-[11px] text-gray-400">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden" style={{border:'1px solid #e5e7eb'}}>
            <table className="w-full">
              <thead><tr style={{borderBottom:'1px solid #f3f4f6'}}>
                {['Patient','Fee','Discount','Paid','Method','Status'].map(h=>(
                  <th key={h} className="px-4 py-2 text-left text-[10px] text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {cashReport.dayInvoices.length===0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-[13px]">No invoices for {cashDate}</td></tr>
                ) : cashReport.dayInvoices.map(inv=>(
                  <tr key={inv.id} className="hover:bg-gray-50" style={{borderBottom:'1px solid #f9fafb'}}>
                    <td className="px-4 py-2.5 font-medium text-navy text-[13px]">{inv.childName}</td>
                    <td className="px-4 py-2.5 text-[12px]">PKR {inv.feeAmount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-[12px] text-emerald-600">{inv.discount>0?'PKR '+inv.discount.toLocaleString():'—'}</td>
                    <td className="px-4 py-2.5 text-[12px] font-semibold text-emerald-700">PKR {inv.paid.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-[12px] text-gray-500">{inv.paymentMethod||'Cash'}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{background:inv.paymentStatus==='Paid'?'#f0fdf4':'#fef2f2',color:inv.paymentStatus==='Paid'?'#16a34a':'#dc2626'}}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── INSURANCE CLAIMS TAB ── */}
      {billingTab==='claims' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-navy">Insurance Claims & RCM</div>
            <button onClick={()=>setShowClaimForm(!showClaimForm)} className="btn-gold text-[11px] px-3 py-2 flex items-center gap-1.5">
              + New Claim
            </button>
          </div>
          {showClaimForm && (
            <div className="bg-white rounded-2xl p-4 space-y-3" style={{border:'1px solid rgba(201,168,76,0.3)'}}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Patient Name</label>
                  <input value={claimForm.patient_name} onChange={e=>setClaimForm(p=>({...p,patient_name:e.target.value}))}
                    placeholder="Patient name" className="w-full border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">MR Number</label>
                  <div className="flex gap-2">
                    <input value={claimForm.mr_number} onChange={e=>setClaimForm(p=>({...p,mr_number:e.target.value}))}
                      placeholder="MR number" className="flex-1 border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"
                      onBlur={async e=>{
                        const mr = e.target.value.trim();
                        if(!mr) return;
                        const {data:pt} = await supabase.from('patients').select('child_name,whatsapp_number').eq('mr_number',mr).maybeSingle();
                        if(pt) { setClaimForm(p=>({...p,patient_name:pt.child_name||p.patient_name})); }
                        else {
                          const {data:apt} = await supabase.from('appointments').select('child_name,whatsapp').eq('mr_number',mr).order('appointment_date',{ascending:false}).limit(1).maybeSingle();
                          if(apt) setClaimForm(p=>({...p,patient_name:apt.child_name||p.patient_name}));
                        }
                      }}/>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Insurance Provider</label>
                  <input value={claimForm.insurance_provider} onChange={e=>setClaimForm(p=>({...p,insurance_provider:e.target.value}))}
                    placeholder="e.g. State Life, Jubilee, SEHAT" className="w-full border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Policy Number</label>
                  <input value={claimForm.policy_number} onChange={e=>setClaimForm(p=>({...p,policy_number:e.target.value}))}
                    placeholder="Policy/Member ID" className="w-full border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Amount Claimed</label>
                  <input value={claimForm.amount_claimed} onChange={e=>setClaimForm(p=>({...p,amount_claimed:e.target.value}))}
                    type="number" placeholder="PKR amount" className="w-full border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Claim Date</label>
                  <input value={claimForm.claim_date} onChange={e=>setClaimForm(p=>({...p,claim_date:e.target.value}))}
                    type="date" className="w-full border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gold"/>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={async()=>{
                  if(!claimForm.patient_name||!claimForm.insurance_provider){toast.error('Patient and insurer required');return;}
                  const {error}=await supabase.from('insurance_claims').insert([{
                    clinic_id:clinicId||null, mr_number:claimForm.mr_number,
                    patient_name:claimForm.patient_name, insurance_provider:claimForm.insurance_provider,
                    policy_number:claimForm.policy_number, amount_claimed:Number(claimForm.amount_claimed)||0,
                    claim_date:claimForm.claim_date||new Date().toISOString().split('T')[0], status:'submitted',
                    notes:claimForm.notes,
                  }]);
                  if(error)toast.error(error.message);
                  else{toast.success('Claim submitted');setShowClaimForm(false);
                    setClaimForm({patient_name:'',mr_number:'',insurance_provider:'',policy_number:'',claim_number:'',claim_date:'',amount_claimed:'',notes:''});
                    supabase.from('insurance_claims').select('*').eq('clinic_id',clinicId||'').order('created_at',{ascending:false}).then(({data})=>setClaims(data||[]));
                  }
                }} className="btn-gold text-[11px] px-4 py-2">Submit Claim</button>
                <button onClick={()=>setShowClaimForm(false)} className="px-4 py-2 rounded-lg text-[11px] text-gray-500 border">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-4 gap-3">
            {[
              {label:'Total Claimed',  value:`PKR ${claims.reduce((s,c)=>s+Number(c.amount_claimed||0),0).toLocaleString()}`, color:'#2b6cb0'},
              {label:'Total Approved', value:`PKR ${claims.reduce((s,c)=>s+Number(c.amount_approved||0),0).toLocaleString()}`, color:'#1a7f5e'},
              {label:'Pending',        value:claims.filter(c=>c.status==='submitted'||c.status==='pending').length, color:'#d97706'},
              {label:'Denied',         value:claims.filter(c=>c.status==='denied').length, color:'#c53030'},
            ].map(s=>(
              <div key={s.label} className="bg-white rounded-2xl p-4" style={{border:'1px solid #e5e7eb'}}>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{s.label}</div>
                <div className="text-[20px] font-bold" style={{color:s.color}}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl overflow-hidden" style={{border:'1px solid #e5e7eb'}}>
            <table className="w-full">
              <thead><tr style={{borderBottom:'1px solid #f3f4f6'}}>
                {['Patient','Insurer','Policy#','Claimed','Approved','Paid','Resubmits','Status'].map(h=>(
                  <th key={h} className="px-3 py-2 text-left text-[10px] text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {claims.length===0?(
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-[13px]">No claims submitted yet</td></tr>
                ):claims.map(claim=>{
                  const statusColors:Record<string,any>={
                    submitted:{bg:'#eff6ff',color:'#2b6cb0'},
                    pending:{bg:'#fffbeb',color:'#d97706'},
                    approved:{bg:'#f0fdf4',color:'#16a34a'},
                    paid:{bg:'#f0fdf4',color:'#16a34a'},
                    denied:{bg:'#fef2f2',color:'#dc2626'},
                    resubmitted:{bg:'#f5f3ff',color:'#7c3aed'},
                  };
                  const sc=statusColors[claim.status]||statusColors.pending;
                  return (
                    <tr key={claim.id} className="hover:bg-gray-50" style={{borderBottom:'1px solid #f9fafb'}}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-navy text-[12px]">{claim.patient_name}</div>
                        {claim.mr_number && <div className="text-[10px] text-gray-400 font-mono">MR# {claim.mr_number}</div>}
                        {claim.claim_date && <div className="text-[10px] text-gray-400">{claim.claim_date}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-600">{claim.insurance_provider}</td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-500 font-mono">{claim.policy_number||'—'}</td>
                      <td className="px-3 py-2.5 text-[12px] text-navy">PKR {Number(claim.amount_claimed||0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-[12px] text-emerald-600">PKR {Number(claim.amount_approved||0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-[12px] font-semibold text-emerald-700">PKR {Number(claim.amount_paid||0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[12px] font-semibold text-navy">{claim.resubmit_count||0}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                          style={{background:sc.bg,color:sc.color}}>{claim.status}</span>
                        {claim.denial_reason&&<div className="text-[10px] text-red-400 mt-0.5">{claim.denial_reason}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <select value={claim.status} onChange={async e=>{
                          await supabase.from('insurance_claims').update({status:e.target.value}).eq('id',claim.id);
                          setClaims(prev=>prev.map(c=>c.id===claim.id?{...c,status:e.target.value}:c));
                        }} className="border rounded px-2 py-1 text-[10px] outline-none">
                          {['submitted','pending','approved','paid','denied','resubmitted'].map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {billingTab==='expenses' && <ExpensesTab/>}
      {billingTab==='invoices' && <div className="space-y-5">

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Collected',
            value: `PKR ${totalRevenue.toLocaleString()}`,
            sub: `${invoices.length} records`,
            color: '#1a7f5e',
            bg: '#e8f7f2',
          },
          {
            label: 'Pending Balance',
            value: `PKR ${totalPending.toLocaleString()}`,
            sub: `${unpaidCount} unpaid`,
            color: '#c53030',
            bg: '#fff0f0',
          },
          {
            label: 'Consultations',
            value: String(consultInvoices.length),
            sub: `PKR ${consultInvoices.reduce((s,i)=>s+i.paid,0).toLocaleString()} collected`,
            color: '#0369a1',
            bg: '#e0f2fe',
          },
          {
            label: 'Procedures',
            value: String(procedureInvoices.length),
            sub: `PKR ${procedureInvoices.reduce((s,i)=>s+i.paid,0).toLocaleString()} collected`,
            color: '#6d28d9',
            bg: '#ede9fe',
          },
        ].map(c => (
          <div key={c.label} className="card p-4" style={{ borderLeft: `3px solid ${c.color}` }}>
            <div className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mb-1">{c.label}</div>
            <div className="text-[22px] font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {['all', 'Paid', 'Partial', 'Unpaid'].map(f => (
            <button key={f} onClick={() => setFilterPay(f)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                filterPay === f ? 'bg-navy text-white border-navy' : 'border-black/10 text-gray-500 hover:border-gold'
              }`}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
          <div className="w-px bg-black/10 mx-1" />
          {[
            { key: 'all',          label: 'All Types' },
            { key: 'consultation', label: 'Consultations' },
            { key: 'procedure',    label: 'Procedures' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                filterType === f.key ? 'bg-navy text-white border-navy' : 'border-black/10 text-gray-500 hover:border-gold'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1 justify-end">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search invoices..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-black/10 rounded-lg pl-8 pr-3 py-2 text-[12px] text-navy bg-white outline-none focus:border-gold" />
          </div>
          {/* Two action buttons */}
          <button onClick={() => openForm('procedure')}
            className="btn-outline text-[12px] py-2 px-4 gap-1.5 border-purple-300 text-purple-700 hover:border-purple-500 hover:bg-purple-50">
            <Stethoscope size={13} /> Procedure
          </button>
          <button onClick={() => openForm('consultation')} className="btn-gold text-[12px] py-2 px-4 gap-1.5">
            <Plus size={13} /> New Invoice
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 animate-in" style={{ border: `2px solid ${formType === 'procedure' ? 'rgba(109,40,217,0.3)' : 'rgba(201,168,76,0.3)'}` }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="font-medium text-navy text-[15px]">{form.id}</div>
              <TypeBadge type={formType} />
              <span className="text-[13px] text-gray-400">— {formTitle}</span>
            </div>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          {/* Appointment picker — consultations only */}
          {formType === 'consultation' && !form.appointmentId && (
            <div className="mb-5 rounded-xl p-4" style={{ background: '#f9f7f3', border: '1px solid rgba(201,168,76,0.2)' }}>
              <div className="text-[12px] font-medium text-navy mb-3">Pick an appointment (or fill manually below)</div>
              <div className="relative mb-3">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search patient..." value={aptSearch}
                  onChange={e => setAptSearch(e.target.value)}
                  className="w-full border border-black/10 rounded-lg pl-8 pr-3 py-2 text-[12px] bg-white outline-none focus:border-gold" />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {aptFiltered.slice(0, 20).map(a => (
                  <button key={a.id}
                    onClick={() => setForm(prev => ({
                      ...prev,
                      appointmentId: String(a.id),
                      mr_number:  (a as any).mr_number || '',
                      childName:  a.childName,
                      parentName: a.parentName,
                      date:       a.appointmentDate,
                      visitType:  a.visitType,
                      reason:     a.reason,
                    }))}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white text-[12px] transition-colors flex items-center justify-between">
                    <span className="font-medium text-navy">{a.childName}</span>
                    <span className="text-gray-400">{formatUSDate(a.appointmentDate)} · {a.appointmentTime}</span>
                  </button>
                ))}
                {aptFiltered.length === 0 && <div className="text-[12px] text-gray-400 text-center py-2">No appointments found</div>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Procedure name — only for procedures */}
            {formType === 'procedure' && (
              <div className="col-span-2">
                <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">
                  Procedure Name <span className="text-red-400">*</span>
                </label>
                <input type="text" placeholder="e.g. Nebulization, Dressing, Ear Wash..." value={form.procedureName || ''}
                  onChange={e => setForm(prev => ({ ...prev, procedureName: e.target.value }))}
                  className="w-full border border-purple-200 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-purple-400" />
              </div>
            )}

            {/* MR Number with auto-fetch */}
            <div className="col-span-2">
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">MR Number</label>
              <div className="flex gap-2">
                <input type="text" placeholder="e.g. A0000000001" value={form.mr_number||''}
                  onChange={e => setForm(prev => ({...prev, mr_number: e.target.value}))}
                  className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-[13px] font-mono text-navy bg-white outline-none focus:border-gold"/>
                <button onClick={async () => {
                  if (!form.mr_number) return;
                  const { data: p } = await supabase.from('patients').select('child_name,parent_name').eq('mr_number', form.mr_number).maybeSingle();
                  if (p) {
                    setForm(prev => ({...prev, childName: p.child_name||prev.childName, parentName: p.parent_name||prev.parentName}));
                    toast.success('Patient loaded: ' + p.child_name);
                  } else {
                    toast.error('Patient not found for MR#: ' + form.mr_number);
                  }
                }} className="btn-gold text-[11px] py-2 px-3">Fetch</button>
              </div>
            </div>

            {[
              { label: 'Patient Name', key: 'childName',  type: 'text' },
              { label: 'Parent Name',  key: 'parentName', type: 'text' },
              { label: 'Visit Date',   key: 'date',       type: 'date' },
              { label: formType === 'procedure' ? 'Procedure Type / Notes' : 'Visit Type', key: 'visitType', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
              </div>
            ))}

            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">
                {formType === 'procedure' ? 'Procedure Fee (PKR)' : 'Consultation Fee (PKR)'}
              </label>
              <input type="number" min="0" value={form.feeAmount || ''}
                onChange={e => setForm(prev => ({ ...prev, feeAmount: Number(e.target.value) }))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Discount (PKR)</label>
              <input type="number" min="0" value={form.discount || ''}
                onChange={e => setForm(prev => ({ ...prev, discount: Number(e.target.value) }))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Amount Paid (PKR)</label>
              <input type="number" min="0" value={form.paid || ''}
                onChange={e => setForm(prev => ({ ...prev, paid: Number(e.target.value) }))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Payment Method</label>
              <select value={form.paymentMethod || 'Cash'}
                onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Net summary */}
          <div className="mt-4 rounded-xl p-4 grid grid-cols-3 gap-4 text-center"
            style={{ background: '#f9f7f3', border: '1px solid rgba(201,168,76,0.15)' }}>
            {[
              { label: 'Net Amount',  value: `PKR ${((form.feeAmount||0)-(form.discount||0)).toLocaleString()}`, color: '#0a1628' },
              { label: 'Paid',        value: `PKR ${(form.paid||0).toLocaleString()}`,                           color: '#1a7f5e' },
              { label: 'Balance Due', value: `PKR ${Math.max(0,(form.feeAmount||0)-(form.discount||0)-(form.paid||0)).toLocaleString()}`, color: '#c53030' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">{s.label}</div>
                <div className="text-[18px] font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Notes</label>
            <textarea rows={2} value={form.notes || ''}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes..."
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold resize-none" />
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-black/5">
            <button onClick={saveInvoice} className="btn-gold text-[12px] py-2 px-4 gap-1.5">
              <Save size={13} /> Save {formType === 'procedure' ? 'Procedure' : 'Invoice'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline text-[12px] py-2 px-3">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden animate-in">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <div className="font-medium text-navy text-[14px]">Invoices & Procedures</div>
          <div className="text-[12px] text-gray-400">{filtered.length} records</div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Type</th>
                <th>Patient</th>
                <th>Date</th>
                <th>Details</th>
                <th>Fee</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="text-center py-10 text-gray-400 text-[13px]">
                  No records yet — click "New Invoice" or "Procedure" to create one
                </td></tr>
              )}
              {filtered.map(inv => {
                const net = inv.feeAmount - inv.discount;
                const due = Math.max(0, net - inv.paid);
                return (
                  <tr key={inv.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="font-mono text-[11px] text-gray-500 font-medium">{inv.id}</td>
                    <td><TypeBadge type={inv.recordType} /></td>
                    <td>
                      <div className="font-medium text-navy text-[13px]">{inv.childName}</div>
                      <div className="text-[11px] text-gray-400">Parent: {inv.parentName}</div>
                    </td>
                    <td className="text-[12px] text-navy whitespace-nowrap">{formatUSDate(inv.date)}</td>
                    <td className="text-[11px] text-gray-500 max-w-[130px]">
                      {inv.recordType === 'procedure'
                        ? <span className="font-medium text-purple-700">{inv.procedureName || '—'}</span>
                        : inv.visitType || '—'
                      }
                    </td>
                    <td className="text-[12px] font-medium text-navy">PKR {inv.feeAmount.toLocaleString()}</td>
                    <td className="text-[12px] font-medium" style={{ color: '#1a7f5e' }}>PKR {inv.paid.toLocaleString()}</td>
                    <td className="text-[12px] font-medium" style={{ color: due > 0 ? '#c53030' : '#1a7f5e' }}>
                      {due > 0 ? `PKR ${due.toLocaleString()}` : '✓ Cleared'}
                    </td>
                    <td className="text-[11px] text-gray-500">{inv.paymentMethod}</td>
                    <td><PayPill status={inv.paymentStatus} /></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => { setFormType(inv.recordType); setForm(inv); setShowForm(true); }}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gold/10 transition-colors" title="Edit">
                          <FileText size={12} className="text-gray-600" />
                        </button>
                        <button onClick={() => printInvoice(inv)}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-50 transition-colors" title="Print">
                          <Printer size={12} className="text-gray-600" />
                        </button>
                        <button onClick={() => deleteInvoice(inv)}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-50 transition-colors" title="Delete">
                          <X size={12} className="text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>}
    </div>
  );
}