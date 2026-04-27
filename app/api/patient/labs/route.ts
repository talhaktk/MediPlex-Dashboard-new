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

const BUCKET = 'lab-results';

// Generate a 1-hour signed URL from a stored public URL path
async function signedUrl(sb: ReturnType<typeof getAdmin>, publicUrl: string): Promise<string> {
  try {
    const marker = `/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return publicUrl;
    const path = decodeURIComponent(publicUrl.slice(idx + marker.length).split('?')[0]);
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
    return data?.signedUrl || publicUrl;
  } catch {
    return publicUrl;
  }
}

async function signFileUrls(sb: ReturnType<typeof getAdmin>, urls: any): Promise<string[]> {
  if (!urls) return [];
  const arr: string[] = Array.isArray(urls) ? urls : (typeof urls === 'string' ? [urls] : []);
  return Promise.all(arr.map(u => signedUrl(sb, u)));
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
  const orderIds = (orders || []).map((o: any) => o.id);
  let resultValues: any[] = [];
  if (orderIds.length > 0) {
    const { data: vals } = await sb
      .from('lab_result_values')
      .select('*')
      .in('order_id', orderIds)
      .order('created_at', { ascending: true });
    resultValues = vals || [];
  }

  // Fetch legacy lab results (uploaded files) — includes QR-uploaded files (order_id set)
  const { data: rawLegacy } = await sb
    .from('lab_results')
    .select('id,test_name,notes,file_urls,visit_date,uploaded_at,has_abnormal,radiologist_report,order_id')
    .eq('mr_number', mrNumber)
    .order('uploaded_at', { ascending: false });

  // Generate signed URLs so files load regardless of bucket visibility
  const legacyResults = await Promise.all(
    (rawLegacy || []).map(async (r: any) => ({
      ...r,
      file_urls: await signFileUrls(sb, r.file_urls),
    }))
  );

  return NextResponse.json({
    orders:        orders        || [],
    resultValues:  resultValues,
    legacyResults: legacyResults,
  });
}
