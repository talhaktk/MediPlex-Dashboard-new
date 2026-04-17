'use client';

import { useState, useEffect } from 'react';
import { Appointment } from '@/types';
import toast from 'react-hot-toast';
import { getAttendance, setAttendance } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import CheckInFlow from './CheckInFlow';

interface Props {
  appointment: Appointment;
  rowIndex:    number;
}

const OPTIONS = [
  { value:'Not Set',    color:'#9ca3af', bg:'#f3f4f6', border:'#d1d5db' },
  { value:'Checked-In', color:'#0369a1', bg:'#dbeafe', border:'#93c5fd' },
  { value:'In Clinic',  color:'#166534', bg:'#dcfce7', border:'#86efac' },
  { value:'Absent',     color:'#c2410c', bg:'#ffedd5', border:'#fdba74' },
  { value:'No-Show',    color:'#991b1b', bg:'#fee2e2', border:'#fca5a5' },
];

export default function AttendanceDropdown({ appointment, rowIndex }: Props) {
  const [rec,          setRec]          = useState(() => getAttendance(appointment.id));
  const [loading,      setLoading]      = useState(false);
  const [showCheckIn,  setShowCheckIn]  = useState(false);
  const [pendingValue, setPendingValue] = useState('');

  useEffect(() => { setRec(getAttendance(appointment.id)); }, [appointment.id]);

  const current = OPTIONS.find(o => o.value === rec.attendanceStatus) ?? OPTIONS[0];
  const now = () => new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });

  const handleChange = (newVal: string) => {
    if (newVal === rec.attendanceStatus) return;
    if (newVal === 'Checked-In') {
      setPendingValue(newVal);
      setShowCheckIn(true);
      return;
    }
    applyChange(newVal);
  };

  const applyChange = async (newVal: string) => {
    setLoading(true);

    const updated = {
      attendanceStatus: newVal,
      checkInTime:  newVal === 'Checked-In' && !rec.checkInTime ? now() : rec.checkInTime,
      inClinicTime: newVal === 'In Clinic'  ? now() : rec.inClinicTime,
    };

    setRec(updated);
    setAttendance(appointment.id, updated);

    // ── Sync to Supabase ──────────────────────────────────────────────────
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          attendance_status: updated.attendanceStatus,
          check_in_time:     updated.checkInTime  || null,
          in_clinic_time:    updated.inClinicTime || null,
        })
        .eq('id', appointment.id);

      if (error) throw error;
      toast.success(`Marked as ${newVal}`);
    } catch (err: any) {
      toast.success(`Marked as ${newVal} (local only — DB sync failed: ${err.message})`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInComplete = (invoiceCreated: boolean) => {
    setShowCheckIn(false);
    if (invoiceCreated) {
      applyChange(pendingValue);
    } else {
      toast('Check-in cancelled — no invoice created', { icon:'⚠️' });
    }
    setPendingValue('');
  };

  const handleCheckInCancel = () => {
    setShowCheckIn(false);
    setPendingValue('');
  };

  return (
    <>
      <div style={{ display:'flex', flexDirection:'column', gap:2, minWidth:118 }}>
        <div style={{ position:'relative' }}>
          <select
            value={rec.attendanceStatus} disabled={loading}
            onChange={e => handleChange(e.target.value)}
            style={{
              appearance:'none', WebkitAppearance:'none',
              background:current.bg, color:current.color,
              border:`1px solid ${current.border}`,
              borderRadius:6, padding:'4px 22px 4px 8px',
              fontSize:11, fontWeight:600,
              cursor:loading?'wait':'pointer',
              outline:'none', width:'100%', transition:'all .15s',
            }}>
            {OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
          </select>
          <span style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:current.color, fontSize:8 }}>▼</span>
        </div>
        {rec.checkInTime  && <div style={{ fontSize:10, color:'#0369a1', paddingLeft:2 }}>✓ {rec.checkInTime}</div>}
        {rec.inClinicTime && <div style={{ fontSize:10, color:'#166534', paddingLeft:2 }}>🩺 {rec.inClinicTime}</div>}
      </div>

      {showCheckIn && (
        <CheckInFlow
          appointment={appointment}
          onComplete={handleCheckInComplete}
          onCancel={handleCheckInCancel}
        />
      )}
    </>
  );
}