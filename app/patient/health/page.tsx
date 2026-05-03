'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { Heart, AlertTriangle, Activity, Shield, Syringe } from 'lucide-react';

export default function PatientHealthRecord() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const mrNumber = user?.mrNumber;
  const [patient, setPatient] = useState<any>(null);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mrNumber) return;
    Promise.all([
      supabase.from('patients').select('*').eq('mr_number', mrNumber).maybeSingle(),
      supabase.from('vaccinations').select('*').eq('mr_number', mrNumber).order('date_given', {ascending:false}),
    ]).then(([p, v]) => {
      setPatient(p.data);
      setVaccinations(v.data || []);
      setLoading(false);
    });
  }, [mrNumber]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5 p-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Health Record</h1>
        <p className="text-slate-500 text-sm mt-1">Your personal health information</p>
      </div>

      {/* Vital Health Info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Heart size={16} className="text-red-500"/> Critical Health Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4" style={{background:'#fef2f2',border:'1px solid #fecaca'}}>
            <div className="text-xs text-red-400 uppercase tracking-widest mb-1">Blood Group</div>
            <div className="text-3xl font-bold text-red-600">{patient?.blood_group || '—'}</div>
          </div>
          <div className="rounded-xl p-4" style={{background:'#fff7ed',border:'1px solid #fed7aa'}}>
            <div className="text-xs text-orange-400 uppercase tracking-widest mb-1">⚠ Allergies</div>
            <div className="text-sm font-semibold text-orange-700">{patient?.allergies || 'None recorded'}</div>
          </div>
          <div className="rounded-xl p-4 col-span-2" style={{background:'#f0fdf4',border:'1px solid #bbf7d0'}}>
            <div className="text-xs text-emerald-400 uppercase tracking-widest mb-1">Chronic Conditions</div>
            <div className="text-sm font-semibold text-emerald-700">{patient?.conditions || 'None recorded'}</div>
          </div>
        </div>
      </div>

      {/* Patient Details */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Shield size={16} className="text-blue-500"/> Patient Details</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['MR Number', patient?.mr_number],
            ['Date of Birth', patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : '—'],
            ['Gender', patient?.gender || '—'],
            ['Phone', patient?.whatsapp_number || patient?.phone || '—'],
            ['Email', patient?.email || '—'],
            ['Address', patient?.address || '—'],
          ].map(([label, val]) => (
            <div key={label}>
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-0.5">{label}</div>
              <div className="text-sm font-medium text-slate-700">{val || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Vaccination Record */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Syringe size={16} className="text-purple-500"/> Vaccination Record</h2>
        {vaccinations.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Syringe size={32} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">No vaccination records on file</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vaccinations.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{background:'#f8fafc',border:'1px solid #e2e8f0'}}>
                <div>
                  <div className="font-medium text-slate-800 text-sm">{v.vaccine_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{v.dose_number ? `Dose ${v.dose_number}` : ''} {v.batch_number ? `· Batch: ${v.batch_number}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-600">{v.date_given ? new Date(v.date_given).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}</div>
                  {v.next_due && <div className="text-xs text-blue-500">Next: {new Date(v.next_due).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
