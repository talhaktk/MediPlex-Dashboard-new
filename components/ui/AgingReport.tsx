'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Invoice {
  id: string;
  childName: string;
  parentName: string;
  feeAmount: number;
  discount: number;
  paid: number;
  paymentStatus: string;
  createdAt: string;
  mr_number?: string;
}

export default function AgingReport() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('billing').select('*').then(({ data }) => {
      setInvoices((data || []).map((r: any) => ({
        id: r.invoice_number || r.id,
        childName: r.child_name || '',
        parentName: r.parent_name || '',
        feeAmount: Number(r.consultation_fee) || 0,
        discount: Number(r.discount) || 0,
        paid: Number(r.amount_paid) || 0,
        paymentStatus: r.payment_status || 'Unpaid',
        createdAt: r.created_at || '',
        mr_number: r.mr_number || '',
      })));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-6 text-gray-400 text-[13px]">Loading...</div>;

  const now = new Date();
  const ageD = (d: string) => d ? Math.floor((now.getTime() - new Date(d).getTime()) / 86400000) : 0;
  const due = (inv: Invoice) => Math.max(0, inv.feeAmount - inv.discount - inv.paid);
  const outstanding = invoices.filter(i => i.paymentStatus !== 'Paid' && due(i) > 0);
  const a0  = outstanding.filter(i => ageD(i.createdAt) <= 30);
  const a31 = outstanding.filter(i => ageD(i.createdAt) > 30 && ageD(i.createdAt) <= 60);
  const a60 = outstanding.filter(i => ageD(i.createdAt) > 60);
  const totalBilled    = invoices.reduce((s, i) => s + (i.feeAmount - i.discount), 0);
  const totalCollected = invoices.reduce((s, i) => s + i.paid, 0);
  const cr = totalBilled ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const buckets = [
    { label: '0–30 Days',  items: a0,  color: '#f59e0b', bg: '#fefce8', border: '#fde68a' },
    { label: '31–60 Days', items: a31, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
    { label: '60+ Days',   items: a60, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  ];

  return (
    <div className="space-y-4">
      {/* Collection Rate */}
      <div className="card p-5">
        <div className="font-medium text-navy text-[14px] mb-3">Collection Rate</div>
        <div className="flex items-center gap-4">
          <div className="text-[40px] font-bold leading-none"
            style={{color: cr>=80?'#1a7f5e':cr>=60?'#c9a84c':'#dc2626'}}>
            {cr}%
          </div>
          <div className="flex-1">
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden mb-1">
              <div className="h-full rounded-full transition-all duration-500"
                style={{width:`${cr}%`, background: cr>=80?'#1a7f5e':cr>=60?'#c9a84c':'#dc2626'}}/>
            </div>
            <div className="text-[11px] text-gray-400">
              PKR {totalCollected.toLocaleString()} collected of PKR {totalBilled.toLocaleString()} billed
            </div>
          </div>
        </div>
      </div>

      {/* Aging buckets */}
      <div className="card p-5">
        <div className="font-medium text-navy text-[14px] mb-4">Outstanding Dues — Aging Report</div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {buckets.map(b => (
            <div key={b.label} className="rounded-xl p-4 text-center"
              style={{background:b.bg, border:`1px solid ${b.border}`}}>
              <div className="text-[10px] uppercase tracking-widest font-semibold mb-2"
                style={{color:b.color}}>{b.label}</div>
              <div className="text-[22px] font-bold" style={{color:b.color}}>
                PKR {b.items.reduce((s,i) => s+due(i), 0).toLocaleString()}
              </div>
              <div className="text-[11px] mt-1" style={{color:b.color}}>
                {b.items.length} invoice(s)
              </div>
            </div>
          ))}
        </div>

        {/* Top debtors */}
        {outstanding.length > 0 ? (
          <div>
            <div className="text-[12px] font-medium text-navy mb-3">Top Outstanding Balances</div>
            <div className="space-y-2">
              {[...outstanding]
                .sort((a, b) => due(b) - due(a))
                .slice(0, 10)
                .map((inv, i) => {
                  const d = due(inv);
                  const days = ageD(inv.createdAt);
                  const color = days > 60 ? '#dc2626' : days > 30 ? '#ea580c' : '#f59e0b';
                  return (
                    <div key={inv.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{background:'#f9f7f3', border:'1px solid rgba(201,168,76,0.12)'}}>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-400 w-5 font-mono">{i+1}</span>
                        <div>
                          <div className="text-[13px] font-semibold text-navy">{inv.childName}</div>
                          <div className="text-[11px] text-gray-400">
                            {inv.parentName} · {days} days overdue
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[14px] font-bold" style={{color}}>
                          PKR {d.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-medium"
                          style={{color: inv.paymentStatus==='Partial'?'#c9a84c':'#dc2626'}}>
                          {inv.paymentStatus}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-[13px]">
            ✅ No outstanding dues
          </div>
        )}
      </div>
    </div>
  );
}
