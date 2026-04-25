import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import OrgDashboard from './OrgDashboard';

export default async function OrgDashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  
  if (!session || user?.role !== 'org_owner') redirect('/dashboard');
  
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {auth:{persistSession:false}});
  const { data: org } = await sb.from('organisations').select('name').eq('id', user.orgId).maybeSingle();
  
  return (
    <OrgDashboard 
      orgId={user.orgId || ''} 
      orgName={org?.name || 'Organisation'} 
      ownerName={user.name || 'Owner'}
    />
  );
}
