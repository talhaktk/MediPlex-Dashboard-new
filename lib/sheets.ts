import type { Appointment, AppointmentStatus, DashboardStats, MonthlyStats, ReasonStat, AgeStat } from '@/types';
import { parseISO, isValid, format, startOfMonth } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
export const fetchAppointmentsFromSheet = fetchAppointmentsFromDb;

// ── Single source-of-truth row mapper ──────────────────────────────────────
function rowToAppointment(row: any): Appointment {
  return {
    id:               String(row.id),
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
    status:           normalizeStatus(row.status || row.appointment_status),
    attendanceStatus: row.attendance_status || '',
    checkInTime:      row.check_in_time || '',
    inClinicTime:     row.in_clinic_time || '',
    mr_number:        row.mr_number || '',
  } as Appointment;
}

export async function fetchAppointmentsFromDb(clinicId?: string): Promise<Appointment[]> {
  try {
    let query = supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false })
      .limit(500);
    if (clinicId) query = query.eq('clinic_id', clinicId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(rowToAppointment);
  } catch (err) {
    console.error('Database fetch failed:', err);
    return [];
  }
}

export function normalizeStatus(raw: string): AppointmentStatus {
  if (!raw) return 'Confirmed';
  const s = raw.toLowerCase().trim();
  if (s.includes('confirm'))   return 'Confirmed';
  if (s.includes('cancel'))    return 'Cancelled';
  if (s.includes('reschedul')) return 'Rescheduled';
  return 'Confirmed';
}

export function computeStats(data: Appointment[]): DashboardStats {
  const todayStr  = format(new Date(), 'yyyy-MM-dd');
  const confirmed = data.filter(a => a.status === 'Confirmed').length;
  const cancelled = data.filter(a => a.status === 'Cancelled').length;
  return {
    total:            data.length,
    confirmed,
    cancelled,
    rescheduled:      data.filter(a => a.status === 'Rescheduled').length,
    todayCount:       data.filter(a => a.appointmentDate === todayStr).length,
    upcomingCount:    data.filter(a => a.status !== 'Cancelled').length,
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
    if (!map.has(key)) map.set(key, { month: format(d, 'MMM yyyy'), total: 0, confirmed: 0, cancelled: 0, rescheduled: 0 });
    const s = map.get(key)!;
    s.total++;
    if (a.status === 'Confirmed') s.confirmed++;
    else if (a.status === 'Cancelled') s.cancelled++;
  });
  return Array.from(map.values());
}

export function computeReasonStats(data: Appointment[]): ReasonStat[] {
  const map = new Map<string, number>();
  data.forEach(a => { if (a.reason) map.set(a.reason, (map.get(a.reason) || 0) + 1); });
  return Array.from(map.entries()).map(([reason, count]) => ({ reason, count }));
}

export function computeAgeStats(data: Appointment[]): AgeStat[] {
  const buckets: Record<string, number> = { '0-5 yrs': 0, '6-12 yrs': 0, '13+ yrs': 0 };
  data.forEach(a => {
    const age = parseInt(a.childAge);
    if (age <= 5) buckets['0-5 yrs']++;
    else if (age <= 12) buckets['6-12 yrs']++;
    else buckets['13+ yrs']++;
  });
  return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
}

export function formatUSDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = parseISO(dateStr);
  return isValid(d) ? format(d, 'MMM d, yyyy') : dateStr;
}

export function filterAppointments(
  data: Appointment[],
  filters: { status?: string; visitType?: string; dateFrom?: string; dateTo?: string; search?: string }
): Appointment[] {
  return data.filter(a => {
    if (filters.status    && filters.status    !== 'all' && a.status    !== filters.status)    return false;
    if (filters.visitType && filters.visitType !== 'all' && a.visitType !== filters.visitType) return false;
    if (filters.dateFrom  && a.appointmentDate < filters.dateFrom) return false;
    if (filters.dateTo    && a.appointmentDate > filters.dateTo)   return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        a.childName.toLowerCase().includes(q)  ||
        a.parentName.toLowerCase().includes(q) ||
        (a.reason||'').toLowerCase().includes(q) ||
        (a.mr_number||'').toLowerCase().includes(q)
      );
    }
    return true;
  });
}

export function exportToCSV(data: Appointment[], filename = 'appointments.csv'): void {
  const headers = ['Child Name','Parent Name','Date','Time','Reason','Status'];
  const rows    = data.map(a => [a.childName,a.parentName,a.appointmentDate,a.appointmentTime,a.reason,a.status]);
  const csv     = [headers,...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  if (typeof window !== 'undefined') {
    const blob = new Blob([csv],{type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href=url; link.download=filename; link.click();
  }
}

export function normalizeMR(raw: string): string {
  const cleaned = raw.trim().replace(/^A-?/i,'');
  const n = parseInt(cleaned);
  if (isNaN(n)) return raw.trim().toUpperCase();
  return `A${String(n).padStart(10,'0')}`;
}

export async function generateNextMRNumber(): Promise<string> {
  try {
    const [{ data: aptData }, { data: patData }] = await Promise.all([
      supabase.from('appointments').select('mr_number').not('mr_number','is',null).neq('mr_number',''),
      supabase.from('patients').select('mr_number').not('mr_number','is',null).neq('mr_number',''),
    ]);
    let maxNum = 0;
    for (const row of [...(aptData||[]),...(patData||[])]) {
      const raw = (row.mr_number||'').replace(/^A-?0*/i,'');
      const n   = parseInt(raw);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
    return `A${String(maxNum+1).padStart(10,'0')}`;
  } catch {
    return `A${String(Date.now()).slice(-8).padStart(10,'0')}`;
  }
}

export async function createAppointment(payload: {
  child_name: string; parent_name: string; child_age: string;
  whatsapp_number: string; email_address: string;
  appointment_date: string; appointment_time: string;
  reason_for_visit: string; visit_type: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('appointments').insert([{
      ...payload,
      appointment_status: 'Confirmed',
      status: 'Confirmed',
    }]);
    if (error) throw error;

    // Auto-create patient record if not existing (by name match)
    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .ilike('child_name', payload.child_name)
      .maybeSingle();

    if (!existing) {
      await supabase.from('patients').insert([{
        child_name:      payload.child_name,
        parent_name:     payload.parent_name,
        age:             payload.child_age || '',
        whatsapp_number: payload.whatsapp_number || '',
        email:           payload.email_address || '',
        is_active:       true,
      }]);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function softDeleteAppointment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('appointments')
      .update({ status: 'Cancelled', appointment_status: 'Cancelled' })
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function upsertPatientByMR(payload: {
  mr_number: string; child_name: string; parent_name: string;
  child_age?: string; whatsapp_number?: string; email?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Find patient by name first (avoid duplicates)
    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .ilike('child_name', payload.child_name)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from('patients').update({
        mr_number:       payload.mr_number,
        parent_name:     payload.parent_name,
        age:             payload.child_age || '',
        whatsapp_number: payload.whatsapp_number || '',
        email:           payload.email || '',
        is_active:       true,
      }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('patients').insert([{
        mr_number:       payload.mr_number,
        child_name:      payload.child_name,
        parent_name:     payload.parent_name,
        age:             payload.child_age || '',
        whatsapp_number: payload.whatsapp_number || '',
        email:           payload.email || '',
        is_active:       true,
      }]);
      if (error) throw error;
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateAttendanceInDb(
  appointmentId: string,
  attendanceStatus: string,
  checkInTime?: string,
  inClinicTime?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Record<string,string> = { attendance_status: attendanceStatus };
    if (checkInTime)  payload.check_in_time  = checkInTime;
    if (inClinicTime) payload.in_clinic_time = inClinicTime;
    const { error } = await supabase.from('appointments').update(payload).eq('id', appointmentId);
    if (error) {
      console.warn('Attendance DB sync failed:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Sync health record to Supabase patients table ───────────────────────────
export async function syncHealthToDb(
  mrNumber: string,
  childName: string,
  health: { bloodGroup?: string; allergies?: string; conditions?: string; notes?: string; vitals?: any[] }
): Promise<void> {
  try {
    // Only sync health fields — NO vitals to patients table
    const updatePayload: Record<string, any> = {};
    if (health.bloodGroup !== undefined) updatePayload.blood_group = health.bloodGroup || null;
    if (health.allergies  !== undefined) updatePayload.allergies   = health.allergies  || null;
    if (health.conditions !== undefined) updatePayload.conditions  = health.conditions || null;
    if (health.notes      !== undefined) updatePayload.notes       = health.notes      || null;
    if (Object.keys(updatePayload).length === 0) return;
    if (mrNumber) {
      await supabase.from('patients').update(updatePayload).eq('mr_number', mrNumber);
    } else if (childName) {
      await supabase.from('patients').update(updatePayload).ilike('child_name', childName);
    }
  } catch (err) {
    console.warn('Health sync failed:', err);
  }
}

// ── Sync vitals to patient_vitals table ─────────────────────────────────────
export async function syncVitalsToDb(
  mrNumber: string,
  childName: string,
  vitals: { weight?: string; height?: string; bp?: string; pulse?: string; temperature?: string; recordedAt?: string },
): Promise<void> {
  try {
    await supabase.from('patient_vitals').insert([{
      mr_number:        mrNumber   || null,
      child_name:       childName,
      weight:           vitals.weight      || '',
      height:           vitals.height      || '',
      bp:               vitals.bp          || '',
      pulse:            vitals.pulse       || '',
      temperature:      vitals.temperature || '',
      recorded_at:      vitals.recordedAt  || new Date().toISOString().split('T')[0],
    }]);
  } catch (err) {
    console.warn('Vitals sync failed:', err);
  }
}

// ── Sync prescription to prescriptions table ─────────────────────────────────
export async function syncPrescriptionToDb(rx: {
  id: string; mr_number?: string; child_name: string; parent_name?: string;
  child_age?: string; date?: string; diagnosis?: string; medicines?: any[];
  advice?: string; follow_up?: string;
}): Promise<void> {
  try {
    await supabase.from('prescriptions').upsert([{
      id:          rx.id,
      mr_number:   rx.mr_number   || null,
      child_name:  rx.child_name,
      parent_name: rx.parent_name || '',
      child_age:   rx.child_age   || '',
      date:        rx.date        || '',
      diagnosis:   rx.diagnosis   || '',
      medicines:   rx.medicines   || [],
      advice:      rx.advice      || '',
      follow_up:   rx.follow_up   || '',
    }], { onConflict: 'id' });
  } catch (err) {
    console.warn('Prescription sync failed:', err);
  }
}

// ── Sync scribe output to scribe_outputs table ───────────────────────────────
export async function syncScribeToDb(output: {
  mr_number?: string; child_name: string; parent_name?: string;
  mode: string; output: string; generated_at?: string;
}): Promise<void> {
  try {
    await supabase.from('scribe_outputs').insert([{
      mr_number:    output.mr_number    || null,
      child_name:   output.child_name,
      parent_name:  output.parent_name  || '',
      mode:         output.mode,
      output:       output.output,
      generated_at: output.generated_at || new Date().toISOString(),
    }]);
  } catch (err) {
    console.warn('Scribe sync failed:', err);
  }
}

// ── Update createAppointment to support gender + mr_number for returning patients ──
export async function createAppointmentFull(payload: {
  child_name: string; parent_name: string; child_age: string;
  whatsapp_number: string; email_address: string;
  appointment_date: string; appointment_time: string;
  reason_for_visit: string; visit_type: string;
  gender?: string; mr_number?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const insertPayload: Record<string, any> = {
      child_name:       payload.child_name,
      parent_name:      payload.parent_name,
      child_age:        payload.child_age,
      whatsapp_number:  payload.whatsapp_number,
      email_address:    payload.email_address,
      appointment_date: payload.appointment_date,
      appointment_time: payload.appointment_time,
      reason_for_visit: payload.reason_for_visit,
      visit_type:       payload.visit_type,
      clinic_id:        (payload as any).clinic_id || null,
      appointment_status: 'Confirmed',
      status: 'Confirmed',
    };
    if (payload.gender)    insertPayload.gender    = payload.gender;
    if (payload.mr_number) insertPayload.mr_number = payload.mr_number;

    const { error } = await supabase.from('appointments').insert([insertPayload]);
    if (error) throw error;

    // Auto-sync patient (upsert by name)
    const { data: existing } = await supabase
      .from('patients')
      .select('id, mr_number')
      .ilike('child_name', payload.child_name)
      .maybeSingle();

    if (existing?.id) {
      // Update existing patient with new data
      await supabase.from('patients').update({
        parent_name:     payload.parent_name,
        age:             payload.child_age || '',
        whatsapp_number: payload.whatsapp_number || '',
        email:           payload.email_address || '',
        gender:          payload.gender || '',
        ...(payload.mr_number ? { mr_number: payload.mr_number } : {}),
      }).eq('id', existing.id);
    } else {
      await supabase.from('patients').insert([{
        child_name:      payload.child_name,
        parent_name:     payload.parent_name,
        age:             payload.child_age || '',
        whatsapp_number: payload.whatsapp_number || '',
        email:           payload.email_address || '',
        gender:          payload.gender || '',
        mr_number:       payload.mr_number || null,
        is_active:       true,
      }]);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}