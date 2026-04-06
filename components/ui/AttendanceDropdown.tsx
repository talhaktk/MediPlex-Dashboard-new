'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  appointmentId: string;
  rowIndex: number;
  initial: string;
  initialCheckInTime?: string;
  initialInClinicTime?: string;
}

const OPTIONS = [
  { value: 'Not Set',    color: '#9ca3af', bg: '#f3f4f6', border: '#d1d5db' },
  { value: 'Checked-In', color: '#0369a1', bg: '#dbeafe', border: '#93c5fd' },
  { value: 'In Clinic',  color: '#166534', bg: '#dcfce7', border: '#86efac' },
  { value: 'Absent',     color: '#c2410c', bg: '#ffedd5', border: '#fdba74' },
  { value: 'No-Show',    color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
];

export default function AttendanceDropdown({
  appointmentId, rowIndex, initial, initialCheckInTime, initialInClinicTime
}: Props) {
  const [value, setValue]           = useState(initial || 'Not Set');
  const [checkInTime, setCheckInTime]   = useState(initialCheckInTime || '');
  const [inClinicTime, setInClinicTime] = useState(initialInClinicTime || '');
  const [loading, setLoading]       = useState(false);

  const current = OPTIONS.find(o => o.value === value) ?? OPTIONS[0];
  const now = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const handleChange = async (newVal: string) => {
    if (newVal === value) return;
    setLoading(true);
    const prev = value;

    let newCheckIn  = checkInTime;
    let newInClinic = inClinicTime;

    if (newVal === 'Checked-In' && !checkInTime) {
      newCheckIn = now();
      setCheckInTime(newCheckIn);
    }
    if (newVal === 'In Clinic') {
      newInClinic = now();
      setInClinicTime(newInClinic);
      if (!checkInTime) { newCheckIn = now(); setCheckInTime(newCheckIn); }
    }

    setValue(newVal);

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex, attendanceStatus: newVal, checkInTime: newCheckIn, inClinicTime: newInClinic }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Marked as ${newVal}`);
    } catch {
      setValue(prev);
      toast.error('Saved on screen — set up Apps Script to sync to sheet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 118 }}>
      <div style={{ position: 'relative' }}>
        <select
          value={value} disabled={loading}
          onChange={e => handleChange(e.target.value)}
          style={{
            appearance: 'none', WebkitAppearance: 'none',
            background: current.bg, color: current.color,
            border: `1px solid ${current.border}`,
            borderRadius: 6, padding: '4px 22px 4px 8px',
            fontSize: 11, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            outline: 'none', width: '100%', transition: 'all .15s',
          }}
        >
          {OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
        </select>
        <span style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:current.color, fontSize:8 }}>▼</span>
      </div>
      {checkInTime  && <div style={{ fontSize:10, color:'#0369a1', paddingLeft:2 }}>✓ In {checkInTime}</div>}
      {inClinicTime && <div style={{ fontSize:10, color:'#166534', paddingLeft:2 }}>🩺 Clinic {inClinicTime}</div>}
    </div>
  );
}
