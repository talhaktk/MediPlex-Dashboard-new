import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clinicId, ...anthropicBody } = body;
  const supabaseAdmin = getSupabaseAdmin();

  // Server-side usage check (service role key bypasses RLS)
  if (clinicId) {
    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('ai_scribe_limit,ai_scribe_used,next_billing')
        .eq('clinic_id', clinicId)
        .maybeSingle();

      if (sub) {
        let used = sub.ai_scribe_used || 0;
        const limit = sub.ai_scribe_limit;

        // Monthly auto-reset based on next_billing month
        const billingMonth = sub.next_billing ? new Date(sub.next_billing).getMonth() : -1;
        if (billingMonth !== -1 && billingMonth !== new Date().getMonth()) {
          await supabaseAdmin.from('subscriptions').update({ ai_scribe_used: 0 }).eq('clinic_id', clinicId);
          used = 0;
        }

        if (limit && used >= limit) {
          supabaseAdmin.from('notifications').insert([{
            clinic_id: clinicId,
            type: 'scribe_blocked',
            title: '🚫 AI Scribe Limit Reached',
            body: `You have used ${used}/${limit} AI Scribe calls this month.`,
          }]).then(() => {});
          return NextResponse.json({ error: 'limit_reached', used, limit }, { status: 429 });
        }
      }
    } catch {}
  }

  // Call Anthropic
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(anthropicBody),
  });

  const data = await res.json();

  // Increment usage after successful generation
  if (clinicId && res.ok) {
    try {
      const { data: sub, error: fetchErr } = await supabaseAdmin
        .from('subscriptions')
        .select('ai_scribe_limit,ai_scribe_used')
        .eq('clinic_id', clinicId)
        .maybeSingle();

      if (fetchErr) console.error('[scribe] subscription fetch error:', fetchErr.message);

      if (sub !== null) {
        const newUsed = (sub.ai_scribe_used || 0) + 1;
        const { error: updateErr } = await supabaseAdmin
          .from('subscriptions')
          .update({ ai_scribe_used: newUsed })
          .eq('clinic_id', clinicId);

        if (updateErr) {
          console.error('[scribe] usage update error:', updateErr.message);
        } else {
          console.log(`[scribe] usage updated: clinicId=${clinicId} newUsed=${newUsed}`);
        }

        // 80% warning notification (once per month)
        const limit = sub.ai_scribe_limit;
        if (limit && newUsed >= Math.floor(limit * 0.8)) {
          const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
          const { data: existing } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('clinic_id', clinicId)
            .eq('type', 'scribe_warning')
            .gte('created_at', monthStart)
            .maybeSingle();
          if (!existing) {
            supabaseAdmin.from('notifications').insert([{
              clinic_id: clinicId,
              type: 'scribe_warning',
              title: '⚠️ AI Scribe Usage at 80%',
              body: `You have used ${newUsed}/${limit} AI Scribe calls this month.`,
            }]).then(() => {});
          }
        }
      } else {
        console.log(`[scribe] no subscription found for clinicId=${clinicId}`);
      }
    } catch (e: any) {
      console.error('[scribe] usage tracking exception:', e?.message);
    }
  }

  return NextResponse.json(data);
}
