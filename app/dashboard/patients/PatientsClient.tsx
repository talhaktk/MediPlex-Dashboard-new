'use client';

import { useState, useMemo } from 'react';
import { Appointment } from '@/types';
import { formatUSDate } from '@/lib/sheets';
import StatusPill from '@/components/ui/StatusPill';
import { Search, X, Phone, Mail, Calendar, Activity, User } from 'lucide-react';

interface PatientRecord {
  name: string;
  parentName: string;
  age: string;
  whatsapp: string;
  email: string;
  visits: Appointment[];
  lastVisit: string;
  totalVisits: number;
  status: string; // most recent status
}

function buildPatientRecords(data: Appointment[]): PatientRecord[] {
  const map = new Map<string, PatientRecord>();
  const sorted = [...data].sort((a, b) =>
    (b.appointmentDate || '').localeCompare(a.appointmentDate || '')
  );

  sorted.forEach(a => {
    const key = a.childName.toLowerCase().trim();
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        name: a.childName,
        parentName: a.parentName,
        age: a.childAge,
        whatsapp: a.whatsapp,
        email: a.email,
        visits: [],
        lastVisit: a.appointmentDate,
        totalVisits: 0,
        status: a.status,
      });
    }
    const rec = map.get(key)!;
    rec.visits.push(a);
    rec.totalVisits++;
    if (a.appointmentDate > rec.lastVisit) {
      rec.lastVisit = a.appointmentDate;
      rec.status = a.status;
    }
  });

  return Array.from(map.values()).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
}

export default function PatientsClient({ data }: { data: Appointment[] }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PatientRecord | null>(null);

  const patients = useMemo(() => buildPatientRecords(data), [data]);
  const filtered = useMemo(() => {
    if (!search) return patients;
    const q = search.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.parentName.toLowerCase().includes(q) ||
      (p.whatsapp || '').includes(q)
    );
  }, [patients, search]);

  const ageGroups: Record<string, number> = {};
  patients.forEach(p => {
    const n = parseInt(p.age);
    if (isNaN(n)) return;
    const g = n <= 5 ? '0–5' : n <= 10 ? '6–10' : n <= 15 ? '11–15' : '16+';
    ageGroups[g] = (ageGroups[g] || 0) + 1;
  });

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: patients.length },
          { label: 'Multiple Visits', value: patients.filter(p => p.totalVisits > 1).length },
          { label: 'Single Visit', value: patients.filter(p => p.totalVisits === 1).length },
          { label: 'Avg. Visits / Patient', value: (data.length / patients.length).toFixed(1) },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="text-[10px] tracking-widest uppercase text-gray-400 font-medium mb-1">{s.label}</div>
            <div className="font-display text-[28px] font-semibold text-navy">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by child name, parent, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="text-[12px] text-gray-400">{filtered.length} patients</div>
      </div>

      {/* Patient cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(p => (
          <div
            key={p.name}
            onClick={() => setSelected(p)}
            className="card p-4 cursor-pointer hover:shadow-md transition-shadow hover:border-gold/30"
            style={{ borderColor: 'rgba(10,22,40,0.07)' }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-semibold flex-shrink-0"
                style={{ background: '#f5edd8', color: '#a07a2a' }}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy text-[14px] truncate">{p.name}</div>
                <div className="text-[11px] text-gray-400 truncate">Parent: {p.parentName}</div>
              </div>
            </div>

            <div className="space-y-1.5 text-[12px] text-gray-500">
              {p.age && (
                <div className="flex items-center gap-1.5">
                  <User size={11} className="text-gray-400 flex-shrink-0" />
                  Age {p.age}
                </div>
              )}
              {p.whatsapp && p.whatsapp !== '—' && (
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Phone size={11} className="text-gray-400 flex-shrink-0" />
                  {p.whatsapp}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar size={11} className="text-gray-400 flex-shrink-0" />
                Last: {formatUSDate(p.lastVisit)}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                <span className="font-semibold text-navy">{p.totalVisits}</span>{' '}
                {p.totalVisits === 1 ? 'visit' : 'visits'}
              </span>
              <StatusPill status={p.status} />
            </div>
          </div>
        ))}
      </div>

      {/* Patient detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,22,40,0.6)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="card w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-black/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-bold"
                  style={{ background: '#f5edd8', color: '#a07a2a' }}>
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-display font-semibold text-navy text-[18px]">{selected.name}</div>
                  <div className="text-[12px] text-gray-400">Parent / Guardian: {selected.parentName}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={14} className="text-gray-600" />
              </button>
            </div>

            {/* Patient info */}
            <div className="p-5 grid grid-cols-3 gap-4 border-b border-black/5">
              {[
                { label: 'Age', value: selected.age ? `${selected.age} yrs` : '—' },
                { label: 'WhatsApp', value: selected.whatsapp || '—' },
                { label: 'Email', value: selected.email || '—' },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-0.5">{item.label}</div>
                  <div className="text-[13px] text-navy font-medium truncate">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Visit history */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-3 border-b border-black/5">
                <div className="font-medium text-navy text-[13px]">
                  Visit History <span className="text-gray-400 font-normal">({selected.visits.length} visits)</span>
                </div>
              </div>
              <div className="divide-y divide-black/5">
                {selected.visits
                  .sort((a, b) => (b.appointmentDate || '').localeCompare(a.appointmentDate || ''))
                  .map(v => (
                    <div key={v.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-[13px] font-medium text-navy">{formatUSDate(v.appointmentDate)}</div>
                        <div className="text-[12px] text-gray-500 mt-0.5">
                          {v.appointmentTime} · {v.visitType || 'N/A'} · {v.reason || 'No reason noted'}
                        </div>
                        {v.reschedulingReason && (
                          <div className="text-[11px] text-amber-600 mt-1">
                            Note: {v.reschedulingReason}
                          </div>
                        )}
                      </div>
                      <StatusPill status={v.status} />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
