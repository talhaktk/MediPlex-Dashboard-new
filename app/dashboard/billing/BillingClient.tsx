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
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
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
export default function BillingClient({ data }: { data: Appointment[] }) {
  const [invoices,   setInvoices]   = useState<Invoice[]>([]);
  const { clinicId, isSuperAdmin } = useClinic();
  const [search,     setSearch]     = useState('');
  const [filterPay,  setFilterPay]  = useState('all');
  const [filterType, setFilterType] = useState('all');   // 'all' | 'consultation' | 'procedure'
  const [showForm,   setShowForm]   = useState(false);
  const [formType,   setFormType]   = useState<RecordType>('consultation');
  const [form,       setForm]       = useState<Partial<Invoice>>({});
  const [aptSearch,  setAptSearch]  = useState('');
  const [billingTab, setBillingTab] = useState<'invoices'|'expenses'>('invoices');

  // ── Fetch + realtime ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      const { data: rows, error } = await supabase
        .from('billing')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { toast.error('Could not load invoices: ' + error.message); return; }
      if (rows) setInvoices(rows.map(mapRow));
    };
    fetch();
    const ch = supabase
      .channel('billing-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

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

  const totalRevenue  = invoices.reduce((s, i) => s + i.paid, 0);
  const totalPending  = invoices.reduce((s, i) => s + Math.max(0, i.feeAmount - i.discount - i.paid), 0);
  const paidCount     = invoices.filter(i => i.paymentStatus === 'Paid').length;
  const unpaidCount   = invoices.filter(i => i.paymentStatus === 'Unpaid').length;

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
      consultation_fee: form.feeAmount,
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
        <div class="clinic-name">${process.env.NEXT_PUBLIC_CLINIC_NAME||'MediPlex Pediatric Clinic'}</div>
        <div class="clinic-sub">${process.env.NEXT_PUBLIC_CLINIC_ADDRESS||''}</div>
        <div class="clinic-sub">${process.env.NEXT_PUBLIC_CLINIC_PHONE||''} · ${process.env.NEXT_PUBLIC_CLINIC_EMAIL||''}</div>
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
    <div class="footer">Thank you for visiting ${process.env.NEXT_PUBLIC_CLINIC_NAME||'MediPlex Pediatric Clinic'} · ${process.env.NEXT_PUBLIC_DOCTOR_NAME||'Dr. Talha'}</div>
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
        {([['invoices','Invoices'],['expenses','Expenses']] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setBillingTab(k)}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${billingTab===k?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
            {l}
          </button>
        ))}
      </div>
      {billingTab==='expenses' && <ExpensesTab/>}
      {billingTab==='invoices' && <div className="space-y-5">



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