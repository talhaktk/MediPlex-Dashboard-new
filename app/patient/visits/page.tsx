'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function PatientVisitSummaries() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const mrNumber = user?.mrNumber;
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!mrNumber) return;
    supabase.from('prescriptions').select('*').eq('mr_number', mrNumber)
      .order('created_at', {ascending:false})
      .then(({data}) => { setPrescriptions(data||[]); setLoading(false); });
  }, [mrNumber]);

  const toggle = (id:string) => setExpanded(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Visit Summaries</h1>
        <p className="text-slate-500 text-sm mt-1">Summary of each clinic visit</p>
      </div>
      {prescriptions.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30"/>
          <p>No visit records found</p>
        </div>
      ) : prescriptions.map(rx => (
        <div key={rx.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button onClick={()=>toggle(rx.id)} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50">
            <div>
              <div className="font-semibold text-slate-800">{new Date(rx.date||rx.created_at).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
              <div className="text-sm text-slate-500 mt-0.5">{rx.diagnosis||'General Visit'} · {rx.medicines?.length||0} medication(s)</div>
            </div>
            {expanded.has(rx.id)?<ChevronUp size={16} className="text-slate-400"/>:<ChevronDown size={16} className="text-slate-400"/>}
          </button>
          {expanded.has(rx.id) && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
              {rx.chief_complaint && <div><div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Chief Complaint</div><div className="text-sm text-slate-700">{rx.chief_complaint}</div></div>}
              {rx.diagnosis && <div><div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Diagnosis</div><div className="text-sm font-semibold text-slate-800">{rx.diagnosis}</div></div>}
              {rx.medicines?.length>0 && (
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">Medications Prescribed</div>
                  {rx.medicines.map((m:any,i:number)=>(
                    <div key={i} className="flex justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                      <span className="font-medium text-slate-700">{m.name} {m.dose}</span>
                      <span className="text-slate-400">{m.frequency} · {m.duration}</span>
                    </div>
                  ))}
                </div>
              )}
              {rx.advice && <div><div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Doctor's Advice</div><div className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded-lg">{rx.advice}</div></div>}
              {rx.follow_up && <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">📅 Follow-up: {rx.follow_up}</div>}
              <a href={`/rx/${rx.id}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{background:'rgba(10,22,40,0.08)',color:'#0a1628'}}>
                <FileText size={12}/> View Full Prescription
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
