import type { Appointment, AppointmentStatus, DashboardStats, MonthlyStats, ReasonStat, AgeStat } from '@/types';
import { parseISO, isValid, format, startOfMonth } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

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