'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useClinic, withClinicFilter, withClinicId } from '@/lib/clinicContext';
import { Star, MessageCircle, TrendingUp, Users, ThumbsUp } from 'lucide-react';

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{color:n<=value?'#f59e0b':'#d1d5db',fontSize:14}}>★</span>
      ))}
    </div>
  );
}

export default function FeedbackDashboard() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const { clinicId, isSuperAdmin } = useClinic();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all'|'submitted'|'pending'>('all');

  useEffect(() => {
    supabase.from('feedback').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setFeedback(data || []); setLoading(false); });
  }, []);

  const submitted = feedback.filter(f => f.status === 'submitted');
  const avgOverall = submitted.length ? (submitted.reduce((s,f) => s+(f.rating_overall||0), 0) / submitted.length).toFixed(1) : '—';
  const avgDoctor = submitted.length ? (submitted.reduce((s,f) => s+(f.rating_doctor||0), 0) / submitted.length).toFixed(1) : '—';
  const avgWait = submitted.length ? (submitted.reduce((s,f) => s+(f.rating_wait||0), 0) / submitted.length).toFixed(1) : '—';
  const responseRate = feedback.length ? Math.round((submitted.length / feedback.length) * 100) : 0;

  const filtered = filter === 'all' ? feedback : feedback.filter(f => f.status === filter);

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Overall Rating', value: avgOverall, icon:'⭐', color:'#f59e0b', bg:'#fefce8' },
          { label:'Doctor Rating', value: avgDoctor, icon:'👨‍⚕️', color:'#3b82f6', bg:'#eff6ff' },
          { label:'Wait Time Rating', value: avgWait, icon:'⏱', color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Response Rate', value: `${responseRate}%`, icon:'📊', color:'#10b981', bg:'#f0fdf4' },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="flex items-center gap-2 mb-1">
              <span style={{fontSize:18}}>{s.icon}</span>
              <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">{s.label}</div>
            </div>
            <div className="font-display text-[28px] font-semibold" style={{color:s.color}}>{s.value}</div>
            <div className="text-[11px] text-gray-400 mt-1">{submitted.length} responses / {feedback.length} sent</div>
          </div>
        ))}
      </div>

      {/* Rating distribution */}
      {submitted.length > 0 && (
        <div className="card p-5">
          <div className="font-medium text-navy text-[14px] mb-4">Rating Distribution</div>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label:'Overall Experience', key:'rating_overall', color:'#f59e0b' },
              { label:'Doctor Consultation', key:'rating_doctor', color:'#3b82f6' },
              { label:'Wait Time', key:'rating_wait', color:'#8b5cf6' },
            ].map(cat => {
              const dist = [5,4,3,2,1].map(star => ({
                star,
                count: submitted.filter(f => f[cat.key] === star).length,
                pct: submitted.length ? Math.round((submitted.filter(f => f[cat.key] === star).length / submitted.length) * 100) : 0
              }));
              return (
                <div key={cat.key}>
                  <div className="text-[12px] font-medium text-navy mb-3">{cat.label}</div>
                  {dist.map(d => (
                    <div key={d.star} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] text-gray-500 w-3">{d.star}</span>
                      <span style={{color:'#f59e0b',fontSize:11}}>★</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${d.pct}%`,background:cat.color}}/>
                      </div>
                      <span className="text-[10px] text-gray-400 w-6">{d.count}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[['all','All'],['submitted','Responded'],['pending','Pending']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k as any)}
            className={`px-4 py-2 rounded-xl text-[12px] font-medium transition-all ${filter===k?'bg-navy text-white':'btn-outline'}`}>
            {l} ({k==='all'?feedback.length:feedback.filter(f=>f.status===k).length})
          </button>
        ))}
      </div>

      {/* Feedback list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">
          Patient Feedback
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-[13px]">No feedback yet</div>
        ) : (
          <div className="divide-y divide-black/5">
            {filtered.map(f => (
              <div key={f.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className="font-semibold text-navy text-[14px]">{f.child_name}</div>
                      {f.parent_name && <div className="text-[12px] text-gray-400">Parent: {f.parent_name}</div>}
                      {f.whatsapp && <div className="text-[11px] font-mono text-gray-400">{f.whatsapp}</div>}
                    </div>
                    {f.status === 'submitted' ? (
                      <div className="space-y-2 mt-2">
                        <div className="flex flex-wrap gap-4 text-[12px]">
                          {f.rating_overall && <div className="flex items-center gap-1"><span className="text-gray-400">Overall:</span><StarDisplay value={f.rating_overall}/></div>}
                          {f.rating_doctor && <div className="flex items-center gap-1"><span className="text-gray-400">Doctor:</span><StarDisplay value={f.rating_doctor}/></div>}
                          {f.rating_wait && <div className="flex items-center gap-1"><span className="text-gray-400">Wait:</span><StarDisplay value={f.rating_wait}/></div>}
                        </div>
                        {f.comments && (
                          <div className="rounded-lg px-3 py-2 text-[12px] text-gray-700 italic" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.15)'}}>
                            "{f.comments}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[12px] text-amber-600 mt-1">⏳ Awaiting response</div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${f.status==='submitted'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
                      {f.status==='submitted'?'✅ Responded':'⏳ Pending'}
                    </span>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {f.submitted_at ? new Date(f.submitted_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : new Date(f.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
