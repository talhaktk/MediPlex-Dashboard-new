import { fetchAppointmentsFromSheet, formatUSDate } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import StatusPill from '@/components/ui/StatusPill';

export const revalidate = 60;

export default async function CalendarPage() {
  const data = await fetchAppointmentsFromSheet();

  // Group by date
  const byDate = new Map<string, typeof data>();
  data.forEach(a => {
    if (!a.appointmentDate) return;
    if (!byDate.has(a.appointmentDate)) byDate.set(a.appointmentDate, []);
    byDate.get(a.appointmentDate)!.push(a);
  });

  // Get upcoming dates sorted
  const today = new Date().toISOString().split('T')[0];
  const sortedDates = Array.from(byDate.keys()).sort();
  const upcoming = sortedDates.filter(d => d >= today);
  const past = sortedDates.filter(d => d < today).reverse();

  return (
    <>
      <Topbar title="Calendar" subtitle="Appointments by date" />
      <main className="flex-1 p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display text-[16px] font-semibold text-navy mb-4">Upcoming Appointments</h2>
            <div className="space-y-3">
              {upcoming.length === 0 && <div className="text-[13px] text-gray-400 card p-5">No upcoming appointments</div>}
              {upcoming.map(date => (
                <div key={date} className="card overflow-hidden animate-in">
                  <div className="px-4 py-3 border-b border-black/5 flex items-center gap-3"
                    style={{ background: date === today ? 'rgba(201,168,76,0.06)' : undefined }}>
                    <div className="text-[13px] font-semibold text-navy">{formatUSDate(date)}</div>
                    {date === today && <span className="text-[10px] bg-gold/20 text-amber-700 px-2 py-0.5 rounded-full font-medium">Today</span>}
                    <span className="ml-auto text-[11px] text-gray-400">{byDate.get(date)!.length} appointment{byDate.get(date)!.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-black/5">
                    {byDate.get(date)!.sort((a,b)=>a.appointmentTime.localeCompare(b.appointmentTime)).map(a => (
                      <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-14 text-[11px] text-gray-400 font-medium flex-shrink-0">{a.appointmentTime || '—'}</div>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: '#f5edd8', color: '#a07a2a' }}>
                          {a.childName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-navy truncate">{a.childName}</div>
                          <div className="text-[11px] text-gray-400 truncate">{a.reason || a.visitType || '—'}</div>
                        </div>
                        <StatusPill status={a.status} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-[16px] font-semibold text-navy mb-4">Past Appointments</h2>
            <div className="space-y-3">
              {past.length === 0 && <div className="text-[13px] text-gray-400 card p-5">No past appointments</div>}
              {past.slice(0, 10).map(date => (
                <div key={date} className="card overflow-hidden animate-in opacity-75 hover:opacity-100 transition-opacity">
                  <div className="px-4 py-3 border-b border-black/5 flex items-center gap-3">
                    <div className="text-[13px] font-semibold text-gray-500">{formatUSDate(date)}</div>
                    <span className="ml-auto text-[11px] text-gray-400">{byDate.get(date)!.length} appt{byDate.get(date)!.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-black/5">
                    {byDate.get(date)!.map(a => (
                      <div key={a.id} className="px-4 py-2.5 flex items-center gap-3">
                        <div className="w-14 text-[11px] text-gray-400 flex-shrink-0">{a.appointmentTime || '—'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-gray-600 truncate">{a.childName}</div>
                          <div className="text-[10px] text-gray-400 truncate">{a.reason || '—'}</div>
                        </div>
                        <StatusPill status={a.status} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
