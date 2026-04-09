'use client';

import { useState, useMemo } from 'react';
import { Appointment } from '@/types';
import { formatUSDate } from '@/lib/sheets';
import StatusPill from '@/components/ui/StatusPill';
import {
  Search, X, Phone, Mail, Calendar, User, Heart,
  AlertTriangle, TrendingUp, FileText, Plus, Save, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

interface HealthRecord {
  bloodGroup:  string;
  allergies:   string;
  conditions:  string;
  notes:       string;
  weights:     { date: string; kg: string }[];
  heights:     { date: string; cm: string }[];
}

interface PatientRecord {
  key:         string;
  name:        string;
  parentName:  string;
  age:         string;
  whatsapp:    string;
  email:       string;
  visits:      Appointment[];
  lastVisit:   string;
  totalVisits: number;
  status:      string;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEY = 'mediplex_health';

function loadHealth(key: string): HealthRecord {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return all[key] || emptyHealth();
  } catch { return emptyHealth(); }
}

function saveHealth(key: string, data: HealthRecord) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    all[key] = data;
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function emptyHealth(): HealthRecord {
  return { bloodGroup:'', allergies:'', conditions:'', notes:'', weights:[], heights:[] };
}

// ── Build patient records ─────────────────────────────────────────────────────
function buildPatients(data: Appointment[]): PatientRecord[] {
  const map = new Map<string, PatientRecord>();
  [...data]
    .sort((a, b) => (b.appointmentDate||'').localeCompare(a.appointmentDate||''))
    .forEach(a => {
      const key = a.childName.toLowerCase().trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { key, name:a.childName, parentName:a.parentName, age:a.childAge,
          whatsapp:a.whatsapp, email:a.email, visits:[], lastVisit:a.appointmentDate,
          totalVisits:0, status:a.status });
      }
      const p = map.get(key)!;
      p.visits.push(a);
      p.totalVisits++;
      if (a.appointmentDate > p.lastVisit) { p.lastVisit = a.appointmentDate; p.status = a.status; }
    });
  return Array.from(map.values()).sort((a,b) => b.lastVisit.localeCompare(a.lastVisit));
}

const BLOOD_GROUPS = ['','A+','A-','B+','B-','AB+','AB-','O+','O-'];

// ── Component ─────────────────────────────────────────────────────────────────
export default function PatientsClient({ data }: { data: Appointment[] }) {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<PatientRecord | null>(null);
  const [health,   setHealth]   = useState<HealthRecord>(emptyHealth());
  const [activeTab, setActiveTab] = useState<'visits'|'health'|'growth'>('visits');
  const [editHealth, setEditHealth] = useState(false);
  const [draftHealth, setDraftHealth] = useState<HealthRecord>(emptyHealth());
  const [newWeight, setNewWeight] = useState({ date: new Date().toISOString().split('T')[0], kg: '' });
  const [newHeight, setNewHeight] = useState({ date: new Date().toISOString().split('T')[0], cm: '' });
  const [showGrowthForm, setShowGrowthForm] = useState(false);

  const patients = useMemo(() => buildPatients(data), [data]);
  const filtered = useMemo(() => {
    if (!search) return patients;
    const q = search.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.parentName.toLowerCase().includes(q) ||
      (p.whatsapp||'').includes(q)
    );
  }, [patients, search]);

  const openPatient = (p: PatientRecord) => {
    const h = loadHealth(p.key);
    setHealth(h);
    setDraftHealth(h);
    setSelected(p);
    setActiveTab('visits');
    setEditHealth(false);
  };

  const saveHealthRecord = () => {
    if (!selected) return;
    saveHealth(selected.key, draftHealth);
    setHealth(draftHealth);
    setEditHealth(false);
    toast.success('Health record saved');
  };

  const addGrowthEntry = () => {
    if (!selected) return;
    const updated = { ...health };
    if (newWeight.kg) updated.weights = [...updated.weights, { ...newWeight }].sort((a,b) => b.date.localeCompare(a.date));
    if (newHeight.cm) updated.heights = [...updated.heights, { date: newHeight.date, cm: newHeight.cm }].sort((a,b) => b.date.localeCompare(a.date));
    saveHealth(selected.key, updated);
    setHealth(updated);
    setDraftHealth(updated);
    setNewWeight({ date: new Date().toISOString().split('T')[0], kg: '' });
    setNewHeight({ date: new Date().toISOString().split('T')[0], cm: '' });
    setShowGrowthForm(false);
    toast.success('Growth entry added');
  };

  // Summary stats
  const multiVisit = patients.filter(p => p.totalVisits > 1).length;
  const avgVisits  = patients.length ? (data.length / patients.length).toFixed(1) : '0';

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total Patients',      value: patients.length },
          { label:'Multiple Visits',     value: multiVisit },
          { label:'Single Visit',        value: patients.length - multiVisit },
          { label:'Avg Visits / Patient',value: avgVisits },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="text-[10px] tracking-widest uppercase text-gray-400 font-medium mb-1">{s.label}</div>
            <div className="font-display text-[28px] font-semibold text-navy">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search by child name, parent, or phone..."
          value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
      </div>

      {/* Patient grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p, i) => {
          const h = typeof window !== 'undefined' ? loadHealth(p.key) : emptyHealth();
          const hasHealth = h.bloodGroup || h.allergies || h.conditions;
          return (
            <div key={p.key} onClick={() => openPatient(p)}
              className="card p-4 cursor-pointer hover:shadow-md transition-all hover:border-gold/30 animate-in"
              style={{ animationDelay:`${Math.min(i*30,300)}ms` }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                  style={{ background:'#f5edd8', color:'#a07a2a' }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy text-[14px] truncate">{p.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">Parent: {p.parentName}</div>
                </div>
                {hasHealth && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:'#fee2e2' }}>
                    <Heart size={10} style={{ color:'#dc2626' }} />
                  </div>
                )}
              </div>
              <div className="space-y-1.5 text-[12px] text-gray-500">
                {p.age && <div className="flex items-center gap-1.5"><User size={11} className="text-gray-400" />Age {p.age}</div>}
                {p.whatsapp && p.whatsapp !== '—' && (
                  <div className="flex items-center gap-1.5 font-mono text-[11px]"><Phone size={11} className="text-gray-400" />{p.whatsapp}</div>
                )}
                <div className="flex items-center gap-1.5"><Calendar size={11} className="text-gray-400" />Last: {formatUSDate(p.lastVisit)}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  <span className="font-semibold text-navy">{p.totalVisits}</span> {p.totalVisits===1?'visit':'visits'}
                </span>
                <StatusPill status={p.status} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Patient Detail Modal ───────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(10,22,40,0.65)' }} onClick={() => setSelected(null)}>
          <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-black/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-bold flex-shrink-0"
                  style={{ background:'#f5edd8', color:'#a07a2a' }}>
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-display font-semibold text-navy text-[18px]">{selected.name}</div>
                  <div className="text-[12px] text-gray-400">Parent: {selected.parentName} · {selected.age ? `Age ${selected.age}` : 'Age unknown'}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={14} className="text-gray-600" />
              </button>
            </div>

            {/* Contact strip */}
            <div className="px-5 py-3 bg-gray-50 border-b border-black/5 flex gap-4 flex-shrink-0">
              {selected.whatsapp && selected.whatsapp !== '—' && (
                <div className="flex items-center gap-1.5 text-[12px] text-gray-600">
                  <Phone size={12} className="text-gray-400" />{selected.whatsapp}
                </div>
              )}
              {selected.email && selected.email !== '—' && (
                <div className="flex items-center gap-1.5 text-[12px] text-gray-600">
                  <Mail size={12} className="text-gray-400" />{selected.email}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[12px] text-gray-600">
                <Calendar size={12} className="text-gray-400" />{selected.totalVisits} visits total
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-black/5 flex-shrink-0">
              {([['visits','Visit History'],['health','Health Record'],['growth','Growth']] as const).map(([t,l]) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${activeTab===t?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── VISIT HISTORY ── */}
              {activeTab === 'visits' && (
                <div className="divide-y divide-black/5">
                  {selected.visits
                    .sort((a,b) => (b.appointmentDate||'').localeCompare(a.appointmentDate||''))
                    .map(v => (
                      <div key={v.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-[13px] font-medium text-navy">{formatUSDate(v.appointmentDate)}</div>
                          <div className="text-[12px] text-gray-500 mt-0.5">
                            {v.appointmentTime}{v.visitType ? ` · ${v.visitType}` : ''}{v.reason ? ` · ${v.reason}` : ''}
                          </div>
                          {v.reschedulingReason && (
                            <div className="text-[11px] text-amber-600 mt-1">↻ {v.reschedulingReason}</div>
                          )}
                          {v.attendanceStatus && v.attendanceStatus !== 'Not Set' && (
                            <div className="text-[11px] text-gray-400 mt-0.5">Attendance: {v.attendanceStatus}</div>
                          )}
                        </div>
                        <StatusPill status={v.status} />
                      </div>
                    ))}
                </div>
              )}

              {/* ── HEALTH RECORD ── */}
              {activeTab === 'health' && (
                <div className="p-5 space-y-4">
                  {!editHealth ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[13px] font-medium text-navy">Health Information</div>
                        <button onClick={() => { setDraftHealth({...health}); setEditHealth(true); }}
                          className="btn-outline text-[11px] py-1.5 px-3 gap-1">
                          <FileText size={11} /> Edit
                        </button>
                      </div>

                      {/* Blood Group */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl p-4" style={{ background:'#fff0f0', border:'1px solid #fecaca' }}>
                          <div className="text-[10px] uppercase tracking-widest text-red-400 font-medium mb-1">Blood Group</div>
                          <div className="text-[24px] font-bold text-red-600">{health.bloodGroup || '—'}</div>
                        </div>
                        <div className="rounded-xl p-4" style={{ background:'#fff9e6', border:'1px solid #fde68a' }}>
                          <div className="text-[10px] uppercase tracking-widest text-amber-600 font-medium mb-1">Total Visits</div>
                          <div className="text-[24px] font-bold text-amber-700">{selected.totalVisits}</div>
                        </div>
                      </div>

                      {/* Allergies */}
                      <div className="rounded-xl p-4" style={{ background:'#fff7ed', border:'1px solid #fed7aa' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={13} style={{ color:'#ea580c' }} />
                          <div className="text-[11px] uppercase tracking-widest text-orange-600 font-medium">Allergies</div>
                        </div>
                        <div className="text-[13px] text-navy">{health.allergies || 'No allergies recorded'}</div>
                      </div>

                      {/* Conditions */}
                      <div className="rounded-xl p-4" style={{ background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                        <div className="text-[11px] uppercase tracking-widest text-green-600 font-medium mb-2">Medical Conditions</div>
                        <div className="text-[13px] text-navy">{health.conditions || 'No conditions recorded'}</div>
                      </div>

                      {/* Notes */}
                      <div className="rounded-xl p-4" style={{ background:'#f8f8f8', border:'1px solid #e5e7eb' }}>
                        <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-2">Doctor Notes</div>
                        <div className="text-[13px] text-navy whitespace-pre-wrap">{health.notes || 'No notes recorded'}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[13px] font-medium text-navy">Edit Health Record</div>
                        <button onClick={() => setEditHealth(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Blood Group</label>
                        <select value={draftHealth.bloodGroup}
                          onChange={e => setDraftHealth(prev => ({...prev, bloodGroup: e.target.value}))}
                          className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                          {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g || 'Select...'}</option>)}
                        </select>
                      </div>

                      {[
                        { label:'Allergies',           key:'allergies',  placeholder:'e.g. Penicillin, Peanuts, Dust...' },
                        { label:'Medical Conditions',  key:'conditions', placeholder:'e.g. Asthma, Diabetes...' },
                        { label:'Doctor Notes',        key:'notes',      placeholder:'General notes about this patient...' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{f.label}</label>
                          <textarea rows={f.key==='notes'?4:2} placeholder={f.placeholder}
value={String((draftHealth as unknown as Record<string,string>)[f.key] ?? '')}
onChange={e => setDraftHealth(prev => ({...prev, [f.key]: e.target.value}))}
                            className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold resize-none" />
                        </div>
                      ))}

                      <button onClick={saveHealthRecord} className="btn-gold gap-1.5 text-[12px] py-2 px-4 w-full justify-center">
                        <Save size={13}/> Save Health Record
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── GROWTH TRACKER ── */}
              {activeTab === 'growth' && (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-medium text-navy">Growth Tracker</div>
                    <button onClick={() => setShowGrowthForm(!showGrowthForm)}
                      className="btn-gold text-[11px] py-1.5 px-3 gap-1">
                      <Plus size={11}/> Add Entry
                    </button>
                  </div>

                  {showGrowthForm && (
                    <div className="rounded-xl p-4" style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)' }}>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Date</label>
                          <input type="date" value={newWeight.date}
                            onChange={e => { setNewWeight(p=>({...p,date:e.target.value})); setNewHeight(p=>({...p,date:e.target.value})); }}
                            className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold" />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Weight (kg)</label>
                          <input type="number" step="0.1" placeholder="e.g. 18.5" value={newWeight.kg}
                            onChange={e => setNewWeight(p=>({...p,kg:e.target.value}))}
                            className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold" />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Height (cm)</label>
                          <input type="number" step="0.5" placeholder="e.g. 105" value={newHeight.cm}
                            onChange={e => setNewHeight(p=>({...p,cm:e.target.value}))}
                            className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold" />
                        </div>
                      </div>
                      <button onClick={addGrowthEntry} className="btn-gold text-[11px] py-1.5 px-4 gap-1">
                        <Save size={11}/> Save Entry
                      </button>
                    </div>
                  )}

                  {/* Weight table */}
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-2 flex items-center gap-2">
                      <TrendingUp size={12}/> Weight History
                    </div>
                    {health.weights.length === 0 ? (
                      <div className="text-[12px] text-gray-400 text-center py-4">No weight entries yet</div>
                    ) : (
                      <div className="space-y-2">
                        {health.weights.map((w, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                            <span className="text-[12px] text-gray-500">{formatUSDate(w.date)}</span>
                            <span className="text-[14px] font-semibold text-navy">{w.kg} kg</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Height table */}
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-2 flex items-center gap-2">
                      <TrendingUp size={12}/> Height History
                    </div>
                    {health.heights.length === 0 ? (
                      <div className="text-[12px] text-gray-400 text-center py-4">No height entries yet</div>
                    ) : (
                      <div className="space-y-2">
                        {health.heights.map((h, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                            <span className="text-[12px] text-gray-500">{formatUSDate(h.date)}</span>
                            <span className="text-[14px] font-semibold text-navy">{h.cm} cm</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
