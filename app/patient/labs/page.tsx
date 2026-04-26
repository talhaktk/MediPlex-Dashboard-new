'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { FlaskConical, FileText, ExternalLink, Calendar, Search } from 'lucide-react';

export default function PatientLabs() {
  const { data: session } = useSession();
  const mrNumber = (session?.user as any)?.mrNumber;

  const [labs,    setLabs]    = useState<any[]>([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mrNumber) return;
    supabase.from('lab_results').select('*').eq('mr_number', mrNumber)
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => { setLabs(data || []); setLoading(false); });
  }, [mrNumber]);

  const filtered = search
    ? labs.filter(l => l.test_name?.toLowerCase().includes(search.toLowerCase()) || l.notes?.toLowerCase().includes(search.toLowerCase()))
    : labs;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#0a1628]">Lab Results</h1>
          <p className="text-slate-500 text-sm">Your test reports and investigation results</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tests..."
            className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none border bg-white"
            style={{ borderColor:'#e2e8f0', color:'#0a1628' }} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl" style={{ border:'1px solid #e2e8f0' }}>
          <FlaskConical size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">{search ? 'No results found' : 'No lab results on file'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(l => {
            const files: string[] = l.file_urls || [];
            return (
              <div key={l.id} className="bg-white rounded-2xl p-5"
                style={{ border:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background:'rgba(245,158,11,0.12)' }}>
                    <FlaskConical size={18} style={{ color:'#f59e0b' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#0a1628] truncate">{l.test_name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      {(l.visit_date || l.uploaded_at) && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {(l.visit_date || l.uploaded_at?.slice(0,10))}
                        </span>
                      )}
                      {files.length > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <FileText size={10} /> {files.length} file{files.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {l.notes && (
                      <div className="mt-2 p-2.5 rounded-lg text-sm text-slate-700 leading-relaxed"
                        style={{ background:'#f8fafc', border:'1px solid #f1f5f9' }}>
                        {l.notes}
                      </div>
                    )}

                    {/* File links */}
                    {files.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {files.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', color:'#d97706' }}>
                            <ExternalLink size={11} />
                            {files.length > 1 ? `Report ${i+1}` : 'View Report'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
