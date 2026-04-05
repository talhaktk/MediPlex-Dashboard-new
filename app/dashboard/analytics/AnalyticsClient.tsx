'use client';

import { useState, useMemo } from 'react';
import { Appointment, MonthlyStats, ReasonStat, AgeStat, DashboardStats } from '@/types';
import { filterAppointments, computeMonthlyStats, exportToCSV } from '@/lib/sheets';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Download, TrendingUp, Calendar, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const GOLD = '#c9a84c';
const COLORS = ['#1a7f5e','#c53030','#b47a00','#2b6cb0','#7c3aed','#0369a1','#b45309','#6b46c1'];
const TT = { contentStyle: { background:'#0a1628', border:'1px solid rgba(201,168,76,0.3)', borderRadius:8, color:'#faf8f4', fontSize:12 } };

interface Props {
  data: Appointment[];
  stats: DashboardStats;
  monthly: MonthlyStats[];
  reasons: ReasonStat[];
  ages: AgeStat[];
}

export default function AnalyticsClient({ data, stats, monthly, reasons, ages }: Props) {
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [activeTab, setActiveTab] = useState<'overview'|'monthly'|'patients'|'trends'>('overview');

  const rangeFiltered = useMemo(() => filterAppointments(data, { dateFrom: rangeFrom, dateTo: rangeTo }), [data, rangeFrom, rangeTo]);
  const rangeMonthly = useMemo(() => computeMonthlyStats(rangeFiltered), [rangeFiltered]);
  const displayMonthly = rangeMonthly.length ? rangeMonthly : monthly;

  const dowData = useMemo(() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const counts = new Array(7).fill(0);
    data.forEach(a => { if (!a.appointmentDate) return; const d = new Date(a.appointmentDate); if (!isNaN(d.getTime())) counts[d.getDay()]++; });
    return days.map((d, i) => ({ day: d, count: counts[i] }));
  }, [data]);

  const rateData = displayMonthly.map(m => ({ month: m.month, rate: m.total ? Math.round(m.confirmed/m.total*100) : 0, total: m.total }));

  const rangeStats = {
    total: rangeFiltered.length,
    confirmed: rangeFiltered.filter(a => a.status === 'Confirmed').length,
    cancelled: rangeFiltered.filter(a => a.status === 'Cancelled').length,
    rescheduled: rangeFiltered.filter(a => a.status === 'Rescheduled').length,
  };

  const tabs = ['overview','monthly','patients','trends'] as const;
  const tabLabels = { overview:'Overview', monthly:'Monthly Records', patients:'Demographics', trends:'Trends' };

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">From Date</label>
            <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
              className="border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none" style={{fontFamily:'DM Sans,sans-serif'}} />
          </div>
          <div>
            <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">To Date</label>
            <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)}
              className="border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none" style={{fontFamily:'DM Sans,sans-serif'}} />
          </div>
          {(rangeFrom||rangeTo) && <button onClick={()=>{setRangeFrom('');setRangeTo('');}} className="btn-outline text-[12px] py-2 px-3">Clear</button>}
          <div className="flex-1" />
          <div className="text-right">
            <div className="text-[11px] text-gray-400 mb-0.5">Filtered Records</div>
            <div className="font-display text-2xl font-semibold text-navy">{rangeFiltered.length}</div>
          </div>
          <button onClick={() => { exportToCSV(rangeFiltered, `analytics_export.csv`); toast.success(`Exported ${rangeFiltered.length} records`); }} className="btn-gold gap-1.5">
            <Download size={13} /> Export Range
          </button>
        </div>
        {(rangeFrom||rangeTo) && (
          <div className="mt-4 pt-4 border-t border-black/5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[['Total',rangeStats.total,'#0a1628'],['Confirmed',rangeStats.confirmed,'#1a7f5e'],['Cancelled',rangeStats.cancelled,'#c53030'],['Rescheduled',rangeStats.rescheduled,'#b47a00']].map(([l,v,c])=>(
              <div key={l} className="text-center">
                <div className="font-display text-2xl font-semibold" style={{color:c as string}}>{v}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${activeTab===t ? 'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab==='overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Monthly Volume</div>
              <div className="p-5" style={{height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayMonthly}>
                    <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={25} />
                    <Tooltip {...TT} />
                    <Bar dataKey="confirmed" name="Confirmed" stackId="a" fill="#1a7f5e" />
                    <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill="#c53030" />
                    <Bar dataKey="rescheduled" name="Rescheduled" stackId="a" fill="#b47a00" />
                    <Bar dataKey="pending" name="Pending" stackId="a" fill="#2b6cb0" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Confirmation Rate by Month</div>
              <div className="p-5" style={{height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rateData}>
                    <CartesianGrid stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} />
                    <YAxis domain={[0,100]} tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={30} unit="%" />
                    <Tooltip {...TT} formatter={(v:any)=>[`${v}%`,'Rate']} />
                    <Line type="monotone" dataKey="rate" stroke={GOLD} strokeWidth={2} dot={{fill:GOLD,r:4}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Busiest Days of Week</div>
            <div className="p-5" style={{height:200}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dowData} barSize={44}>
                  <XAxis dataKey="day" tick={{fontSize:12,fill:'#8a9bb0'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={25} />
                  <Tooltip {...TT} />
                  <Bar dataKey="count" name="Appointments" radius={[4,4,0,0]}>
                    {dowData.map((e,i)=><Cell key={i} fill={e.count===Math.max(...dowData.map(d=>d.count)) ? GOLD : '#e8e4da'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY */}
      {activeTab==='monthly' && (
        <div className="space-y-5">
          <div className="card overflow-hidden animate-in">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
              <div className="font-medium text-navy text-[14px]">Monthly Patient Record</div>
              <div className="text-[12px] text-gray-400">{displayMonthly.length} months</div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th><th>Total</th><th>Confirmed</th><th>Cancelled</th>
                    <th>Rescheduled</th><th>Pending</th><th>Confirm %</th><th>Cancel %</th><th>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {displayMonthly.map(m => {
                    const cr = m.total ? Math.round(m.confirmed/m.total*100) : 0;
                    const xr = m.total ? Math.round(m.cancelled/m.total*100) : 0;
                    const mx = Math.max(...displayMonthly.map(x=>x.total));
                    return (
                      <tr key={m.month}>
                        <td className="font-medium text-navy">{m.month}</td>
                        <td><span className="font-semibold text-navy">{m.total}</span></td>
                        <td><span className="text-emerald-700 font-medium">{m.confirmed}</span></td>
                        <td><span className="text-red-600 font-medium">{m.cancelled}</span></td>
                        <td><span className="text-amber-600 font-medium">{m.rescheduled}</span></td>
                        <td><span className="text-blue-600 font-medium">{m.pending}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{width:`${cr}%`}} />
                            </div>
                            <span className="text-[11px] text-gray-600">{cr}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full bg-red-400" style={{width:`${xr}%`}} />
                            </div>
                            <span className="text-[11px] text-gray-600">{xr}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="w-20 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${mx?Math.round(m.total/mx*100):0}%`,background:'linear-gradient(90deg,#c9a84c,#e8c87a)'}} />
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
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Status Trend Over Time</div>
            <div className="p-5" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayMonthly.map(m=>({month:m.month,Confirmed:m.confirmed,Cancelled:m.cancelled,Rescheduled:m.rescheduled,Pending:m.pending}))}>
                  <CartesianGrid stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={25} />
                  <Tooltip {...TT} />
                  <Area type="monotone" dataKey="Confirmed" stackId="1" stroke="#1a7f5e" fill="#e8f7f2" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Cancelled" stackId="1" stroke="#c53030" fill="#fff0f0" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Rescheduled" stackId="1" stroke="#b47a00" fill="#fff9e6" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* PATIENTS */}
      {activeTab==='patients' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Age Distribution</div>
            <div className="p-5" style={{height:260}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ages} layout="vertical" barSize={22}>
                  <XAxis type="number" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="bucket" tick={{fontSize:11,fill:'#4a5568'}} axisLine={false} tickLine={false} width={80} />
                  <Tooltip {...TT} />
                  <Bar dataKey="count" name="Patients" radius={[0,3,3,0]}>
                    {ages.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Top Visit Reasons</div>
            <div className="p-5" style={{height:260}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={reasons} cx="50%" cy="50%" outerRadius={95} dataKey="count" nameKey="reason" paddingAngle={2}>
                    {reasons.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...TT} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card animate-in lg:col-span-2">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Visit Type Breakdown</div>
            <div className="p-5">
              {(() => {
                const vtMap: Record<string,number> = {};
                data.forEach(a=>{const vt=a.visitType||'Unknown';vtMap[vt]=(vtMap[vt]||0)+1;});
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Object.entries(vtMap).sort((a,b)=>b[1]-a[1]).map(([name,value],i)=>(
                      <div key={name} className="text-center p-4 rounded-xl" style={{background:`${COLORS[i%COLORS.length]}12`}}>
                        <div className="font-display text-2xl font-semibold" style={{color:COLORS[i%COLORS.length]}}>{value}</div>
                        <div className="text-[11px] text-gray-500 mt-1">{name}</div>
                        <div className="text-[10px] text-gray-400">{Math.round(value/data.length*100)}%</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TRENDS */}
      {activeTab==='trends' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {label:'Avg Appts / Month', val: monthly.length ? Math.round(data.length/monthly.length) : 0, color:GOLD},
              {label:'Peak Month', val: [...monthly].sort((a,b)=>b.total-a.total)[0]?.month||'—', color:'#1a7f5e'},
              {label:'Best Confirm Rate', val: monthly.length ? `${Math.max(...monthly.map(m=>m.total?Math.round(m.confirmed/m.total*100):0))}%` : '—', color:'#2b6cb0'},
            ].map(s=>(
              <div key={s.label} className="kpi-card animate-in">
                <div className="text-[10px] tracking-widest uppercase text-gray-400 font-medium mb-2">{s.label}</div>
                <div className="font-display text-3xl font-semibold" style={{color:s.color}}>{s.val}</div>
              </div>
            ))}
          </div>
          <div className="card animate-in">
            <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Cumulative Appointment Growth</div>
            <div className="p-5" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(() => { let cum=0; return displayMonthly.map(m=>({month:m.month,total:m.total,cumulative:(cum+=m.total)})); })()}>
                  <CartesianGrid stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10,fill:'#8a9bb0'}} axisLine={false} tickLine={false} width={30} />
                  <Tooltip {...TT} />
                  <Area type="monotone" dataKey="cumulative" name="Cumulative Total" stroke={GOLD} fill="rgba(201,168,76,0.1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="total" name="Monthly New" stroke="#2b6cb0" fill="rgba(43,108,176,0.08)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
