'use client';

import { useState } from 'react';
import { AttendanceStatus } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  appointmentId: string;
  rowIndex: number; // 1-based row in sheet (row 1 = header, so data starts at 2)
  initial: AttendanceStatus | string;
}

const OPTIONS: { value: AttendanceStatus; label: string; color: string; bg: string; dot: string }[] = [
  { value: 'Not Set',    label: 'Not Set',    color: '#9ca3af', bg: '#f3f4f6', dot: '#d1d5db' },
  { value: 'In Clinic',  label: 'In Clinic',  color: '#0369a1', bg: '#e0f2fe', dot: '#0ea5e9' },
  { value: 'Checked-In', label: 'Checked-In', color: '#166534', bg: '#dcfce7', dot: '#22c55e' },
  { value: 'Absent',     label: 'Absent',     color: '#c2410c', bg: '#ffedd5', dot: '#f97316' },
  { value: 'No-Show',    label: 'No-Show',    color: '#991b1b', bg: '#fee2e2', dot: '#ef4444' },
];

export default function AttendanceDropdown({ appointmentId, rowIndex, initial }: Props) {
  const [value, setValue] = useState<string>(initial || 'Not Set');
  const [loading, setLoading] = useState(false);

  const current = OPTIONS.find(o => o.value === value) ?? OPTIONS[0];

  const handleChange = async (newVal: AttendanceStatus) => {
    if (newVal === value) return;
    setLoading(true);
    const prev = value;
    setValue(newVal);

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          rowIndex,
          attendanceStatus: newVal,
          checkInTime: newVal === 'Checked-In' || newVal === 'In Clinic'
            ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : '',
        }),
      });

      if (!res.ok) throw new Error('Failed');
      toast.success(`Marked as ${newVal}`);
    } catch {
      setValue(prev);
      toast.error('Could not save — check API setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" style={{ minWidth: 110 }}>
      <select
        value={value}
        disabled={loading}
        onChange={e => handleChange(e.target.value as AttendanceStatus)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          background: current.bg,
          color: current.color,
          border: `1px solid ${current.dot}40`,
          borderRadius: 6,
          padding: '3px 24px 3px 8px',
          fontSize: 11,
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          outline: 'none',
          width: '100%',
          transition: 'all 0.15s',
        }}
      >
        {OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {/* chevron icon */}
      <span style={{
        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', color: current.color, fontSize: 9,
      }}>▼</span>
    </div>
  );
}
