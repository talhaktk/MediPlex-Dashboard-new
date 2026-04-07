import type { Appointment, AppointmentStatus, DashboardStats, MonthlyStats, ReasonStat, AgeStat } from '@/types';
import { parseISO, isValid, format, startOfMonth, isSameMonth } from 'date-fns';

// ─── Google Sheets CSV fetch ──────────────────────────────────────────────────

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '18XQKbYAKRVho0PzajF2vXwHIs-GcsneginzppJAXVP8';

export async function fetchAppointmentsFromSheet(): Promise<Appointment[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
  
  try {
    const res = await fetch(url, { next: { revalidate: 60 } }); // revalidate every 60s
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const csv = await res.text();
    return parseCSV(csv);
  } catch (err) {
    console.error('Failed to fetch sheet:', err);
    return FALLBACK_DATA;
  }
}

function parseCSV(csv: string): Appointment[] {
  const lines = csv.split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  
  // Skip header row (index 0)
  const rows = lines.slice(1);
  const appointments: Appointment[] = [];

  rows.forEach((line, i) => {
    const cols = parseCSVLine(line);
    if (!cols[1]?.trim()) return; // skip rows with no child name
    
    const raw: Appointment = {
      id: `apt-${i + 1}`,
      timestamp: clean(cols[0]),
      childName: clean(cols[1]),
      parentName: clean(cols[2]),
      childAge: clean(cols[3]),
      whatsapp: clean(cols[4]),
      email: clean(cols[5]),
      appointmentDate: normalizeDate(clean(cols[6])),
      appointmentTime: clean(cols[7]),
      reason: clean(cols[8]),
      visitType: clean(cols[9]) as Appointment['visitType'],
      status: normalizeStatus(clean(cols[10])),
      calendarEventId: clean(cols[11]),
      reminder24Sent: cols[12]?.trim()?.toLowerCase() === 'true',
      reminder4Sent: cols[13]?.trim()?.toLowerCase() === 'true',
      followUpVisit: clean(cols[14]),
      reschedulingReason: clean(cols[15]),
      originalDate: normalizeDate(clean(cols[16])),
      attendanceStatus: clean(cols[17]) || '',
      checkInTime:      clean(cols[18]) || '',
      inClinicTime:     clean(cols[19]) || '',
    };
    appointments.push(raw);
  });

  return appointments;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function clean(s?: string): string {
  if (!s) return '';
  return s.trim().replace(/^"|"$/g, '');
}

function normalizeDate(raw: string): string {
  if (!raw || raw === 'N/A' || raw === 'None') return '';
  // Try ISO first
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try "April 18th, 2026"
  const months: Record<string, string> = {
    january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',
    july:'07',august:'08',september:'09',october:'10',november:'11',december:'12'
  };
  const match = raw.match(/(\w+)\s+(\d+)(?:st|nd|rd|th)?,?\s+(\d{4})/i);
  if (match) {
    const m = months[match[1].toLowerCase()];
    const d = match[2].padStart(2, '0');
    const y = match[3];
    if (m) return `${y}-${m}-${d}`;
  }
  // Try "08 April"
  const match2 = raw.match(/(\d{2})\s+(\w+)/i);
  if (match2) {
    const m = months[match2[2].toLowerCase()];
    if (m) return `2026-${m}-${match2[1]}`;
  }
  return raw;
}

export function normalizeStatus(raw: string): AppointmentStatus {
  if (!raw) return 'Confirmed';
  const s = raw.toLowerCase().trim();
  if (s.includes('confirm')) return 'Confirmed';
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('reschedul') || s === 'reschedule') return 'Rescheduled';
  return 'Confirmed'; // default — no Pending
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

export function computeStats(data: Appointment[]): DashboardStats {
  const today = new Date();
  today.setHours(0,0,0,0);

  const todayStr = format(today, 'yyyy-MM-dd');
  
  const confirmed   = data.filter(a => a.status === 'Confirmed').length;
  const cancelled   = data.filter(a => a.status === 'Cancelled').length;
  const rescheduled = data.filter(a => a.status === 'Rescheduled').length;
  const todayCount  = data.filter(a => a.appointmentDate === todayStr).length;
  const upcomingCount = data.filter(a => {
    const d = parseISO(a.appointmentDate);
    return isValid(d) && d >= today && a.status !== 'Cancelled';
  }).length;

  return {
    total: data.length,
    confirmed,
    cancelled,
    rescheduled,
    todayCount,
    upcomingCount,
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
    const label = format(d, 'MMM yyyy');
    
    if (!map.has(key)) {
      map.set(key, { month: label, total: 0, confirmed: 0, cancelled: 0, rescheduled: 0 });
    }
    const s = map.get(key)!;
    s.total++;
    if (a.status === 'Confirmed') s.confirmed++;
    else if (a.status === 'Cancelled') s.cancelled++;
    else if (a.status === 'Rescheduled') s.rescheduled++;
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export function computeReasonStats(data: Appointment[]): ReasonStat[] {
  const map = new Map<string, number>();
  data.forEach(a => {
    if (!a.reason || a.reason === '—') return;
    const key = a.reason.trim();
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function computeAgeStats(data: Appointment[]): AgeStat[] {
  const buckets: Record<string, number> = {
    '0–2 yrs': 0,
    '3–5 yrs': 0,
    '6–9 yrs': 0,
    '10–12 yrs': 0,
    '13–17 yrs': 0,
    'Unknown': 0,
  };
  
  data.forEach(a => {
    const raw = a.childAge?.replace(/\s*(yrs?|years?)/i, '').trim();
    const age = parseInt(raw);
    if (isNaN(age)) { buckets['Unknown']++; return; }
    if (age <= 2) buckets['0–2 yrs']++;
    else if (age <= 5) buckets['3–5 yrs']++;
    else if (age <= 9) buckets['6–9 yrs']++;
    else if (age <= 12) buckets['10–12 yrs']++;
    else buckets['13–17 yrs']++;
  });

  return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
}

export function filterAppointments(
  data: Appointment[],
  filters: { status?: string; visitType?: string; dateFrom?: string; dateTo?: string; search?: string }
): Appointment[] {
  return data.filter(a => {
    if (filters.status && filters.status !== 'all' && a.status !== filters.status) return false;
    if (filters.visitType && filters.visitType !== 'all' && a.visitType !== filters.visitType) return false;
    if (filters.dateFrom) {
      const d = parseISO(a.appointmentDate);
      if (!isValid(d) || d < parseISO(filters.dateFrom)) return false;
    }
    if (filters.dateTo) {
      const d = parseISO(a.appointmentDate);
      if (!isValid(d) || d > parseISO(filters.dateTo)) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !a.childName.toLowerCase().includes(q) &&
        !a.parentName.toLowerCase().includes(q) &&
        !(a.reason || '').toLowerCase().includes(q) &&
        !(a.whatsapp || '').includes(q)
      ) return false;
    }
    return true;
  });
}

export function exportToCSV(data: Appointment[], filename = 'appointments.csv'): void {
  const headers = [
    'Child Name', 'Parent Name', 'Age', 'WhatsApp', 'Email',
    'Appointment Date', 'Time', 'Reason', 'Visit Type', 'Status',
    'Attendance Status', 'Check-In Time', 'In Clinic Time',
    'Rescheduling Reason', 'Original Date',
  ];
  const rows = data.map(a => [
    a.childName        || '',
    a.parentName       || '',
    a.childAge         || '',
    a.whatsapp         || '',
    a.email            || '',
    a.appointmentDate  || '',
    a.appointmentTime  || '',
    a.reason           || '',
    a.visitType        || '',
    a.status           || '',
    a.attendanceStatus || '',
    a.checkInTime      || '',
    a.inClinicTime     || '',
    a.reschedulingReason || '',
    a.originalDate     || '',
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${c.toString().replace(/"/g, '""')}"`).join(','))
    .join('\n');

  if (typeof window !== 'undefined') {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement('a');
    el.href    = url;
    el.download = filename;
    el.click();
    URL.revokeObjectURL(url);
  }
}

export function formatUSDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  if (!isValid(d)) return dateStr;
  return format(d, 'MMM d, yyyy');
}

export function formatUSDateTime(dateStr: string, time: string): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  if (!isValid(d)) return `${dateStr} ${time}`.trim();
  return `${format(d, 'MMM d, yyyy')} at ${time}`;
}

// ─── Fallback data (mirrors the Google Sheet) ─────────────────────────────────

export const FALLBACK_DATA: Appointment[] = [
  { id:'apt-1', childName:'Subahn', parentName:'Sherjan', childAge:'12', whatsapp:'—', email:'Klassical.llc@gmail.com', appointmentDate:'2026-04-05', appointmentTime:'9:00 AM', reason:'Rashes on body', visitType:'New', status:'Confirmed', calendarEventId:'nfdm3i7i' },
  { id:'apt-2', childName:'Aizel', parentName:'Maaz', childAge:'5', whatsapp:'15551848968', email:'KlassicalHoldings.ltd@gmail.com', appointmentDate:'2026-04-05', appointmentTime:'10:00 AM', reason:'Fever', visitType:'New', status:'Confirmed', calendarEventId:'kil1q56s' },
  { id:'apt-3', childName:'Shahab', parentName:'Maaz', childAge:'17', whatsapp:'447776387877', email:'Klassicalholdings.ltd@gmail.com', appointmentDate:'2026-04-07', appointmentTime:'2:00 PM', reason:'Fever', visitType:'New Visit', status:'Rescheduled', reschedulingReason:"Office leave denied", originalDate:'2026-04-06' },
  { id:'apt-4', childName:'Saam', parentName:'Talha', childAge:'', whatsapp:'—', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-08', appointmentTime:'9:00 AM', reason:'Pain in abdomen', visitType:'New', status:'Pending' },
  { id:'apt-5', childName:'Dalaa', parentName:'Shaba', childAge:'6', whatsapp:'447776387877', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-08', appointmentTime:'10:00 AM', reason:'Gastrointestinal', visitType:'New', status:'Confirmed' },
  { id:'apt-6', childName:'Bakaaa', parentName:'Baanaaaa', childAge:'17', whatsapp:'447776387877', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-08', appointmentTime:'11:00 AM', reason:'General complaint', visitType:'New', status:'Confirmed' },
  { id:'apt-7', childName:'Sameer', parentName:'Talha', childAge:'', whatsapp:'1234567899', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-10', appointmentTime:'10:00 AM', reason:'Fever and vomiting', visitType:'New', status:'Cancelled' },
  { id:'apt-8', childName:'Shabano', parentName:'Mustafa', childAge:'7', whatsapp:'447776387877', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-10', appointmentTime:'2:00 PM', reason:'General complaint', visitType:'New', status:'Confirmed' },
  { id:'apt-9', childName:'Lala', parentName:'Bibi', childAge:'10', whatsapp:'447776387877', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-11', appointmentTime:'11:00 AM', reason:'Pain', visitType:'New', status:'Rescheduled', reschedulingReason:'Sssss', originalDate:'2026-04-08' },
  { id:'apt-10', childName:'Bibi', parentName:'Talha', childAge:'9', whatsapp:'447776387877', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-14', appointmentTime:'9:00 AM', reason:'Vomiting', visitType:'New Visit', status:'Rescheduled', reschedulingReason:'Busy in office', originalDate:'2026-04-10' },
  { id:'apt-11', childName:'SHAAAB', parentName:'Saam', childAge:'15', whatsapp:'—', email:'Dr.talhaktk@gmail.com', appointmentDate:'2026-04-17', appointmentTime:'9:00 AM', reason:'Pain', visitType:'New', status:'Confirmed' },
  { id:'apt-12', childName:'Zahid', parentName:'Kaka jee', childAge:'7', whatsapp:'—', email:'Klassical.llc@gmail.com', appointmentDate:'2026-04-17', appointmentTime:'9:15 AM', reason:'Pain in abdomen', visitType:'New', status:'Confirmed' },
  { id:'apt-13', childName:'Mesha', parentName:'Shabano', childAge:'13', whatsapp:'—', email:'Klassicalholdings.ltd@gmail.com', appointmentDate:'2026-04-17', appointmentTime:'9:45 AM', reason:'Fever and pain', visitType:'New', status:'Confirmed' },
  { id:'apt-14', childName:'Atizaz', parentName:'Saji', childAge:'12', whatsapp:'03000000000', email:'Klassical.llc@gmail.com', appointmentDate:'2026-04-17', appointmentTime:'10:00 AM', reason:'Fever', visitType:'New', status:'Rescheduled', reschedulingReason:'Busy', originalDate:'2026-04-16' },
  { id:'apt-15', childName:'Shahab', parentName:'Aleeza', childAge:'14', whatsapp:'—', email:'Dr.talhaktk@gmail.com', appointmentDate:'2026-04-18', appointmentTime:'9:00 AM', reason:'Fever', visitType:'New', status:'Confirmed' },
  { id:'apt-16', childName:'Mustafa', parentName:'Jaffar', childAge:'14', whatsapp:'923001234567', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-18', appointmentTime:'9:15 AM', reason:'Pain and Fever', visitType:'New Visit', status:'Confirmed' },
  { id:'apt-17', childName:'Mustafa', parentName:'Sahab', childAge:'14', whatsapp:'923001234567', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-18', appointmentTime:'9:15 AM', reason:'Pain and Fever', visitType:'New visit', status:'Confirmed' },
  { id:'apt-18', childName:'Lala', parentName:'Naaaji', childAge:'4', whatsapp:'447776387877', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-22', appointmentTime:'9:00 AM', reason:'Gastrointestinal', visitType:'New', status:'Confirmed' },
  { id:'apt-19', childName:'Yaseen', parentName:'Shabar', childAge:'14', whatsapp:'—', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-22', appointmentTime:'9:15 AM', reason:'Fever', visitType:'New', status:'Confirmed' },
  { id:'apt-20', childName:'Ubaildullah', parentName:'Jan Muhammad', childAge:'17', whatsapp:'—', email:'shabano@gmail.com', appointmentDate:'2026-04-22', appointmentTime:'10:00 AM', reason:'Gastrointestinal', visitType:'Follow-up', status:'Confirmed' },
  { id:'apt-21', childName:'Mustafa', parentName:'Talha', childAge:'6', whatsapp:'447776387877', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-22', appointmentTime:'10:00 AM', reason:'Fever and pain', visitType:'New', status:'Cancelled', reschedulingReason:'Far away', originalDate:'2026-04-21' },
  { id:'apt-22', childName:'Jaallla', parentName:'Jakkaaa', childAge:'13', whatsapp:'—', email:'N/A', appointmentDate:'2026-04-22', appointmentTime:'2:30 PM', reason:'General Health Check-up', visitType:'New', status:'Confirmed' },
  { id:'apt-23', childName:'Abdullah', parentName:'Talha', childAge:'', whatsapp:'447776387877', email:'Dr.talhaktk@outlook.com', appointmentDate:'2024-04-02', appointmentTime:'10:00 AM', reason:'', visitType:'', status:'Pending' },
  { id:'apt-24', childName:'Azel', parentName:'Shamsher', childAge:'', whatsapp:'447776387877', email:'Dr.talhaktk@outlook.com', appointmentDate:'2024-04-23', appointmentTime:'4:00 PM', reason:'', visitType:'', status:'Pending' },
  { id:'apt-25', childName:'Mirha', parentName:'Saleem', childAge:'', whatsapp:'7774657990', email:'Dr.talhaktk@outlook.com', appointmentDate:'2024-04-24', appointmentTime:'3:15 PM', reason:'', visitType:'', status:'Pending' },
  { id:'apt-26', childName:'Bajrangbali', parentName:'Baba', childAge:'10', whatsapp:'447776387877', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-01', appointmentTime:'10:30 AM', reason:'Stomach complaint', visitType:'New', status:'Confirmed' },
  { id:'apt-27', childName:'Shaar', parentName:'Shaha', childAge:'', whatsapp:'22486624272', email:'Dr.talhaktk@outlook.com', appointmentDate:'2026-04-01', appointmentTime:'2:30 PM', reason:'', visitType:'', status:'Pending' },
];
