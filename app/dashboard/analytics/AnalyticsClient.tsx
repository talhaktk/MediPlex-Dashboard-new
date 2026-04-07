'use client';

import { useState, useMemo } from 'react';
import { Appointment, MonthlyStats, ReasonStat, AgeStat, DashboardStats } from '@/types';
import { filterAppointments, computeMonthlyStats, exportToCSV, formatUSDate } from '@/lib/sheets';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { Download, FileText, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const GOLD  = '#c9a84c';
const GREEN = '#1a7f5e';
const RED   = '#c53030';
const AMBER = '#b47a00';
const BLUE  = '#2b6cb0';
const COLORS = [GREEN, RED, AMBER, BLUE, '#7c3aed', '#0369a1'];
const TT = { contentStyle: { background:'#0a1628', border:'1px solid rgba(201,168,76,0.3)', borderRadius:8, color:'#faf8f4', fontSize:12 } };

function normVT(vt: string): 'Follow-up' | 'New Visit' {
  return vt?.toLowerCase().includes('follow') ? 'Follow-up' : 'New Visit';
}

function getPreset(key: string): { from: string; to: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const add = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  if (key === 'today') return { from: fmt(today), to: fmt(today) };
  if (key === 'week')  return { from: fmt(add(today, -6)), to: fmt(today) };
  if (key === 'month') return { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmt(today) };
  if (key === 'last')  return { from: fmt(new Date(today.getFullYear(), today.getMonth()-1, 1)), to: fmt(new Date(today.getFullYear(), today.getMonth(), 0)) };
  return { from: '', to: '' };
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
  return `${yr}-${MONTH_MAP[mon] || '01'}`;
}

interface Props {
  data: Appointment[];
  stats: DashboardStats;
  monthly: MonthlyStats[];
  reasons: ReasonStat[];
  ages: AgeStat[];
}

export default function AnalyticsClient({ data, stats, monthly, reasons, ages }: Props) {
  const [rangeFrom,    setRangeFrom]    = useState('');
  const [rangeTo,      setRangeTo]      = useState('');
  const [activePreset, setActivePreset] = useState('all');
  const [activeTab,    setActiveTab]    = useState<'overview'|'monthly'|'patients'|'trends'>('overview');
  const [drillMonth,   setDrillMonth]   = useState<string|null>(null);

  const applyPreset = (key: string) => {
    const { from, to } = getPreset(key);
    setRangeFrom(from); setRangeTo(to); setActivePreset(key);
  };

  const rangeFiltered  = useMemo(() => filterAppointments(data, { dateFrom: rangeFrom, dateTo: rangeTo }), [data, rangeFrom, rangeTo]);
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

  // ── Core stats ──────────────────────────────────────────────────────────────
  const rs = useMemo(() => {
    const confirmed   = rangeFiltered.filter(a => a.status === 'Confirmed').length;
    const cancelled   = rangeFiltered.filter(a => a.status === 'Cancelled').length;
    const rescheduled = rangeFiltered.filter(a => a.status === 'Rescheduled').length;
    const newVisit    = rangeFiltered.filter(a => normVT(a.visitType) === 'New Visit').length;
    const followUp    = rangeFiltered.filter(a => normVT(a.visitType) === 'Follow-up').length;
    const inClinic    = rangeFiltered.filter(a => a.attendanceStatus === 'In Clinic').length;
    const absent      = rangeFiltered.filter(a => a.attendanceStatus === 'Absent' || a.attendanceStatus === 'No-Show').length;
    return {
      total: rangeFiltered.length,
      confirmed, cancelled, rescheduled,
      newVisit, followUp,
      inClinic, absent,
    };
  }, [rangeFiltered]);

  const dowData = useMemo(() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const counts = new Array(7).fill(0);
    rangeFiltered.forEach(a => {
      if (!a.appointmentDate) return;
      const d = new Date(a.appointmentDate);
      if (!isNaN(d.getTime())) counts[d.getDay()]++;
    });
    return days.map((d, i) => ({ day: d, count: counts[i] }));
  }, [rangeFiltered]);

  const rateData = displayMonthly.map(m => ({
    month: m.month,
    rate:  m.total ? Math.round(m.confirmed / m.total * 100) : 0,
  }));

  // ── Exports ─────────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    exportToCSV(rangeFiltered, `mediplex_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${rs.total} records`);
  };

  const handleDrillCSV = () => {
    exportToCSV(drillData, 'month_detail.csv');
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    const period = rangeFrom && rangeTo
      ? `${rangeFrom} to ${rangeTo}`
      : rangeFrom || rangeTo || 'All Time';

    const monthRows = displayMonthly.map(m => {
      const cr = m.total ? Math.round(m.confirmed/m.total*100) : 0;
      return `<tr>
        <td>${m.month}</td>
        <td>${m.total}</td>
        <td style="color:#1a7f5e;font-weight:600">${m.confirmed}</td>
        <td style="color:#c53030;font-weight:600">${m.cancelled}</td>
        <td style="color:#b47a00;font-weight:600">${m.rescheduled}</td>
        <td>${cr}%</td>
      </tr>`;
    }).join('');

    const pct = (n: number) => rs.total ? Math.round(n/rs.total*100) : 0;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>MediPlex Analytics Report</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;color:#0a1628;padding:32px;font-size:13px;line-height:1.5}
      h1{font-size:20px;font-weight:700;margin-bottom:2px}
      .meta{color:#6b7280;font-size:11px;margin-bottom:28px}
      h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin:24px 0 10px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
      .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:8px}
      .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:8px}
      .grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:8px}
      .card{border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px}
      .val{font-size:26px;font-weight:700;line-height:1}
      .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-top:4px}
      .sub{font-size:11px;color:#9ca3af;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-top:4px}
      th{background:#0a1628;color:#fff;padding:7px 12px;text-align:left;font-size:11px;font-weight:600}
      td{padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:12px}
      tr:nth-child(even) td{background:#f9fafb}
      .bar{height:6px;border-radius:3px;margin-top:4px}
      .footer{margin-top:28px;font-size:10px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:10px;text-align:center}
      @media print{body{padding:16px}}
    </style></head><body>

    <h1>MediPlex Pediatric Clinic — Analytics Report</h1>
    <div class="meta">Period: <strong>${period}</strong> &nbsp;·&nbsp; Generated: ${new Date().toLocaleString()} &nbsp;·&nbsp; Confidential</div>

    <!-- Section A: Appointment Status -->
    <h2>A — Appointment Status</h2>
    <div class="grid4">
      <div class="card"><div class="val">${rs.total}</div><div class="lbl">Total Appointments</div><div class="sub">All records</div></div>
      <div class="card"><div class="val" style="color:#1a7f5e">${rs.confirmed}</div><div class="lbl">Confirmed</div><div class="sub">${pct(rs.confirmed)}% of total</div></div>
      <div class="card"><div class="val" style="color:#c53030">${rs.cancelled}</div><div class="lbl">Cancelled</div><div class="sub">${pct(rs.cancelled)}% of total</div></div>
      <div class="card"><div class="val" style="color:#b47a00">${rs.rescheduled}</div><div class="lbl">Rescheduled</div><div class="sub">${pct(rs.rescheduled)}% of total</div></div>
    </div>

    <!-- Section B: Visit Type -->
    <h2>B — Visit Type Breakdown</h2>
    <div class="grid2">
      <div class="card" style="border-color:#1a7f5e44">
        <div class="val" style="color:#1a7f5e">${rs.newVisit}</div>
        <div class="lbl">New Visits</div>
        <div class="sub">${pct(rs.newVisit)}% of total appointments</div>
        <div class="bar" style="background:#1a7f5e;width:${pct(rs.newVisit)}%"></div>
      </div>
      <div class="card" style="border-color:#2b6cb044">
        <div class="val" style="color:#2b6cb0">${rs.followUp}</div>
        <div class="lbl">Follow-up Visits</div>
        <div class="sub">${pct(rs.followUp)}% of total appointments</div>
        <div class="bar" style="background:#2b6cb0;width:${pct(rs.followUp)}%"></div>
      </div>
    </div>

    <!-- Section C: Attendance -->
    <h2>C — Clinic Attendance</h2>
    <div class="grid3">
      <div class="card" style="border-color:#16653344">
        <div class="val" style="color:#166534">${rs.inClinic}</div>
        <div class="lbl">In Clinic</div>
        <div class="sub">Seen by doctor</div>
      </div>
      <div class="card" style="border-color:#c2410c44">
        <div class="val" style="color:#c2410c">${rs.absent}</div>
        <div class="lbl">Absent / No-Show</div>
        <div class="sub">Did not arrive</div>
      </div>
      <div class="card">
        <div class="val" style="color:#0369a1">${rs.total - rs.inClinic - rs.absent}</div>
        <div class="lbl">Awaiting / Not Set</div>
        <div class="sub">No attendance recorded</div>
      </div>
    </div>

    <!-- Section D: Monthly Breakdown -->
    <h2>D — Monthly Breakdown</h2>
    <table>
      <thead><tr><th>Month</th><th>Total</th><th>Confirmed</th><th>Cancelled</th><th>Rescheduled</th><th>Confirm %</th></tr></thead>
      <tbody>${monthRows}</tbody>
    </table>

    <div class="footer">MediPlex Pediatric Clinic &nbsp;·&nbsp; This report is confidential &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</div>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) { toast.error('Allow popups to export PDF'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
    toast.success('PDF ready — Print → Save as PDF');
  };

  const tabs = ['overview','monthly','patients','trends'] as const;
  const tabLabels = { overview:'Overview', monthly:'Monthly Records', patients:'Demographics', trends:'Trends' };

  return (
    <div className="space-y-5">

      {/* ── Period Selector ─────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => applyPreset(p.key)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                activePreset === p.key
                  ? 'bg-navy text-white border-navy'
                  : 'border-black/10 text-gray-500 hover:border-gold hover:text-navy'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">From</label>
            <input type="date" value={rangeFrom}
              onChange={e => { setRangeFrom(e.target.value); setActivePreset(''); }}
              className="border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">To</label>
            <input type="date" value={rangeTo}
              onChange={e => { setRangeTo(e.target.value); setActivePreset(''); }}
              className="border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
          </div>
          <div className="flex-1" />
          <button onClick={handleExportCSV} className="btn-outline gap-1.5 text-[12px] py-2 px-4">
            <Download size={13} /> Export CSV
          </button>
          <button onClick={exportPDF} className="btn-gold gap-1.5 text-[12px] py-2 px-4">
            <FileText size={13} /> Export PDF
          </button>
        </div>

        {/* ── KPI Summary Bar ── */}
        <div className="mt-5 pt-5 border-t border-black/5">
          {/* Row 1: Appointment Status */}
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">Appointment Status</div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label:'Total',       val:rs.total,       color:'#0a1628' },
              { label:'Confirmed',   val:rs.confirmed,   color:GREEN },
              { label:'Cancelled',   val:rs.cancelled,   color:RED },
              { label:'Rescheduled', val:rs.rescheduled, color:AMBER },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-semibold text-[22px] leading-none" style={{ color:s.color }}>{s.val}</div>
                <div className="text-[10px] text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Row 2: Visit Type */}
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">Visit Type</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label:'New Visits',  val:rs.newVisit, color:GREEN },
              { label:'Follow-ups',  val:rs.followUp, color:BLUE },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-semibold text-[22px] leading-none" style={{ color:s.color }}>{s.val}</div>
                <div className="text-[10px] text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Row 3: Attendance */}
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">Clinic Attendance</div>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
            {[
              { label:'In Clinic',        val:rs.inClinic,                          color:'#166534' },
              { label:'Absent / No-Show', val:rs.absent,                            color:RED },
              { label:'Awaiting',         val:rs.total - rs.inClinic - rs.absent,   color:'#6b7280' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-semibold text-[22px] leading-none" style={{ color:s.color }}>{s.val}</div>
                <div className="text-[10px] text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => { setActiveTab(t); setDrillMonth(null); }}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${activeTab===t ? 'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Monthly Volume</div>
              <div className="p-5" style={{ height:260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayMonthly}>
                    <XAxis dataKey="month" tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                    <Bar dataKey="confirmed"   name="Confirmed"   stackId="a" fill={GREEN} />
                    <Bar dataKey="cancelled"   name="Cancelled"   stackId="a" fill={RED} />
                    <Bar dataKey="rescheduled" name="Rescheduled" stackId="a" fill={AMBER} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Confirmation Rate Trend</div>
              <div className="p-5" style={{ height:260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rateData}>
                    <CartesianGrid stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="month" tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} width={30} unit="%" />
                    <Tooltip {...TT} formatter={(v:unknown) => [`${v}%`, 'Rate']} />
                    <Line type="monotone" dataKey="rate" stroke={GOLD} strokeWidth={2} dot={{ fill:GOLD, r:4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Visit type split */}
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">New Visit vs Follow-up</div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    { label:'New Visit', val:rs.newVisit, color:GREEN, bg:'#e8f7f2' },
                    { label:'Follow-up', val:rs.followUp, color:BLUE,  bg:'#ebf4ff' },
                  ].map(v => (
                    <div key={v.label} className="rounded-xl p-4 text-center" style={{ background:v.bg }}>
                      <div className="text-[32px] font-semibold leading-none" style={{ color:v.color }}>{v.val}</div>
                      <div className="text-[11px] text-gray-500 mt-1">{v.label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color:v.color }}>
                        {rs.total ? Math.round(v.val/rs.total*100) : 0}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex rounded-full overflow-hidden h-3">
                  <div style={{ width:`${rs.total ? Math.round(rs.newVisit/rs.total*100) : 50}%`, background:GREEN }} />
                  <div style={{ flex:1, background:BLUE }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>New Visit</span><span>Follow-up</span>
                </div>
              </div>
            </div>

            {/* Attendance split */}
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Clinic Attendance</div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label:'In Clinic',  val:rs.inClinic, color:'#166534', bg:'#dcfce7' },
                    { label:'Absent',     val:rs.absent,   color:RED,       bg:'#fee2e2' },
                    { label:'Awaiting',   val:rs.total - rs.inClinic - rs.absent, color:'#6b7280', bg:'#f3f4f6' },
                  ].map(v => (
                    <div key={v.label} className="rounded-xl p-3 text-center" style={{ background:v.bg }}>
                      <div className="text-[28px] font-semibold leading-none" style={{ color:v.color }}>{v.val}</div>
                      <div className="text-[10px] mt-1" style={{ color:v.color }}>{v.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex rounded-full overflow-hidden h-3">
                  <div style={{ width:`${rs.total ? Math.round(rs.inClinic/rs.total*100) : 0}%`, background:'#166534' }} />
                  <div style={{ width:`${rs.total ? Math.round(rs.absent/rs.total*100) : 0}%`, background:RED }} />
                  <div style={{ flex:1, background:'#e5e7eb' }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span style={{ color:'#166534' }}>● In Clinic</span>
                  <span style={{ color:RED }}>● Absent</span>
                  <span>● Awaiting</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Busiest Days of Week</div>
            <div className="p-5" style={{ height:200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dowData} barSize={40}>
                  <XAxis dataKey="day" tick={{ fontSize:12, fill:'#8a9bb0' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip {...TT} />
                  <Bar dataKey="count" name="Appointments" radius={[4,4,0,0]}>
                    {dowData.map((e, i) => (
                      <Cell key={i} fill={e.count === Math.max(...dowData.map(d => d.count)) ? GOLD : '#e8e4da'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── MONTHLY RECORDS ───────────────────────────────────────────────────── */}
      {activeTab === 'monthly' && (
        <div className="space-y-5">
          {drillMonth ? (
            <div className="space-y-4 animate-in">
              <button onClick={() => setDrillMonth(null)}
                className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-navy transition-colors">
                <ChevronLeft size={15} /> Back to all months
              </button>
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                  <div className="font-medium text-navy text-[14px]">Detail — {drillData.length} appointments</div>
                  <button onClick={handleDrillCSV} className="btn-outline text-[11px] py-1.5 px-3 gap-1">
                    <Download size={11} /> CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Patient</th><th>Parent</th><th>Age</th><th>Date</th><th>Time</th><th>Reason</th><th>Visit</th><th>Status</th><th>Attendance</th></tr>
                    </thead>
                    <tbody>
                      {drillData.map(a => (
                        <tr key={a.id}>
                          <td className="font-medium text-navy text-[13px]">{a.childName}</td>
                          <td className="text-[12px] text-gray-500">{a.parentName}</td>
                          <td className="text-[12px] text-gray-500">{a.childAge ? `${a.childAge} yr` : '—'}</td>
                          <td className="text-[12px] text-navy whitespace-nowrap">{formatUSDate(a.appointmentDate)}</td>
                          <td className="text-[12px] text-gray-500">{a.appointmentTime || '—'}</td>
                          <td className="text-[12px] text-gray-600 max-w-[140px] truncate">{a.reason || '—'}</td>
                          <td>
                            <span className="text-[11px] px-2 py-0.5 rounded font-medium"
                              style={{ background:normVT(a.visitType)==='Follow-up'?'#ebf4ff':'#e8f7f2', color:normVT(a.visitType)==='Follow-up'?BLUE:GREEN }}>
                              {normVT(a.visitType)}
                            </span>
                          </td>
                          <td><span className={`pill pill-${a.status?.toLowerCase().replace(/[\s-]/g,'')}`}>{a.status}</span></td>
                          <td className="text-[11px] text-gray-500">{a.attendanceStatus || '—'}</td>
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
                  <div className="text-[12px] text-gray-400">Click any row to see patient details</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Month</th><th>Total</th><th>Confirmed</th><th>Cancelled</th><th>Rescheduled</th><th>Confirm %</th><th>Cancel %</th><th>Volume</th></tr>
                    </thead>
                    <tbody>
                      {displayMonthly.map(m => {
                        const cr = m.total ? Math.round(m.confirmed/m.total*100) : 0;
                        const xr = m.total ? Math.round(m.cancelled/m.total*100) : 0;
                        const mx = Math.max(...displayMonthly.map(x => x.total));
                        return (
                          <tr key={m.month} onClick={() => setDrillMonth(monthKey(m.month))}
                            className="cursor-pointer hover:bg-amber-50/30 transition-colors">
                            <td className="font-medium text-navy">{m.month}</td>
                            <td><span className="font-semibold text-navy">{m.total}</span></td>
                            <td><span className="text-emerald-700 font-medium">{m.confirmed}</span></td>
                            <td><span className="text-red-600 font-medium">{m.cancelled}</span></td>
                            <td><span className="text-amber-600 font-medium">{m.rescheduled}</span></td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-500" style={{ width:`${cr}%` }} />
                                </div>
                                <span className="text-[11px] text-gray-600">{cr}%</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-red-400" style={{ width:`${xr}%` }} />
                                </div>
                                <span className="text-[11px] text-gray-600">{xr}%</span>
                              </div>
                            </td>
                            <td>
                              <div className="w-20 h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width:`${mx?Math.round(m.total/mx*100):0}%`, background:'linear-gradient(90deg,#c9a84c,#e8c87a)' }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card animate-in">
                <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Status Trend</div>
                <div className="p-5" style={{ height:280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayMonthly.map(m => ({ month:m.month, Confirmed:m.confirmed, Cancelled:m.cancelled, Rescheduled:m.rescheduled }))}>
                      <CartesianGrid stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="month" tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} width={25} />
                      <Tooltip {...TT} />
                      <Legend wrapperStyle={{ fontSize:11 }} />
                      <Area type="monotone" dataKey="Confirmed"   stackId="1" stroke={GREEN} fill="#e8f7f2" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="Cancelled"   stackId="1" stroke={RED}   fill="#fff0f0" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="Rescheduled" stackId="1" stroke={AMBER} fill="#fff9e6" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── DEMOGRAPHICS ─────────────────────────────────────────────────────── */}
      {activeTab === 'patients' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Age Distribution</div>
              <div className="p-5" style={{ height:260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ages} layout="vertical" barSize={22}>
                    <XAxis type="number" tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="bucket" tick={{ fontSize:11, fill:'#4a5568' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip {...TT} />
                    <Bar dataKey="count" name="Patients" radius={[0,3,3,0]}>
                      {ages.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Top Reasons for Visit</div>
              <div className="p-5" style={{ height:260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reasons} cx="50%" cy="50%" outerRadius={95} dataKey="count" nameKey="reason" paddingAngle={2}>
                      {reasons.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...TT} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Visit Type Breakdown</div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                {[
                  { label:'New Visit', val:rs.newVisit, color:GREEN, bg:'#e8f7f2', desc:'First-time or new concern' },
                  { label:'Follow-up', val:rs.followUp, color:BLUE,  bg:'#ebf4ff', desc:'Return visits' },
                ].map(v => (
                  <div key={v.label} className="rounded-xl p-6 text-center" style={{ background:v.bg }}>
                    <div className="text-[42px] font-bold leading-none mb-2" style={{ color:v.color }}>{v.val}</div>
                    <div className="text-[13px] font-semibold mb-1" style={{ color:v.color }}>{v.label}</div>
                    <div className="text-[11px] text-gray-400 mb-3">{v.desc}</div>
                    <div className="text-[18px] font-semibold" style={{ color:v.color }}>
                      {rs.total ? Math.round(v.val/rs.total*100) : 0}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex rounded-full overflow-hidden h-4 max-w-md mx-auto">
                <div style={{ width:`${rs.total?Math.round(rs.newVisit/rs.total*100):50}%`, background:GREEN, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span className="text-white text-[10px] font-semibold">{rs.total?Math.round(rs.newVisit/rs.total*100):0}%</span>
                </div>
                <div style={{ flex:1, background:BLUE, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span className="text-white text-[10px] font-semibold">{rs.total?Math.round(rs.followUp/rs.total*100):0}%</span>
                </div>
              </div>
              <div className="flex justify-between text-[11px] mt-1.5 max-w-md mx-auto px-1">
                <span style={{ color:GREEN }}>● New Visit</span>
                <span style={{ color:BLUE }}>● Follow-up</span>
              </div>
            </div>
          </div>

          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Visit Reasons Ranked</div>
            <div className="p-5 space-y-3">
              {reasons.map((r, i) => (
                <div key={r.reason} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background:`${COLORS[i%COLORS.length]}18`, color:COLORS[i%COLORS.length] }}>{i+1}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[12px] font-medium text-navy mb-1">
                      <span>{r.reason}</span><span>{r.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${Math.round(r.count/reasons[0].count*100)}%`, background:COLORS[i%COLORS.length] }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TRENDS ───────────────────────────────────────────────────────────── */}
      {activeTab === 'trends' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { label:'Avg / Month',       val: monthly.length ? Math.round(data.length/monthly.length) : 0,   color:GOLD },
              { label:'Peak Month',        val: [...monthly].sort((a,b)=>b.total-a.total)[0]?.month || '—',    color:GREEN },
              { label:'Best Confirm Rate', val: monthly.length ? `${Math.max(...monthly.map(m=>m.total?Math.round(m.confirmed/m.total*100):0))}%` : '—', color:BLUE },
              { label:'Total Patients',    val: new Set(data.map(a=>a.childName.toLowerCase())).size,          color:'#7c3aed' },
            ].map(s => (
              <div key={s.label} className="kpi-card animate-in">
                <div className="text-[10px] tracking-widest uppercase text-gray-400 font-medium mb-2">{s.label}</div>
                <div className="font-display text-[28px] font-semibold leading-none" style={{ color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Cumulative Growth</div>
            <div className="p-5" style={{ height:280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(() => { let cum=0; return displayMonthly.map(m=>({ month:m.month, total:m.total, cumulative:(cum+=m.total) })); })()}>
                  <CartesianGrid stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip {...TT} />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                  <Area type="monotone" dataKey="cumulative" name="Cumulative Total" stroke={GOLD} fill="rgba(201,168,76,0.1)"  strokeWidth={2} />
                  <Area type="monotone" dataKey="total"      name="Monthly New"      stroke={BLUE} fill="rgba(43,108,176,0.08)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">New Visit vs Follow-up by Month</div>
            <div className="p-5" style={{ height:260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayMonthly.map(m => {
                  const mk = monthKey(m.month);
                  const md = rangeFiltered.filter(a => {
                    const d = new Date(a.appointmentDate);
                    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === mk;
                  });
                  return {
                    month:       m.month,
                    'New Visit': md.filter(a => normVT(a.visitType)==='New Visit').length,
                    'Follow-up': md.filter(a => normVT(a.visitType)==='Follow-up').length,
                  };
                })}>
                  <XAxis dataKey="month" tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#8a9bb0' }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip {...TT} />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                  <Bar dataKey="New Visit" fill={GREEN} radius={[2,2,0,0]} />
                  <Bar dataKey="Follow-up" fill={BLUE}  radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
