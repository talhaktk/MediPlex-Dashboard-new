// ─── Appointment / Patient ────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'Confirmed'
  | 'Cancelled'
  | 'Rescheduled'
  | 'Pending'
  | 'No-Show'
  | 'Completed';

export type VisitType = 'New' | 'New Visit' | 'Follow-up' | 'Emergency' | 'Telehealth';

export interface Appointment {
  id: string;
  timestamp?: string;
  childName: string;
  parentName: string;
  childAge: string;
  whatsapp: string;
  email: string;
  appointmentDate: string;    // ISO yyyy-MM-dd or raw string from sheet
  appointmentTime: string;
  reason: string;
  visitType: VisitType | string;
  status: AppointmentStatus | string;
  calendarEventId?: string;
  reminder24Sent?: boolean;
  reminder4Sent?: boolean;
  followUpVisit?: string;
  reschedulingReason?: string;
  originalDate?: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface MonthlyStats {
  month: string;          // "Jan 2026"
  total: number;
  confirmed: number;
  cancelled: number;
  rescheduled: number;
  pending: number;
}

export interface StatusBreakdown {
  status: AppointmentStatus | string;
  count: number;
  pct: number;
}

export interface ReasonStat {
  reason: string;
  count: number;
}

export interface AgeStat {
  bucket: string;
  count: number;
}

export interface DashboardStats {
  total: number;
  confirmed: number;
  cancelled: number;
  rescheduled: number;
  pending: number;
  todayCount: number;
  upcomingCount: number;
  confirmationRate: number;
  cancellationRate: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'doctor' | 'receptionist' | 'viewer';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface FilterState {
  status: string;
  visitType: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}
