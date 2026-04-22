'use client';

import { useState, useMemo, useEffect } from 'react';
import { Appointment, MonthlyStats, ReasonStat, AgeStat, DashboardStats } from '@/types';
import { filterAppointments, computeMonthlyStats, exportToCSV, formatUSDate } from '@/lib/sheets';
import { supabase } from '@/lib/supabase';
import AgingReport from '@/components/ui/AgingReport';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { Download, FileText, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const GOLD   = '#c9a84c';
const GREEN  = '#1a7f5e';
const RED    = '#c53030';
const AMBER  = '#b47a00';
const BLUE   = '#2b6cb0';
const PURPLE = '#6d28d9';
const COLORS = [GREEN, RED, AMBER, BLUE, '#7c3aed', '#0369a1'];
const TT = { contentStyle: { background:'#0a1628', border:'1px solid rgba(201,168,76,0.3)', borderRadius:8, color:'#faf8f4', fontSize:12 } };

function normVT(vt: string): 'Follow-up' | 'New Visit' {
  return vt?.toLowerCase().includes('follow') ? 'Follow-up' : 'New Visit';
}

function getPreset(key: string): { from: string; to: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const add  = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };
  if (key==='today') return { from:fmt(today), to:fmt(today) };
  if (key==='week')  return { from:fmt(add(today,-6)), to:fmt(today) };
  if (key==='month') return { from:fmt(new Date(today.getFullYear(),today.getMonth(),1)), to:fmt(today) };
  if (key==='last')  return { from:fmt(new Date(today.getFullYear(),today.getMonth()-1,1)), to:fmt(new Date(today.getFullYear(),today.getMonth(),0)) };
  return { from:'', to:'' };
}

const PRESETS = [
  { key:'today', label:'Today' },
  { key:'week',  label:'Last 7 Days' },
  { key:'month', label:'This Month' },
  { key:'last',  label:'Last Month' },
  { key:'all',   label:'All Time' },
];

const MONTH_MAP: Record<string,string> = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
function monthKey(label: string) {
  const [mon, yr] = label.split(' ');
  return `${yr}-${MONTH_MAP[mon]||'01'}`;
}

function mapDbInvoice(r: any) {
  return {
    id:            r.invoice_number || String(r.id),
    childName:     r.child_name    || '',
    parentName:    r.parent_name   || '',
    date:          r.date          || r.created_at?.split('T')[0] || '',
    visitType:     r.visit_type    || '',
    feeAmount:     Number(r.consultation_fee) || 0,
    discount:      Number(r.discount)         || 0,
    paid:          Number(r.amount_paid)      || 0,
    paymentMethod: r.payment_method || 'Cash',
    paymentStatus: (r.payment_status || 'Unpaid') as 'Paid'|'Partial'|'Unpaid',
    notes:         r.notes    || '',
    createdAt:     r.created_at || new Date().toISOString(),
    recordType:    (r.record_type || 'consultation') as 'consultation'|'procedure',
    procedureName: r.procedure_name || '',
  };
}

interface Props {
  data:          Appointment[];
  stats:         DashboardStats;
  monthly?:      MonthlyStats[];
  monthlyStats?: MonthlyStats[];
  reasons?:      ReasonStat[];
  reasonStats?:  ReasonStat[];
  ages?:         AgeStat[];
  ageStats?:     AgeStat[];
}

export default function AnalyticsClient({ data, stats, ...rest }: Props) {
  const monthly = rest.monthly      || rest.monthlyStats || [];
  const reasons = rest.reasons      || rest.reasonStats  || [];
  const ages    = rest.ages         || rest.ageStats     || [];

  const [rangeFrom,    setRangeFrom]    = useState('');
  const [rangeTo,      setRangeTo]      = useState('');
  const [activePreset, setActivePreset] = useState('all');
  const [activeTab,    setActiveTab]    = useState<'overview'|'monthly'|'patients'|'trends'|'billing'|'aging'|'expenses'>('overview');  const [drillMonth,   setDrillMonth]   = useState<string|null>(null);

  const applyPreset = (key: string) => {
    const { from, to } = getPreset(key);
    setRangeFrom(from); setRangeTo(to); setActivePreset(key);
  };

  // ── Billing from Supabase ─────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<ReturnType<typeof mapDbInvoice>[]>([]);

  useEffect(() => {
    const fetchBilling = async () => {
      const { data: rows, error } = await supabase
        .from('billing').select('*').order('created_at', { ascending: false });
      if (!error && rows) setInvoices(rows.map(mapDbInvoice));
    };
    fetchBilling();
    const ch = supabase.channel('analytics-billing')
      .on('postgres_changes', { event:'*', schema:'public', table:'billing' }, fetchBilling)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filteredInvoices = useMemo(() => invoices.filter(inv => {
    if (rangeFrom && inv.date < rangeFrom) return false;
    if (rangeTo   && inv.date > rangeTo)   return false;
    return true;
  }), [invoices, rangeFrom, rangeTo]);

  const [expenses, setExpenses] = useState<any[]>([]);

  // Fetch expenses
  useEffect(() => {
    supabase.from('expenses').select('*').order('date',{ascending:false})
      .then(({data}) => { if(data) setExpenses(data); });
  }, []);

  const totalExpenses = expenses.reduce((s,e) => s + Number(e.amount), 0);
  const netProfit = invoices.reduce((s,i) => s + i.paid, 0) - totalExpenses;

  const totalRevenue = invoices.reduce((s,i) => s + i.paid, 0);
  const totalPending = invoices.reduce((s,i) => s + Math.max(0, i.feeAmount-i.discount-i.paid), 0);
  const paidCount    = invoices.filter(i => i.paymentStatus==='Paid').length;
  const unpaidCount  = invoices.filter(i => i.paymentStatus==='Unpaid').length;

  const filteredRevenue = filteredInvoices.reduce((s,i) => s + i.paid, 0);
  const filteredPending = filteredInvoices.reduce((s,i) => s + Math.max(0,i.feeAmount-i.discount-i.paid), 0);

  const consultInvoices   = invoices.filter(i => i.recordType !== 'procedure');
  const procedureInvoices = invoices.filter(i => i.recordType === 'procedure');
  const filteredConsult   = filteredInvoices.filter(i => i.recordType !== 'procedure');
  const filteredProcedure = filteredInvoices.filter(i => i.recordType === 'procedure');

  const monthlyBilling = useMemo(() => {
    const map: Record<string,{
      month:string; invoices:number; revenue:number; paid:number; unpaid:number; partial:number;
      consultRevenue:number; procedureRevenue:number; consultCount:number; procedureCount:number;
    }> = {};
    invoices.forEach(inv => {
      if (!inv.date) return;
      const d = new Date(inv.date);
      if (isNaN(d.getTime())) return;
      const label = d.toLocaleString('en-US', { month:'short', year:'numeric' });
      if (!map[label]) map[label] = { month:label, invoices:0, revenue:0, paid:0, unpaid:0, partial:0, consultRevenue:0, procedureRevenue:0, consultCount:0, procedureCount:0 };
      map[label].invoices++;
      map[label].revenue += inv.paid;
      if (inv.paymentStatus==='Paid')         map[label].paid++;
      else if (inv.paymentStatus==='Unpaid')  map[label].unpaid++;
      else if (inv.paymentStatus==='Partial') map[label].partial++;
      if (inv.recordType==='procedure') { map[label].procedureRevenue+=inv.paid; map[label].procedureCount++; }
      else                              { map[label].consultRevenue+=inv.paid;   map[label].consultCount++; }
    });
    return Object.values(map).sort((a,b) => a.month.localeCompare(b.month));
  }, [invoices]);

  // ── Appointment data ──────────────────────────────────────────────────────
  const rangeFiltered  = useMemo(() => filterAppointments(data,{dateFrom:rangeFrom,dateTo:rangeTo}), [data,rangeFrom,rangeTo]);
  const rangeMonthly   = useMemo(() => computeMonthlyStats(rangeFiltered), [rangeFiltered]);
  const displayMonthly = rangeMonthly.length ? rangeMonthly : monthly;

  const drillData = useMemo(() => {
    if (!drillMonth) return [];
    return rangeFiltered.filter(a => {
      if (!a.appointmentDate) return false;
      const d = new Date(a.appointmentDate);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === drillMonth;
    });
  }, [drillMonth, rangeFiltered]);

  const rs = useMemo(() => {
    const confirmed   = rangeFiltered.filter(a => a.status==='Confirmed').length;
    const cancelled   = rangeFiltered.filter(a => a.status==='Cancelled').length;
    const rescheduled = rangeFiltered.filter(a => a.status==='Rescheduled').length;
    const newVisit    = rangeFiltered.filter(a => normVT(a.visitType)==='New Visit').length;
    const followUp    = rangeFiltered.filter(a => normVT(a.visitType)==='Follow-up').length;
    const inClinic    = rangeFiltered.filter(a => a.attendanceStatus==='In Clinic').length;
    const absent      = rangeFiltered.filter(a => a.attendanceStatus==='Absent'||a.attendanceStatus==='No-Show').length;
    return { total:rangeFiltered.length, confirmed, cancelled, rescheduled, newVisit, followUp, inClinic, absent };
  }, [rangeFiltered]);

  const dowData = useMemo(() => {
    const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const counts = new Array(7).fill(0);
    rangeFiltered.forEach(a => {
      if (!a.appointmentDate) return;
      const d = new Date(a.appointmentDate);
      if (!isNaN(d.getTime())) counts[d.getDay()]++;
    });
    return days.map((d,i) => ({ day:d, count:counts[i] }));
  }, [rangeFiltered]);

  const rateData = displayMonthly.map(m => ({ month:m.month, rate: m.total?Math.round(m.confirmed/m.total*100):0 }));

  const handleExportCSV = () => {
    exportToCSV(rangeFiltered, `mediplex_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${rs.total} records`);
  };

  const exportPDF = () => {
    const period = rangeFrom && rangeTo ? `${rangeFrom} to ${rangeTo}` : 'All Time';
    const monthRows = displayMonthly.map(m =>
      '<tr><td>' + m.month + '</td><td>' + m.total + '</td>' +
      '<td style="color:#1a7f5e">' + m.confirmed + '</td>' +
      '<td style="color:#c53030">' + m.cancelled + '</td>' +
      '<td style="color:#b47a00">' + m.rescheduled + '</td>' +
      '<td>' + (m.total ? Math.round(m.confirmed / m.total * 100) : 0) + '%</td></tr>'
    ).join('');
    const consultRev   = consultInvoices.reduce((s, i) => s + i.paid, 0);
    const procedureRev = procedureInvoices.reduce((s, i) => s + i.paid, 0);
    const html = [
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Analytics</title>',
      '<style>',
      '*{box-sizing:border-box;margin:0;padding:0}',
      'body{font-family:Arial,sans-serif;color:#0a1628;padding:32px;font-size:13px}',
      'h1{font-size:20px;font-weight:700;margin-bottom:2px}',
      '.meta{color:#6b7280;font-size:11px;margin-bottom:28px}',
      'h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin:24px 0 10px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}',
      '.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:8px}',
      '.card{border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px}',
      '.val{font-size:26px;font-weight:700;line-height:1}',
      '.lbl{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-top:4px}',
      'table{width:100%;border-collapse:collapse;margin-top:4px}',
      'th{background:#0a1628;color:#fff;padding:7px 12px;text-align:left;font-size:11px}',
      'td{padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:12px}',
      '.footer{margin-top:28px;font-size:10px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:10px;text-align:center}',
      '</style></head><body>',
      '<h1>MediPlex Pediatric Clinic - Analytics Report</h1>',
      '<div class="meta">Period: <strong>' + period + '</strong> - Generated: ' + new Date().toLocaleString() + '</div>',
      '<h2>A - Appointment Status</h2>',
      '<div class="grid4">',
      '<div class="card"><div class="val">' + rs.total + '</div><div class="lbl">Total</div></div>',
      '<div class="card"><div class="val" style="color:#1a7f5e">' + rs.confirmed + '</div><div class="lbl">Confirmed</div></div>',
      '<div class="card"><div class="val" style="color:#c53030">' + rs.cancelled + '</div><div class="lbl">Cancelled</div></div>',
      '<div class="card"><div class="val" style="color:#b47a00">' + rs.rescheduled + '</div><div class="lbl">Rescheduled</div></div>',
      '</div>',
      '<h2>B - Monthly Breakdown</h2>',
      '<table><thead><tr><th>Month</th><th>Total</th><th>Confirmed</th><th>Cancelled</th><th>Rescheduled</th><th>Rate</th></tr></thead>',
      '<tbody>' + monthRows + '</tbody></table>',
      '<h2>C - Billing Summary (Consultations + Procedures)</h2>',
      '<div class="grid4">',
      '<div class="card"><div class="val" style="color:#1a7f5e">PKR ' + totalRevenue.toLocaleString() + '</div><div class="lbl">Total Revenue</div></div>',
      '<div class="card"><div class="val" style="color:#c53030">PKR ' + totalPending.toLocaleString() + '</div><div class="lbl">Pending</div></div>',
      '<div class="card"><div class="val" style="color:#0369a1">PKR ' + consultRev.toLocaleString() + '</div><div class="lbl">Consultation Revenue</div></div>',
      '<div class="card"><div class="val" style="color:#6d28d9">PKR ' + procedureRev.toLocaleString() + '</div><div class="lbl">Procedure Revenue</div></div>',
      '</div>',
      '<div class="footer">MediPlex Pediatric Clinic - Confidential - ' + new Date().toLocaleDateString() + '</div>',
      '</body></html>',
    ].join('');
    const w = window.open('', '_blank');
    if (!w) { toast.error('Allow popups'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const tabs = ['overview','monthly','patients','trends','billing','aging','expenses'] as const;
  const tabLabels = { overview:'Overview', monthly:'Monthly Records', patients:'Demographics', trends:'Trends', billing:'Billing', aging:'Aging & Dues', expenses:'Expenses' };
  const safeReasons = reasons||[];
  const safeAges    = ages||[];

  return (
    <div className="space-y-5">

      {/* Period Selector */}
      <div className="card p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => applyPreset(p.key)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${activePreset===p.key?'bg-navy text-white border-navy':'border-black/10 text-gray-500 hover:border-gold hover:text-navy'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">From</label>
            <input type="date" value={rangeFrom} onChange={e=>{setRangeFrom(e.target.value);setActivePreset('');}}
              className="border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
          </div>
          <div>
            <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">To</label>
            <input type="date" value={rangeTo} onChange={e=>{setRangeTo(e.target.value);setActivePreset('');}}
              className="border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
          </div>
          <div className="flex-1"/>
          <button onClick={handleExportCSV} className="btn-outline gap-1.5 text-[12px] py-2 px-4"><Download size={13}/> Export CSV</button>
          <button onClick={exportPDF} className="btn-gold gap-1.5 text-[12px] py-2 px-4"><FileText size={13}/> Export PDF</button>
        </div>

        {/* KPI Bar */}
        <div className="mt-5 pt-5 border-t border-black/5 space-y-4">

          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">Appointment Status</div>
            <div className="grid grid-cols-4 gap-3">
              {[
                {label:'Total',val:rs.total,color:'#0a1628'},
                {label:'Confirmed',val:rs.confirmed,color:GREEN},
                {label:'Cancelled',val:rs.cancelled,color:RED},
                {label:'Rescheduled',val:rs.rescheduled,color:AMBER},
              ].map(s=>(
                <div key={s.label} className="text-center">
                  <div className="font-semibold text-[22px] leading-none" style={{color:s.color}}>{s.val}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">Visit Type</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {label:'New Visits',val:rs.newVisit,color:GREEN},
                {label:'Follow-ups',val:rs.followUp,color:BLUE},
              ].map(s=>(
                <div key={s.label} className="text-center">
                  <div className="font-semibold text-[22px] leading-none" style={{color:s.color}}>{s.val}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">Clinic Attendance</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {label:'In Clinic',val:rs.inClinic,color:'#166534'},
                {label:'Absent / No-Show',val:rs.absent,color:RED},
                {label:'Awaiting',val:rs.total-rs.inClinic-rs.absent,color:'#6b7280'},
              ].map(s=>(
                <div key={s.label} className="text-center">
                  <div className="font-semibold text-[22px] leading-none" style={{color:s.color}}>{s.val}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">Billing</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[
                {label:'Revenue (Period)',val:`PKR ${filteredRevenue.toLocaleString()}`,color:'#1a7f5e'},
                {label:'Pending (Period)',val:`PKR ${filteredPending.toLocaleString()}`,color:RED},
                {label:'Paid Invoices',val:filteredInvoices.filter(i=>i.paymentStatus==='Paid').length,color:'#1a7f5e'},
                {label:'Unpaid Invoices',val:filteredInvoices.filter(i=>i.paymentStatus==='Unpaid').length,color:RED},
              ].map(s=>(
                <div key={s.label} className="text-center">
                  <div className="font-semibold text-[18px] leading-none" style={{color:s.color}}>{s.val}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-black/5">
              <div className="rounded-xl px-4 py-3" style={{background:'#e0f2fe',border:'1px solid rgba(3,105,161,0.15)'}}>
                <div className="text-[10px] uppercase tracking-widest font-medium mb-0.5" style={{color:'#0369a1'}}>Consultations</div>
                <div className="text-[15px] font-bold" style={{color:'#0369a1'}}>PKR {filteredConsult.reduce((s,i)=>s+i.paid,0).toLocaleString()}</div>
                <div className="text-[10px] text-blue-600">{filteredConsult.length} invoices</div>
              </div>
              <div className="rounded-xl px-4 py-3" style={{background:'#ede9fe',border:'1px solid rgba(109,40,217,0.15)'}}>
                <div className="text-[10px] uppercase tracking-widest font-medium mb-0.5" style={{color:PURPLE}}>Procedures</div>
                <div className="text-[15px] font-bold" style={{color:PURPLE}}>PKR {filteredProcedure.reduce((s,i)=>s+i.paid,0).toLocaleString()}</div>
                <div className="text-[10px] text-purple-600">{filteredProcedure.length} invoices</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7 w-fit">
        {tabs.map(t=>(
          <button key={t} onClick={()=>{setActiveTab(t);setDrillMonth(null);}}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${activeTab===t?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab==='overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Monthly Volume</div>
              <div className="p-5" style={{height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayMonthly}>
                    <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={25}/>
                    <Tooltip {...TT}/><Legend wrapperStyle={{fontSize:11}}/>
                    <Bar dataKey="confirmed"   name="Confirmed"   stackId="a" fill={GREEN}/>
                    <Bar dataKey="cancelled"   name="Cancelled"   stackId="a" fill={RED}/>
                    <Bar dataKey="rescheduled" name="Rescheduled" stackId="a" fill={AMBER} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Confirmation Rate Trend</div>
              <div className="p-5" style={{height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rateData}>
                    <CartesianGrid stroke="rgba(0,0,0,0.04)"/>
                    <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0,100]} tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={30} unit="%"/>
                    <Tooltip {...TT} formatter={(v:unknown)=>[`${v}%`,'Rate']}/>
                    <Line type="monotone" dataKey="rate" stroke={GOLD} strokeWidth={2} dot={{fill:GOLD,r:4}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">New Visit vs Follow-up</div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    {label:'New Visit',val:rs.newVisit,color:GREEN,bg:'#e8f7f2'},
                    {label:'Follow-up',val:rs.followUp,color:BLUE,bg:'#ebf4ff'},
                  ].map(v=>(
                    <div key={v.label} className="rounded-xl p-4 text-center" style={{background:v.bg}}>
                      <div className="text-[32px] font-semibold leading-none" style={{color:v.color}}>{v.val}</div>
                      <div className="text-[11px] text-gray-500 mt-1">{v.label}</div>
                      <div className="text-[10px] mt-0.5" style={{color:v.color}}>{rs.total?Math.round(v.val/rs.total*100):0}%</div>
                    </div>
                  ))}
                </div>
                <div className="flex rounded-full overflow-hidden h-3">
                  <div style={{width:`${rs.total?Math.round(rs.newVisit/rs.total*100):50}%`,background:GREEN}}/>
                  <div style={{flex:1,background:BLUE}}/>
                </div>
              </div>
            </div>
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Clinic Attendance</div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    {label:'In Clinic',val:rs.inClinic,color:'#166534',bg:'#dcfce7'},
                    {label:'Absent',val:rs.absent,color:RED,bg:'#fee2e2'},
                    {label:'Awaiting',val:rs.total-rs.inClinic-rs.absent,color:'#6b7280',bg:'#f3f4f6'},
                  ].map(v=>(
                    <div key={v.label} className="rounded-xl p-3 text-center" style={{background:v.bg}}>
                      <div className="text-[28px] font-semibold leading-none" style={{color:v.color}}>{v.val}</div>
                      <div className="text-[10px] mt-1" style={{color:v.color}}>{v.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Busiest Days of Week</div>
            <div className="p-5" style={{height:200}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dowData} barSize={40}>
                  <XAxis dataKey="day" tick={{fontSize:12,fill:'#8a9bb0'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={20}/>
                  <Tooltip {...TT}/>
                  <Bar dataKey="count" name="Appointments" radius={[4,4,0,0]}>
                    {dowData.map((e,i)=><Cell key={i} fill={e.count===Math.max(...dowData.map(d=>d.count))?GOLD:'#e8e4da'}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── MONTHLY ── */}
      {activeTab==='monthly' && (
        <div className="space-y-5">
          {drillMonth ? (
            <div className="space-y-4 animate-in">
              <button onClick={()=>setDrillMonth(null)} className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-navy transition-colors">
                <ChevronLeft size={15}/> Back to all months
              </button>
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                  <div className="font-medium text-navy text-[14px]">Detail — {drillData.length} appointments</div>
                  <button onClick={()=>{exportToCSV(drillData,'month_detail.csv');toast.success('CSV exported');}} className="btn-outline text-[11px] py-1.5 px-3 gap-1"><Download size={11}/> CSV</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Patient</th><th>Parent</th><th>Age</th><th>Date</th><th>Time</th><th>Reason</th><th>Visit</th><th>Status</th></tr></thead>
                    <tbody>
                      {drillData.map(a=>(
                        <tr key={a.id}>
                          <td className="font-medium text-navy text-[13px]">{a.childName}</td>
                          <td className="text-[12px] text-gray-500">{a.parentName}</td>
                          <td className="text-[12px] text-gray-500">{a.childAge?`${a.childAge} yr`:'—'}</td>
                          <td className="text-[12px] text-navy whitespace-nowrap">{formatUSDate(a.appointmentDate)}</td>
                          <td className="text-[12px] text-gray-500">{a.appointmentTime||'—'}</td>
                          <td className="text-[12px] text-gray-600 max-w-[140px] truncate">{a.reason||'—'}</td>
                          <td><span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{background:normVT(a.visitType)==='Follow-up'?'#ebf4ff':'#e8f7f2',color:normVT(a.visitType)==='Follow-up'?BLUE:GREEN}}>{normVT(a.visitType)}</span></td>
                          <td><span className={`pill pill-${(a.status||'').toLowerCase().replace(/[\s-]/g,'')}`}>{a.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="card overflow-hidden animate-in">
                <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                  <div className="font-medium text-navy text-[14px]">Monthly Summary</div>
                  <div className="text-[12px] text-gray-400">Click row to drill down</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Month</th><th>Total</th><th>Confirmed</th><th>Cancelled</th><th>Rescheduled</th><th>In Clinic</th><th>Absent</th></tr></thead>
                    <tbody>
                      {displayMonthly.map(m=>{
                        const mk=monthKey(m.month);
                        const md=rangeFiltered.filter(a=>{const d=new Date(a.appointmentDate);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===mk;});
                        const mInClinic=md.filter(a=>(a.attendanceStatus||'')==='In Clinic').length;
                        const mAbsent=md.filter(a=>['Absent','No-Show'].includes(a.attendanceStatus||'')).length;
                        return(
                          <tr key={m.month} onClick={()=>setDrillMonth(mk)} className="cursor-pointer hover:bg-amber-50/30 transition-colors">
                            <td className="font-medium text-navy">{m.month}</td>
                            <td><span className="font-semibold text-navy">{m.total}</span></td>
                            <td><span className="text-emerald-700 font-medium">{m.confirmed}</span></td>
                            <td><span className="text-red-600 font-medium">{m.cancelled}</span></td>
                            <td><span className="text-amber-600 font-medium">{m.rescheduled}</span></td>
                            <td><span className="text-emerald-700 font-medium">{mInClinic}</span></td>
                            <td><span className="text-red-600 font-medium">{mAbsent}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card animate-in">
                <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Status Trend</div>
                <div className="p-5" style={{height:280}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayMonthly.map(m=>({month:m.month,Confirmed:m.confirmed,Cancelled:m.cancelled,Rescheduled:m.rescheduled}))}>
                      <CartesianGrid stroke="rgba(0,0,0,0.04)"/>
                      <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={25}/>
                      <Tooltip {...TT}/><Legend wrapperStyle={{fontSize:11}}/>
                      <Area type="monotone" dataKey="Confirmed"   stackId="1" stroke={GREEN} fill="#e8f7f2" strokeWidth={1.5}/>
                      <Area type="monotone" dataKey="Cancelled"   stackId="1" stroke={RED}   fill="#fff0f0" strokeWidth={1.5}/>
                      <Area type="monotone" dataKey="Rescheduled" stackId="1" stroke={AMBER} fill="#fff9e6" strokeWidth={1.5}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── DEMOGRAPHICS ── */}
      {activeTab==='patients' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Age Distribution</div>
              <div className="p-5" style={{height:260}}>
                {safeAges.length>0?(
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={safeAges} layout="vertical" barSize={22}>
                      <XAxis type="number" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="bucket" tick={{fontSize:11,fill:'#4a5568'}} axisLine={false} tickLine={false} width={80}/>
                      <Tooltip {...TT}/>
                      <Bar dataKey="count" name="Patients" radius={[0,3,3,0]}>{safeAges.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ):<div className="flex items-center justify-center h-full text-gray-400 text-[13px]">No age data available</div>}
              </div>
            </div>
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Top Reasons for Visit</div>
              <div className="p-5" style={{height:260}}>
                {safeReasons.length>0?(
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={safeReasons} cx="50%" cy="50%" outerRadius={95} dataKey="count" nameKey="reason" paddingAngle={2}>
                        {safeReasons.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip {...TT}/>
                    </PieChart>
                  </ResponsiveContainer>
                ):<div className="flex items-center justify-center h-full text-gray-400 text-[13px]">No reason data</div>}
              </div>
            </div>
          </div>
          {safeReasons.length>0&&(
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Visit Reasons Ranked</div>
              <div className="p-5 space-y-3">
                {safeReasons.map((r,i)=>(
                  <div key={r.reason} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{background:`${COLORS[i%COLORS.length]}18`,color:COLORS[i%COLORS.length]}}>{i+1}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[12px] font-medium text-navy mb-1"><span>{r.reason}</span><span>{r.count}</span></div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${Math.round(r.count/safeReasons[0].count*100)}%`,background:COLORS[i%COLORS.length]}}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TRENDS ── */}
      {activeTab==='trends' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              {label:'Avg / Month',       val:monthly.length?Math.round(data.length/monthly.length):0,                                              color:GOLD},
              {label:'Peak Month',        val:[...monthly].sort((a,b)=>b.total-a.total)[0]?.month||'—',                                             color:GREEN},
              {label:'Best Confirm Rate', val:monthly.length?`${Math.max(...monthly.map(m=>m.total?Math.round(m.confirmed/m.total*100):0))}%`:'—',  color:BLUE},
              {label:'Total Patients',    val:new Set(data.map(a=>a.childName?.toLowerCase()).filter(Boolean)).size,                                 color:'#7c3aed'},
            ].map(s=>(
              <div key={s.label} className="kpi-card animate-in">
                <div className="text-[10px] tracking-widest uppercase text-gray-400 font-medium mb-2">{s.label}</div>
                <div className="font-display text-[28px] font-semibold leading-none" style={{color:s.color}}>{s.val}</div>
              </div>
            ))}
          </div>
          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Cumulative Growth</div>
            <div className="p-5" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(() => { let c=0; return displayMonthly.map(m=>({month:m.month,total:m.total,cumulative:(c+=m.total)})); })()}>
                  <CartesianGrid stroke="rgba(0,0,0,0.04)"/>
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={30}/>
                  <Tooltip {...TT}/><Legend wrapperStyle={{fontSize:11}}/>
                  <Area type="monotone" dataKey="cumulative" name="Cumulative Total" stroke={GOLD} fill="rgba(201,168,76,0.1)" strokeWidth={2}/>
                  <Area type="monotone" dataKey="total"      name="Monthly New"      stroke={BLUE} fill="rgba(43,108,176,0.08)" strokeWidth={1.5}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">New Visit vs Follow-up by Month</div>
            <div className="p-5" style={{height:260}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayMonthly.map(m=>{
                  const mk=monthKey(m.month);
                  const md=rangeFiltered.filter(a=>{const d=new Date(a.appointmentDate);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===mk;});
                  return {month:m.month,'New Visit':md.filter(a=>normVT(a.visitType)==='New Visit').length,'Follow-up':md.filter(a=>normVT(a.visitType)==='Follow-up').length};
                })}>
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={25}/>
                  <Tooltip {...TT}/><Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="New Visit" fill={GREEN} radius={[2,2,0,0]}/>
                  <Bar dataKey="Follow-up" fill={BLUE}  radius={[2,2,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── BILLING TAB ── */}
      {activeTab==='billing' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {label:'Total Revenue',   val:`PKR ${totalRevenue.toLocaleString()}`,  color:'#1a7f5e', bg:'#e8f7f2'},
              {label:'Total Pending',   val:`PKR ${totalPending.toLocaleString()}`,  color:RED,       bg:'#fff0f0'},
              {label:'Total Expenses',  val:`PKR ${totalExpenses.toLocaleString()}`, color:'#dc2626', bg:'#fef2f2'},
              {label:'Net Profit',      val:`PKR ${netProfit.toLocaleString()}`,     color:netProfit>=0?'#1a7f5e':'#dc2626', bg:netProfit>=0?'#f0fdf4':'#fef2f2'},
            ].map(s=>(
              <div key={s.label} className="card p-4">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">{s.label}</div>
                <div className="text-[22px] font-semibold" style={{color:s.color}}>{s.val}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4" style={{border:'1px solid rgba(3,105,161,0.2)'}}>
              <div className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{color:'#0369a1'}}>Consultations</div>
              <div className="text-[22px] font-bold" style={{color:'#0369a1'}}>PKR {consultInvoices.reduce((s,i)=>s+i.paid,0).toLocaleString()}</div>
              <div className="text-[11px] text-gray-400 mt-1">{consultInvoices.length} invoices · {consultInvoices.filter(i=>i.paymentStatus==='Paid').length} paid</div>
            </div>
            <div className="card p-4" style={{border:'1px solid rgba(109,40,217,0.2)'}}>
              <div className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{color:PURPLE}}>Procedures</div>
              <div className="text-[22px] font-bold" style={{color:PURPLE}}>PKR {procedureInvoices.reduce((s,i)=>s+i.paid,0).toLocaleString()}</div>
              <div className="text-[11px] text-gray-400 mt-1">{procedureInvoices.length} invoices · {procedureInvoices.filter(i=>i.paymentStatus==='Paid').length} paid</div>
            </div>
          </div>

          {/* Revenue vs Expenses Chart */}
          {monthlyBilling.length>0&&(
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Revenue vs Expenses — Net Profit</div>
              <div className="p-5" style={{height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyBilling.map(m => {
                    const monthExp = expenses.filter(e=>e.date?.startsWith(m.month.replace(/\s/g,'-').toLowerCase())||false).reduce((s,e)=>s+Number(e.amount),0);
                    const mExp = expenses.filter(e=>{
                      const d = new Date(e.date);
                      const label = d.toLocaleString('en-US',{month:'short',year:'2-digit'});
                      return label === m.month;
                    }).reduce((s,e)=>s+Number(e.amount),0);
                    return {...m, expenses: mExp, profit: m.revenue - mExp};
                  })}>
                    <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={60} tickFormatter={(v:number)=>`${(v/1000).toFixed(0)}k`}/>
                    <Tooltip {...TT} formatter={(v:unknown,name:unknown)=>[`PKR ${Number(v).toLocaleString()}`,String(name)]}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <Bar dataKey="revenue" name="Revenue" fill={BLUE} radius={[3,3,0,0]}/>
                    <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[3,3,0,0]}/>
                    <Bar dataKey="profit" name="Net Profit" fill="#10b981" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {monthlyBilling.length>0&&(
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Monthly Revenue — Consultations + Procedures</div>
              <div className="p-5" style={{height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyBilling}>
                    <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={60} tickFormatter={(v:number)=>`${(v/1000).toFixed(0)}k`}/>
                    <Tooltip {...TT} formatter={(v:unknown,name:unknown)=>[`PKR ${Number(v).toLocaleString()}`,String(name)]}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <Bar dataKey="consultRevenue"   name="Consultations" stackId="a" fill={BLUE}   radius={[0,0,0,0]}/>
                    <Bar dataKey="procedureRevenue" name="Procedures"    stackId="a" fill={PURPLE} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {monthlyBilling.length>0&&(
            <div className="card overflow-hidden animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Monthly Billing Breakdown</div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th><th>Total Invoices</th><th>Total Revenue</th>
                      <th style={{color:'#0369a1'}}>Consult Rev.</th><th style={{color:PURPLE}}>Procedure Rev.</th>
                      <th>Paid</th><th>Unpaid</th><th>Partial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyBilling.map(m=>(
                      <tr key={m.month}>
                        <td className="font-medium text-navy">{m.month}</td>
                        <td><span className="font-semibold text-navy">{m.invoices}</span></td>
                        <td><span className="font-medium" style={{color:'#1a7f5e'}}>PKR {m.revenue.toLocaleString()}</span></td>
                        <td><span className="font-medium" style={{color:'#0369a1'}}>PKR {m.consultRevenue.toLocaleString()}</span></td>
                        <td><span className="font-medium" style={{color:PURPLE}}>PKR {m.procedureRevenue.toLocaleString()}</span></td>
                        <td><span className="font-medium" style={{color:'#1a7f5e'}}>{m.paid}</span></td>
                        <td><span className="font-medium" style={{color:RED}}>{m.unpaid}</span></td>
                        <td><span className="font-medium" style={{color:AMBER}}>{m.partial}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card overflow-hidden animate-in">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
              <div className="font-medium text-navy text-[14px]">All Records</div>
              <div className="text-[12px] text-gray-400">{filteredInvoices.length} records</div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Invoice #</th><th>Type</th><th>Patient</th><th>Date</th><th>Fee</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filteredInvoices.length===0&&(
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-[13px]">No invoices in this period</td></tr>
                  )}
                  {filteredInvoices.map(inv=>{
                    const due=Math.max(0,inv.feeAmount-inv.discount-inv.paid);
                    return(
                      <tr key={inv.id}>
                        <td className="font-mono text-[11px] text-gray-500">{inv.id}</td>
                        <td>
                          {inv.recordType==='procedure'
                            ?<span className="pill" style={{background:'#ede9fe',color:'#6d28d9'}}>Procedure</span>
                            :<span className="pill" style={{background:'#e0f2fe',color:'#0369a1'}}>Consult</span>}
                        </td>
                        <td>
                          <div className="font-medium text-navy text-[13px]">{inv.childName}</div>
                          <div className="text-[11px] text-gray-400">{inv.recordType==='procedure'?inv.procedureName:inv.parentName}</div>
                        </td>
                        <td className="text-[12px] text-navy whitespace-nowrap">{formatUSDate(inv.date)}</td>
                        <td className="text-[12px] font-medium text-navy">PKR {inv.feeAmount.toLocaleString()}</td>
                        <td className="text-[12px] font-medium" style={{color:'#1a7f5e'}}>PKR {inv.paid.toLocaleString()}</td>
                        <td className="text-[12px] font-medium" style={{color:due>0?RED:'#1a7f5e'}}>{due>0?`PKR ${due.toLocaleString()}`:'✓ Cleared'}</td>
                        <td><span className={`pill ${inv.paymentStatus==='Paid'?'pill-confirmed':inv.paymentStatus==='Partial'?'pill-rescheduled':'pill-cancelled'}`}>{inv.paymentStatus}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab==='expenses' && (
        <div className="space-y-5">
          {/* Monthly expenses breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {label:'Total Expenses', val:`PKR ${totalExpenses.toLocaleString()}`, color:'#dc2626', bg:'#fef2f2'},
              {label:'This Month', val:`PKR ${expenses.filter(e=>e.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,e)=>s+Number(e.amount),0).toLocaleString()}`, color:'#ea580c', bg:'#fff7ed'},
              {label:'Net Profit', val:`PKR ${netProfit.toLocaleString()}`, color:netProfit>=0?'#1a7f5e':'#dc2626', bg:netProfit>=0?'#f0fdf4':'#fef2f2'},
              {label:'Expense Records', val:expenses.length, color:'#0a1628', bg:'#f9f7f3'},
            ].map(s=>(
              <div key={s.label} className="card p-4">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">{s.label}</div>
                <div className="text-[22px] font-semibold" style={{color:s.color}}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Revenue vs Expenses chart */}
          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Revenue vs Expenses — Net Profit</div>
            <div className="p-5" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBilling.map(m => {
                  const mExp = expenses.filter(e=>{
                    if(!e.date) return false;
                    const ym = e.date.slice(0,7);
                    return monthKey(m.month) === ym;
                  }).reduce((s,e)=>s+Number(e.amount),0);
                  return {...m, expenses: mExp, profit: m.revenue - mExp};
                })}>
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={60} tickFormatter={(v:number)=>`${(v/1000).toFixed(0)}k`}/>
                  <Tooltip {...TT} formatter={(v:unknown,name:unknown)=>[`PKR ${Number(v).toLocaleString()}`,String(name)]}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="revenue" name="Revenue" fill={BLUE} radius={[3,3,0,0]}/>
                  <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[3,3,0,0]}/>
                  <Bar dataKey="profit" name="Net Profit" fill="#10b981" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category breakdown */}
          {expenses.length > 0 && (
            <div className="card p-5">
              <div className="font-medium text-navy text-[14px] mb-4">Expenses by Category</div>
              <div className="space-y-3">
                {Object.entries(expenses.reduce((m:any,e)=>{m[e.category]=(m[e.category]||0)+Number(e.amount);return m;},{}))
                  .sort((a:any,b:any)=>b[1]-a[1]).map(([cat,amt]:any)=>(
                  <div key={cat} className="flex items-center gap-3">
                    <div className="text-[12px] text-gray-600 w-44 flex-shrink-0 truncate">{cat}</div>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${(amt/totalExpenses)*100}%`,background:'#dc2626'}}/>
                    </div>
                    <div className="text-[12px] font-medium text-red-600 w-28 text-right">PKR {amt.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Monthly Expenses</div>
            <div className="divide-y divide-black/5">
              {Object.entries(expenses.reduce((m:any,e)=>{const k=e.date?.slice(0,7)||'';m[k]=(m[k]||0)+Number(e.amount);return m;},{}))
                .sort((a,b)=>b[0].localeCompare(a[0])).map(([month,amt]:any)=>(
                <div key={month} className="flex items-center justify-between px-5 py-3">
                  <div className="text-[13px] font-medium text-navy">{new Date(month+'-01').toLocaleString('en-US',{month:'long',year:'numeric'})}</div>
                  <div className="text-[13px] font-semibold text-red-600">PKR {amt.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab==='aging' && (
        <div className="space-y-5">
          <AgingReport/>
        </div>
      )}
    </div>
  );
}