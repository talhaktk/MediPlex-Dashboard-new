import { NextRequest, NextResponse } from 'next/server';

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const API_KEY  = process.env.GOOGLE_API_KEY!;

// Column indices in the sheet (0-based)
// Add these two columns to your Google Sheet header row:
//   Column R (index 17) = attendanceStatus
//   Column S (index 18) = checkInTime
const ATTENDANCE_COL = 'R'; // change if your sheet layout differs
const CHECKIN_COL    = 'S';

export async function POST(req: NextRequest) {
  try {
    const { rowIndex, attendanceStatus, checkInTime } = await req.json();

    if (!rowIndex || !attendanceStatus) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Sheet row: header is row 1, data starts at row 2
    // rowIndex passed from client is 1-based data index, so sheet row = rowIndex + 1
    const sheetRow = rowIndex + 1;

    // Build the range for the two cells: e.g. Sheet1!R3:S3
    const range = `Sheet1!${ATTENDANCE_COL}${sheetRow}:${CHECKIN_COL}${sheetRow}`;

    // Google Sheets API v4 — values.update (requires API key with write access OR service account)
    // NOTE: Public API keys are READ-ONLY. For write access you need either:
    //   Option A: Google Apps Script webhook (easiest — see README)
    //   Option B: Service account (add GOOGLE_SERVICE_ACCOUNT_KEY env var)
    //
    // For now this calls the REST endpoint — works if you enable write on the sheet
    // and use a service account token. Falls back gracefully if not configured.

    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      // No service account — save optimistically on client, log server-side
      console.log(`[Attendance] Row ${sheetRow}: ${attendanceStatus} @ ${checkInTime} (no service account configured)`);
      return NextResponse.json({ ok: true, mode: 'local-only' });
    }

    // Service account path
    const credentials = JSON.parse(serviceAccountKey);
    const token = await getServiceAccountToken(credentials, 'https://www.googleapis.com/auth/spreadsheets');

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

    const sheetRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [[attendanceStatus, checkInTime || '']],
      }),
    });

    if (!sheetRes.ok) {
      const err = await sheetRes.text();
      console.error('Sheets API error:', err);
      return NextResponse.json({ error: 'Sheets write failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mode: 'sheets' });
  } catch (err) {
    console.error('Attendance API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ─── Minimal service account JWT helper ──────────────────────────────────────

async function getServiceAccountToken(credentials: Record<string, string>, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    iss: credentials.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  const signingInput = `${header}.${payload}`;
  const privateKey = credentials.private_key.replace(/\\n/g, '\n');

  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const { access_token } = await tokenRes.json();
  return access_token;
}
