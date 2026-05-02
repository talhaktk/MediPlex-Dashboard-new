'use client';
// Helper to generate MR number using clinic settings pattern
function generateMR(prefix: string, digits: number, existingCount: number): string {
  const num = (existingCount + 1).toString().padStart(digits, '0');
  return `${prefix}-${num}`;
}

import { supabase } from '@/lib/supabase';
import { useClinic, withClinicFilter, withClinicId } from '@/lib/clinicContext';
import { useState, useMemo, useEffect } from 'react';
import { Appointment } from '@/types';
import { filterAppointments, exportToCSV, formatUSDate, createAppointmentFull, softDeleteAppointment } from '@/lib/sheets';import StatusPill from '@/components/ui/StatusPill';
import AttendanceDropdown from '@/components/ui/AttendanceDropdown';
import CheckInFlow from '@/components/ui/CheckInFlow';
import TelehealthModal from '@/components/ui/TelehealthModal';
import {
  Search, Download, Filter, ChevronLeft, ChevronRight,
  X, CalendarCheck, UserCheck, Stethoscope, XCircle, FileText, Plus, Trash2, Video
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAttendanceAll, AttendanceRecord } from '@/lib/store';

const STATUSES    = ['all', 'Confirmed', 'Cancelled', 'Rescheduled', 'Pending', 'No-Show', 'Completed'];
const VISIT_TYPES = ['all', 'New', 'New Visit', 'Follow-up', 'Emergency', 'Telehealth'];
const ATTENDANCE  = ['all', 'Not Set', 'Checked-In', 'In Clinic', 'Absent', 'No-Show'];
const PER_PAGE    = 12;

// ── New appointment form defaults ──────────────────────────────────────────
const EMPTY_FORM = {
  child_name:       '',
  parent_name:      '',
  child_age:        '',
  gender:            '',
   mr_number:         '',
  whatsapp_number:  '',
  email_address:    '',
  appointment_date: '',
  appointment_time: '',
  reason_for_visit: '',
  visit_type:       'New Visit',
};

export default function AppointmentsClient({ data: initialData }: { data: Appointment[] }) {
  const [data, setData] = useState<Appointment[]>(initialData);
  const { settings: clinicSettings, refetch: refetchSettings } = useClinicSettings();
  const { clinicId, isSuperAdmin, terminology } = useClinic();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [status,      setStatus]      = useState('all');
  const [visitType,   setVisitType]   = useState('all');
  const [attendance,  setAttendance]  = useState('all');
  const [search,      setSearch]      = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [page,        setPage]        = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selected,    setSelected]    = useState<string[]>([]);

  const [sortAtt, setSortAtt] = useState<'asc' | 'desc' | null>(null);
  const [sortBy,  setSortBy]  = useState<'date' | 'name' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ── Store attendance ───────────────────────────────────────────────────────
  const [storeAtt, setStoreAtt] = useState<Record<string, AttendanceRecord>>({});
  useEffect(() => { setStoreAtt(getAttendanceAll()); }, []);
  useEffect(() => {
  const raw = localStorage.getItem('mediplex_apt_prefill');
  if (raw) {
    try { setAddForm(prev => ({ ...prev, ...JSON.parse(raw) })); setShowAddModal(true); } catch {}
    localStorage.removeItem('mediplex_apt_prefill');
  }
}, []);
  const refreshAttendance = () => setStoreAtt(getAttendanceAll());

  // ── Patient record / check-in modal ───────────────────────────────────────
  const [patientRecordApt, setPatientRecordApt] = useState<Appointment | null>(null);
  const [telehealthApt, setTelehealthApt] = useState<Appointment | null>(null);

  // ── Add appointment modal ──────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm,      setAddForm]      = useState({ ...EMPTY_FORM });
  const [addLoading,   setAddLoading]   = useState(false);
  const [schedule, setSchedule] = useState<any>(null);
  const [slotConflict, setSlotConflict] = useState<string>('');

  // Fetch schedule settings once
  useEffect(() => {
    /* schedule loaded via useClinicSettings hook */
  }, []);

  // Generate time slots from schedule
  const generateTimeSlots = (sch: any) => {
    if (!sch) return [];
    const slots: string[] = [];
    const addSlots = (start: string, end: string) => {
      const [sh,sm] = start.split(':').map(Number);
      const [eh,em] = end.split(':').map(Number);
      let mins = sh*60+sm;
      const endM = eh*60+em;
      while (mins < endM) {
        const h = Math.floor(mins/60);
        const m = mins%60;
        const ampm = h>=12?'PM':'AM';
        const h12 = h>12?h-12:h===0?12:h;
        slots.push(`${h12}:${m.toString().padStart(2,'0')} ${ampm}`);
        mins += (sch.slot_duration||15) + (sch.buffer_time||0);
      }
    };
    addSlots(sch.morning_start||'09:00', sch.morning_end||'12:00');
    addSlots(sch.evening_start||'14:00', sch.evening_end||'17:00');
    return slots;
  };

  // Check slot conflict
  const checkSlotConflict = (date: string, time: string) => {
    if (!date || !time) { setSlotConflict(''); return; }
    const conflicts = data.filter(a =>
      a.appointmentDate === date &&
      a.appointmentTime === time &&
      !['Cancelled','No-Show'].includes(a.status)
    );
    const maxPerSlot = schedule?.max_per_slot || 1;
    if (conflicts.length >= maxPerSlot) {
      setSlotConflict(`⚠ Slot taken by: ${conflicts.map(a=>a.childName).join(', ')}`);
    } else {
      setSlotConflict('');
    }
  };

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('appointments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchLatest();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLatest = async () => {
    const { data: rows } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false })
      .eq('clinic_id', clinicId||'');
    if (rows) {
      setData(rows.map((row: any) => ({
        id:               row.id.toString(),
        timestamp:        row.created_at || '',
        childName:        row.child_name || '',
        parentName:       row.parent_name || '',
        childAge:         row.child_age || '',
        whatsapp:         row.whatsapp_number || '',
        email:            row.email_address || '',
        appointmentDate:  row.appointment_date || '',
        appointmentTime:  row.appointment_time || '',
        reason:           row.reason_for_visit || '',
        visitType:        row.visit_type || 'New',
        status:           row.status || row.appointment_status || 'Confirmed',
        attendanceStatus: row.attendance_status || '',
        checkInTime:      row.check_in_time || '',
        inClinicTime:     row.in_clinic_time || '',
        mr_number:        row.mr_number || '',
        gender:           row.gender || '',
      } as Appointment)));
    }
  };

  // ── Sort helper ────────────────────────────────────────────────────────────
  const toggleSort = (col: 'date' | 'name') => {
    if (sortBy === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else setSortBy(null);
    } else {
      setSortBy(col); setSortDir('asc'); setSortAtt(null);
    }
  };

  const getAttendance = (a: Appointment) => storeAtt[a.id] ?? {
    attendanceStatus: a.attendanceStatus || 'Not Set',
    checkInTime:  a.checkInTime  || '',
    inClinicTime: a.inClinicTime || '',
  };

  // ── Filtered + sorted list ─────────────────────────────────────────────────
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
          if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
          if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
          return h * 60 + min;
        };
        const dA = a.appointmentDate || '', dB = b.appointmentDate || '';
        if (dA !== dB) return sortDir === 'asc' ? dA.localeCompare(dB) : dB.localeCompare(dA);
        const diff = toMins(a.appointmentTime) - toMins(b.appointmentTime);
        return sortDir === 'asc' ? diff : -diff;
      });
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) =>
        sortDir === 'asc' ? a.childName.localeCompare(b.childName) : b.childName.localeCompare(a.childName)
      );
    }
    if (sortAtt) {
      const order = ['Not Set', 'Checked-In', 'In Clinic', 'Absent', 'No-Show'];
      result = [...result].sort((a, b) => {
        const ai = order.indexOf(getAttendance(a).attendanceStatus || 'Not Set');
        const bi = order.indexOf(getAttendance(b).attendanceStatus || 'Not Set');
        return sortAtt === 'asc' ? ai - bi : bi - ai;
      });
    }
    return result;
  }, [data, status, visitType, search, dateFrom, dateTo, attendance, sortAtt, sortBy, sortDir, storeAtt]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const slice      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Today summary ──────────────────────────────────────────────────────────
  const today     = new Date().toISOString().split('T')[0];
  const todayData = data.filter(a =>
    a.appointmentDate === today &&
    ['Confirmed', 'Rescheduled', 'Pending'].includes(a.status)
  );
  const totalToday  = todayData.length;
  const checkedIn   = todayData.filter(a => getAttendance(a).attendanceStatus === 'Checked-In').length;
  const inClinic    = todayData.filter(a => getAttendance(a).attendanceStatus === 'In Clinic').length;
  const absentToday = todayData.filter(a => ['Absent', 'No-Show'].includes(getAttendance(a).attendanceStatus)).length;

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const toExport = selected.length > 0 ? filtered.filter(a => selected.includes(a.id)) : filtered;
    exportToCSV(toExport, `mediplex_appointments_${today}.csv`);
    toast.success(`Exported ${toExport.length} records`);
  };

  // ── Clear filters ──────────────────────────────────────────────────────────
  const clearFilters = () => {
    setStatus('all'); setVisitType('all'); setAttendance('all');
    setSearch(''); setDateFrom(''); setDateTo(''); setPage(1);
  };

  const hasFilters = status !== 'all' || visitType !== 'all' || attendance !== 'all' || search || dateFrom || dateTo;

  // ── Add appointment ────────────────────────────────────────────────────────
  const handleAddAppointment = async () => {
    if (!addForm.child_name.trim())       { toast.error(`${terminology.patient} name is required`);        return; }
    if (!addForm.parent_name.trim())      { toast.error(`${terminology.guardian} name is required`);       return; }
    if (!addForm.appointment_date)        { toast.error('Appointment date is required');  return; }
    if (!addForm.appointment_time.trim()) { toast.error('Appointment time is required');  return; }
    // Check slot conflict
    const conflicts = data.filter(a =>
      a.appointmentDate === addForm.appointment_date &&
      a.appointmentTime === addForm.appointment_time &&
      !['Cancelled','No-Show'].includes(a.status)
    );
    const maxPerSlot = schedule?.max_per_slot || 1;
    if (conflicts.length >= maxPerSlot) {
      const names = conflicts.map(a=>a.childName).join(', ');
      if (!confirm(`⚠ This slot is already booked by: ${names}\n\nBook anyway as emergency?`)) return;
    }

    setAddLoading(true);
const result = await createAppointmentFull({...addForm, clinic_id: clinicId} as any);
    setAddLoading(false);

    if (result.success) {
      toast.success('Appointment added successfully');
      setShowAddModal(false);
      setAddForm({ ...EMPTY_FORM });
      await fetchLatest();
    } else {
      toast.error('Failed to add: ' + result.error);
    }
  };

  // ── Soft delete ────────────────────────────────────────────────────────────
  const handleDelete = async (apt: Appointment) => {
    if (!confirm(`Cancel appointment for ${apt.childName} on ${formatUSDate(apt.appointmentDate)}?`)) return;
    const result = await softDeleteAppointment(apt.id);
    if (result.success) {
      toast.success('Appointment cancelled');
      await fetchLatest();
    } else {
      toast.error('Failed: ' + result.error);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Summary cards ── */}
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

      {/* ── Toolbar ── */}
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
          <button onClick={handleExport} className="btn-outline text-[12px] py-2 px-3 gap-1.5">
            <Download size={13} /> Export CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-gold text-[12px] py-2 px-4 gap-1.5">
            <Plus size={13} /> New Appointment
          </button>
        </div>
      </div>

      {/* ── Filters panel ── */}
      {showFilters && (
        <div className="card p-5 animate-in">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Status',     value: status,     set: setStatus,     opts: STATUSES,    allLabel: 'All Statuses'   },
              { label: 'Visit Type', value: visitType,  set: setVisitType,  opts: VISIT_TYPES, allLabel: 'All Types'      },
              { label: 'Attendance', value: attendance, set: setAttendance, opts: ATTENDANCE,  allLabel: 'All Attendance' },
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

      {/* ── Search ── */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search by patient name, parent, or reason for visit..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="search-input" />
      </div>

      {/* ── Table ── */}
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
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('name')}>
                  Patient {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th>MR#</th>
                <th>Age</th>
                <th>Contact</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('date')}>
                  Appointment {sortBy === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th>Time</th>
                <th>Reason</th>
                <th>Visit</th>
                <th>Status</th>
                <th style={{ minWidth: 130, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setSortAtt(s => s === 'asc' ? 'desc' : s === 'desc' ? null : 'asc')}>
                  Attendance {sortAtt === 'asc' ? '↑' : sortAtt === 'desc' ? '↓' : '↕'}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 && (
                <tr><td colSpan={13} className="text-center py-12 text-gray-400 text-[13px]">No appointments match your filters</td></tr>
              )}
              {slice.map((a, i) => {
                const dataRowIndex = data.findIndex(d => d.id === a.id) + 1;
                const att = getAttendance(a);
                const mr  = (a as any).mr_number;
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

                    {/* MR# */}
                    <td>
                      {mr ? (
                        <span className="font-mono text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          {mr}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>

                    <td className="text-[12px] text-gray-600">
  {a.childAge ? `${a.childAge} yr` : '—'}
  {(a as any).gender ? <span className="ml-1 text-[10px] px-1 py-0.5 rounded font-medium" style={{background:(a as any).gender==='Male'?'#dbeafe':(a as any).gender==='Female'?'#fce7f3':'#f3e8ff',color:(a as any).gender==='Male'?'#1d4ed8':(a as any).gender==='Female'?'#be185d':'#7c3aed'}}>{(a as any).gender.charAt(0)}</span> : null}
</td>

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

                    {/* Status */}
                    <td>
                      <StatusPill status={a.status} />
                      {a.status === 'Rescheduled' && (
                        <div className="mt-1 space-y-0.5">
                          {a.originalDate && (
                            <div className="text-[10px] text-gray-400">
                              Was: {formatUSDate(a.originalDate)}{a.appointmentTime ? ` · ${a.appointmentTime}` : ''}
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

                    {/* Attendance */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        <AttendanceDropdown appointment={a} rowIndex={dataRowIndex} />
                        <button onClick={() => setPatientRecordApt(a)} title="Open patient record"
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-amber-50 transition-colors flex-shrink-0">
                          <FileText size={12} className="text-gray-500" />
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => setTelehealthApt(a)} title="Start Telehealth"
                          className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors flex-shrink-0">
                          <Video size={12} className="text-blue-500"/>
                        </button>
                        <button onClick={() => handleDelete(a)} title="Cancel appointment"
                          disabled={a.status === 'Cancelled'}
                          className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors flex-shrink-0 disabled:opacity-30">
                          <Trash2 size={12} className="text-red-500"/>
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

      {/* ── Patient Record Modal ── */}
      {patientRecordApt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl">
            <CheckInFlow
              appointment={patientRecordApt}
              onComplete={() => { setPatientRecordApt(null); refreshAttendance(); fetchLatest(); }}
              onCancel={() => setPatientRecordApt(null)}
            />
          </div>
        </div>
      )}

      {/* ── Telehealth Modal ── */}
      {telehealthApt && (
        <TelehealthModal appointment={telehealthApt} onClose={() => setTelehealthApt(null)}/>
      )}

      {/* ── Add Appointment Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card w-full max-w-lg max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-black/5 flex-shrink-0">
              <div>
                <div className="font-semibold text-navy text-[16px]">New Appointment</div>
                <div className="text-[12px] text-gray-400">Fill in the details to book an appointment</div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Patient info */}
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mb-2">Patient Information</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">{terminology.patient} Name *</label>
                    <input type="text" placeholder="Full name"
                      value={addForm.child_name}
                      onChange={e => setAddForm(p => ({ ...p, child_name: e.target.value }))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">{terminology.guardian} Name *</label>
                    <input type="text" placeholder="Parent name"
                      value={addForm.parent_name}
                      onChange={e => setAddForm(p => ({ ...p, parent_name: e.target.value }))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Age (years)</label>
                    <input type="text" placeholder="e.g. 5"
                      value={addForm.child_age}
                      onChange={e => setAddForm(p => ({ ...p, child_age: e.target.value }))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">WhatsApp</label>
                    <input type="text" placeholder="+92..."
                      value={addForm.whatsapp_number}
                      onChange={e => setAddForm(p => ({ ...p, whatsapp_number: e.target.value }))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Email</label>
                    <input type="email" placeholder="optional"
                      value={addForm.email_address}
                      onChange={e => setAddForm(p => ({ ...p, email_address: e.target.value }))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                  </div>
                  <div>
  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Gender</label>
  <select value={addForm.gender} onChange={e => setAddForm(p => ({ ...p, gender: e.target.value }))}
    className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
    <option value="">Select gender...</option>
    <option value="Male">Male</option>
    <option value="Female">Female</option>
    <option value="Other">Other</option>
  </select>
</div>
{addForm.mr_number && (
  <div className="col-span-2 rounded-lg px-3 py-2 text-[12px] font-mono"
    style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)', color:'#a07a2a' }}>
    Returning patient · MR# {addForm.mr_number}
  </div>
)}
                </div>
              </div>

              {/* Appointment details */}
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mb-2">Appointment Details</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Date *</label>
                    <input type="date"
                      value={addForm.appointment_date}
                      onChange={e => setAddForm(p => ({ ...p, appointment_date: e.target.value }))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Time *</label>
                    {schedule ? (
                      <select value={addForm.appointment_time}
                        onChange={e => { setAddForm(p => ({...p, appointment_time: e.target.value})); checkSlotConflict(addForm.appointment_date, e.target.value); }}
                        className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                        <option value="">Select time slot...</option>
                        {generateTimeSlots(schedule).map(slot => {
                          const taken = data.filter(a=>a.appointmentDate===addForm.appointment_date&&a.appointmentTime===slot&&!['Cancelled','No-Show'].includes(a.status)).length;
                          const full = taken >= (schedule.max_per_slot||1);
                          return <option key={slot} value={slot} style={{color:full?'#dc2626':'inherit'}}>{slot}{full?' ⚠ Full':taken>0?` (${taken}/${schedule.max_per_slot})`  :''}</option>;
                        })}
                      </select>
                    ) : (
                      <input type="time" value={addForm.appointment_time}
                        onChange={e => setAddForm(p => ({...p, appointment_time: e.target.value}))}
                        className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                    )}
                    {slotConflict && <div className="text-[11px] text-red-500 mt-1">{slotConflict}</div>}
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Reason for Visit</label>
                    <input type="text" placeholder="e.g. Fever, Follow-up, Vaccination"
                      value={addForm.reason_for_visit}
                      onChange={e => setAddForm(p => ({ ...p, reason_for_visit: e.target.value }))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Visit Type</label>
                    <select value={addForm.visit_type}
                      onChange={e => setAddForm(p => ({ ...p, visit_type: e.target.value }))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                      {['New Visit', 'Follow-up', 'Emergency', 'Telehealth'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-2 p-5 border-t border-black/5 flex-shrink-0">
              <button
                onClick={handleAddAppointment}
                disabled={addLoading}
                className="btn-gold gap-1.5 text-[13px] py-2.5 px-5 flex-1"
              >
                {addLoading ? 'Saving...' : <><Plus size={14} /> Book Appointment</>}
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn-outline text-[12px] py-2 px-4">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}