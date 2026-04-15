'use client';

import { supabase } from '@/lib/supabase';
import { useState, useMemo, useEffect } from 'react';
import { Appointment } from '@/types';
import { formatUSDate } from '@/lib/sheets';
import { Plus, FileText, Search, X, Save, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
type Invoice = {
  id: number;                // CHANGED: DB ID is now a number
  invoiceNumber: string;     // ADDED: For the 'INV-...' string
  appointmentId: string;
  mr_number: string;
  childName: string;
  parentName: string;
  date: string;
  visitType: string;
  reason: string;
  feeAmount: number;
  discount: number;
  paid: number;
  paymentMethod: string;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  notes: string;
  createdAt: string;
};

const METHODS = ['Cash', 'Card', 'Online Transfer', 'Insurance', 'Waived'];

function genId() {
  return `INV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

// ── Map DB row → Invoice ──────────────────────────────────────────────────────
function mapRow(r: any): Invoice {
  return {
    id:            r.id,                    // Keep numeric
    invoiceNumber: r.invoice_number ?? '',  // Map custom string
    appointmentId: String(r.appointment_id ?? ''),
    mr_number:     r.mr_number ?? '',
    childName:     r.child_name ?? '',
    parentName:    r.parent_name ?? '',
    date:          r.date ?? r.created_at?.split('T')[0] ?? '',
    visitType:     r.visit_type ?? '',
    reason:        r.reason ?? '',
    feeAmount:     Number(r.consultation_fee) || 0,
    discount:      Number(r.discount) || 0,
    paid:          Number(r.amount_paid) || 0,
    paymentMethod: r.payment_method ?? 'Cash',
    paymentStatus: (r.payment_status ?? r.status ?? 'Unpaid') as Invoice['paymentStatus'],
    notes:         r.notes ?? '',
    createdAt:     r.created_at ?? new Date().toISOString(),
  };
}

function computeStatus(fee: number, discount: number, paid: number): Invoice['paymentStatus'] {
  const net = fee - discount;
  if (paid >= net) return 'Paid';
  if (paid > 0)    return 'Partial';
  return 'Unpaid';
}

function PayPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    Paid:    { bg: '#e8f7f2', color: '#1a7f5e' },
    Partial: { bg: '#fff9e6', color: '#b47a00' },
    Unpaid:  { bg: '#fff0f0', color: '#c53030' },
  };
  const c = cfg[status] || cfg.Unpaid;
  return <span className="pill" style={{ background: c.bg, color: c.color }}>{status}</span>;
}

export default function BillingClient({ data }: { data: Appointment[] }) {
  const [invoices,  setInvoices]  = useState<Invoice[]>([]);
  const [search,    setSearch]    = useState('');
  const [filterPay, setFilterPay] = useState('all');
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState<Partial<Invoice>>({});
  const [aptSearch, setAptSearch] = useState('');

  useEffect(() => {
    const fetchInvoices = async () => {
      const { data: rows, error } = await supabase
        .from('billing')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Could not load invoices: ' + error.message);
        return;
      }
      if (rows) setInvoices(rows.map(mapRow));
    };

    fetchInvoices();
    const channel = supabase.channel('billing-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing' }, () => { fetchInvoices(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const uninvoiced = useMemo(() => {
    const invoicedIds = new Set(invoices.map(i => i.appointmentId));
    return data.filter(a => 
      a.childName && a.appointmentDate && !invoicedIds.has(String(a.id)) && 
      (a.status === 'Confirmed' || a.status === 'Rescheduled')
    ).sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));
  }, [data, invoices]);

  const filtered = useMemo(() => {
    let r = invoices;
    if (filterPay !== 'all') r = r.filter(i => i.paymentStatus === filterPay);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(i => 
        i.childName.toLowerCase().includes(q) || 
        i.invoiceNumber.toLowerCase().includes(q) // Search by custom INV ID
      );
    }
    return [...r].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [invoices, filterPay, search]);

  const totalRevenue = invoices.reduce((s, i) => s + i.paid, 0);
  const totalPending = invoices.reduce((s, i) => s + Math.max(0, i.feeAmount - i.discount - i.paid), 0);
  const paidCount    = invoices.filter(i => i.paymentStatus === 'Paid').length;
  const unpaidCount  = invoices.filter(i => i.paymentStatus === 'Unpaid').length;

  const openNewForm = (apt?: Appointment) => {
    setForm({
      id:            undefined, 
      invoiceNumber: genId(), 
      appointmentId: apt ? String(apt.id) : '',
      mr_number:     (apt as any)?.mr_number ?? '',
      childName:     apt?.childName ?? '',
      parentName:    apt?.parentName ?? '',
      date:          apt?.appointmentDate ?? new Date().toISOString().split('T')[0],
      visitType:     apt?.visitType ?? '',
      reason:        apt?.reason ?? '',
      feeAmount:     500,
      discount:      0,
      paid:          0,
      paymentMethod: 'Cash',
      paymentStatus: 'Unpaid',
      notes:         '',
      createdAt:     new Date().toISOString(),
    });
    setAptSearch('');
    setShowForm(true);
  };

  const saveInvoice = async () => {
    if (!form.childName?.trim()) { toast.error('Patient name is required'); return; }
    
    const status = computeStatus(form.feeAmount || 0, form.discount || 0, form.paid || 0);
    const displayInvoiceId = form.invoiceNumber || genId();

    const payload = {
      ...(form.id ? { id: form.id } : {}), 
      invoice_number:   displayInvoiceId,
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
      created_at:       form.createdAt     || new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('billing').upsert([payload]);
      if (error) throw error;
      setShowForm(false);
      toast.success(`Invoice ${displayInvoiceId} saved!`);
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    }
  };

  const deleteInvoice = async (id: number) => {
    if (!confirm('Delete this invoice?')) return;
    const { error } = await supabase.from('billing').delete().eq('id', id);
    if (error) toast.error('Delete failed: ' + error.message);
    else toast.success('Invoice deleted');
  };

  const printInvoice = (inv: Invoice) => {
    const net = inv.feeAmount - inv.discount;
    const due = Math.max(0, net - inv.paid);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${inv.invoiceNumber}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #c9a84c;padding-bottom:20px;}
      .invoice-id{font-size:28px;font-weight:700;color:#c9a84c;}
      .fee-table{width:100%;border-collapse:collapse;margin-top:20px;}
      .fee-table th{background:#f9f7f3;padding:10px;text-align:left;}
      .fee-table td{padding:10px;border-bottom:1px solid #eee;}
    </style></head><body>
    <div class="header">
      <div><h2>${process.env.NEXT_PUBLIC_CLINIC_NAME || 'MediPlex Pediatric Clinic'}</h2></div>
      <div style="text-align:right"><div class="invoice-id">${inv.invoiceNumber}</div><div>Date: ${formatUSDate(inv.date)}</div></div>
    </div>
    <p><strong>Patient:</strong> ${inv.childName}</p>
    <table class="fee-table">
      <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr><td>Consultation Fee</td><td style="text-align:right">PKR ${inv.feeAmount.toLocaleString()}</td></tr>
        <tr><td>Net Amount</td><td style="text-align:right">PKR ${net.toLocaleString()}</td></tr>
        <tr style="font-weight:bold"><td>Balance Due</td><td style="text-align:right">PKR ${due.toLocaleString()}</td></tr>
      </tbody>
    </table>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const aptFiltered = uninvoiced.filter(a => {
    if (!aptSearch) return true;
    const q = aptSearch.toLowerCase();
    return a.childName.toLowerCase().includes(q) || a.parentName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-[10px] uppercase text-gray-400">Total Revenue</div>
          <div className="text-[18px] font-semibold">PKR {totalRevenue.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase text-gray-400">Pending</div>
          <div className="text-[18px] font-semibold text-red-600">PKR {totalPending.toLocaleString()}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['all', 'Paid', 'Partial', 'Unpaid'].map(f => (
            <button key={f} onClick={() => setFilterPay(f)} className={`px-3 py-1 rounded ${filterPay === f ? 'bg-navy text-white' : 'bg-gray-100'}`}>{f}</button>
          ))}
        </div>
        <button onClick={() => openNewForm()} className="btn-gold px-4 py-2 text-[12px] rounded">+ New Invoice</button>
      </div>

      {/* Form UI */}
      {showForm && (
        <div className="card p-6 border-2 border-gold/30">
          <div className="flex justify-between mb-4">
            <span className="font-bold">{form.invoiceNumber}</span>
            <X className="cursor-pointer" onClick={() => setShowForm(false)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Child Name" value={form.childName || ''} onChange={e => setForm({...form, childName: e.target.value})} className="border p-2 rounded" />
            <input placeholder="Fee" type="number" value={form.feeAmount || ''} onChange={e => setForm({...form, feeAmount: Number(e.target.value)})} className="border p-2 rounded" />
            <input placeholder="Paid" type="number" value={form.paid || ''} onChange={e => setForm({...form, paid: Number(e.target.value)})} className="border p-2 rounded" />
          </div>
          <button onClick={saveInvoice} className="btn-gold w-full mt-4 p-2 rounded">Save Invoice</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table w-full">
          <thead className="bg-gray-50 text-[11px] uppercase text-gray-400">
            <tr>
              <th className="p-3 text-left">Invoice #</th>
              <th className="p-3 text-left">Patient</th>
              <th className="p-3 text-left">Fee</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} className="border-t">
                <td className="p-3 font-mono text-[11px]">{inv.invoiceNumber}</td>
                <td className="p-3 text-[13px] font-medium">{inv.childName}</td>
                <td className="p-3 text-[13px]">PKR {inv.feeAmount}</td>
                <td className="p-3"><PayPill status={inv.paymentStatus} /></td>
                <td className="p-3 flex gap-2">
                   <button onClick={() => { setForm(inv); setShowForm(true); }} className="p-1 bg-gray-100 rounded"><FileText size={14}/></button>
                   <button onClick={() => printInvoice(inv)} className="p-1 bg-gray-100 rounded"><Printer size={14}/></button>
                   <button onClick={() => deleteInvoice(inv.id)} className="p-1 bg-gray-100 rounded"><X size={14}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}