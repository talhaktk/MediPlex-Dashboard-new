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
      // No Apps Script configured — changes are saved on screen only
      console.log(`[Attendance] Row ${rowIndex}: ${attendanceStatus} checkIn=${checkInTime} inClinic=${inClinicTime}`);
      return NextResponse.json({ ok: true, mode: 'screen-only' });
    }

    // Forward to Google Apps Script web app
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex, attendanceStatus, checkInTime: checkInTime || '', inClinicTime: inClinicTime || '' }),
    });

    if (!res.ok) {
      console.error('Apps Script error:', await res.text());
      return NextResponse.json({ error: 'Script error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mode: 'sheet' });
  } catch (err) {
    console.error('Attendance API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
