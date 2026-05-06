import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// SQL to run manually in Supabase SQL Editor if exec_sql RPC is not available
export const SUPERADMIN_MIGRATION_SQL = `
-- ── organisations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organisations (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  owner_name   TEXT,
  email        TEXT,
  phone        TEXT,
  city         TEXT,
  province     TEXT,
  country      TEXT DEFAULT 'Pakistan',
  status       TEXT DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── clinics ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinics (
  id                   TEXT PRIMARY KEY,
  org_id               TEXT REFERENCES organisations(id),
  name                 TEXT NOT NULL,
  speciality           TEXT DEFAULT 'General Practice',
  city                 TEXT,
  address              TEXT,
  phone                TEXT,
  email                TEXT,
  is_active            BOOLEAN DEFAULT true,
  status               TEXT DEFAULT 'active',
  subscription_expiry  DATE,
  modules              JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── subscriptions: add columns if missing ─────────────────────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS org_id          TEXT,
  ADD COLUMN IF NOT EXISTS plan_name       TEXT DEFAULT 'Standard',
  ADD COLUMN IF NOT EXISTS price_monthly   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency        TEXT DEFAULT 'PKR',
  ADD COLUMN IF NOT EXISTS start_date      DATE,
  ADD COLUMN IF NOT EXISTS next_billing    DATE,
  ADD COLUMN IF NOT EXISTS trial_ends_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_ref     TEXT,
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS plan_ends_at    TIMESTAMPTZ;

-- ── logins: ensure org_id column exists ───────────────────────────────────────
ALTER TABLE logins
  ADD COLUMN IF NOT EXISTS org_id TEXT;

-- ── clinic_settings: onboarding flag ──────────────────────────────────────────
ALTER TABLE clinic_settings
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- ── mediplex_expenses ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mediplex_expenses (
  id          SERIAL PRIMARY KEY,
  category    TEXT,
  amount      NUMERIC,
  currency    TEXT DEFAULT 'USD',
  date        DATE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({
      ok: false,
      message: 'Run this SQL manually in Supabase SQL Editor:',
      sql: SUPERADMIN_MIGRATION_SQL,
    });
  }

  try {
    const { error } = await admin.rpc('exec_sql', { sql: SUPERADMIN_MIGRATION_SQL });
    if (error) {
      return NextResponse.json({
        ok: false,
        message: 'exec_sql not available. Run manually:',
        sql: SUPERADMIN_MIGRATION_SQL,
        error: error.message,
      });
    }
    return NextResponse.json({ ok: true, message: 'Migration complete' });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      message: 'Run this SQL manually in Supabase SQL Editor:',
      sql: SUPERADMIN_MIGRATION_SQL,
    });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ sql: SUPERADMIN_MIGRATION_SQL });
}
