'use client';

import { useState, useMemo, useEffect } from 'react';
import { Appointment } from '@/types';
import { filterAppointments, exportToCSV, formatUSDate } from '@/lib/sheets';
import StatusPill from '@/components/ui/StatusPill';
import AttendanceDropdown from '@/components/ui/AttendanceDropdown';
import CheckInFlow from '@/components/ui/CheckInFlow';
import { Search, Download, Filter, ChevronLeft, ChevronRight, X, CalendarCheck, UserCheck, Stethoscope, XCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAttendanceAll, AttendanceRecord } from '@/lib/store';

const STATUSES    = ['all','Confirmed','Cancelled','Rescheduled','Pending','No-Show','Completed'];
const VISIT_TYPES = ['all','New','New Visit','Follow-up','Emergency','Telehealth'];
const ATTENDANCE  = ['all','Not Set','Checked-In','In Clinic','Absent','No-Show'];
const PER_PAGE = 12;

export default function AppointmentsClient({ data }: { data: Appointment[] }) {
  const [status,     setStatus]     = useState('all');
  const [visitType,  setVisitType]  = useState('all');
  const [attendance, setAttendance] = useState('all');
  const [search,     setSearch]     = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [page,       setPage]       = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selected,   setSelected]   = useState<string[]>([]);

  const [sortAtt, setSortAtt] = useState<'asc'|'desc'|null>(null);
  const [sortBy,  setSortBy]  = useState<'date'|'name'|null>(null);
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

  // Use central store for attendance
  const [storeAtt, setStoreAtt] = useState<Record<string, AttendanceRecord>>({});
  const [patientRecordApt, setPatientRecordApt] = useState<Appointment | null>(null);

  useEffect(() => { setStoreAtt(getAttendanceAll()); }, []);

  // Refresh store attendance after check-in flow completes
  const refreshAttendance = () => setStoreAtt(getAttendanceAll());

  const toggleSort = (col: 'date'|'name') => {
    if (sortBy === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortBy(null); }
    } else {
      setSortBy(col); setSortDir('asc'); setSortAtt(null);
    }
  };

  const getAttendance = (a: Appointment) => storeAtt[a.id] ?? {
    attendanceStatus: a.attendanceStatus || 'Not Set',
    checkInTime:  a.checkInTime  || '',
    inClinicTime: a.inClinicTime || '',
  };

  const filtered = useMemo(() => {
    let result = filterAppointments(data, { status, visitType, search, dateFrom, dateTo });
    if (attendance !== 'all') {
      result = result.filter(a => getAttendance(a).attendanceStatus === attendance);
    }
    if (sortBy === 'date') {
      result = [...result].sort((a, b) => {
        const toMins = (t: string) => {
          if (!t) return 0;
          const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!m) return 0;
          let h = parseInt(m[1]);
          const min = parseInt(m[2]);
          const pm = m[3].toUpperCase() === 'PM';
          if (pm && h !== 12) h += 12;
          if (!pm && h === 12) h = 0;
          return h * 60 + min;
        };
        const dateA = a.appointmentDate || '';
        const dateB = b.appointmentDate || '';
        if (dateA !== dateB) {
          return sortDir === 'asc'
            ? dateA.localeCompare(dateB)
            : dateB.localeCompare(dateA);
        }
        const diff = toMins(a.appointmentTime) - toMins(b.appointmentTime);
        return sortDir === 'asc' ? diff : -diff;
      });
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) =>
        sortDir === 'asc'
          ? a.childName.localeCompare(b.childName)
          : b.childName.localeCompare(a.childName)
      );
    }
    if (sortAtt) {
      const order = ['Not Set','Checked-In','In Clinic','Absent','No-Show'];
      result = [...result].sort((a, b) => {
        const ai = order.indexOf(getAttendance(a).attendanceStatus || 'Not Set');
        const bi = order.indexOf(getAttendance(b).attendanceStatus || 'Not Set');
        return sortAtt === 'asc' ? ai - bi : bi - ai;
      });
    }
    return result;
  }, [data, status, visitType, search, dateFrom, dateTo, attendance, sortAtt, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Today's summary stats ──────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const todayData = data.filter(a =>
    a.appointmentDate === today &&
    (a.status === 'Confirmed' || a.status === 'Rescheduled' || a.status === 'Pending')
  );
  
  const totalToday  = todayData.length;
  const checkedIn   = todayData.filter(a => getAttendance(a).attendanceStatus === 'Checked-In').length;
  const inClinic    = todayData.filter(a => getAttendance(a).attendanceStatus === 'In Clinic').length;
  const absentToday = todayData.filter(a => ['Absent','No-Show'].includes(getAttendance(a).attendanceStatus)).length;

  const handleExport = () => {
    const toExport = selected.length > 0 ? filtered.filter(a => selected.includes(a.id)) : filtered;
    exportToCSV(toExport, `mediplex_appointments_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${toExport.length} records`);
  };

  const clearFilters = () => {
    setStatus('all'); setVisitType('all'); setAttendance('all');
    setSearch(''); setDateFrom(''); setDateTo(''); setPage(1);
  };

  const hasFilters = status !== 'all' || visitType !== 'all' || attendance !== 'all' || search || dateFrom || dateTo;

  return (
    <div className="space-y-5">

      {/* ── Today's summary cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4' }}>
            <CalendarCheck size={16} style={{ color: '#16a34a' }} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Total Today</div>
            <div className="text-[26px] font-semibold text-navy leading-none">{totalToday}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Confirmed + Rescheduled</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#dbeafe' }}>
            <UserCheck size={16} style={{ color: '#1d4ed8' }} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Checked-In</div>
            <div className="text-[26px] font-semibold text-navy leading-none">{checkedIn}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Waiting room</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#dcfce7' }}>
            <Stethoscope size={16} style={{ color: '#166534' }} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">In Clinic</div>
            <div className="text-[26px] font-semibold text-navy leading-none">{inClinic}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">With doctor now</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fee2e2' }}>
            <XCircle size={16} style={{ color: '#dc2626' }} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Absent / No-Show</div>
            <div className="text-[26px] font-semibold text-navy leading-none">{absentToday}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Did not arrive</div>
          </div>
        </div>

      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-gray-500">
          Showing <span className="font-medium text-navy">{filtered.length}</span> of{' '}
          <span className="font-medium text-navy">{data.length}</span> appointments
        </div>
        <div className="flex gap-2">
          {hasFilters && (
            <button onClick={clearFilters} className="btn-outline text-[12px] py-2 px-3 gap-1.5">
              <X size={12} /> Clear filters
            </button>
          )}
          <button onClick={() => setShowFilters(!showFilters)} className="btn-outline text-[12px] py-2 px-3 gap-1.5">
            <Filter size={13} /> Filters
          </button>
          <button onClick={handleExport} className="btn-gold text-[12px] py-2 px-4 gap-1.5">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="card p-5 animate-in">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label:'Status',     value:status,     set:setStatus,     opts:STATUSES,    allLabel:'All Statuses' },
              { label:'Visit Type', value:visitType,  set:setVisitType,  opts:VISIT_TYPES, allLabel:'All Types' },
              { label:'Attendance', value:attendance, set:setAttendance, opts:ATTENDANCE,  allLabel:'All Attendance' },
            ].map(({ label, value: val, set, opts, allLabel }) => (
              <div key={label}>
                <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{label}</label>
                <select value={val} onChange={e => { set(e.target.value); setPage(1); }}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                  {opts.map(o => <option key={o} value={o}>{o === 'all' ? allLabel : o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Date From</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Date To</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
            </div>
          </div>
        </div>
      )}

      {/* ── Search ───────────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search by patient name, parent, or reason for visit..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="search-input" />
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="card animate-in">
        <div className="overflow-visible">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input type="checkbox"
                    onChange={e => setSelected(e.target.checked ? filtered.map(a => a.id) : [])}
                    checked={selected.length === filtered.length && filtered.length > 0} />
                </th>
                <th>#</th>
                <th style={{ cursor:'pointer', userSelect:'none' }} onClick={() => toggleSort('name')}>
                  Patient {sortBy==='name' ? (sortDir==='asc'?'↑':'↓') : '↕'}
                </th>
                <th>Age</th>
                <th>Contact</th>
                <th style={{ cursor:'pointer', userSelect:'none' }} onClick={() => toggleSort('date')}>
                  Appointment {sortBy==='date' ? (sortDir==='asc'?'↑':'↓') : '↕'}
                </th>
                <th>Time</th>
                <th>Reason</th>
                <th>Visit</th>
                <th>Status</th>
                <th style={{ minWidth: 130, cursor:'pointer', userSelect:'none' }}
                  onClick={() => setSortAtt(s => s === 'asc' ? 'desc' : s === 'desc' ? null : 'asc')}>
                  Attendance {sortAtt === 'asc' ? '↑' : sortAtt === 'desc' ? '↓' : '↕'}
                </th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400 text-[13px]">No appointments match your filters</td></tr>
              )}
              {slice.map((a, i) => {
                const dataRowIndex = data.findIndex(d => d.id === a.id) + 1;
                const att = getAttendance(a);
                return (
                  <tr key={a.id} className={selected.includes(a.id) ? 'bg-amber-50/40' : ''}>
                    <td>
                      <input type="checkbox" checked={selected.includes(a.id)}
                        onChange={e => setSelected(prev =>
                          e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id)
                        )} />
                    </td>
                    <td className="text-gray-400 text-[11px]">{(page - 1) * PER_PAGE + i + 1}</td>

                    {/* Patient */}
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                          style={{ background: '#f5edd8', color: '#a07a2a' }}>
                          {a.childName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-navy text-[13px]">{a.childName}</div>
                          <div className="text-[11px] text-gray-400">Parent: {a.parentName}</div>
                        </div>
                      </div>
                    </td>

                    <td className="text-[12px] text-gray-600">{a.childAge ? `${a.childAge} yr` : '—'}</td>

                    {/* Contact */}
                    <td>
                      <div className="text-[11px] text-gray-500">{a.whatsapp || '—'}</div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{a.email || '—'}</div>
                    </td>

                    <td className="text-[12px] font-medium text-navy whitespace-nowrap">{formatUSDate(a.appointmentDate)}</td>
                    <td className="text-[12px] text-gray-500 whitespace-nowrap">{a.appointmentTime || '—'}</td>

                    {/* Reason */}
                    <td className="max-w-[150px]">
                      <div className="text-[12px] text-gray-700 truncate" title={a.reason}>{a.reason || '—'}</div>
                    </td>

                    <td>
                      <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{a.visitType || '—'}</span>
                    </td>

                    {/* Status — shows rescheduled info inline */}
                    <td>
                      <StatusPill status={a.status} />
                      {a.status === 'Rescheduled' && (
                        <div className="mt-1 space-y-0.5">
                          {a.originalDate && (
                            <div className="text-[10px] text-gray-400">
                              Was: {formatUSDate(a.originalDate)}
                              {a.appointmentTime ? ` · ${a.appointmentTime}` : ''}
                            </div>
                          )}
                          {a.reschedulingReason && (
                            <div className="text-[10px] text-amber-600 truncate max-w-[130px]" title={a.reschedulingReason}>
                              ↻ {a.reschedulingReason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Attendance dropdown — triggers invoice+vitals flow on check-in */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        <AttendanceDropdown
                          appointment={a}
                          rowIndex={dataRowIndex}
                        />
                        <button
                          onClick={() => setPatientRecordApt(a)}
                          title="Open patient record"
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-amber-50 transition-colors flex-shrink-0">
                          <FileText size={12} className="text-gray-500"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <div className="text-[12px] text-gray-400">
            {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} records
            {selected.length > 0 && <span className="ml-2 text-gold font-medium">· {selected.length} selected</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-black/10 text-gray-500 hover:border-gold hover:text-gold disabled:opacity-30 transition-all">
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] transition-all ${page === p ? 'text-navy font-semibold border-2 border-gold' : 'border border-black/10 text-gray-500 hover:border-gold'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-black/10 text-gray-500 hover:border-gold hover:text-gold disabled:opacity-30 transition-all">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Patient Record Quick Modal */}
      {patientRecordApt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl">
            <CheckInFlow
              appointment={patientRecordApt}
              onComplete={() => { setPatientRecordApt(null); refreshAttendance(); }}
              onCancel={() => setPatientRecordApt(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
