import { createClient } from '@supabase/supabase-js';
import PreConsultClient from './PreConsultClient';

export const dynamic = 'force-dynamic';

export default async function PreConsultPage({ params }: { params: { token: string } }) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: session } = await sb
    .from('telehealth_sessions')
    .select('*')
    .eq('token', params.token)
    .maybeSingle();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{background:'#f9f7f3'}}>
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <div className="font-bold" style={{color:'#0a1628',fontSize:20}}>Link Not Found</div>
          <div style={{color:'#6b7280',fontSize:14}}>This pre-consultation link is invalid or has expired.</div>
        </div>
      </div>
    );
  }

  return <PreConsultClient session={session}/>;
}
