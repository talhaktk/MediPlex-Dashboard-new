import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { clinicId, ...updates } = await req.json();
    if (!clinicId) return NextResponse.json({ error: 'clinicId required' }, { status: 400 });

    // Update clinics table
    const clinicUpdates: any = {};
    if (updates.name)               clinicUpdates.name = updates.name;
    if (updates.speciality)         clinicUpdates.speciality = updates.speciality;
    if (updates.city)               clinicUpdates.city = updates.city;
    if (updates.is_active !== undefined) {
      clinicUpdates.is_active = updates.is_active;
      clinicUpdates.status = updates.is_active ? 'active' : 'inactive';
    }
    if (updates.subscriptionExpiry !== undefined) {
      clinicUpdates.subscription_expiry = updates.subscriptionExpiry || null;
    }
    if (Object.keys(clinicUpdates).length) {
      await admin.from('clinics').update(clinicUpdates).eq('id', clinicId);
    }

    // Update clinic_settings
    const settingsUpdates: any = {};
    if (updates.name)        settingsUpdates.clinic_name = updates.name;
    if (updates.speciality)  settingsUpdates.speciality  = updates.speciality;
    if (updates.city)        settingsUpdates.clinic_city = updates.city;
    if (updates.address)     settingsUpdates.clinic_address = updates.address;
    if (updates.phone)       settingsUpdates.clinic_phone = updates.phone;
    if (updates.email)       settingsUpdates.clinic_email = updates.email;
    if (updates.doctorName)  settingsUpdates.doctor_name = updates.doctorName;
    if (updates.modules)     settingsUpdates.modules = updates.modules;
    if (Object.keys(settingsUpdates).length) {
      await admin.from('clinic_settings').update(settingsUpdates).eq('clinic_id', clinicId);
    }

    // Update subscription
    if (updates.plan || updates.aiScribeLimit !== undefined || updates.subscriptionExpiry) {
      const subUpdates: any = {};
      if (updates.plan)                       subUpdates.plan_name = updates.plan;
      if (updates.aiScribeLimit !== undefined) subUpdates.ai_scribe_limit = parseInt(updates.aiScribeLimit);
      if (updates.subscriptionExpiry)         subUpdates.next_billing = updates.subscriptionExpiry;
      await admin.from('subscriptions').update(subUpdates).eq('clinic_id', clinicId);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Delete clinic (super admin only, destructive — use with care)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { clinicId } = await req.json();
  if (!clinicId) return NextResponse.json({ error: 'clinicId required' }, { status: 400 });

  // Soft-delete only — never hard-delete clinic data
  await admin.from('clinics').update({ is_active: false, status: 'deleted' }).eq('id', clinicId);
  await admin.from('logins').update({ is_active: false }).eq('clinic_id', clinicId);

  return NextResponse.json({ ok: true, message: 'Clinic deactivated (soft delete)' });
}
