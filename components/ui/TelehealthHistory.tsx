'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Video, ChevronDown, ChevronUp } from 'lucide-react';

export default function TelehealthHistory({ mrNumber, childName }: { mrNumber?: string; childName: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string|null>(null);

  useEffect(() => {
    const q = mrNumber
      ? supabase.from('telehealth_sessions').select('*').eq('mr_number', mrNumber)
      : supabase.from('telehealth_sessions').select('*').ilike('child_name', childName);
    q.order('created_at', { ascending: false }).then(({ data }) => {
      setSessions(data || []);
      setLoading(false);
    });
  }, [mrNumber, childName]);

  if (loading) return <div className="text-center py-8 text-gray-400 text-[13px]">Loading...</div>;
  if (sessions.length === 0) return <div className="text-center py-8 text-gray-400 text-[13px]">No telehealth sessions yet</div>;

  return (
    <div className="space-y-3">
      <div className="text-[13px] font-medium text-navy mb-3">Telehealth Sessions</div>
      {sessions.map(s => {
        const v = s.vitals || {};
        const isExpanded = expanded === s.id?.toString();
        return (
          <div key={s.id} className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(59,130,246,0.2)'}}>
            <button className="w-full text-left px-4 py-3 flex items-center justify-between" style={{background:'rgba(59,130,246,0.06)'}}
              onClick={() => setExpanded(isExpanded ? null : s.id?.toString())}>
              <div className="flex items-center gap-3">
                <Video size={14} style={{color:'#3b82f6'}}/>
                <div>
                  <div className="text-[13px] font-medium text-navy">
                    {new Date(s.created_at).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'})}
                    {' · '}{s.platform || 'Jitsi'}
                  </div>
                  <div className="text-[11px] text-gray-400">{s.chief_complaint || 'No complaint recorded'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{background:s.status==='submitted'?'#dcfce7':'#f3f4f6',color:s.status==='submitted'?'#166534':'#6b7280'}}>
                  {s.status==='submitted'?'✅ Submitted':'Pending'}
                </span>
                {isExpanded ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
              </div>
            </button>
            {isExpanded && (
              <div className="px-4 py-3 space-y-2 border-t border-black/5">
                {s.symptoms && <div className="text-[12px]"><span className="text-gray-400">Symptoms: </span><span className="text-navy">{s.symptoms} {s.duration&&`(${s.duration})`}</span></div>}
                {s.allergies && <div className="text-[12px]"><span className="text-gray-400">Allergies: </span><span className="text-orange-600">{s.allergies}</span></div>}
                {s.conditions && <div className="text-[12px]"><span className="text-gray-400">Conditions: </span><span className="text-navy">{s.conditions}</span></div>}
                {s.blood_group && <div className="text-[12px]"><span className="text-gray-400">Blood Group: </span><span className="text-red-600 font-bold">{s.blood_group}</span></div>}
                {s.current_meds && <div className="text-[12px]"><span className="text-gray-400">Medications: </span><span className="text-navy">{s.current_meds}</span></div>}
                {(v.weight||v.bp||v.pulse||v.temperature) && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {v.weight&&<span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>⚖ {v.weight}kg</span>}
                    {v.height&&<span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>📏 {v.height}cm</span>}
                    {v.bp&&<span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>BP {v.bp}</span>}
                    {v.pulse&&<span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>💓 {v.pulse}bpm</span>}
                    {v.temperature&&<span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>🌡 {v.temperature}°C</span>}
                    {v.o2_sat&&<span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#e8f7f2',color:'#1a7f5e'}}>O2 {v.o2_sat}%</span>}
                  </div>
                )}
                {s.notes && <div className="text-[11px] text-gray-500 italic mt-1">{s.notes}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
