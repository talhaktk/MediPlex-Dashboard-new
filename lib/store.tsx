// ─────────────────────────────────────────────────────────────────────────────
// MediPlex Central Store — single localStorage source of truth
// All tabs read/write through here so data stays in sync
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VitalSigns {
  weight:      string; // kg
  height:      string; // cm
  bp:          string; // e.g. "120/80"
  pulse:       string; // bpm
  temperature: string; // °C
  recordedAt:  string; // ISO date
}

export interface HealthRecord {
  bloodGroup:  string;
  allergies:   string;
  conditions:  string;
  notes:       string;
  weights:     { date: string; kg: string }[];
  heights:     { date: string; cm: string }[];
  vitals:      VitalSigns[];
}

export interface AttendanceRecord {
  attendanceStatus: string;
  checkInTime:      string;
  inClinicTime:     string;
}

export interface InvoiceRecord {
  id:            string;
  appointmentId: string;
  childName:     string;
  parentName:    string;
  date:          string;
  visitType:     string;
  reason:        string;
  feeAmount:     number;
  discount:      number;
  paid:          number;
  paymentMethod: string;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  notes:         string;
  createdAt:     string;
}

export interface PrescriptionRecord {
  id:            string;
  appointmentId: string;
  childName:     string;
  parentName:    string;
  childAge:      string;
  date:          string;
  diagnosis:     string;
  medicines:     { id:string; name:string; dose:string; frequency:string; duration:string; notes:string }[];
  advice:        string;
  followUp:      string;
  createdAt:     string;
}

// ── Keys ──────────────────────────────────────────────────────────────────────

const KEYS = {
  attendance:    'mediplex_attendance',
  health:        'mediplex_health',
  billing:       'mediplex_billing',
  prescriptions: 'mediplex_prescriptions',
  reminders:     'mediplex_reminders',
} as const;

// ── Generic helpers ───────────────────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

function write<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ── Attendance ────────────────────────────────────────────────────────────────

export function getAttendanceAll(): Record<string, AttendanceRecord> {
  return read(KEYS.attendance, {});
}

export function getAttendance(aptId: string): AttendanceRecord {
  return getAttendanceAll()[aptId] || { attendanceStatus:'Not Set', checkInTime:'', inClinicTime:'' };
}

export function setAttendance(aptId: string, data: AttendanceRecord): void {
  const all = getAttendanceAll();
  all[aptId] = data;
  write(KEYS.attendance, all);
}

// ── Health Records ────────────────────────────────────────────────────────────

function emptyHealth(): HealthRecord {
  return { bloodGroup:'', allergies:'', conditions:'', notes:'', weights:[], heights:[], vitals:[] };
}

export function getHealthAll(): Record<string, HealthRecord> {
  return read(KEYS.health, {});
}

export function getHealth(patientKey: string): HealthRecord {
  return getHealthAll()[patientKey] || emptyHealth();
}

export function setHealth(patientKey: string, data: HealthRecord): void {
  const all = getHealthAll();
  all[patientKey] = data;
  write(KEYS.health, all);
}

export function addVitals(patientKey: string, vitals: VitalSigns): void {
  const health = getHealth(patientKey);
  health.vitals = [vitals, ...(health.vitals || [])].slice(0, 20); // keep last 20
  if (vitals.weight) health.weights = [{ date: vitals.recordedAt, kg: vitals.weight }, ...health.weights].slice(0, 30);
  if (vitals.height) health.heights = [{ date: vitals.recordedAt, cm: vitals.height }, ...health.heights].slice(0, 30);
  if (!health.bloodGroup && vitals['bloodGroup' as keyof VitalSigns]) {
    health.bloodGroup = vitals['bloodGroup' as keyof VitalSigns] as string;
  }
  setHealth(patientKey, health);
}

export function getLatestVitals(patientKey: string): VitalSigns | null {
  const h = getHealth(patientKey);
  return h.vitals && h.vitals.length > 0 ? h.vitals[0] : null;
}

// ── Billing ───────────────────────────────────────────────────────────────────

export function getInvoices(): InvoiceRecord[] {
  return read(KEYS.billing, []);
}

export function saveInvoice(inv: InvoiceRecord): void {
  const all = getInvoices();
  const idx = all.findIndex(i => i.id === inv.id);
  if (idx >= 0) all[idx] = inv; else all.unshift(inv);
  write(KEYS.billing, all);
}

export function getInvoiceByApt(aptId: string): InvoiceRecord | null {
  return getInvoices().find(i => i.appointmentId === aptId) || null;
}

export function deleteInvoice(id: string): void {
  write(KEYS.billing, getInvoices().filter(i => i.id !== id));
}

// ── Prescriptions ─────────────────────────────────────────────────────────────

export function getPrescriptions(): PrescriptionRecord[] {
  return read(KEYS.prescriptions, []);
}

export function savePrescription(rx: PrescriptionRecord): void {
  const all = getPrescriptions();
  const idx = all.findIndex(r => r.id === rx.id);
  if (idx >= 0) all[idx] = rx; else all.unshift(rx);
  write(KEYS.prescriptions, all);
}

export function getPrescriptionsByPatient(patientKey: string): PrescriptionRecord[] {
  return getPrescriptions().filter(r => r.childName.toLowerCase().trim() === patientKey.toLowerCase().trim());
}

// ── Monthly billing stats (for Analytics) ────────────────────────────────────

export interface MonthlyBilling {
  month:      string; // "Apr 2026"
  revenue:    number;
  invoices:   number;
  paid:       number;
  unpaid:     number;
  partial:    number;
}

export function getMonthlyBilling(): MonthlyBilling[] {
  const invoices = getInvoices();
  const map = new Map<string, MonthlyBilling>();

  invoices.forEach(inv => {
    if (!inv.date) return;
    const d     = new Date(inv.date);
    const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleString('en-US', { month:'short', year:'numeric' });

    if (!map.has(key)) {
      map.set(key, { month:label, revenue:0, invoices:0, paid:0, unpaid:0, partial:0 });
    }
    const m = map.get(key)!;
    m.invoices++;
    m.revenue += inv.paid;
    if (inv.paymentStatus === 'Paid')    m.paid++;
    else if (inv.paymentStatus === 'Unpaid')  m.unpaid++;
    else m.partial++;
  });

  return Array.from(map.entries())
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([,v]) => v);
}

export function getTotalRevenue(): number {
  return getInvoices().reduce((s, i) => s + i.paid, 0);
}

export function getTotalPending(): number {
  return getInvoices().reduce((s, i) => s + Math.max(0, i.feeAmount - i.discount - i.paid), 0);
}

// ── Patient key helper ────────────────────────────────────────────────────────
export function patientKey(name: string): string {
  return name.toLowerCase().trim();
}
