'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Save, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Staff Salaries', 'Rent & Utilities', 'Medical Supplies',
  'Equipment & Maintenance', 'Lab Reagents', 'Marketing & Printing',
  'Medicines Stock', 'Insurance', 'Miscellaneous'
];
const METHODS = ['Cash', 'Card', 'Online Transfer', 'Cheque'];

interface Expense {
  id: number; category: string; amount: number;
  date: string; description: string; payment_method: string; created_at: string;
}

const EMPTY = { category:'Medical Supplies', amount:'', date:new Date().toISOString().split('T')[0], description:'', payment_method:'Cash' };

export default function ExpensesTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({...EMPTY});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('expenses').select('*').order('date', { ascending: false })
      .then(({ data }) => { setExpenses(data || []); setLoading(false); });
  }, []);

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const byCat = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category]||0) + Number(e.amount); });
    return Object.entries(map).sort((a,b) => b[1]-a[1]);
  }, [expenses]);

  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const m = e.date?.slice(0,7) || '';
      map[m] = (map[m]||0) + Number(e.amount);
    });
    return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0])).slice(0,6);
  }, [expenses]);

  const handleSave = async () => {
    if (!form.amount || !form.category || !form.date) { toast.error('Category, amount and date required'); return; }
    setSaving(true);
    const { error } = await supabase.from('expenses').insert([{
      category: form.category, amount: Number(form.amount),
      date: form.date, description: form.description, payment_method: form.payment_method
    }]);
    if (error) { toast.error('Failed: ' + error.message); setSaving(false); return; }
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    setExpenses(data || []);
    setForm({...EMPTY});
    setShowForm(false);
    setSaving(false);
    toast.success('Expense recorded');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast.success('Deleted');
  };

  const maxCat = byCat[0]?.[1] || 1;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Total Expenses</div>
          <div className="text-[24px] font-semibold text-red-600">PKR {totalExpenses.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">This Month</div>
          <div className="text-[24px] font-semibold text-red-500">
            PKR {expenses.filter(e=>e.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,e)=>s+Number(e.amount),0).toLocaleString()}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Categories</div>
          <div className="text-[24px] font-semibold text-navy">{byCat.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Records</div>
          <div className="text-[24px] font-semibold text-navy">{expenses.length}</div>
        </div>
      </div>

      {/* Add expense */}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="btn-gold text-[12px] py-2 px-4 gap-1.5">
          <Plus size={13}/> Add Expense
        </button>
      </div>

      {showForm && (
        <div className="card p-5 animate-in" style={{border:'2px solid rgba(220,38,38,0.2)'}}>
          <div className="flex items-center justify-between mb-4">
            <div className="font-medium text-navy text-[14px]">Record Expense</div>
            <button onClick={()=>setShowForm(false)}><X size={16} className="text-gray-400"/></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Category</label>
              <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Amount (PKR)</label>
              <input type="number" placeholder="0" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Date</label>
              <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Payment Method</label>
              <select value={form.payment_method} onChange={e=>setForm(p=>({...p,payment_method:e.target.value}))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                {METHODS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Description</label>
              <input type="text" placeholder="Details..." value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-gold text-[12px] py-2 px-4 gap-1.5">
              {saving?<><Loader2 size={12} className="animate-spin"/>Saving...</>:<><Save size={12}/>Save Expense</>}
            </button>
            <button onClick={()=>setShowForm(false)} className="btn-outline text-[12px] py-2 px-3">Cancel</button>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {byCat.length > 0 && (
        <div className="card p-5">
          <div className="font-medium text-navy text-[14px] mb-4">Expenses by Category</div>
          <div className="space-y-3">
            {byCat.map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-3">
                <div className="text-[12px] text-gray-600 w-40 flex-shrink-0 truncate">{cat}</div>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${(amt/maxCat)*100}%`,background:'#dc2626'}}/>
                </div>
                <div className="text-[12px] font-medium text-red-600 w-28 text-right">PKR {amt.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly breakdown */}
      {byMonth.length > 0 && (
        <div className="card p-5">
          <div className="font-medium text-navy text-[14px] mb-4">Monthly Expenses</div>
          <div className="space-y-2">
            {byMonth.map(([month, amt]) => (
              <div key={month} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{background:'#fef2f2'}}>
                <div className="text-[13px] font-medium text-navy">{new Date(month+'-01').toLocaleString('en-US',{month:'long',year:'numeric'})}</div>
                <div className="text-[13px] font-semibold text-red-600">PKR {amt.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">All Expenses</div>
        {loading ? <div className="text-center py-8 text-gray-400 text-[13px]">Loading...</div>
        : expenses.length===0 ? <div className="text-center py-8 text-gray-400 text-[13px]">No expenses recorded yet</div>
        : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Method</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {expenses.map(e=>(
                <tr key={e.id}>
                  <td className="text-[12px] text-gray-600">{new Date(e.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
                  <td><span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{background:'#fef2f2',color:'#dc2626'}}>{e.category}</span></td>
                  <td className="text-[12px] text-gray-600">{e.description||'—'}</td>
                  <td className="text-[12px] text-gray-500">{e.payment_method}</td>
                  <td className="text-[13px] font-semibold text-red-600">PKR {Number(e.amount).toLocaleString()}</td>
                  <td><button onClick={()=>handleDelete(e.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
