import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// SafePay Sandbox credentials (from env; fall back to hardcoded sandbox keys)
const SP_KEY    = process.env.SAFEPAY_KEY    || 'sec_test_8d1c0a1b-5b1b-4b1b-8b1b-0a1b2c3d4e5f';
const SP_SECRET = process.env.SAFEPAY_SECRET || 'sandbox_sk_test_placeholder';
const SP_BASE   = 'https://sandbox.api.getsafepay.com';

function hmacSig(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { amount, currency = 'PKR', orderId, email, clinicName, successUrl, cancelUrl } = await req.json();

    if (!amount || !orderId) {
      return NextResponse.json({ error: 'amount and orderId required' }, { status: 400 });
    }

    // SafePay v2 checkout session
    const payload = {
      merchant_api_key: SP_KEY,
      intent:           'CYBERSOURCE',
      mode:             'payment',
      currency:         currency,
      amount:           Math.round(parseFloat(amount) * 100), // SafePay uses paisa/pence
      order_id:         orderId,
      email:            email || '',
      source:           'mediplex-onboarding',
      metadata: {
        clinic_name: clinicName || '',
      },
      redirect_url: successUrl || `${process.env.NEXTAUTH_URL || 'https://mediplex.vercel.app'}/onboarding/success`,
      cancel_url:   cancelUrl  || `${process.env.NEXTAUTH_URL || 'https://mediplex.vercel.app'}/onboarding?step=5`,
    };

    const body = JSON.stringify(payload);
    const sig  = hmacSig(body, SP_SECRET);

    const res = await fetch(`${SP_BASE}/v1/checkout/session`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-SFPY-MERCHANT': SP_KEY,
        'X-SFPY-SIG':      sig,
      },
      body,
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[safepay/init]', data);
      return NextResponse.json({ error: data?.message || 'SafePay error' }, { status: res.status });
    }

    // Return the SafePay checkout URL
    return NextResponse.json({
      ok:         true,
      tracker:    data?.data?.tracker,
      checkoutUrl: `${SP_BASE}/embedded/${data?.data?.tracker}`,
    });

  } catch (err: any) {
    console.error('[safepay/init]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
