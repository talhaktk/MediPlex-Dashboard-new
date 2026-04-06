import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rowIndex, attendanceStatus, checkInTime, inClinicTime } = body;

    if (!rowIndex || !attendanceStatus) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const scriptUrl = process.env.APPS_SCRIPT_URL;

    if (!scriptUrl) {
      console.log(`[Attendance] No APPS_SCRIPT_URL. Row ${rowIndex}: ${attendanceStatus}`);
      return NextResponse.json({ ok: true, mode: 'screen-only' });
    }

    // Google Apps Script redirects — must use redirect:'follow' and Content-Type text/plain
    const res = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ rowIndex, attendanceStatus, checkInTime: checkInTime || '', inClinicTime: inClinicTime || '' }),
    });

    const text = await res.text();
    console.log('[Attendance] Script response:', text);

    try {
      const json = JSON.parse(text);
      if (json.ok) return NextResponse.json({ ok: true, mode: 'sheet' });
    } catch { /* not json */ }

    return NextResponse.json({ ok: true, mode: 'screen-only' });

  } catch (err) {
    console.error('[Attendance] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
