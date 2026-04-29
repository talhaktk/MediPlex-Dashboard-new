'use client';
import { t, Lang } from '@/lib/translations';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { Pill, Download, AlertTriangle, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

export default function PatientPrescriptions() {
  const { data: session } = useSession();
  const mrNumber = (session?.user as any)?.mrNumber;

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lang, setLang] = useState<Lang>('en');
  useEffect(()=>{ const s=localStorage.getItem('patient_lang'); if(s==='ur') setLang('ur'); },[]);

  useEffect(() => {
    if (!mrNumber) return;
    supabase.from('prescriptions').select('*').eq('mr_number', mrNumber)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setPrescriptions(data || []); setLoading(false); });
  }, [mrNumber]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#0a1628]">Prescription History</h1>
        <p className="text-slate-500 text-sm">All medications prescribed by your doctor</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl" style={{ border:'1px solid #e2e8f0' }}>
          <Pill size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No prescriptions on file</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map(rx => {
            const isOpen = expanded.has(rx.id);
            const meds: any[] = rx.medicines || [];
            return (
              <div key={rx.id} className="bg-white rounded-2xl overflow-hidden"
                style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                {/* Header */}
                <button className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => toggleExpand(rx.id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(16,185,129,0.1)' }}>
                      <Pill size={18} style={{ color:'#10b981' }} />
                    </div>
                    <div>
                      <div className="font-semibold text-[#0a1628]">{rx.diagnosis || 'Prescription'}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {rx.date ? new Date(rx.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : 'N/A'}
                        </span>
                        <span>{meds.length} medicine{meds.length !== 1 ? 's' : ''}</span>
                        {rx.doctor_name && <span>Dr. {rx.doctor_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rx.chief_complaint && (
                      <span className="hidden sm:block text-xs px-2.5 py-1 rounded-full"
                        style={{ background:'rgba(59,130,246,0.08)', color:'#3b82f6' }}>
                        {rx.chief_complaint.slice(0,30)}{rx.chief_complaint.length > 30 ? '…' : ''}
                      </span>
                    )}
                    {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t px-5 pb-5" style={{ borderColor:'#f1f5f9' }}>

                    {/* Allergy warning */}
                    {rx.allergies && (
                      <div className="flex items-center gap-2 p-3 rounded-xl my-3 text-sm"
                        style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)', color:'#dc2626' }}>
                        <AlertTriangle size={14} className="flex-shrink-0" />
                        Allergy on record: {rx.allergies}
                      </div>
                    )}

                    {/* Medicines table */}
                    {meds.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr style={{ borderBottom:'2px solid #f1f5f9' }}>
                              {['Medicine','Dose','Route','Frequency','Duration','Instructions'].map(h => (
                                <th key={h} className="text-left pb-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {meds.map((m, i) => (
                              <tr key={i} className="border-b" style={{ borderColor:'#f8fafc' }}>
                                <td className="py-2 pr-4 font-semibold text-[#0a1628]">{m.name}</td>
                                <td className="py-2 pr-4 text-slate-600">{m.dose || '—'}</td>
                                <td className="py-2 pr-4 text-slate-600">{m.route || '—'}</td>
                                <td className="py-2 pr-4 text-slate-600" dir={lang==='ur'?'rtl':'ltr'}>{m.frequency ? t(m.frequency, lang) : '—'}</td>
                                <td className="py-2 pr-4 text-slate-600">{m.duration || '—'}</td>
                                <td className="py-2 text-slate-500 text-xs" dir={lang==='ur'?'rtl':'ltr'}>{m.instructions ? t(m.instructions, lang) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Advice & Follow-up */}
                    {(rx.advice || rx.follow_up) && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {rx.advice && (
                          <div className="p-3 rounded-xl text-sm" style={{ background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                            <div className="font-semibold text-emerald-800 text-xs mb-1 uppercase tracking-wide">{t('Advice', lang)}</div>
                            <div className="text-emerald-700">{rx.advice}</div>
                          </div>
                        )}
                        {rx.follow_up && (
                          <div className="p-3 rounded-xl text-sm" style={{ background:'#eff6ff', border:'1px solid #bfdbfe' }}>
                            <div className="font-semibold text-blue-800 text-xs mb-1 uppercase tracking-wide">{t('Follow-up', lang)}</div>
                            <div className="text-blue-700">{rx.follow_up}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Signs/Symptoms */}
                    {rx.signs_symptoms && (
                      <div className="mt-3 p-3 rounded-xl text-sm" style={{ background:'#fafafa', border:'1px solid #e2e8f0' }}>
                        <div className="font-semibold text-slate-600 text-xs mb-1 uppercase tracking-wide">Signs & Symptoms</div>
                        <div className="text-slate-600">{rx.signs_symptoms}</div>
                      </div>
                    )}

                    {/* Download button */}
                    {rx.id && (
                      <div className="mt-4 flex justify-end">
                        <a href={`/rx/${rx.id}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                          style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#10b981' }}>
                          <Download size={13} /> {t('View Full Prescription', lang)}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
