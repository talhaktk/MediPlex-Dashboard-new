import { fetchAppointmentsFromSheet, formatUSDate } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import StatusPill from '@/components/ui/StatusPill';

export const revalidate = 60;

export default async function PatientsPage() {
  const data = await fetchAppointmentsFromSheet();

  const patientMap = new Map<string, {
    key: string; childName: string; parentName: string; childAge: string;
    whatsapp: string; email: string; visits: typeof data;
    lastVisit: string; status: string;
  }>();

  data.forEach(a => {
    const key = `${a.childName.toLowerCase()}_${a.parentName.toLowerCase()}`;
    if (!patientMap.has(key)) {
      patientMap.set(key, { key, childName: a.childName, parentName: a.parentName,
        childAge: a.childAge, whatsapp: a.whatsapp, email: a.email,
        visits: [], lastVisit: '', status: a.status });
    }
    const p = patientMap.get(key)!;
    p.visits.push(a);
    if (!p.lastVisit || a.appointmentDate > p.lastVisit) {
      p.lastVisit = a.appointmentDate; p.status = a.status;
      if (a.childAge) p.childAge = a.childAge;
    }
  });

  const patients = Array.from(patientMap.values())
    .filter(p => p.childName.trim())
    .sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

  return (
    <>
      <Topbar title="Patients" subtitle={`${patients.length} unique patient records`} />
      <main className="flex-1 p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {patients.map((p, i) => (
            <div key={p.key} className="card p-5 hover:shadow-md transition-shadow animate-in cursor-pointer"
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[15px] font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#f5edd8,#e8c87a)', color: '#a07a2a' }}>
                  {p.childName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-navy text-[14px] truncate">{p.childName}</div>
                  <div className="text-[11px] text-gray-400 truncate">Parent: {p.parentName}</div>
                </div>
              </div>
              <div className="space-y-2 text-[12px] mb-4">
                {[['Age', p.childAge ? `${p.childAge} yr` : '—'],['Total Visits',p.visits.length],
                  ['Last Visit',formatUSDate(p.lastVisit)],['Phone',p.whatsapp||'—']].map(([k,v])=>(
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-gray-400">{k}</span>
                    <span className="text-navy font-medium truncate ml-2 max-w-[130px]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                <StatusPill status={p.status} />
                <span className="text-[11px] text-gold font-medium">View history →</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
