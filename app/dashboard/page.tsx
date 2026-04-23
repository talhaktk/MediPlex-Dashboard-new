import { fetchAppointmentsFromSheet, computeStats, computeReasonStats, formatUSDate } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import StatCard from '@/components/ui/StatCard';
import StatusPill from '@/components/ui/StatusPill';
import OverviewCharts from './OverviewCharts';
import {
  CalendarDays, CheckCircle, XCircle, RefreshCw,
  TrendingUp, Users, Activity
} from 'lucide-react';

export const revalidate = 60; // refresh every 60 seconds

export default async function DashboardPage() {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {auth:{persistSession:false}});
  const { data: cs } = await sb.from('clinic_settings').select('doctor_name').eq('id',1).maybeSingle();
  const doctorName = cs?.doctor_name || process.env.NEXT_PUBLIC_DOCTOR_NAME || 'Doctor';
  const data = await fetchAppointmentsFromSheet();
  const stats = computeStats(data);
  const reasons = computeReasonStats(data);

  // Today's appointments
  const today = new Date().toLocaleString('en-CA', {timeZone:'Asia/Karachi'}).split(',')[0].trim();
  const todayApts = data.filter(a => a.appointmentDate === today);

  // Upcoming (next 7 days, not cancelled)
  const upcoming = data
    .filter(a => a.appointmentDate >= today && a.status !== 'Cancelled' && a.status !== 'Completed')
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))
    .slice(0, 6);

  // Recent 8
  const recent = [...data]
    .filter(a => a.childName)
    .reverse()
    .slice(0, 8);

  return (
    <>
      <Topbar
        title={`${(() => { const h = new Date().toLocaleString("en-US", {timeZone:"Asia/Karachi", hour:"numeric", hour12:false}); const hr = parseInt(h); return hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening"; })()}, ${doctorName || "Doctor"} 👋`}
        subtitle="Here's your clinic overview for today"
      />

      <main className="flex-1 p-8 space-y-8">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label="Total Appointments" value={stats.total}
            sub="All-time records" icon={CalendarDays} delay={0} />
          <StatCard label="Confirmed" value={stats.confirmed}
            sub={`${stats.confirmationRate}% confirmation rate`}
            icon={CheckCircle} iconColor="#1a7f5e" delay={50} />
          <StatCard label="Cancelled" value={stats.cancelled}
            sub={`${stats.cancellationRate}% cancellation rate`}
            icon={XCircle} iconColor="#c53030" delay={100} />
          <StatCard label="Rescheduled" value={stats.rescheduled}
            sub="Needs new slot" icon={RefreshCw} iconColor="#b47a00" delay={150} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label="Today's Patients" value={stats.todayCount}
            sub={`${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})}`}
            icon={Activity} iconColor="#7c3aed" delay={0} />
          <StatCard label="Upcoming (7d)" value={stats.upcomingCount}
            sub="Confirmed + Rescheduled" icon={TrendingUp} iconColor="#0369a1" delay={50} />
          <StatCard label="Total Patients" value={new Set(data.map(a=>((a as any).mr_number || a.childName.toLowerCase().trim()))).size}
            sub="Unique child records" icon={Users} iconColor="#c9a84c" delay={150} />
        </div>

        {/* Charts row */}
        <OverviewCharts data={data} reasons={reasons} />

        {/* Two column: Recent + Today */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Recent appointments table */}
          <div className="card lg:col-span-3 animate-in stagger-3">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
              <div className="font-medium text-navy text-[14px]">Recent Appointments</div>
              <a href="/dashboard/appointments" className="text-[12px] font-medium" style={{ color: '#c9a84c' }}>
                View all →
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className="font-medium text-navy text-[13px]">{a.childName}</div>
                        <div className="text-[11px] text-gray-400">Parent: {a.parentName}</div>
                      </td>
                      <td className="text-[12px] text-gray-600 whitespace-nowrap">
                        {formatUSDate(a.appointmentDate)}
                      </td>
                      <td className="text-[12px] text-gray-500">{a.appointmentTime || '—'}</td>
                      <td className="text-[12px] text-gray-600 max-w-[140px] truncate">
                        {a.reason || '—'}
                      </td>
                      <td><StatusPill status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming sidebar */}
          <div className="card lg:col-span-2 animate-in stagger-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
              <div className="font-medium text-navy text-[14px]">Upcoming Appointments</div>
              <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                Next 7 days
              </span>
            </div>
            <div className="divide-y divide-black/5">
              {upcoming.length === 0 && (
                <div className="px-5 py-8 text-center text-[13px] text-gray-400">
                  No upcoming appointments
                </div>
              )}
              {upcoming.map(a => (
                <div key={a.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center text-[12px] font-semibold text-gold flex-shrink-0">
                    {a.childName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-navy text-[13px] truncate">{a.childName}</div>
                    <div className="text-[11px] text-gray-400 truncate">
                      {formatUSDate(a.appointmentDate)} · {a.appointmentTime}
                    </div>
                  </div>
                  <StatusPill status={a.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top reasons */}
        <div className="card animate-in stagger-5">
          <div className="px-5 py-4 border-b border-black/5">
            <div className="font-medium text-navy text-[14px]">Top Reasons for Visit</div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reasons.slice(0,8).map((r, i) => (
              <div key={r.reason} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: '#f5edd8', color: '#a07a2a' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-navy truncate">{r.reason}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{
                          width: `${Math.round(r.count / reasons[0].count * 100)}%`,
                          background: 'linear-gradient(90deg,#c9a84c,#e8c87a)'
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{r.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </>
  );
}
