import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isPatient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const mrNumber = user.mrNumber as string;
  const sb = getAdmin();

  // Fetch lab orders
  const { data: orders } = await sb
    .from('lab_orders')
    .select('id,order_type,tests,clinical_notes,ordered_by,ordered_at,qr_token,qr_expires_at,status')
    .eq('mr_number', mrNumber)
    .order('ordered_at', { ascending: false });

  // Fetch result values for each order
  const orderIds = (orders || []).map(o => o.id);
  let resultValues: any[] = [];
  if (orderIds.length > 0) {
    const { data: vals } = await sb
      .from('lab_result_values')
      .select('*')
      .in('order_id', orderIds)
      .order('created_at', { ascending: true });
    resultValues = vals || [];
  }

  // Fetch legacy lab results (uploaded files)
  const { data: legacyResults } = await sb
    .from('lab_results')
    .select('id,test_name,notes,file_urls,visit_date,uploaded_at,has_abnormal,radiologist_report')
    .eq('mr_number', mrNumber)
    .order('uploaded_at', { ascending: false });

  return NextResponse.json({
    orders:        orders        || [],
    resultValues:  resultValues,
    legacyResults: legacyResults || [],
  });
}
