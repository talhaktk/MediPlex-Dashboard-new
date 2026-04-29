'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { Receipt, CheckCircle, Clock, AlertTriangle, Download, CreditCard } from 'lucide-react';

export default function PatientBilling() {
  const { data: session } = useSession();
  const mrNumber = (session?.user as any)?.mrNumber;
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mrNumber) return;
    supabase.from('billing').select('*').eq('mr_number', mrNumber)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setInvoices(data || []); setLoading(false); });
  }, [mrNumber]);

  const totalPaid = invoices.reduce((s, i) => s + Number(i.paid || 0), 0);
  const totalDue = invoices.reduce((s, i) => s + Math.max(0, Number(i.fee_amount || 0) - Number(i.discount || 0) - Number(i.paid || 0)), 0);

  const statusStyle: Record<string, any> = {
    'Paid':         { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', icon: CheckCircle },
    'Partial':      { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', icon: Clock       },
    'Unpaid':       { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', icon: AlertTriangle },
    'Waived':       { bg: 'rgba(139,92,246,0.1)',  color: '#8b5cf6', icon: CheckCircle },
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#0a1628]">Billing & Payments</h1>
        <p className="text-slate-500 text-sm">Your invoices and payment history</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #e2e8f0' }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={14} className="text-emerald-500" />
            <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Paid</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">PKR {totalPaid.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #e2e8f0' }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Outstanding</span>
          </div>
          <div className="text-2xl font-bold text-red-500">PKR {totalDue.toLocaleString()}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl" style={{ border: '1px solid #e2e8f0' }}>
          <Receipt size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No invoices on file</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const s = statusStyle[inv.payment_status] || statusStyle['Unpaid'];
            const Icon = s.icon;
            const due = Math.max(0, Number(inv.fee_amount || 0) - Number(inv.discount || 0) - Number(inv.paid || 0));
            return (
              <div key={inv.id || inv.invoice_number} className="bg-white rounded-2xl p-5"
                style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: s.bg }}>
                      <Icon size={18} style={{ color: s.color }} />
                    </div>
                    <div>
                      <div className="font-semibold text-[#0a1628]">{inv.service_name || inv.appointment_type || 'Consultation'}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {inv.date || inv.created_at?.slice(0, 10)} · Invoice #{inv.invoice_number || inv.id}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm">
                        <span className="text-slate-600">Fee: <strong>PKR {Number(inv.fee_amount || 0).toLocaleString()}</strong></span>
                        {Number(inv.discount || 0) > 0 && <span className="text-emerald-600">Discount: PKR {Number(inv.discount).toLocaleString()}</span>}
                        <span className="text-emerald-700">Paid: <strong>PKR {Number(inv.paid || 0).toLocaleString()}</strong></span>
                        {due > 0 && <span className="text-red-500 font-semibold">Due: PKR {due.toLocaleString()}</span>}
                      </div>
                      {inv.payment_method && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                          <CreditCard size={10} /> {inv.payment_method}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                    style={{ background: s.bg, color: s.color }}>
                    {inv.payment_status || 'Unpaid'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
