import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SP_SECRET = process.env.SAFEPAY_SECRET || 'sandbox_sk_test_placeholder';

function verifySignature(body: string, sig: string) {
  const expected = crypto.createHmac('sha256', SP_SECRET).update(body).digest('hex');
  return expected === sig;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sig     = req.headers.get('x-sfpy-sig') || '';

    if (sig && !verifySignature(rawBody, sig)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event;

    if (type === 'payment.success' || type === 'checkout.success') {
      const orderId  = data?.order_id  || data?.metadata?.order_id;
      const clinicId = data?.metadata?.clinic_id || orderId;

      if (clinicId) {
        // Activate subscription after successful payment
        const planEnd = new Date();
        planEnd.setFullYear(planEnd.getFullYear() + 1);

        await admin.from('subscriptions')
          .update({
            status:       'active',
            plan:         data?.metadata?.plan || 'professional',
            plan_ends_at: planEnd.toISOString(),
            paid_at:      new Date().toISOString(),
            payment_ref:  data?.tracker || orderId,
          })
          .eq('clinic_id', clinicId);
      }
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error('[safepay/callback]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// SafePay may also GET-redirect after checkout
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tracker = searchParams.get('tracker');
  const status  = searchParams.get('status');

  if (status === 'success' || status === 'paid') {
    return NextResponse.redirect(
      new URL('/onboarding/success', req.url),
    );
  }

  return NextResponse.redirect(
    new URL(`/onboarding?step=5&payment=cancelled`, req.url),
  );
}
