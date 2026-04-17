import type { Appointment, AppointmentStatus, DashboardStats, MonthlyStats, ReasonStat, AgeStat } from '@/types';
import { parseISO, isValid, format, startOfMonth } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

// This "alias" fixes all your other pages (Billing, Calendar, etc.) at once!
export const fetchAppointmentsFromSheet = fetchAppointmentsFromDb;

// 1. Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. New Supabase Fetch Function
export async function fetchAppointmentsFromDb(): Promise<Appointment[]> {
  try {
    const { data, error } = await supabase
      .from('appointments') 
      .select('*')
      .order('appointment_date', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id.toString(),
      timestamp: row.created_at || '',
      childName: row.child_name || '',
      parentName: row.parent_name || '',
      childAge: row.child_age || '',
      whatsapp: row.whatsapp || '',
      email: row.email || '',
      appointmentDate: row.appointment_date || '',
      appointmentTime: row.appointment_time || '',
      reason: row.reason || '',
      visitType: row.visit_type || 'New',
      status: normalizeStatus(row.status),
      attendanceStatus: row.attendance_status || '',
      checkInTime: row.check_in_time || '',
      inClinicTime: row.in_clinic_time || '',
      mr_number: row.mr_number || '',
    }));
  } catch (err) {
    console.error('Database fetch failed:', err);
    return []; 
  }
}

// 3. Helper: Normalize Status
export function normalizeStatus(raw: string): AppointmentStatus {
  if (!raw) return 'Confirmed';
  const s = raw.toLowerCase().trim();
  if (s.includes('confirm')) return 'Confirmed';
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('reschedul')) return 'Rescheduled';
  return 'Confirmed';
}

// 4. Analytics Helpers (Keeping your existing logic)
export function computeStats(data: Appointment[]): DashboardStats {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const confirmed = data.filter(a => a.status === 'Confirmed').length;
  const cancelled = data.filter(a => a.status === 'Cancelled').length;
  const rescheduled = data.filter(a => a.status === 'Rescheduled').length;
  
  return {
    total: data.length,
    confirmed,
    cancelled,
    rescheduled,
    todayCount: data.filter(a => a.appointmentDate === todayStr).length,
    upcomingCount: data.filter(a => a.status !== 'Cancelled').length,
    confirmationRate: data.length ? Math.round(confirmed / data.length * 100) : 0,
    cancellationRate: data.length ? Math.round(cancelled / data.length * 100) : 0,
  };
}

export function computeMonthlyStats(data: Appointment[]): MonthlyStats[] {
  const map = new Map<string, MonthlyStats>();
  data.forEach(a => {
    const d = parseISO(a.appointmentDate);
    if (!isValid(d)) return;
    const key = format(startOfMonth(d), 'yyyy-MM');
    if (!map.has(key)) {
      map.set(key, { month: format(d, 'MMM yyyy'), total: 0, confirmed: 0, cancelled: 0, rescheduled: 0 });
    }
    const s = map.get(key)!;
    s.total++;
    if (a.status === 'Confirmed') s.confirmed++;
    else if (a.status === 'Cancelled') s.cancelled++;
  });
  return Array.from(map.values());
}

export function computeReasonStats(data: Appointment[]): ReasonStat[] {
  const map = new Map<string, number>();
  data.forEach(a => {
    if (!a.reason) return;
    map.set(a.reason, (map.get(a.reason) || 0) + 1);
  });
  return Array.from(map.entries()).map(([reason, count]) => ({ reason, count }));
}

export function computeAgeStats(data: Appointment[]): AgeStat[] {
  const buckets: Record<string, number> = { '0–5 yrs': 0, '6–12 yrs': 0, '13+ yrs': 0 };
  data.forEach(a => {
    const age = parseInt(a.childAge);
    if (age <= 5) buckets['0–5 yrs']++;
    else if (age <= 12) buckets['6–12 yrs']++;
    else buckets['13+ yrs']++;
  });
  return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
}

export function formatUSDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  return isValid(d) ? format(d, 'MMM d, yyyy') : dateStr;
}
// ─── Missing Helpers for Analytics ──────────────────────────────────────────

export function filterAppointments(
  data: Appointment[],
  filters: { status?: string; visitType?: string; dateFrom?: string; dateTo?: string; search?: string }
): Appointment[] {
  return data.filter(a => {
    if (filters.status && filters.status !== 'all' && a.status !== filters.status) return false;
    if (filters.visitType && filters.visitType !== 'all' && a.visitType !== filters.visitType) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        a.childName.toLowerCase().includes(q) ||
        a.parentName.toLowerCase().includes(q) ||
        (a.reason || '').toLowerCase().includes(q)
      );
    }
    return true;
  });
}

export function exportToCSV(data: Appointment[], filename = 'appointments.csv'): void {
  const headers = ['Child Name', 'Parent Name', 'Date', 'Time', 'Reason', 'Status'];
  const rows = data.map(a => [
    a.childName, a.parentName, a.appointmentDate, a.appointmentTime, a.reason, a.status
  ]);
  const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');

  if (typeof window !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }
}

// ── Generate next MR number ─────────────────────────────────────────────────
export async function generateNextMRNumber(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('mr_number')
      .not('mr_number', 'is', null)
      .neq('mr_number', '');

    if (error) throw error;

    let maxNum = 0;
    for (const row of data || []) {
      const raw = (row.mr_number || '').replace(/^A-?0*/i, '');
      const n = parseInt(raw);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
    return `A${String(maxNum + 1).padStart(10, '0')}`;
  } catch (err) {
    console.error('MR generation failed:', err);
    return `A${String(Date.now()).slice(-6).padStart(10, '0')}`;
  }
}

// ── Create appointment ──────────────────────────────────────────────────────
export async function createAppointment(payload: {
  child_name: string;
  parent_name: string;
  child_age: string;
  whatsapp_number: string;
  email_address: string;
  appointment_date: string;
  appointment_time: string;
  reason_for_visit: string;
  visit_type: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('appointments').insert([{
      ...payload,
      appointment_status: 'Confirmed',
      status: 'Confirmed',
    }]);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Soft delete appointment (set status = Cancelled) ───────────────────────
export async function softDeleteAppointment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'Cancelled', appointment_status: 'Cancelled' })
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Upsert patient record linked by MR number ──────────────────────────────
export async function upsertPatientByMR(payload: {
  mr_number: string;
  child_name: string;
  parent_name: string;
  child_age?: string;
  whatsapp_number?: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('patients').upsert([{
      mr_number:     payload.mr_number,
      child_name:    payload.child_name,
      parent_name:   payload.parent_name,
      age:           payload.child_age || '',
      whatsapp_number: payload.whatsapp_number || '',
      email:         payload.email || '',
      is_active:     true,
    }], { onConflict: 'mr_number' });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
// ADD THESE to the bottom of your lib/sheets.ts file

const _sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Called whenever an appointment is created or checked in — syncs patient to patients table
export async function upsertPatientFromAppointment(apt: {
  child_name: string; parent_name: string; child_age?: string;
  whatsapp_number?: string; email_address?: string; mr_number?: string;
}) {
  if (!apt.child_name?.trim()) return;
  try {
    const payload: Record<string, any> = {
      child_name:      apt.child_name.trim(),
      parent_name:     apt.parent_name?.trim() || null,
      age:             apt.child_age            || null,
      whatsapp_number: apt.whatsapp_number      || null,
      email:           apt.email_address        || null,
      updated_at:      new Date().toISOString(),
    };
    if (apt.mr_number) payload.mr_number = apt.mr_number;

    if (apt.mr_number) {
      await _sb.from('patients').upsert(payload, { onConflict: 'mr_number' });
    } else {
      const { data: existing } = await _sb.from('patients')
        .select('id').ilike('child_name', apt.child_name.trim()).maybeSingle();
      if (existing?.id) {
        await _sb.from('patients').update(payload).eq('id', existing.id);
      } else {
        await _sb.from('patients').insert(payload);
      }
    }
  } catch (e) { console.error('upsertPatient error:', e); }
}

// Create appointment in Supabase + auto-upsert patient
export async function createAppointment(form: Record<string, string>) {
  try {
    const { data, error } = await _sb.from('appointments').insert({
      child_name:       form.child_name,
      parent_name:      form.parent_name,
      child_age:        form.child_age        || null,
      whatsapp_number:  form.whatsapp_number  || null,
      email_address:    form.email_address    || null,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      reason_for_visit: form.reason_for_visit || null,
      visit_type:       form.visit_type       || 'New Visit',
      status:           'Confirmed',
    }).select().single();

    if (error) return { success: false, error: error.message };

    // Auto-sync to patients table
    await upsertPatientFromAppointment(form);

    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Soft delete — sets status to Cancelled
export async function softDeleteAppointment(id: string) {
  try {
    const { error } = await _sb.from('appointments')
      .update({ status: 'Cancelled' }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}