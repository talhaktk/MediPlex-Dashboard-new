'use client';

import { useState, useRef } from 'react';
import {
  Search, X, Pill, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, Shield, Loader2,
  Info, RefreshCw, Activity, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BNF_DRUGS, BNF_INTERACTIONS, searchDrugs, checkInteractions,
  getDrugInfo, calcPaedDose, DrugInfo, Interaction
} from '@/lib/bnf';

interface Drug { rxcui: string; name: string; info?: DrugInfo; }

const SEV_CFG = {
  'Contraindicated': { bg:'#1a0000', border:'#dc2626', color:'#fca5a5', icon:'⛔', badge:'bg-red-900 text-red-200' },
  'Severe':          { bg:'#fff0f0', border:'#fca5a5', color:'#991b1b', icon:'🚨', badge:'bg-red-100 text-red-800' },
  'Moderate':        { bg:'#fff9e6', border:'#fde68a', color:'#92400e', icon:'⚠️', badge:'bg-amber-100 text-amber-800' },
  'Mild':            { bg:'#eff6ff', border:'#bfdbfe', color:'#1e40af', icon:'ℹ️', badge:'bg-blue-100 text-blue-800' },
} as const;

export default function ClinicalClient({ bnfApiKey }: { bnfApiKey: string }) {
  const [tab,         setTab]         = useState<'interact'|'dose'>('interact');

  // Interaction state
  const [iSearch,     setISearch]     = useState('');
  const [iSugg,       setISugg]       = useState<Drug[]>([]);
  const [drugs,       setDrugs]       = useState<Drug[]>([]);
  const [results,     setResults]     = useState<Interaction[]>([]);
  const [checked,     setChecked]     = useState(false);
  const [expanded,    setExpanded]    = useState<number|null>(null);

  // Dose state
  const [dSearch,     setDSearch]     = useState('');
  const [dSugg,       setDSugg]       = useState<DrugInfo[]>([]);
  const [selDrug,     setSelDrug]     = useState<DrugInfo|null>(null);
  const [isChild,     setIsChild]     = useState(true);
  const [weight,      setWeight]      = useState('');
  const [ageY,        setAgeY]        = useState('');
  const [ageM,        setAgeM]        = useState('');
  const [calcDose,    setCalcDose]    = useState('');
  const [loading,     setLoading]     = useState(false);

  const iRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const dRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Search drugs
  const onISearch = (v: string) => {
    setISearch(v);
    if (iRef.current) clearTimeout(iRef.current);
    iRef.current = setTimeout(() => {
      if (v.length < 2) { setISugg([]); return; }
      const r = searchDrugs(v);
      setISugg(r.map(d => ({ rxcui: d.rxcui, name: d.name, info: d })));
    }, 200);
  };

  const onDSearch = (v: string) => {
    setDSearch(v);
    if (dRef.current) clearTimeout(dRef.current);
    dRef.current = setTimeout(() => {
      if (v.length < 2) { setDSugg([]); return; }
      setDSugg(searchDrugs(v));
    }, 200);
  };

  const addDrug = (d: Drug) => {
    if (drugs.find(x => x.name === d.name)) { toast.error('Already added'); return; }
    if (drugs.length >= 8) { toast.error('Max 8 drugs'); return; }
    setDrugs(p => [...p, d]);
    setISearch(''); setISugg([]);
    setChecked(false); setResults([]);
  };

  const doCheck = () => {
    if (drugs.length < 2) { toast.error('Add at least 2 drugs'); return; }
    const names = drugs.map(d => d.name);
    const r = checkInteractions(names);
    setResults(r);
    setChecked(true);
    setExpanded(null);
    r.length === 0
      ? toast.success('No interactions found in BNF database')
      : toast.error(`${r.length} interaction(s) found`);
  };

  const selectDrug = (d: DrugInfo) => {
    setSelDrug(d);
    setDSearch(d.name);
    setDSugg([]);
    setCalcDose('');
  };

  const doCalc = () => {
    if (!selDrug) { toast.error('Select a drug first'); return; }
    if (!weight) { toast.error('Enter patient weight'); return; }
    const totalMonths = (parseFloat(ageY||'0') * 12) + parseFloat(ageM||'0');
    const dose = calcPaedDose(selDrug, parseFloat(weight), totalMonths);
    setCalcDose(dose);
  };

  const sevOrder = {'Contraindicated':0,'Severe':1,'Moderate':2,'Mild':3};

  return (
    <div className="space-y-5">

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7 w-fit">
        {([['interact','💊 Drug Interaction Checker'],['dose','🧮 Dose Calculator']] as const).map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${tab===k?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── INTERACTION CHECKER ─────────────────────────────────────────── */}
      {tab === 'interact' && (
        <div className="space-y-4">
          <div className="rounded-xl px-4 py-3 text-[12px]"
            style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.25)'}}>
            <span className="font-medium text-amber-800">📚 Data Source: </span>
            <span className="text-amber-700">BNF / BNFC (British National Formulary) — Comprehensive drug interaction database · {BNF_INTERACTIONS.length} interactions · {BNF_DRUGS.length} drugs</span>
          </div>

          <div className="card p-5">
            <div className="font-medium text-navy text-[14px] mb-4">Search & Add Drugs</div>
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={iSearch} onChange={e => onISearch(e.target.value)}
                placeholder="Type drug name — Warfarin, Aspirin, Metformin, Ibuprofen..."
                className="w-full border border-black/10 rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
              {iSugg.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-black/10 rounded-lg shadow-lg mt-1 overflow-hidden">
                  {iSugg.map(s => (
                    <button key={s.name} onClick={() => addDrug(s)}
                      className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-black/5 last:border-0">
                      <div className="font-medium text-navy text-[13px]">{s.name}</div>
                      <div className="text-[11px] text-gray-400">{s.info?.category}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {drugs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {drugs.map(d => (
                  <span key={d.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                    style={{background:'#dbeafe',color:'#1e40af',border:'1px solid #bfdbfe'}}>
                    <Pill size={11}/>{d.name}
                    <button onClick={() => {setDrugs(p=>p.filter(x=>x.name!==d.name));setChecked(false);setResults([]);}}
                      className="hover:text-red-500"><X size={11}/></button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={doCheck} disabled={drugs.length < 2}
                className="btn-gold gap-2 text-[13px] py-2.5 px-6">
                <Shield size={14}/>Check Interactions ({drugs.length} drugs)
              </button>
              {drugs.length > 0 && (
                <button onClick={() => {setDrugs([]);setChecked(false);setResults([]);setISearch('');}}
                  className="btn-outline text-[12px] py-2 px-3 gap-1">
                  <RefreshCw size={12}/>Clear
                </button>
              )}
            </div>
          </div>

          {checked && (
            <div className="space-y-3">
              <div className={`rounded-xl p-4 flex items-center gap-4 border ${results.length===0?'border-emerald-200 bg-emerald-50':'border-red-200 bg-red-50'}`}>
                {results.length === 0
                  ? <><CheckCircle size={24} className="text-emerald-600 flex-shrink-0"/>
                      <div>
                        <div className="font-semibold text-emerald-800">No interactions found</div>
                        <div className="text-[12px] text-emerald-600">BNF/BNFC database checked — no clinically significant interactions identified</div>
                      </div></>
                  : <><AlertTriangle size={24} className="text-red-600 flex-shrink-0"/>
                      <div>
                        <div className="font-semibold text-red-800">{results.length} Interaction(s) Found — BNF/BNFC</div>
                        <div className="text-[12px] text-red-600">
                          {results.filter(r=>r.severity==='Contraindicated').length>0 && `${results.filter(r=>r.severity==='Contraindicated').length} contraindicated · `}
                          {results.filter(r=>r.severity==='Severe').length>0 && `${results.filter(r=>r.severity==='Severe').length} severe · `}
                          {results.filter(r=>r.severity==='Moderate').length>0 && `${results.filter(r=>r.severity==='Moderate').length} moderate`}
                        </div>
                      </div></>}
              </div>

              {[...results].sort((a,b) => sevOrder[a.severity] - sevOrder[b.severity]).map((r,i) => {
                const c = SEV_CFG[r.severity];
                return (
                  <div key={i} className="rounded-xl overflow-hidden"
                    style={{background:c.bg,border:`1.5px solid ${c.border}`}}>
                    <button className="w-full text-left px-5 py-4 flex items-center gap-4"
                      onClick={() => setExpanded(expanded===i?null:i)}>
                      <span className="text-[22px] flex-shrink-0">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[15px]" style={{color:c.color}}>
                            {r.drugs[0].charAt(0).toUpperCase()+r.drugs[0].slice(1)}
                          </span>
                          <span style={{color:c.color}}>+</span>
                          <span className="font-bold text-[15px]" style={{color:c.color}}>
                            {r.drugs[1].charAt(0).toUpperCase()+r.drugs[1].slice(1)}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${c.badge}`}>
                            {r.severity}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 font-medium" style={{color:c.color}}>BNF</span>
                        </div>
                        <div className="text-[13px] font-medium" style={{color:c.color}}>{r.effect}</div>
                      </div>
                      {expanded===i?<ChevronUp size={16} style={{color:c.color}}/>:<ChevronDown size={16} style={{color:c.color}}/>}
                    </button>
                    {expanded === i && (
                      <div className="px-5 pb-5 pt-3 space-y-3 border-t" style={{borderColor:c.border}}>
                        <div>
                          <div className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{color:c.color}}>Mechanism</div>
                          <div className="text-[13px] leading-relaxed" style={{color:c.color}}>{r.mechanism}</div>
                        </div>
                        <div className="rounded-xl p-4" style={{background:'rgba(0,0,0,0.25)'}}>
                          <div className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{color:c.color}}>⚕️ Clinical Action Required</div>
                          <div className="text-[14px] font-semibold leading-relaxed" style={{color:c.color}}>{r.action}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5 pt-1">
                <Info size={11}/>
                British National Formulary (BNF/BNFC) · Always apply clinical judgement
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DOSE CALCULATOR ──────────────────────────────────────────────── */}
      {tab === 'dose' && (
        <div className="space-y-4">
          <div className="rounded-xl px-4 py-3 text-[12px]"
            style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.25)'}}>
            <span className="font-medium text-amber-800">📚 Data Source: </span>
            <span className="text-amber-700">BNFC (BNF for Children) paediatric dosing formulas · BNF adult dosing · {BNF_DRUGS.length} drugs in database</span>
          </div>

          <div className="card p-5">
            {/* Toggle */}
            <div className="flex gap-2 mb-5">
              {([['true','👶 Paediatric'],['false','🧑 Adult']] as const).map(([v,l]) => (
                <button key={v} onClick={() => {setIsChild(v==='true');setCalcDose('');}}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium border transition-all ${String(isChild)===v?'bg-navy text-white border-navy':'border-black/10 text-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Drug search */}
            <div className="mb-4 relative">
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">
                Search Drug — BNF Database ({BNF_DRUGS.length} drugs)
              </label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={dSearch} onChange={e => onDSearch(e.target.value)}
                  placeholder="Paracetamol, Ibuprofen, Amoxicillin, Prednisolone..."
                  className="w-full border border-black/10 rounded-lg pl-8 pr-3 py-2.5 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
              </div>
              {dSugg.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-black/10 rounded-lg shadow-lg mt-1 overflow-hidden">
                  {dSugg.map(d => (
                    <button key={d.name} onClick={() => selectDrug(d)}
                      className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-black/5 last:border-0">
                      <div className="font-medium text-navy text-[13px]">{d.name}</div>
                      <div className="text-[11px] text-gray-400">{d.category} · Forms: {d.forms.slice(0,2).join(', ')}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Paediatric fields */}
            {isChild && selDrug && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  {l:'Weight (kg) *',v:weight,s:setWeight},
                  {l:'Age (years)', v:ageY,  s:setAgeY  },
                  {l:'Age (months)',v:ageM,  s:setAgeM  },
                ].map((f,i) => (
                  <div key={i}>
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{f.l}</label>
                    <input type="number" placeholder="0" value={f.v} onChange={e => f.s(e.target.value)}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                  </div>
                ))}
              </div>
            )}

            {selDrug && isChild && weight && (
              <button onClick={doCalc} className="btn-gold gap-2 text-[13px] py-2.5 px-5">
                <Activity size={14}/>Calculate BNFC Paediatric Dose
              </button>
            )}
          </div>

          {/* Dose result card */}
          {selDrug && (
            <div className="space-y-4">
              {/* Calculated dose — prominent */}
              {calcDose && isChild && (
                <div className="rounded-xl p-6" style={{background:'linear-gradient(135deg,#0a1628,#142240)',border:'2px solid rgba(201,168,76,0.4)'}}>
                  <div className="text-[11px] uppercase tracking-widest text-gold/70 font-medium mb-2">BNFC Calculated Paediatric Dose</div>
                  <div className="text-[28px] font-bold text-gold leading-tight mb-1">{calcDose}</div>
                  <div className="text-[13px] text-white/60">{selDrug.paediatric.frequency}</div>
                  <div className="text-[12px] text-white/40 mt-1">Route: {selDrug.paediatric.route} · Based on {weight}kg body weight</div>
                  {selDrug.paediatric.warning && (
                    <div className="mt-3 rounded-lg p-3 flex items-start gap-2"
                      style={{background:'rgba(220,38,38,0.15)',border:'1px solid rgba(220,38,38,0.3)'}}>
                      <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5"/>
                      <div className="text-[12px] text-red-300">{selDrug.paediatric.warning}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Adult dose */}
              {!isChild && (
                <div className="rounded-xl p-6" style={{background:'linear-gradient(135deg,#0a1628,#142240)',border:'2px solid rgba(201,168,76,0.4)'}}>
                  <div className="text-[11px] uppercase tracking-widest text-gold/70 font-medium mb-2">BNF Adult Dose</div>
                  <div className="text-[26px] font-bold text-gold leading-tight mb-1">{selDrug.adult.standard}</div>
                  <div className="text-[13px] text-white/60">{selDrug.adult.frequency}</div>
                  <div className="text-[12px] text-white/40 mt-1">Route: {selDrug.adult.route}{selDrug.adult.max ? ` · Max: ${selDrug.adult.max}` : ''}</div>
                  {selDrug.adult.notes && (
                    <div className="mt-2 text-[12px] text-white/50">{selDrug.adult.notes}</div>
                  )}
                </div>
              )}

              {/* Drug info card */}
              <div className="card p-5 space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-black/5">
                  <div>
                    <div className="font-display font-semibold text-navy text-[18px]">{selDrug.name}</div>
                    <div className="text-[12px] text-gray-400">{selDrug.category}</div>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{background:'#dbeafe',color:'#1e40af'}}>BNF/BNFC</span>
                </div>

                {/* Available forms */}
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-2">Available Formulations</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selDrug.forms.map(f => (
                      <span key={f} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{f}</span>
                    ))}
                  </div>
                </div>

                {/* Paediatric doses by age */}
                {isChild && (
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-emerald-600 font-medium mb-2">BNFC Doses by Age Group</div>
                    <div className="space-y-1.5">
                      {[
                        {label:'Neonate',         val:selDrug.paediatric.neonatal},
                        {label:'1–11 months',      val:selDrug.paediatric.age1to11m},
                        {label:'1–4 years',        val:selDrug.paediatric.age1to4y},
                        {label:'5–11 years',       val:selDrug.paediatric.age5to11y},
                        {label:'12–17 years',      val:selDrug.paediatric.age12to17y},
                      ].filter(r => r.val).map(r => (
                        <div key={r.label} className="flex gap-3 text-[12px] p-2.5 rounded-lg bg-gray-50">
                          <span className="font-semibold text-navy w-28 flex-shrink-0">{r.label}</span>
                          <span className="text-gray-600">{r.val}</span>
                        </div>
                      ))}
                    </div>
                    {selDrug.paediatric.notes && (
                      <div className="mt-2 text-[12px] text-gray-500 italic">{selDrug.paediatric.notes}</div>
                    )}
                  </div>
                )}

                {/* Contraindications */}
                {selDrug.contraindications.length > 0 && (
                  <div className="rounded-xl p-4" style={{background:'#fff0f0',border:'1px solid #fecaca'}}>
                    <div className="text-[11px] uppercase tracking-widest text-red-600 font-bold mb-2">⛔ Contraindications</div>
                    <div className="space-y-1">
                      {selDrug.contraindications.map(c => (
                        <div key={c} className="text-[13px] text-red-800 flex items-start gap-2">
                          <span className="text-red-400 flex-shrink-0">•</span>{c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cautions */}
                {selDrug.cautions.length > 0 && (
                  <div className="rounded-xl p-4" style={{background:'#fff9e6',border:'1px solid #fde68a'}}>
                    <div className="text-[11px] uppercase tracking-widest text-amber-700 font-bold mb-2">⚠️ Cautions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selDrug.cautions.map(c => (
                        <span key={c} className="text-[12px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Side effects */}
                {selDrug.sideEffects.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-2">Common Side Effects</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selDrug.sideEffects.map(s => (
                        <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monitoring */}
                {selDrug.monitoring && (
                  <div className="rounded-xl p-4" style={{background:'#eff6ff',border:'1px solid #bfdbfe'}}>
                    <div className="text-[11px] uppercase tracking-widest text-blue-700 font-bold mb-1">Monitoring</div>
                    <div className="text-[13px] text-blue-800">{selDrug.monitoring}</div>
                  </div>
                )}

                {/* Dose adjustments */}
                {(selDrug.renalDose || selDrug.hepaticDose) && (
                  <div className="rounded-xl p-4" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.2)'}}>
                    <div className="text-[11px] uppercase tracking-widest text-amber-700 font-bold mb-2">Dose Adjustments</div>
                    {selDrug.renalDose   && <div className="text-[12px] text-gray-700 mb-1"><span className="font-semibold">Renal: </span>{selDrug.renalDose}</div>}
                    {selDrug.hepaticDose && <div className="text-[12px] text-gray-700"><span className="font-semibold">Hepatic: </span>{selDrug.hepaticDose}</div>}
                  </div>
                )}

                <div className="text-[10px] text-gray-400 pt-1 border-t border-black/5">
                  Source: British National Formulary (BNF) / BNF for Children (BNFC) · Always verify with current edition · Clinical judgement required
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
