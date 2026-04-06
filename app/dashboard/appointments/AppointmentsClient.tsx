'use client';

import { useState, useMemo } from 'react';
import { Appointment } from '@/types';
import { filterAppointments, exportToCSV, formatUSDate } from '@/lib/sheets';
import StatusPill from '@/components/ui/StatusPill';
import AttendanceDropdown from '@/components/ui/AttendanceDropdown';
import { Search, Download, Filter, ChevronLeft, ChevronRight, X, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['all','Confirmed','Cancelled','Rescheduled','Pending','No-Show','Completed'];
const VISIT_TYPES = ['all','New','New Visit','Follow-up','Emergency','Telehealth'];
const ATTENDANCE = ['all','Not Set','In Clinic','Checked-In','Absent','No-Show'];
const PER_PAGE = 12;

export default function AppointmentsClient({ data }: { data: Appointment[] }) {
  const [status, setStatus] = useState('all');
  const [visitType, setVisitType] = useState('all');
  const [attendance, setAttendance] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let result = filterAppointments(data, { status, visitType, search, dateFrom, dateTo });
    if (attendance !== 'all') {
      result = result.filter(a => (a.attendanceStatus || 'Not Set') === attendance);
    }
    return result;
  }, [data, status, visitType, search, dateFrom, dateTo, attendance]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayData = data.filter(a => a.appointmentDate === today);
  const checkedIn = todayData.filter(a => a.attendanceStatus === 'Checked-In' || a.attendanceStatus === 'In Clinic').length;
  const absent    = todayData.filter(a => a.attendanceStatus === 'Absent' || a.attendanceStatus === 'No-Show').length;
  const pending   = todayData.filter(a => !a.attendanceStatus || a.attendanceStatus === 'Not Set').length;

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

      {/* Today's attendance summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
            <UserCheck size={16} style={{ color: '#166534' }} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Checked In Today</div>
            <div className="text-[24px] font-semibold text-navy leading-none">{checkedIn}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#ffedd5' }}>
            <span style={{ fontSize: 16, color: '#c2410c' }}>✕</span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Absent / No-Show</div>
            <div className="text-[24px] font-semibold text-navy leading-none">{absent}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f3f4f6' }}>
            <span style={{ fontSize: 16, color: '#6b7280' }}>◷</span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Awaiting Today</div>
            <div className="text-[24px] font-semibold text-navy leading-none">{pending}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
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

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-5 animate-in">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Status</label>
              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Visit Type</label>
              <select value={visitType} onChange={e => { setVisitType(e.target.value); setPage(1); }}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                {VISIT_TYPES.map(v => <option key={v} value={v}>{v === 'all' ? 'All Types' : v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Attendance</label>
              <select value={attendance} onChange={e => { setAttendance(e.target.value); setPage(1); }}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                {ATTENDANCE.map(a => <option key={a} value={a}>{a === 'all' ? 'All Attendance' : a}</option>)}
              </select>
            </div>
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

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search by patient name, parent, or reason for visit..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="search-input" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden animate-in">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input type="checkbox"
                    onChange={e => setSelected(e.target.checked ? filtered.map(a => a.id) : [])}
                    checked={selected.length === filtered.length && filtered.length > 0} />
                </th>
                <th>#</th>
                <th>Patient</th>
                <th>Age</th>
                <th>Contact</th>
                <th>Appointment</th>
                <th>Time</th>
                <th>Reason</th>
                <th>Visit Type</th>
                <th>Status</th>
                <th style={{ minWidth: 120 }}>Attendance</th>
                <th>Check-in</th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 && (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400 text-[13px]">No appointments match your filters</td></tr>
              )}
              {slice.map((a, i) => {
                const dataRowIndex = data.findIndex(d => d.id === a.id) + 1; // 1-based
                return (
                  <tr key={a.id} className={selected.includes(a.id) ? 'bg-amber-50/40' : ''}>
                    <td>
                      <input type="checkbox" checked={selected.includes(a.id)}
                        onChange={e => setSelected(prev => e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id))} />
                    </td>
                    <td className="text-gray-400 text-[11px]">{(page - 1) * PER_PAGE + i + 1}</td>
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
                    <td>
                      <div className="text-[11px] text-gray-500">{a.whatsapp || '—'}</div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{a.email || '—'}</div>
                    </td>
                    <td className="text-[12px] font-medium text-navy whitespace-nowrap">{formatUSDate(a.appointmentDate)}</td>
                    <td className="text-[12px] text-gray-500 whitespace-nowrap">{a.appointmentTime || '—'}</td>
                    <td className="max-w-[160px]">
                      <div className="text-[12px] text-gray-700 truncate" title={a.reason}>{a.reason || '—'}</div>
                    </td>
                    <td>
                      <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{a.visitType || '—'}</span>
                    </td>
                    <td><StatusPill status={a.status} /></td>
                    <td>
                      <AttendanceDropdown
                        appointmentId={a.id}
                        rowIndex={dataRowIndex}
                        initial={(a.attendanceStatus as string) || 'Not Set'}
                      />
                    </td>
                    <td className="text-[11px] text-gray-400 whitespace-nowrap">
                      {a.checkInTime || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
