import { NextRequest, NextResponse } from 'next/server';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const BASE_URL = process.env.NEXTAUTH_URL || 'https://mediplex.vercel.app';

export async function POST(req: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({
      error: 'Stripe not configured. Add STRIPE_SECRET_KEY to Vercel environment variables.',
    }, { status: 200 });
  }

  try {
    const { amount, currency = 'gbp', planName, clinicId, clinicName, clinicEmail } = await req.json();

    if (!amount || !clinicId) {
      return NextResponse.json({ error: 'amount and clinicId required' }, { status: 400 });
    }

    // Create a Stripe Checkout Session (one-time payment)
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': currency,
      'line_items[0][price_data][unit_amount]': String(Math.round(parseFloat(amount) * 100)),
      'line_items[0][price_data][product_data][name]': `MediPlex ${planName} Plan`,
      'line_items[0][price_data][product_data][description]': `${clinicName} — MediPlex subscription`,
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': `${BASE_URL}/onboarding/success?session_id={CHECKOUT_SESSION_ID}&clinic_id=${clinicId}`,
      'cancel_url': `${BASE_URL}/login`,
      'customer_email': clinicEmail || '',
      'metadata[clinic_id]': clinicId,
      'metadata[plan]': planName,
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: session.error?.message || 'Stripe error' }, { status: res.status });
    }

    // Update subscription record to mark Stripe session created
    // (webhook will activate it on payment success)
    return NextResponse.json({
      ok:  true,
      url: session.url,
      id:  session.id,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
