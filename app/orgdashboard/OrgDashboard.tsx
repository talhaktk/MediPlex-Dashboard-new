'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Calendar, Receipt, BarChart3, LogOut, RefreshCw, TrendingUp, DollarSign } from 'lucide-react';

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
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview'|'appointments'|'revenue'|'feedback'>('overview');

  useEffect(() => {
    fetchAll();
  }, [orgId]);

  const fetchAll = async () => {
    setLoading(true);
    // Fetch clinics for this org
    const { data: clinicData } = await supabase.from('clinics').select('*').eq('org_id', orgId).eq('is_active', true);
    const orgClinics = clinicData || [];
    setClinics(orgClinics);

    // Fetch stats per clinic
    const statsArr: OrgStats[] = [];
    for (const clinic of orgClinics) {
      const [{ count: pc }, { count: ac }, { data: inv }] = await Promise.all([
        supabase.from('patients').select('*', { count:'exact', head:true }).eq('clinic_id', clinic.id),
        supabase.from('appointments').select('*', { count:'exact', head:true }).eq('clinic_id', clinic.id),
        supabase.from('billing').select('paid,fee_amount,discount,payment_status').eq('clinic_id', clinic.id),
      ]);
      const revenue = (inv||[]).reduce((s:number,i:any)=>s+(Number(i.paid)||0),0);
      const pending = (inv||[]).reduce((s:number,i:any)=>s+Math.max(0,(Number(i.fee_amount)||0)-(Number(i.discount)||0)-(Number(i.paid)||0)),0);
      statsArr.push({ clinicId: clinic.id, clinicName: clinic.name, speciality: clinic.speciality, patients: pc||0, appointments: ac||0, revenue, pending });
    }
    setStats(statsArr);

    // Fetch all appointments for org
    const clinicIds = orgClinics.map((c:any)=>c.id);
    if (clinicIds.length > 0) {
      const { data: apts } = await supabase.from('appointments').select('*').in('clinic_id', clinicIds).order('appointment_date',{ascending:false}).limit(200);
      setAppointments(apts||[]);
      const { data: inv } = await supabase.from('billing').select('*').in('clinic_id', clinicIds).order('created_at',{ascending:false});
      setInvoices(inv||[]);
      const { data: exp } = await supabase.from('expenses').select('*').in('clinic_id', clinicIds).order('date',{ascending:false});
      setExpenses(exp||[]);
      const { data: exp } = await supabase.from('expenses').select('*').in('clinic_id', clinicIds).order('date',{ascending:false});
      setExpenses(exp||[]);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => ({
    appointments: selectedClinic==='all' ? appointments : appointments.filter(a=>a.clinic_id===selectedClinic),
    invoices: selectedClinic==='all' ? invoices : invoices.filter(i=>i.clinic_id===selectedClinic),
    expenses: selectedClinic==='all' ? expenses : expenses.filter(e=>e.clinic_id===selectedClinic),
    expenses: selectedClinic==='all' ? expenses : expenses.filter(e=>e.clinic_id===selectedClinic),
    stats: selectedClinic==='all' ? stats : stats.filter(s=>s.clinicId===selectedClinic),
  }), [selectedClinic, appointments, invoices, stats]);

  const totalRevenue = filtered.stats.reduce((s,c)=>s+c.revenue,0);
  const totalExpenses = (filtered as any).expenses?.reduce((s:number,e:any)=>s+Number(e.amount||0),0)||0;
  const netProfit = totalRevenue - totalExpenses;
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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-navy font-bold text-sm" style={{background:'linear-gradient(135deg,#c9a84c,#e8c87a)'}}>M+</div>
          <div>
            <div className="text-[13px] font-bold text-navy">MediPlex</div>
            <div className="text-[10px] text-gold uppercase tracking-widest">Organisation Portal</div>
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
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7 w-fit">
          {([['overview','Overview'],['appointments','Appointments'],['revenue','Revenue'],['feedback','Feedback']] as const).map(([k,l])=>(
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
                        <td className="px-4 py-3 text-[12px] font-medium text-navy">PKR {Number(inv.fee_amount||0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-[12px] font-medium text-green-700">PKR {Number(inv.paid||0).toLocaleString()}</td>
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
          <div className="bg-white rounded-2xl overflow-hidden border border-black/5">
            <div className="px-5 py-4 border-b border-black/5 font-semibold text-navy text-[14px]">Patient Feedback — All Clinics</div>
            <div className="p-5 text-center text-gray-400 text-[13px]">Feedback analytics coming soon</div>
          </div>
        )}
      </main>
    </div>
  );
}
