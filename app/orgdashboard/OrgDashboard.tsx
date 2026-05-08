'use client';

import { useState, useEffect, useMemo } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Calendar, Receipt, BarChart3, LogOut, RefreshCw, TrendingUp, DollarSign, Star, UserCheck } from 'lucide-react';

interface Clinic {
  id: string; name: string; speciality: string; city: string; is_active: boolean;
}

interface OrgStats {
  clinicId: string; clinicName: string; speciality: string;
  patients: number; appointments: number; revenue: number; pending: number;
}

export default function OrgDashboard({ orgId, orgName, ownerName }: { orgId: string; orgName: string; ownerName: string }) {
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('all');
  const [stats, setStats] = useState<OrgStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview'|'appointments'|'revenue'|'feedback'|'staff'>('overview');
  const [feedbackData, setFeedbackData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);

  useEffect(() => {
    fetchAll();
  }, [orgId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orgdashboard');
      if (!res.ok) throw new Error('Failed to load org data');
      const json = await res.json();

      const orgClinics: Clinic[] = json.clinics || [];
      setClinics(orgClinics);

      // Build per-clinic stats from the flat data returned
      const invoicesAll: any[] = json.invoices || [];
      const patientsAll: any[] = json.patients || [];
      const appointmentsAll: any[] = json.appointments || [];

      const statsArr: OrgStats[] = orgClinics.map((clinic: Clinic) => {
        const inv = invoicesAll.filter((i: any) => i.clinic_id === clinic.id);
        const revenue = inv.reduce((s: number, i: any) => s + (Number(i.amount_paid) || 0), 0);
        const pending = inv.reduce((s: number, i: any) => s + Math.max(0, (Number(i.consultation_fee) || 0) - (Number(i.discount) || 0) - (Number(i.amount_paid) || 0)), 0);
        const patients = patientsAll.filter((p: any) => p.clinic_id === clinic.id).length;
        const appointments = appointmentsAll.filter((a: any) => a.clinic_id === clinic.id).length;
        return { clinicId: clinic.id, clinicName: clinic.name, speciality: clinic.speciality, patients, appointments, revenue, pending };
      });
      setStats(statsArr);
      setAppointments(appointmentsAll);
      setInvoices(invoicesAll);
      setExpenses(json.expenses || []);
      setFeedbackData(json.feedback || []);
      setStaffData(json.staff || []);
    } catch (e: any) {
      console.error('[orgdashboard] fetchAll error:', e?.message);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => ({
    appointments: selectedClinic==='all' ? appointments : appointments.filter(a=>a.clinic_id===selectedClinic),
    invoices: selectedClinic==='all' ? invoices : invoices.filter(i=>i.clinic_id===selectedClinic),
    expenses: selectedClinic==='all' ? expenses : expenses.filter(e=>e.clinic_id===selectedClinic),
    stats: selectedClinic==='all' ? stats : stats.filter(s=>s.clinicId===selectedClinic),
  }), [selectedClinic, appointments, invoices, stats]);

  const totalRevenue = filtered.stats.reduce((s,c)=>s+c.revenue,0);
  const totalExpenses = (filtered as any).expenses?.reduce((s:number,e:any)=>s+Number(e.amount||0),0)||0;
  const netProfit = totalRevenue - totalExpenses;
  const totalPending = filtered.stats.reduce((s,c)=>s+c.pending,0);
  const totalPatients = filtered.stats.reduce((s,c)=>s+c.patients,0);
  const totalApts = filtered.stats.reduce((s,c)=>s+c.appointments,0);

  const today = new Date().toISOString().split('T')[0];
  const todayApts = filtered.appointments.filter(a=>a.appointment_date===today);
  const upcoming = filtered.appointments.filter(a=>a.appointment_date>=today&&a.status!=='Cancelled');

  // Monthly revenue per clinic
  const monthlyRevenue = useMemo(() => {
    const map: Record<string,Record<string,number>> = {};
    filtered.invoices.forEach(inv => {
      if (!inv.created_at) return;
      const month = inv.created_at.slice(0,7);
      const cname = stats.find(s=>s.clinicId===inv.clinic_id)?.clinicName || inv.clinic_id;
      if (!map[month]) map[month] = {};
      map[month][cname] = (map[month][cname]||0) + (Number(inv.paid)||0);
    });
    return Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6);
  }, [filtered.invoices, stats]);

  const clinicColors = ['#c9a84c','#1a7f5e','#2b6cb0','#9f7aea','#dc2626','#ea580c'];

  return (
    <div className="min-h-screen" style={{background:'#f9f7f3',fontFamily:'DM Sans, sans-serif'}}>
      {/* Header */}
      <header className="h-16 bg-white border-b border-black/5 flex items-center px-6 gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-2.5 mr-6">
          <img src="/icons/icon.svg" alt="MediPlex" style={{height:32,width:32,borderRadius:7,display:'block'}}/>
          <div>
            <div style={{fontWeight:700,letterSpacing:'-0.6px',fontSize:'15px',lineHeight:1}}>
              <span style={{color:'#0A1628'}}>Medi</span><span style={{color:'#C9A84C'}}>Plex</span>
            </div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest">Organisation Portal</div>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-semibold text-navy">{orgName}</div>
          <div className="text-[11px] text-gray-400">{clinics.length} clinics · Welcome, {ownerName}</div>
        </div>
        <button onClick={fetchAll} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-navy hover:bg-gray-100">
          <RefreshCw size={14}/>
        </button>
        <button onClick={()=>{signOut({redirect:false});router.push('/login');}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-gray-500 hover:text-red-500 hover:bg-red-50">
          <LogOut size={13}/> Sign Out
        </button>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-5">
        {/* Clinic filter */}
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={()=>setSelectedClinic('all')}
            className="px-4 py-2 rounded-xl text-[12px] font-medium transition-all"
            style={selectedClinic==='all'?{background:'#0a1628',color:'#fff'}:{background:'#fff',color:'#6b7280',border:'1px solid #e5e7eb'}}>
            All Clinics
          </button>
          {clinics.map((c,i)=>(
            <button key={c.id} onClick={()=>setSelectedClinic(c.id)}
              className="px-4 py-2 rounded-xl text-[12px] font-medium transition-all"
              style={selectedClinic===c.id?{background:clinicColors[i%clinicColors.length],color:'#fff'}:{background:'#fff',color:'#6b7280',border:'1px solid #e5e7eb'}}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7 w-fit flex-wrap">
          {([['overview','Overview'],['appointments','Appointments'],['revenue','Revenue'],['feedback','Feedback'],['staff','Staff']] as const).map(([k,l])=>(
            <button key={k} onClick={()=>setActiveTab(k)}
              className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${activeTab===k?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab==='overview' && (
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {label:'Total Revenue', val:`PKR ${totalRevenue.toLocaleString()}`, icon:DollarSign, color:'#1a7f5e', bg:'#f0fdf4'},
                {label:'Outstanding', val:`PKR ${totalPending.toLocaleString()}`, icon:TrendingUp, color:'#d97706', bg:'#fefce8'},
                {label:'Total Patients', val:totalPatients, icon:Users, color:'#2b6cb0', bg:'#eff6ff'},
                {label:'Total Appointments', val:totalApts, icon:Calendar, color:'#7c3aed', bg:'#f5f3ff'},
                {label:'Total Expenses', val:`PKR ${totalExpenses.toLocaleString()}`, icon:Receipt, color:'#dc2626', bg:'#fef2f2'},
                {label:'Net Profit', val:`PKR ${netProfit.toLocaleString()}`, icon:TrendingUp, color:netProfit>=0?'#1a7f5e':'#dc2626', bg:netProfit>=0?'#f0fdf4':'#fef2f2'},
              ].map(s=>(
                <div key={s.label} className="bg-white rounded-2xl p-5 border border-black/5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:s.bg}}>
                      <s.icon size={16} style={{color:s.color}}/>
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">{s.label}</div>
                  </div>
                  <div className="text-[26px] font-bold text-navy">{s.val}</div>
                </div>
              ))}
            </div>

            {/* Today stats */}
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <div className="font-semibold text-navy text-[15px] mb-4">Today — {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl p-4 text-center" style={{background:'#f0fdf4'}}>
                  <div className="text-[28px] font-bold text-green-700">{todayApts.length}</div>
                  <div className="text-[11px] text-green-600 mt-1">Today's Appointments</div>
                </div>
                <div className="rounded-xl p-4 text-center" style={{background:'#eff6ff'}}>
                  <div className="text-[28px] font-bold text-blue-700">{upcoming.length}</div>
                  <div className="text-[11px] text-blue-600 mt-1">Upcoming</div>
                </div>
                <div className="rounded-xl p-4 text-center" style={{background:'#fef2f2'}}>
                  <div className="text-[28px] font-bold text-red-600">{filtered.appointments.filter(a=>a.attendance_status==='No-Show').length}</div>
                  <div className="text-[11px] text-red-500 mt-1">No-Shows (All Time)</div>
                </div>
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                <div className="font-semibold text-navy text-[15px]">Upcoming Appointments</div>
                <div className="text-[12px] text-gray-400">{upcoming.length} total</div>
              </div>
              {/* Per-clinic upcoming counts */}
              <div className="px-5 py-3 flex gap-3 flex-wrap border-b border-black/5">
                {clinics.map((c,i)=>{
                  const count = upcoming.filter(a=>a.clinic_id===c.id).length;
                  return (
                    <div key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium"
                      style={{background:`${clinicColors[i%clinicColors.length]}18`,color:clinicColors[i%clinicColors.length]}}>
                      {c.name}: {count}
                    </div>
                  );
                })}
              </div>
              {/* Upcoming list */}
              <div className="divide-y divide-black/5 max-h-72 overflow-y-auto">
                {upcoming.slice(0,20).map(a=>{
                  const clinic = clinics.find(c=>c.id===a.clinic_id);
                  const ci = clinics.findIndex(c=>c.id===a.clinic_id);
                  return (
                    <div key={a.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:clinicColors[ci%clinicColors.length]||'#ccc'}}/>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-navy truncate">{a.child_name||'—'}</div>
                        <div className="text-[11px] text-gray-400">{a.parent_name||''}</div>
                      </div>
                      <div className="text-[11px] text-gray-500 flex-shrink-0">{clinic?.name||'—'}</div>
                      <div className="text-[12px] font-medium text-navy flex-shrink-0">{a.appointment_date}</div>
                      <div className="text-[11px] text-gray-400 flex-shrink-0">{a.appointment_time||''}</div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
                        style={{background:a.status==='Confirmed'?'#f0fdf4':'#fefce8',color:a.status==='Confirmed'?'#16a34a':'#d97706'}}>
                        {a.status}
                      </span>
                    </div>
                  );
                })}
                {upcoming.length===0 && <div className="px-5 py-6 text-center text-gray-400 text-[13px]">No upcoming appointments</div>}
              </div>
            </div>

            {/* Per clinic cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.stats.map((s,i)=>(
                <div key={s.clinicId} className="bg-white rounded-2xl p-5 border border-black/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-[13px]"
                      style={{background:clinicColors[i%clinicColors.length]}}>
                      {s.clinicName.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-navy text-[14px]">{s.clinicName}</div>
                      <div className="text-[11px] text-gray-400">{s.speciality}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      {label:'Patients', val:s.patients, color:'#2b6cb0'},
                      {label:'Appointments', val:s.appointments, color:'#7c3aed'},
                      {label:'Revenue', val:`PKR ${(s.revenue/1000).toFixed(0)}k`, color:'#1a7f5e'},
                      {label:'Pending', val:`PKR ${(s.pending/1000).toFixed(0)}k`, color:'#d97706'},
                    ].map(m=>(
                      <div key={m.label} className="rounded-xl p-2 text-center" style={{background:'#f9f7f3'}}>
                        <div className="text-[16px] font-bold" style={{color:m.color}}>{m.val}</div>
                        <div className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab==='appointments' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl overflow-hidden border border-black/5">
              <div className="px-5 py-4 border-b border-black/5 font-semibold text-navy text-[14px]">
                {filtered.appointments.length} Appointments {selectedClinic!=='all'?`— ${clinics.find(c=>c.id===selectedClinic)?.name}`:'— All Clinics'}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                      {['Patient','Clinic','Date','Time','Status'].map(h=>(
                        <th key={h} className="px-4 py-3 text-left text-[10px] text-gray-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.appointments.slice(0,50).map(a=>{
                      const clinic = clinics.find(c=>c.id===a.clinic_id);
                      return (
                        <tr key={a.id} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-[13px] font-medium text-navy">{a.child_name}</div>
                            <div className="text-[11px] text-gray-400">{a.parent_name}</div>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-gray-500">{clinic?.name||'—'}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-600">{a.appointment_date}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-600">{a.appointment_time||'—'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{background:a.status==='Confirmed'?'#f0fdf4':a.status==='Cancelled'?'#fef2f2':'#fefce8',
                                color:a.status==='Confirmed'?'#16a34a':a.status==='Cancelled'?'#dc2626':'#d97706'}}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab==='revenue' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-black/5">
                <div className="font-semibold text-navy text-[14px] mb-4">Revenue by Clinic</div>
                <div className="space-y-3">
                  {filtered.stats.sort((a,b)=>b.revenue-a.revenue).map((s,i)=>(
                    <div key={s.clinicId} className="flex items-center gap-3">
                      <div className="text-[12px] text-gray-600 w-36 flex-shrink-0 truncate">{s.clinicName}</div>
                      <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{width:`${totalRevenue?((s.revenue/totalRevenue)*100):0}%`,background:clinicColors[i%clinicColors.length]}}/>
                      </div>
                      <div className="text-[12px] font-semibold text-navy w-28 text-right">PKR {s.revenue.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-black/5">
                <div className="font-semibold text-navy text-[14px] mb-4">Outstanding by Clinic</div>
                <div className="space-y-3">
                  {filtered.stats.sort((a,b)=>b.pending-a.pending).map((s,i)=>(
                    <div key={s.clinicId} className="flex items-center gap-3">
                      <div className="text-[12px] text-gray-600 w-36 flex-shrink-0 truncate">{s.clinicName}</div>
                      <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{width:`${totalPending?((s.pending/totalPending)*100):0}%`,background:'#dc2626'}}/>
                      </div>
                      <div className="text-[12px] font-semibold text-red-600 w-28 text-right">PKR {s.pending.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Doctor Revenue */}
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <div className="font-semibold text-navy text-[14px] mb-4">Revenue by Doctor (All Clinics)</div>
              {(()=>{
                const drMap: Record<string,{revenue:number,clinic:string,count:number}> = {};
                (filtered as any).invoices?.forEach((inv:any) => {
                  const dr = inv.doctor_name || 'Unknown';
                  const clinic = clinics.find((c:any)=>c.id===inv.clinic_id)?.name || inv.clinic_id || '—';
                  if(!drMap[dr]) drMap[dr] = {revenue:0,clinic,count:0};
                  drMap[dr].revenue += Number(inv.amount_paid||inv.paid||0);
                  drMap[dr].count += 1;
                });
                const entries = Object.entries(drMap).sort((a,b)=>b[1].revenue-a[1].revenue);
                const maxRev = entries[0]?.[1]?.revenue || 1;
                return entries.length===0 ? (
                  <div className="text-center py-8 text-gray-400 text-[13px]">No doctor revenue data. Add doctor names to billing records.</div>
                ) : (
                  <div className="space-y-3">
                    {entries.map(([dr, stats], i)=>(
                      <div key={dr} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{background:['#c9a84c','#1a7f5e','#2b6cb0','#9f7aea','#e53e3e'][i%5]}}>
                          {dr.replace(/^Dr\.?\s*/i,'').slice(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-[13px] font-medium text-navy">{dr}</span>
                            <span className="text-[12px] font-semibold text-navy">PKR {stats.revenue.toLocaleString()}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${(stats.revenue/maxRev)*100}%`,background:['#c9a84c','#1a7f5e','#2b6cb0','#9f7aea','#e53e3e'][i%5]}}/>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{stats.clinic} · {stats.count} invoices</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Monthly breakdown */}
            <div className="bg-white rounded-2xl overflow-hidden border border-black/5">
              <div className="px-5 py-4 border-b border-black/5 font-semibold text-navy text-[14px]">Monthly Revenue Breakdown</div>
              <div className="divide-y divide-black/5">
                {monthlyRevenue.map(([month, clinicRevs])=>(
                  <div key={month} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[13px] font-medium text-navy">
                        {new Date(month+'-01').toLocaleString('en-US',{month:'long',year:'numeric'})}
                      </div>
                      <div className="text-[13px] font-bold text-green-700">
                        PKR {Object.values(clinicRevs).reduce((s,v)=>s+v,0).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      {Object.entries(clinicRevs).map(([clinic,rev],i)=>(
                        <div key={clinic} className="text-[11px]">
                          <span style={{color:clinicColors[i%clinicColors.length]}}>{clinic}: </span>
                          <span className="font-medium text-navy">PKR {rev.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses by clinic */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-black/5">
                <div className="font-semibold text-navy text-[14px] mb-4">Expenses by Clinic</div>
                <div className="space-y-3">
                  {clinics.map((clinic,i)=>{
                    const clinicExp = (filtered as any).expenses?.filter((e:any)=>e.clinic_id===clinic.id).reduce((s:number,e:any)=>s+Number(e.amount||0),0)||0;
                    return (
                      <div key={clinic.id} className="flex items-center gap-3">
                        <div className="text-[12px] text-gray-600 w-36 flex-shrink-0 truncate">{clinic.name}</div>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${totalExpenses?((clinicExp/totalExpenses)*100):0}%`,background:'#dc2626'}}/>
                        </div>
                        <div className="text-[12px] font-medium text-red-600 w-28 text-right">PKR {clinicExp.toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-black/5">
                <div className="font-semibold text-navy text-[14px] mb-4">Net Profit by Clinic</div>
                <div className="space-y-3">
                  {filtered.stats.map((s,i)=>{
                    const clinicExp = (filtered as any).expenses?.filter((e:any)=>e.clinic_id===s.clinicId).reduce((sum:number,e:any)=>sum+Number(e.amount||0),0)||0;
                    const profit = s.revenue - clinicExp;
                    return (
                      <div key={s.clinicId} className="flex items-center justify-between p-3 rounded-xl" style={{background:'#f9f7f3'}}>
                        <div className="text-[13px] font-medium text-navy">{s.clinicName}</div>
                        <div className="text-[13px] font-bold" style={{color:profit>=0?'#1a7f5e':'#dc2626'}}>
                          PKR {profit.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Invoices list */}
            <div className="bg-white rounded-2xl overflow-hidden border border-black/5">
              <div className="px-5 py-4 border-b border-black/5 font-semibold text-navy text-[14px]">Recent Invoices</div>
              <table className="w-full">
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                    {['Patient','Clinic','Date','Amount','Paid','Status'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-[10px] text-gray-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.invoices.slice(0,30).map(inv=>{
                    const clinic = clinics.find(c=>c.id===inv.clinic_id);
                    return (
                      <tr key={inv.id||inv.invoice_number} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-[13px] font-medium text-navy">{inv.child_name||'—'}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500">{clinic?.name||'—'}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500">{inv.date||inv.created_at?.slice(0,10)||'—'}</td>
                        <td className="px-4 py-3 text-[12px] font-medium text-navy">PKR {Number(inv.consultation_fee||0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-[12px] font-medium text-green-700">PKR {Number(inv.amount_paid||0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{background:inv.payment_status==='Paid'?'#f0fdf4':inv.payment_status==='Unpaid'?'#fef2f2':'#fefce8',
                              color:inv.payment_status==='Paid'?'#16a34a':inv.payment_status==='Unpaid'?'#dc2626':'#d97706'}}>
                            {inv.payment_status||'—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab==='feedback' && (
          <div className="space-y-4">
            {/* Feedback KPIs */}
            {(() => {
              const filtered_fb = selectedClinic==='all' ? feedbackData : feedbackData.filter(f=>f.clinic_id===selectedClinic);
              const submitted = filtered_fb.filter(f=>f.status==='submitted'||f.rating);
              const avgRating = submitted.length ? (submitted.reduce((s:number,f:any)=>s+(Number(f.rating)||0),0)/submitted.length).toFixed(1) : '—';
              const rating5 = submitted.filter(f=>f.rating===5).length;
              const rating4 = submitted.filter(f=>f.rating===4).length;
              const rating3 = submitted.filter(f=>f.rating===3).length;
              const ratingLow = submitted.filter(f=>f.rating<=2&&f.rating>0).length;
              const responseRate = filtered_fb.length ? Math.round((submitted.length/filtered_fb.length)*100) : 0;
              return (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {label:'Total Sent', val:filtered_fb.length, color:'#2b6cb0', bg:'#eff6ff'},
                      {label:'Responses', val:submitted.length, color:'#1a7f5e', bg:'#f0fdf4'},
                      {label:'Response Rate', val:`${responseRate}%`, color:'#d97706', bg:'#fefce8'},
                      {label:'Avg Rating', val:avgRating==='—'?'—':`★ ${avgRating}`, color:'#c9a84c', bg:'#fffbeb'},
                    ].map(s=>(
                      <div key={s.label} className="bg-white rounded-2xl p-5 border border-black/5">
                        <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">{s.label}</div>
                        <div className="text-[28px] font-bold" style={{color:s.color}}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-black/5">
                    <div className="font-semibold text-navy text-[14px] mb-4">Rating Distribution</div>
                    {[['5 ★',rating5,'#16a34a'],['4 ★',rating4,'#65a30d'],['3 ★',rating3,'#d97706'],['1-2 ★',ratingLow,'#dc2626']].map(([label,count,color])=>(
                      <div key={String(label)} className="flex items-center gap-3 mb-2">
                        <div className="text-[12px] text-gray-500 w-10">{label}</div>
                        <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{width:`${submitted.length?(Number(count)/submitted.length)*100:0}%`,background:String(color)}}/>
                        </div>
                        <div className="text-[12px] font-medium text-navy w-6 text-right">{count}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl overflow-hidden border border-black/5">
                    <div className="px-5 py-4 border-b border-black/5 font-semibold text-navy text-[14px]">Recent Feedback</div>
                    <div className="divide-y divide-black/5 max-h-96 overflow-y-auto">
                      {filtered_fb.slice(0,50).map((f:any,i:number)=>{
                        const clinic = clinics.find(c=>c.id===f.clinic_id);
                        return (
                          <div key={f.id||i} className="px-5 py-3 hover:bg-gray-50">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-navy">{f.child_name||f.patient_name||'Patient'}</div>
                                <div className="text-[11px] text-gray-400">{clinic?.name||'—'} · {f.created_at?.slice(0,10)||'—'}</div>
                                {f.comment && <div className="text-[12px] text-gray-600 mt-1 line-clamp-2">{f.comment}</div>}
                              </div>
                              {f.rating && (
                                <div className="flex-shrink-0 flex items-center gap-0.5">
                                  {[1,2,3,4,5].map(s=>(
                                    <Star key={s} size={12} fill={s<=f.rating?'#c9a84c':'none'} stroke={s<=f.rating?'#c9a84c':'#d1d5db'}/>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {filtered_fb.length===0 && <div className="px-5 py-10 text-center text-gray-400 text-[13px]">No feedback yet</div>}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Staff Tab */}
        {activeTab==='staff' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {['doctor','doctor_admin','admin','receptionist'].map(role=>{
                const count = staffData.filter(u=>u.user_role===role&&(selectedClinic==='all'||u.clinic_id===selectedClinic)).length;
                const labels: Record<string,string> = {doctor:'Doctors',doctor_admin:'Doctor Admins',admin:'Admins',receptionist:'Receptionists'};
                const colors: Record<string,string> = {doctor:'#2b6cb0',doctor_admin:'#7c3aed',admin:'#1a7f5e',receptionist:'#d97706'};
                return (
                  <div key={role} className="bg-white rounded-2xl p-5 border border-black/5">
                    <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">{labels[role]}</div>
                    <div className="text-[28px] font-bold" style={{color:colors[role]}}>{count}</div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white rounded-2xl overflow-hidden border border-black/5">
              <div className="px-5 py-4 border-b border-black/5 font-semibold text-navy text-[14px]">All Staff Members</div>
              <table className="w-full">
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                    {['Name','Email','Role','Clinic','Status','Since'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-[10px] text-gray-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffData
                    .filter(u=>selectedClinic==='all'||u.clinic_id===selectedClinic)
                    .sort((a,b)=>a.user_role.localeCompare(b.user_role))
                    .map((u:any)=>{
                      const clinic = clinics.find(c=>c.id===u.clinic_id);
                      const roleColors: Record<string,string> = {doctor:'#2b6cb0',doctor_admin:'#7c3aed',admin:'#1a7f5e',receptionist:'#d97706',org_owner:'#c9a84c'};
                      return (
                        <tr key={u.id} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                                style={{background:roleColors[u.user_role]||'#6b7280'}}>
                                {u.name?.slice(0,2).toUpperCase()||'??'}
                              </div>
                              <div className="text-[13px] font-medium text-navy">{u.name||'—'}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-gray-500">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                              style={{background:`${roleColors[u.user_role]||'#6b7280'}18`,color:roleColors[u.user_role]||'#6b7280'}}>
                              {u.user_role?.replace('_',' ')||'—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-gray-500">{clinic?.name||'—'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={u.is_active?{background:'rgba(22,163,74,0.12)',color:'#16a34a'}:{background:'rgba(220,38,38,0.12)',color:'#dc2626'}}>
                              {u.is_active?'Active':'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-gray-400">{u.created_at?.slice(0,10)||'—'}</td>
                        </tr>
                      );
                    })}
                  {staffData.length===0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-[13px]">No staff found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
