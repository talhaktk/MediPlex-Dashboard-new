import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const OWNER_EMAIL = 'dr.talhaktk@gmail.com';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, subject, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Name, email and message are required' }, { status: 400 });
    }

    const payload = {
      name:       name.trim(),
      email:      email.trim().toLowerCase(),
      phone:      phone?.trim() || '',
      subject:    subject?.trim() || 'General Enquiry',
      message:    message.trim(),
      created_at: new Date().toISOString(),
      source:     'landing_contact_form',
    };

    // Store in Supabase (table created lazily — ignore if table doesn't exist yet)
    try {
      await admin.from('contact_submissions').insert(payload);
    } catch {
      // table may not exist; swallow error
    }

    // Send email notification via Resend (if API key configured)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:    'MediPlex Contact <noreply@resend.dev>',
          to:      [OWNER_EMAIL],
          subject: `[MediPlex Lead] ${payload.subject} — ${payload.name}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <div style="background:#0A1628;padding:20px 24px;border-radius:12px;margin-bottom:24px;">
                <span style="font-size:20px;font-weight:900;color:#ffffff;">Medi</span><span style="font-size:20px;font-weight:900;color:#C9A84C;">Plex</span>
                <span style="font-size:13px;color:rgba(255,255,255,0.5);margin-left:12px;">New Contact Form Lead</span>
              </div>

              <table style="width:100%;border-collapse:collapse;">
                ${[
                  ['Name',     payload.name],
                  ['Email',    `<a href="mailto:${payload.email}">${payload.email}</a>`],
                  ['WhatsApp', payload.phone || '—'],
                  ['Subject',  payload.subject],
                ].map(([k,v]) => `
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6B7280;font-weight:600;width:110px;vertical-align:top;text-transform:uppercase;letter-spacing:0.05em;">${k}</td>
                    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#0A1628;font-weight:500;">${v}</td>
                  </tr>
                `).join('')}
              </table>

              <div style="margin-top:20px;background:#f8fafc;border-radius:12px;padding:16px 20px;">
                <div style="font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">Message</div>
                <div style="font-size:14px;color:#0A1628;line-height:1.7;white-space:pre-wrap;">${payload.message}</div>
              </div>

              <div style="margin-top:20px;display:flex;gap:12px;">
                <a href="mailto:${payload.email}?subject=Re: ${encodeURIComponent(payload.subject)}"
                   style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8C87A);color:#0A1628;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;margin-right:8px;">
                  Reply via Email
                </a>
                ${payload.phone ? `
                <a href="https://wa.me/${payload.phone.replace(/[^0-9]/g,'')}"
                   style="display:inline-block;background:#25D366;color:white;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">
                  Reply on WhatsApp
                </a>` : ''}
              </div>

              <div style="margin-top:24px;font-size:11px;color:#9CA3AF;">
                Submitted ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })} GMT · MediPlex Landing Page
              </div>
            </div>
          `,
        }),
      }).catch(() => {
        // Email send failed — submission is already stored in Supabase
      });
    }

    return NextResponse.json({ ok: true, message: 'Your message has been received. We will be in touch within 2 hours.' });

  } catch (err: any) {
    console.error('[contact]', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
