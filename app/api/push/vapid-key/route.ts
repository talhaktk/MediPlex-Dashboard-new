import { NextResponse } from 'next/server';

export async function GET() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
  return NextResponse.json({ vapidKey });
}
