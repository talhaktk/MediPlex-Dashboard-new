'use client';

import { useState, useRef } from 'react';
import { Search, X, Pill, Calculator, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Shield, Loader2, ExternalLink, Info, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Drug { rxcui: string; name: string; generic?: string; }
interface Interaction { drug1: string; drug2: string; severity: string; description: string; comment: string; source: string; }
interface FDALabel { brandName: string; genericName: string; manufacturer: string; dosageAdmin: string; warnings: string; contraindications: string; interactions: string; pediatricUse: string; geriatricUse: string; pregnancy: string; howSupplied: string; }

const SEV: Record<string,{bg:string;border:string;color:string;icon:string;label:string}> = {
  high:     {bg:'#fff0f0',border:'#fca5a5',color:'#991b1b',icon:'🚨',label:'High'},
  severe:   {bg:'#fff0f0',border:'#fca5a5',color:'#991b1b',icon:'🚨',label:'Severe'},
  moderate: {bg:'#fff9e6',border:'#fde68a',color:'#92400e',icon:'⚠️',label:'Moderate'},
  low:      {bg:'#eff6ff',border:'#bfdbfe',color:'#1e40af',icon:'ℹ️',label:'Low'},
  mild:     {bg:'#eff6ff',border:'#bfdbfe',color:'#1e40af',icon:'ℹ️',label:'Mild'},
  unknown:  {bg:'#f9f7f3',border:'#e5e7eb',color:'#6b7280',icon:'❓',label:'Unknown'},
};
const getSev = (s:string) => SEV[s?.toLowerCase()] ?? SEV.unknown;

const FORMULAS: Record<string,[number,number,string]> = {
  paracetamol:[15,1000,'Every 4–6 hrs'], acetaminophen:[15,1000,'Every 4–6 hrs'],
  ibuprofen:[10,400,'Every 6–8 hrs with food'], amoxicillin:[25,500,'Every 8 hrs'],
  azithromycin:[10,500,'Once daily x5 days'], metronidazole:[7.5,400,'Every 8 hrs'],
  prednisolone:[1,40,'Once daily (morning)'], cetirizine:[0.25,10,'Once daily'],
  salbutamol:[0.1,5,'Every 4–6 hrs'], omeprazole:[1,40,'Once daily before food'],
  clarithromycin:[7.5,500,'Every 12 hrs'], trimethoprim:[4,200,'Every 12 hrs'],
  cefuroxime:[15,500,'Every 12 hrs'], erythromycin:[12.5,500,'Every 6 hrs'],
};

export default function ClinicalClient({ bnfApiKey }: { bnfApiKey: string }) {
  const [tab,         setTab]         = useState<'interact'|'dose'>('interact');
  const [input,       setInput]       = useState('');
  const [drugs,       setDrugs]       = useState<Drug[]>([]);
  const [suggestions, setSuggestions] = useState<Drug[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [checking,    setChecking]    = useState(false);
  const [results,     setResults]     = useState<Interaction[]>([]);
  const [checked,     setChecked]     = useState(false);
  const [expanded,    setExpanded]    = useState<number|null>(null);
  const [doseInput,   setDoseInput]   = useState('');
  const [doseSugg,    setDoseSugg]    = useState<Drug[]>([]);
  const [doseLoading, setDoseLoading] = useState(false);
  const [fdaLabel,    setFdaLabel]    = useState<FDALabel|null>(null);
  const [selDrug,     setSelDrug]     = useState('');
  const [weight,      setWeight]      = useState('');
  const [ageY,        setAgeY]        = useState('');
  const [ageM,        setAgeM]        = useState('');
  const [isChild,     setIsChild]     = useState(true);
  const [doseResult,  setDoseResult]  = useState('');
  const iRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const dRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const nlmSearch = async (q:string, forDose=false) => {
    if (q.length < 2) { forDose ? setDoseSugg([]) : setSuggestions([]); return; }
    if (!forDose) setSearching(true);
    try {
      const r = await fetch(`/api/clinical?action=lookup&name=${encodeURIComponent(q)}`);
      const d = await r.json();
      forDose ? setDoseSugg(d.results||[]) : setSuggestions(d.results||[]);
    } catch { forDose ? setDoseSugg([]) : setSuggestions([]); }
    finally { if (!forDose) setSearching(false); }
  };

  const addDrug = (d:Drug) => {
    if (drugs.find(x=>x.rxcui===d.rxcui)) { toast.error('Already added'); return; }
    if (drugs.length >= 8) { toast.error('Max 8 drugs'); return; }
    setDrugs(p=>[...p,d]); setInput(''); setSuggestions([]); setChecked(false); setResults([]);
  };

  const checkInteractions = async () => {
    if (drugs.length < 2) { toast.error('Add at least 2 drugs'); return; }
    setChecking(true); setChecked(false);
    try {
      const r = await fetch(`/api/clinical?action=interact&rxcuis=${drugs.map(d=>d.rxcui).join(',')}&drugnames=${drugs.map(d=>encodeURIComponent(d.name)).join(',')}`);
      const d = await r.json();
      setResults(d.interactions||[]);
      (d.interactions||[]).length===0 ? toast.success('No interactions found — NLM database') : toast.error(`${d.interactions.length} interaction(s) found`);
    } catch { setResults([]); toast.error('NLM API error — check internet connection'); }
    setChecked(true); setChecking(false);
  };

  const fetchFDA = async (name:string, generic?:string) => {
    setDoseLoading(true); setFdaLabel(null); setDoseResult('');
    try {
      const r = await fetch(`/api/clinical?action=openfda&name=${encodeURIComponent(name)}&generic=${encodeURIComponent(generic||name)}`);
      const d = await r.json();
      if (d.found) { setFdaLabel(d.result); toast.success('FDA label loaded'); }
      else toast.error('Not found in FDA — try generic name (e.g. "paracetamol" not "Panadol")');
    } catch { toast.error('FDA API error'); }
    setDoseLoading(false);
  };

  const selectDrug = (d:Drug) => {
    const isCombo = d.name.toLowerCase().includes(' and ') || d.name.toLowerCase().includes('hydrochloride') || d.name.toLowerCase().includes('sulfate') || d.name.toLowerCase().includes('hcl');
    const useName = isCombo ? doseInput : d.name;
    setSelDrug(useName); setDoseInput(useName); setDoseSugg([]); setDoseResult(''); setFdaLabel(null); fetchFDA(useName);
  };

  const calcDose = () => {
    if (!weight) { toast.error('Enter weight'); return; }
    const w = parseFloat(weight);
    const name = (fdaLabel?.genericName||selDrug).toLowerCase();
    const match = Object.entries(FORMULAS).find(([k])=>name.includes(k));
    if (match) {
      const [mgkg,max,freq] = match[1];
      setDoseResult(`${Math.round(w*mgkg*10)/10}mg per dose (max ${max}mg) · ${freq}`);
    } else {
      setDoseResult('Formula not available — see FDA Paediatric Use section below');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7 w-fit">
        {([['interact','💊 Drug Interaction Checker'],['dose','🧮 Dose Calculator']] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${tab===k?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>{l}</button>
        ))}
      </div>

      {tab==='interact' && (
        <div className="space-y-4">
          <div className="rounded-xl px-4 py-3 text-[12px]" style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.25)'}}>
            <span className="font-medium text-amber-800">🏥 Live: </span>
            <span className="text-amber-700">NLM RxNorm 100,000+ drugs · NLM RxNav Interactions · Free, no API key</span>
          </div>

          <div className="card p-5">
            <div className="font-medium text-navy text-[14px] mb-4">Search & Add Drugs</div>
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gold animate-spin"/>}
              <input value={input} onChange={e=>{setInput(e.target.value);if(iRef.current)clearTimeout(iRef.current);iRef.current=setTimeout(()=>nlmSearch(e.target.value),350);}}
                placeholder="Type any drug — Warfarin, Metformin, Atorvastatin, Ciprofloxacin..."
                className="w-full border border-black/10 rounded-lg pl-9 pr-8 py-2.5 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
              {suggestions.length>0&&(
                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-black/10 rounded-lg shadow-lg mt-1 overflow-hidden max-h-72 overflow-y-auto">
                  {suggestions.map(s=>(
                    <button key={s.rxcui} onClick={()=>addDrug(s)} className="w-full text-left px-4 py-3 text-[13px] hover:bg-amber-50 border-b border-black/5 last:border-0 flex items-center justify-between">
                      <span className="font-medium text-navy">{s.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">RxCUI {s.rxcui}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {drugs.length>0&&(
              <div className="flex flex-wrap gap-2 mb-4">
                {drugs.map(d=>(
                  <span key={d.rxcui} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{background:'#dbeafe',color:'#1e40af',border:'1px solid #bfdbfe'}}>
                    <Pill size={11}/>{d.name}<span className="text-[9px] opacity-50">#{d.rxcui}</span>
                    <button onClick={()=>{setDrugs(p=>p.filter(x=>x.rxcui!==d.rxcui));setChecked(false);setResults([]);}} className="hover:text-red-500"><X size={11}/></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={checkInteractions} disabled={drugs.length<2||checking} className="btn-gold gap-2 text-[13px] py-2.5 px-6">
                {checking?<><Loader2 size={14} className="animate-spin"/>Checking NLM...</>:<><Shield size={14}/>Check Interactions ({drugs.length} drugs)</>}
              </button>
              {drugs.length>0&&<button onClick={()=>{setDrugs([]);setChecked(false);setResults([]);setInput('');}} className="btn-outline text-[12px] py-2 px-3 gap-1"><RefreshCw size={12}/>Clear</button>}
            </div>
          </div>

          {checked&&(
            <div className="space-y-3">
              <div className={`rounded-xl p-4 flex items-center gap-4 border ${results.length===0?'border-emerald-200 bg-emerald-50':'border-red-200 bg-red-50'}`}>
                {results.length===0
                  ?<><CheckCircle size={24} className="text-emerald-600 flex-shrink-0"/><div><div className="font-semibold text-emerald-800">No interactions found</div><div className="text-[12px] text-emerald-600">NLM RxNav database checked successfully</div></div></>
                  :<><AlertTriangle size={24} className="text-red-600 flex-shrink-0"/><div><div className="font-semibold text-red-800">{results.length} Interaction(s) Found — NLM RxNav</div><div className="text-[12px] text-red-600">{results.filter(r=>['high','severe'].includes(r.severity?.toLowerCase())).length} severe · {results.filter(r=>r.severity?.toLowerCase()==='moderate').length} moderate</div></div></>}
              </div>
              {[...results].sort((a,b)=>{const o:Record<string,number>={high:0,severe:0,moderate:1,low:2,mild:2,unknown:3};return(o[a.severity?.toLowerCase()]??3)-(o[b.severity?.toLowerCase()]??3);}).map((r,i)=>{
                const c=getSev(r.severity);
                return(
                  <div key={i} className="rounded-xl overflow-hidden" style={{background:c.bg,border:`1px solid ${c.border}`}}>
                    <button className="w-full text-left px-5 py-4 flex items-center gap-4" onClick={()=>setExpanded(expanded===i?null:i)}>
                      <span className="text-[20px] flex-shrink-0">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-semibold text-[14px]" style={{color:c.color}}>{r.drug1}</span>
                          <span style={{color:c.color}}>+</span>
                          <span className="font-semibold text-[14px]" style={{color:c.color}}>{r.drug2}</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(255,255,255,0.7)',color:c.color}}>{c.label}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'rgba(255,255,255,0.5)',color:c.color}}>{r.source}</span>
                        </div>
                        <div className="text-[12px] truncate" style={{color:c.color}}>{r.description}</div>
                      </div>
                      {expanded===i?<ChevronUp size={16} style={{color:c.color}}/>:<ChevronDown size={16} style={{color:c.color}}/>}
                    </button>
                    {expanded===i&&(
                      <div className="px-5 pb-4 pt-3 space-y-3 border-t" style={{borderColor:c.border}}>
                        {r.description&&<div><div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{color:c.color}}>Effect</div><div className="text-[13px]" style={{color:c.color}}>{r.description}</div></div>}
                        {r.comment&&<div className="rounded-lg p-3" style={{background:'rgba(255,255,255,0.65)'}}><div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{color:c.color}}>Clinical Note</div><div className="text-[13px] font-medium" style={{color:c.color}}>{r.comment}</div></div>}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5">
                <Info size={11}/>NLM RxNav Interaction API · Always apply clinical judgement
                <a href="https://rxnav.nlm.nih.gov" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline flex items-center gap-0.5">RxNav<ExternalLink size={9}/></a>
              </div>
            </div>
          )}
        </div>
      )}

      {tab==='dose'&&(
        <div className="space-y-4">
          <div className="rounded-xl px-4 py-3 text-[12px]" style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.25)'}}>
            <span className="font-medium text-amber-800">🏥 Live: </span>
            <span className="text-amber-700">OpenFDA drug labels · NLM RxNorm · Full dosing, warnings, paediatric info for any drug</span>
          </div>
          <div className="card p-5">
            <div className="flex gap-2 mb-5">
              {([['true','👶 Paediatric'],['false','🧑 Adult']] as const).map(([v,l])=>(
                <button key={v} onClick={()=>{setIsChild(v==='true');setDoseResult('');}} className={`px-4 py-2 rounded-lg text-[13px] font-medium border transition-all ${String(isChild)===v?'bg-navy text-white border-navy':'border-black/10 text-gray-500'}`}>{l}</button>
              ))}
            </div>
            <div className="mb-4 relative">
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Search Any Drug — NLM RxNorm (100,000+ drugs)</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                {doseLoading&&<Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gold animate-spin"/>}
                <input value={doseInput} onChange={e=>{setDoseInput(e.target.value);setSelDrug('');setFdaLabel(null);setDoseResult('');if(dRef.current)clearTimeout(dRef.current);dRef.current=setTimeout(()=>nlmSearch(e.target.value,true),350);}}
                  placeholder="Any drug — Metformin, Atorvastatin, Ciprofloxacin, Amoxicillin..."
                  className="w-full border border-black/10 rounded-lg pl-8 pr-8 py-2.5 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
              </div>
              {doseSugg.length>0&&(
                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-black/10 rounded-lg shadow-lg mt-1 overflow-hidden max-h-72 overflow-y-auto">
                  {doseSugg.map(d=>(
                    <button key={d.rxcui} onClick={()=>selectDrug(d)} className="w-full text-left px-4 py-3 text-[13px] hover:bg-amber-50 border-b border-black/5 last:border-0 flex items-center justify-between">
                      <span className="font-medium text-navy">{d.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">RxCUI {d.rxcui}</span>
                    </button>
                  ))}
                </div>
              )}
              {selDrug&&!doseLoading&&<div className="mt-2 px-3 py-2 rounded-lg text-[12px]" style={{background:'#dcfce7',border:'1px solid #86efac'}}>✓ <span className="font-medium text-emerald-800">{selDrug}</span>{fdaLabel?.genericName&&<span className="text-emerald-600 ml-1">· {fdaLabel.genericName}</span>}</div>}
            </div>
            {isChild&&selDrug&&(
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[{l:'Weight (kg) *',v:weight,s:setWeight},{l:'Age (years)',v:ageY,s:setAgeY},{l:'Age (months)',v:ageM,s:setAgeM}].map((f,i)=>(
                  <div key={i}><label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{f.l}</label>
                  <input type="number" placeholder="0" value={f.v} onChange={e=>f.s(e.target.value)} className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/></div>
                ))}
              </div>
            )}
            {isChild&&selDrug&&weight&&<button onClick={calcDose} className="btn-gold gap-2 text-[13px] py-2.5 px-5"><Calculator size={14}/>Calculate Paediatric Dose</button>}
            {doseResult&&<div className="rounded-xl p-4 mt-3" style={{background:'#f9f7f3',border:'2px solid rgba(201,168,76,0.35)'}}><div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Calculated Dose</div><div className="text-[18px] font-bold text-gold">{doseResult}</div><div className="text-[11px] text-gray-400 mt-1">Based on {weight}kg · Verify with FDA info below</div></div>}
          </div>

          {doseLoading&&<div className="card p-10 flex items-center justify-center gap-3 text-gray-400"><Loader2 size={22} className="animate-spin text-gold"/><div><div className="text-[13px] font-medium text-navy">Fetching FDA drug label...</div><div className="text-[11px]">Connecting to OpenFDA</div></div></div>}

          {fdaLabel&&!doseLoading&&(
            <div className="card p-5 animate-in space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/5">
                <div>
                  <div className="font-display font-semibold text-navy text-[18px]">{fdaLabel.brandName||selDrug}</div>
                  {fdaLabel.genericName&&<div className="text-[12px] text-gray-500">Generic: {fdaLabel.genericName}</div>}
                  {fdaLabel.manufacturer&&<div className="text-[11px] text-gray-400">{fdaLabel.manufacturer}</div>}
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{background:'#dbeafe',color:'#1e40af'}}>Live · OpenFDA</span>
              </div>
              {[
                {label:'📋 Dosage & Administration',val:fdaLabel.dosageAdmin,      bg:'#f9f7f3',border:'rgba(201,168,76,0.2)',tc:'#0a1628'},
                {label:'👶 Paediatric Use',          val:fdaLabel.pediatricUse,     bg:'#f0fdf4',border:'#bbf7d0',             tc:'#166534'},
                {label:'💊 Drug Interactions',       val:fdaLabel.interactions,     bg:'#fff9e6',border:'#fde68a',             tc:'#92400e'},
                {label:'🚫 Contraindications',       val:fdaLabel.contraindications,bg:'#fff0f0',border:'#fecaca',             tc:'#991b1b'},
                {label:'⚠️ Warnings',                val:fdaLabel.warnings,         bg:'#fff0f0',border:'#fca5a5',             tc:'#991b1b'},
                {label:'👴 Geriatric Use',            val:fdaLabel.geriatricUse,     bg:'#eff6ff',border:'#bfdbfe',             tc:'#1e40af'},
                {label:'🤰 Pregnancy',               val:fdaLabel.pregnancy,        bg:'#fdf4ff',border:'#e9d5ff',             tc:'#7e22ce'},
                {label:'📦 How Supplied',            val:fdaLabel.howSupplied,      bg:'#f9f7f3',border:'#e5e7eb',             tc:'#374151'},
              ].filter(f=>f.val).map(f=>(
                <div key={f.label}>
                  <div className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{color:f.tc}}>{f.label}</div>
                  <div className="text-[13px] rounded-xl p-4 leading-relaxed" style={{background:f.bg,border:`1px solid ${f.border}`,color:f.tc}}>{f.val}</div>
                </div>
              ))}
              <div className="pt-2 border-t border-black/5 text-[10px] text-gray-400">Source: U.S. Food & Drug Administration · OpenFDA · Data is informational — verify with current prescribing information</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
