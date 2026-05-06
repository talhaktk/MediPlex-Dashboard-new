import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, body, url, clinicId } = await req.json();
  if (!title || !body) return NextResponse.json({ error: 'title and body required' }, { status: 400 });

  const vapidPublicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidMailto     = process.env.VAPID_MAILTO || `mailto:${process.env.NEXTAUTH_EMAIL || 'admin@mediplex.io'}`;

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({
      ok: false,
      message: 'VAPID keys not configured. Run: npx web-push generate-vapid-keys and add to env vars.',
    }, { status: 200 });
  }

  const sb = getAdmin();
  let query = sb.from('push_subscriptions').select('*');
  if (clinicId) query = query.eq('clinic_id', clinicId);
  const { data: subs } = await query;

  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0, message: 'No subscribers' });

  let webpush: any;
  try {
    webpush = require('web-push');
    webpush.setVapidDetails(vapidMailto, vapidPublicKey, vapidPrivateKey);
  } catch {
    return NextResponse.json({
      ok: false,
      message: 'web-push package not installed. Run: npm install web-push',
    }, { status: 200 });
  }

  const payload = JSON.stringify({ title, body, url: url || '/dashboard' });
  let sent = 0;
  const failed: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }, payload);
        sent++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Expired subscription — remove it
          await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
        failed.push(sub.endpoint);
      }
    })
  );

  return NextResponse.json({ ok: true, sent, failed: failed.length });
}
