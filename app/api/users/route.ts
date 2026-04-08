import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const SHEET_ID    = process.env.GOOGLE_SHEETS_ID!;
const APPS_SCRIPT = process.env.APPS_SCRIPT_URL!;

// ── GET — fetch all users from Logins sheet ───────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string })?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Logins`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error('Sheet fetch failed');

    const csv  = await res.text();
    const lines = csv.split('\n').filter(Boolean);
    if (lines.length < 2) return NextResponse.json({ users: [] });

    const users = lines.slice(1).map((line, i) => {
      const cols = parseCSVLine(line);
      return {
        rowIndex: i + 1,
        name:     clean(cols[0]),
        email:    clean(cols[1]),
        password: clean(cols[2]),
        role:     clean(cols[3]) || 'receptionist',
        initials: clean(cols[4]),
        active:   clean(cols[5])?.toLowerCase() !== 'no',
      };
    }).filter(u => u.email);

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [], error: 'Could not load users — make sure Logins sheet exists' });
  }
}

// ── POST — add / update / delete user via Apps Script ────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string })?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json();

  if (!APPS_SCRIPT) {
    return NextResponse.json({ ok: true, mode: 'env-only', warning: 'Apps Script not configured — changes not saved to sheet' });
  }

  const res = await fetch(APPS_SCRIPT, {
    method:   'POST',
    redirect: 'follow',
    headers:  { 'Content-Type': 'text/plain' },
    body:     JSON.stringify({ action: 'users', ...body }),
  });

  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ ok: true });
  }
}

function clean(s?: string) {
  return (s || '').trim().replace(/^"|"$/g, '');
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
      result.push(current); current = '';
    } else current += char;
  }
  result.push(current);
  return result;
}
