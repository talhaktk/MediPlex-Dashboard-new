import { createClient } from '@supabase/supabase-js';
import FeedbackClient from './FeedbackClient';
export const dynamic = 'force-dynamic';
export default async function FeedbackPage({ params }: { params: { id: string } }) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await sb.from('feedback').select('*').eq('id', params.id).maybeSingle();
  if (!data) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9f7f3',fontFamily:'system-ui'}}>
      <div style={{textAlign:'center'}}><div style={{fontSize:40}}>��</div><div style={{fontSize:20,fontWeight:700,color:'#0a1628',marginTop:12}}>Link Not Found</div></div>
    </div>
  );
  return <FeedbackClient feedback={data}/>;
}
