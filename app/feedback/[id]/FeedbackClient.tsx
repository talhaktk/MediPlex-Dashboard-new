'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{display:'flex',gap:6}}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)}
          style={{fontSize:28,background:'none',border:'none',cursor:'pointer',color:n<=value?'#f59e0b':'#d1d5db',padding:0}}>★</button>
      ))}
    </div>
  );
}

export default function FeedbackClient({ feedback }: { feedback: any }) {
  const [submitted, setSubmitted] = useState(feedback.status === 'submitted');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ overall: 0, doctor: 0, wait: 0, comments: '' });

  const handleSubmit = async () => {
    if (!form.overall) { alert('Please rate your overall experience'); return; }
    setSaving(true);
    await sb.from('feedback').update({
      rating_overall: form.overall,
      rating_doctor: form.doctor,
      rating_wait: form.wait,
      comments: form.comments,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }).eq('id', feedback.id);
    setSaving(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f9f7f3',fontFamily:'system-ui',padding:24}}>
      <div style={{fontSize:48,marginBottom:16}}>🙏</div>
      <div style={{fontSize:22,fontWeight:700,color:'#0a1628',marginBottom:8}}>Thank You!</div>
      <div style={{fontSize:14,color:'#6b7280',textAlign:'center',maxWidth:280}}>Your feedback helps us improve our service. We appreciate you taking the time.</div>
      <div style={{marginTop:20,background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.3)',borderRadius:12,padding:'12px 20px',textAlign:'center'}}>
        <div style={{fontSize:13,fontWeight:600,color:'#92400e'}}>MediPlex Pediatric Centre</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#f9f7f3',fontFamily:'system-ui'}}>
      <div style={{background:'#0a1628',padding:'14px 20px'}}>
        <div style={{maxWidth:480,margin:'0 auto'}}>
          <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>🏥 MediPlex Pediatric Centre</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:2}}>Patient Feedback Form</div>
        </div>
      </div>
      <div style={{maxWidth:480,margin:'0 auto',padding:'20px 16px'}}>
        <div style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.25)',borderRadius:12,padding:'12px 16px',marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:600,color:'#0a1628'}}>{feedback.child_name}</div>
          <div style={{fontSize:12,color:'#6b7280'}}>Parent: {feedback.parent_name}</div>
        </div>

        {[
          {label:'Overall Experience',key:'overall',emoji:'⭐'},
          {label:'Doctor Consultation',key:'doctor',emoji:'👨‍⚕️'},
          {label:'Wait Time',key:'wait',emoji:'⏱'},
        ].map(f => (
          <div key={f.key} style={{background:'#fff',borderRadius:12,padding:'16px',marginBottom:12,border:'1px solid #e5e7eb'}}>
            <div style={{fontSize:13,fontWeight:600,color:'#0a1628',marginBottom:8}}>{f.emoji} {f.label}</div>
            <Stars value={(form as any)[f.key]} onChange={v => setForm(p => ({...p,[f.key]:v}))}/>
          </div>
        ))}

        <div style={{background:'#fff',borderRadius:12,padding:'16px',marginBottom:20,border:'1px solid #e5e7eb'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#0a1628',marginBottom:8}}>💬 Comments (Optional)</div>
          <textarea rows={4} placeholder="Share your experience or suggestions..."
            value={form.comments} onChange={e => setForm(p => ({...p,comments:e.target.value}))}
            style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#0a1628',resize:'none',outline:'none',boxSizing:'border-box'}}/>
        </div>

        <button onClick={handleSubmit} disabled={saving||!form.overall}
          style={{width:'100%',padding:'16px',borderRadius:16,fontSize:16,fontWeight:700,border:'2px solid rgba(201,168,76,0.4)',background:'linear-gradient(135deg,#0a1628,#142240)',color:'#c9a84c',cursor:saving||!form.overall?'not-allowed':'pointer',opacity:saving||!form.overall?0.5:1,marginBottom:32}}>
          {saving?'Submitting...':'✅ Submit Feedback'}
        </button>
      </div>
    </div>
  );
}
