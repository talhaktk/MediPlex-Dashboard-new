import { createClient } from '@supabase/supabase-js';
import FeedbackClient from './FeedbackClient';
export const dynamic = 'force-dynamic';
export default async function FeedbackPage({ params }: { params: { id: string } }) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await sb.from('feedback').select('*').eq('id', params.id).maybeSingle();
  if (!data) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9f7f3',fontFamily:'system-ui'}}>
      <div style={{textAlign:'center'}}><div style={{fontSize:40}}>🔗</div><div style={{fontSize:20,fontWeight:700,color:'#0a1628',marginTop:12}}>Link Not Found</div></div>
    </div>
  );

  // Resolve clinic_id: prefer stored field, then via prescriptions rx_id
  let clinicId = data.clinic_id || null;
  if (!clinicId && data.rx_id) {
    const { data: rx } = await sb.from('prescriptions').select('clinic_id').eq('id', data.rx_id).maybeSingle();
    clinicId = rx?.clinic_id || null;
  }
  if (!clinicId && data.mr_number) {
    const { data: apt } = await sb.from('appointments').select('clinic_id').eq('mr_number', data.mr_number).order('appointment_date',{ascending:false}).limit(1).maybeSingle();
    clinicId = apt?.clinic_id || null;
  }

  let clinicSettings: any = null;
  if (clinicId) {
    const { data: cs } = await sb.from('clinic_settings').select('clinic_name,doctor_name,doctor_qualification,logo_url,clinic_phone').eq('clinic_id', clinicId).maybeSingle();
    clinicSettings = cs;
  }

  return <FeedbackClient feedback={data} clinicSettings={clinicSettings}/>;
}
