import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function RxPublicPage({ params }: { params: { id: string } }) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await sb.from('rx_public').select('*').eq('id', params.id).maybeSingle();

  if (!data) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9f7f3',fontFamily:'system-ui'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>🔒</div>
          <div style={{fontSize:20,fontWeight:700,color:'#0a1628'}}>Prescription Not Found</div>
          <div style={{fontSize:14,color:'#6b7280',marginTop:8}}>This link is invalid or has expired.</div>
        </div>
      </div>
    );
  }

  const rx = data.rx_data;
  const clinic = data.clinic_name || 'MediPlex Pediatric Centre';
  const doctor = data.doctor_name || 'Dr. Talha';

  return (
    <div style={{minHeight:'100vh',background:'#f9f7f3',fontFamily:'Arial,sans-serif'}}>
      {/* Header */}
      <div style={{background:'#0a1628',padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>🏥 {clinic}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:2}}>Digital Prescription · {doctor}</div>
        </div>
        <div style={{background:'rgba(201,168,76,0.2)',border:'1px solid rgba(201,168,76,0.4)',color:'#c9a84c',padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:600}}>{rx.id}</div>
      </div>

      <div style={{maxWidth:480,margin:'0 auto',padding:'16px'}}>
        {/* Patient info */}
        <div style={{background:'#fff',borderRadius:12,padding:'14px 16px',marginBottom:12,border:'1px solid #e5e7eb'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[['Patient',rx.childName],['Age',rx.childAge?rx.childAge+' yrs':'—'],['Parent',rx.parentName],['Date',rx.date]].map(([l,v])=>(
              <div key={l}>
                <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.06em',color:'#9ca3af',fontWeight:600}}>{l}</div>
                <div style={{fontSize:13,fontWeight:600,color:'#0a1628',marginTop:2}}>{v||'—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chief complaint */}
        {(rx.chiefComplaint||rx.signsSymptoms) && (
          <div style={{display:'grid',gridTemplateColumns:rx.chiefComplaint&&rx.signsSymptoms?'1fr 1fr':'1fr',gap:8,marginBottom:12}}>
            {rx.chiefComplaint&&<div style={{background:'#fff9e6',border:'1px solid #fde68a',borderRadius:10,padding:'10px 14px'}}>
              <div style={{fontSize:9,textTransform:'uppercase',color:'#92400e',fontWeight:700,marginBottom:4}}>Chief Complaint</div>
              <div style={{fontSize:13,color:'#0a1628',whiteSpace:'pre-line'}}>{rx.chiefComplaint}</div>
            </div>}
            {rx.signsSymptoms&&<div style={{background:'#fff9e6',border:'1px solid #fde68a',borderRadius:10,padding:'10px 14px'}}>
              <div style={{fontSize:9,textTransform:'uppercase',color:'#92400e',fontWeight:700,marginBottom:4}}>Signs & Symptoms</div>
              <div style={{fontSize:13,color:'#0a1628',whiteSpace:'pre-line'}}>{rx.signsSymptoms}</div>
            </div>}
          </div>
        )}

        {/* Diagnosis */}
        {rx.diagnosis && (
          <div style={{background:'#fff3cd',border:'1px solid #ffc107',borderRadius:10,padding:'10px 14px',marginBottom:12}}>
            <div style={{fontSize:9,textTransform:'uppercase',color:'#856404',fontWeight:700,marginBottom:4}}>🔍 Diagnosis</div>
            <div style={{fontSize:14,fontWeight:600,color:'#856404'}}>{rx.diagnosis}</div>
          </div>
        )}

        {/* Medicines */}
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',overflow:'hidden',marginBottom:12}}>
          <div style={{background:'#0a1628',padding:'8px 14px',fontSize:11,fontWeight:700,color:'#c9a84c',textTransform:'uppercase',letterSpacing:'0.06em'}}>℞ Medicines</div>
          {(rx.medicines||[]).map((m: any, i: number) => (
            <div key={i} style={{padding:'10px 14px',borderBottom:'1px solid #f5f5f5'}}>
              <div style={{fontSize:14,fontWeight:700,color:'#0a1628'}}>{i+1}. {m.name}</div>
              <div style={{display:'flex',gap:12,marginTop:4,flexWrap:'wrap'}}>
                {m.dose&&<span style={{fontSize:11,color:'#374151'}}>💊 {m.dose}</span>}
                <span style={{fontSize:11,color:'#374151'}}>🕐 {m.frequency}</span>
                <span style={{fontSize:11,color:'#374151'}}>📅 {m.duration}</span>
              </div>
              {m.notes&&<div style={{fontSize:11,color:'#6b7280',marginTop:3,fontStyle:'italic'}}>{m.notes}</div>}
            </div>
          ))}
        </div>

        {/* Lab Investigations */}
        {rx.labs?.length > 0 && (
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',overflow:'hidden',marginBottom:12}}>
            <div style={{background:'#0a1628',padding:'8px 14px',fontSize:11,fontWeight:700,color:'#c9a84c',textTransform:'uppercase',letterSpacing:'0.06em'}}>🔬 Lab Investigations</div>
            {rx.labs.map((l: any, i: number) => (
              <div key={i} style={{padding:'8px 14px',borderBottom:'1px solid #f5f5f5',display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:600,color:'#0a1628'}}>{i+1}. {l.name}</span>
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,fontWeight:600,background:l.urgency==='STAT'?'#fee2e2':l.urgency==='Urgent'?'#fff7ed':'#dcfce7',color:l.urgency==='STAT'?'#991b1b':l.urgency==='Urgent'?'#92400e':'#166534'}}>{l.urgency}</span>
                {l.instructions&&<span style={{fontSize:11,color:'#6b7280'}}>— {l.instructions}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Lab Results */}
        {rx.labResultsText && (
          <div style={{background:'#f8f8f8',border:'1px solid #e5e7eb',borderRadius:10,padding:'10px 14px',marginBottom:12}}>
            <div style={{fontSize:9,textTransform:'uppercase',color:'#6b7280',fontWeight:700,marginBottom:6}}>🧾 Lab Results</div>
            <div style={{fontSize:12,whiteSpace:'pre-wrap',color:'#374151'}}>{rx.labResultsText}</div>
          </div>
        )}

        {/* Advice */}
        {rx.advice && (
          <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 14px',marginBottom:12}}>
            <div style={{fontSize:9,textTransform:'uppercase',color:'#166534',fontWeight:700,marginBottom:4}}>💡 Advice</div>
            <div style={{fontSize:13,color:'#166534'}}>{rx.advice}</div>
          </div>
        )}

        {/* Follow-up */}
        {rx.followUp && (
          <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:10,padding:'10px 14px',marginBottom:12}}>
            <div style={{fontSize:9,textTransform:'uppercase',color:'#1e40af',fontWeight:700,marginBottom:4}}>📅 Follow-up</div>
            <div style={{fontSize:13,color:'#1e40af'}}>Please visit again: <strong>{rx.followUp}</strong></div>
          </div>
        )}

        <div style={{textAlign:'center',fontSize:11,color:'#9ca3af',padding:'12px 0',borderTop:'1px solid #e5e7eb',marginTop:8}}>
          {clinic} · Digital Prescription · Valid 30 days<br/>
          <span style={{fontSize:10}}>Powered by MediPlex</span>
        </div>
      </div>
    </div>
  );
}
