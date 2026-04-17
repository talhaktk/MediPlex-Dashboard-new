'use client';

import { useState, useEffect } from 'react';
import { Appointment } from '@/types';
import toast from 'react-hot-toast';
import { getAttendance, setAttendance } from '@/lib/store';
import CheckInFlow from './CheckInFlow';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  // Hydrate from appointment prop on mount
  useEffect(() => {
    const local = getAttendance(appointment.id);
    const hasLocal = local.attendanceStatus && local.attendanceStatus !== 'Not Set';
    if (!hasLocal && appointment.attendanceStatus && appointment.attendanceStatus !== 'Not Set') {
      const hydrated = {
        attendanceStatus: appointment.attendanceStatus,
        checkInTime:      appointment.checkInTime  || '',
        inClinicTime:     appointment.inClinicTime || '',
      };
      setRec(hydrated);
      setAttendance(appointment.id, hydrated);
    } else {
      setRec(getAttendance(appointment.id));
    }
  }, [appointment.id]);

  const current = OPTIONS.find(o => o.value === rec.attendanceStatus) ?? OPTIONS[0];
  const now = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

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
      inClinicTime: newVal === 'In Clinic' ? now() : rec.inClinicTime,
    };

    // 1. Update local state immediately
    setRec(updated);
    setAttendance(appointment.id, updated);

    try {
      // 2. Sync attendance to Supabase appointments table
      await supabase.from('appointments').update({
        attendance_status: updated.attendanceStatus,
        check_in_time:     updated.checkInTime  || null,
        in_clinic_time:    updated.inClinicTime || null,
      }).eq('id', appointment.id);

      // 3. On any real attendance event, upsert patient to patients table
      if (newVal !== 'Not Set') {
        const patientPayload: Record<string, any> = {
          child_name:      appointment.childName,
          parent_name:     appointment.parentName || null,
          age:             appointment.childAge   || null,
          whatsapp_number: appointment.whatsapp   || null,
          email:           appointment.email      || null,
          updated_at:      new Date().toISOString(),
        };
        const mr = (appointment as any).mr_number;
        if (mr) patientPayload.mr_number = mr;

        // Upsert by mr_number if available, else by child_name
        if (mr) {
          await supabase.from('patients')
            .upsert(patientPayload, { onConflict: 'mr_number' });
        } else {
          const { data: existing } = await supabase.from('patients')
            .select('id').ilike('child_name', appointment.childName).maybeSingle();
          if (existing?.id) {
            await supabase.from('patients').update(patientPayload).eq('id', existing.id);
          } else {
            await supabase.from('patients').insert(patientPayload);
          }
        }
      }

      // 4. Legacy Google Sheet sync (fire and forget)
      const scriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
      if (scriptUrl) {
        fetch(scriptUrl, {
          method: 'POST', redirect: 'follow',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ rowIndex, ...updated }),
        }).catch(() => {});
      }

      toast.success(`Marked as ${newVal}`);
    } catch (err) {
      toast.success(`Marked as ${newVal} (local)`);
      console.error('Sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInComplete = (invoiceCreated: boolean) => {
    setShowCheckIn(false);
    if (invoiceCreated) applyChange(pendingValue);
    else toast('Check-in cancelled', { icon: '⚠️' });
    setPendingValue('');
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 118 }}>
        <div style={{ position: 'relative' }}>
          <select value={rec.attendanceStatus} disabled={loading}
            onChange={e => handleChange(e.target.value)}
            style={{
              appearance: 'none', WebkitAppearance: 'none',
              background: current.bg, color: current.color,
              border: `1px solid ${current.border}`,
              borderRadius: 6, padding: '4px 22px 4px 8px',
              fontSize: 11, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              outline: 'none', width: '100%', transition: 'all .15s',
            }}>
            {OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: current.color, fontSize: 8 }}>▼</span>
        </div>
        {rec.checkInTime  && <div style={{ fontSize: 10, color: '#0369a1', paddingLeft: 2 }}>✓ {rec.checkInTime}</div>}
        {rec.inClinicTime && <div style={{ fontSize: 10, color: '#166534', paddingLeft: 2 }}>🩺 {rec.inClinicTime}</div>}
        {loading && <div style={{ fontSize: 9, color: '#9ca3af', paddingLeft: 2 }}>syncing…</div>}
      </div>

      {showCheckIn && (
        <CheckInFlow
          appointment={appointment}
          onComplete={handleCheckInComplete}
          onCancel={() => { setShowCheckIn(false); setPendingValue(''); }}
        />
      )}
    </>
  );
}