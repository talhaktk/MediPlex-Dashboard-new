import { supabase } from '@/lib/supabase';
import PreConsultClient from './PreConsultClient';

export default async function PreConsultPage({ params }: { params: { token: string } }) {
  console.log('Looking for token:', params.token);
  const { data: session, error: sessionError } = await supabase
    .from('telehealth_sessions')
    .select('*')
    .eq('token', params.token)
    .maybeSingle();

  console.log('Session:', session, 'Error:', sessionError?.message);
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{background:'#f9f7f3'}}>
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <div className="font-bold text-navy text-[20px]">Link Not Found</div>
          <div className="text-gray-500 text-[14px]">This pre-consultation link is invalid or has expired.</div>
        </div>
      </div>
    );
  }

  return <PreConsultClient session={session}/>;
}
