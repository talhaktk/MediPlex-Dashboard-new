'use client';

import { useState, useRef } from 'react';
import {
  AlertTriangle, Search, Plus, X, Pill,
  Calculator, CheckCircle, Info, ChevronDown,
  ChevronUp, Shield, Loader2, ExternalLink, RefreshCw
} from 'lucide-react';
import { DRUG_DB, checkInteractions, calculateDose } from '@/lib/drugs';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RxSuggestion { rxcui: string; name: string; }

interface LiveInteraction {
  drug1: string; drug2: string;
  severity: string; description: string;
  comment: string; source: string;
}

interface FDALabel {
  brandName: string; genericName: string; manufacturer: string;
  dosageAdmin: string; warnings: string; contraindications: string;
  interactions: string; pediatricUse: string;
}

const SEVERITY_CFG: Record<string, { bg:string; border:string; color:string; icon:string; label:string }> = {
  'high':    { bg:'#fff0f0', border:'#fca5a5', color:'#991b1b', icon:'🚨', label:'High' },
  'severe':  { bg:'#fff0f0', border:'#fca5a5', color:'#991b1b', icon:'🚨', label:'Severe' },
  'moderate':{ bg:'#fff9e6', border:'#fde68a', color:'#92400e', icon:'⚠️', label:'Moderate' },
  'low':     { bg:'#eff6ff', border:'#bfdbfe', color:'#1e40af', icon:'ℹ️', label:'Low' },
  'mild':    { bg:'#eff6ff', border:'#bfdbfe', color:'#1e40af', icon:'ℹ️', label:'Mild' },
  'unknown': { bg:'#f9f7f3', border:'#e5e7eb', color:'#6b7280', icon:'❓', label:'Unknown' },
};

function getSeverityCfg(s: string) {
  return SEVERITY_CFG[s?.toLowerCase()] || SEVERITY_CFG.unknown;
}

export default function ClinicalClient({ bnfApiKey }: { bnfApiKey: string }) {
  const [activeTab, setActiveTab] = useState<'interactions'|'dosecalc'>('interactions');

  // ── Interaction state ──────────────────────────────────────────────────────
  const [drugInput,      setDrugInput]      = useState('');
  const [drugList,       setDrugList]       = useState<{ name:string; rxcui:string }[]>([]);
  const [suggestions,    setSuggestions]    = useState<RxSuggestion[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingCheck,   setLoadingCheck]   = useState(false);
  const [liveResults,    setLiveResults]    = useState<LiveInteraction[]>([]);
  const [localResults,   setLocalResults]   = useState<ReturnType<typeof checkInteractions>>([]);
  const [checked,        setChecked]        = useState(false);
  const [expanded,       setExpanded]       = useState<number|null>(null);
  const [apiStatus,      setApiStatus]      = useState<'idle'|'live'|'fallback'>('idle');
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dose Calc state ────────────────────────────────────────────────────────
  const [doseSearch,     setDoseSearch]     = useState('');
  const [doseSuggestions,setDoseSuggestions]= useState<RxSuggestion[]>([]);
  const [selectedDrug,   setSelectedDrug]   = useState<typeof DRUG_DB[0] | null>(null);
  const [fdaLabel,       setFdaLabel]       = useState<FDALabel|null>(null);
  const [weightKg,       setWeightKg]       = useState('');
  const [ageYears,       setAgeYears]       = useState('');
  const [ageMonths,      setAgeMonths]      = useState('');
  const [isChild,        setIsChild]        = useState(true);
  const [doseResult,     setDoseResult]     = useState<ReturnType<typeof calculateDose>>(null);
  const [loadingFDA,     setLoadingFDA]     = useState(false);
  const [showDrugBrowser,setShowDrugBrowser]= useState(false);

  // ── Drug name search (NLM RxNav) ───────────────────────────────────────────
  const searchDrugs = async (val: string, forDose = false) => {
    if (val.length < 2) { setSuggestions([]); setDoseSuggestions([]); return; }
    setLoadingSuggest(true);
    try {
      const res  = await fetch(`/api/clinical?action=lookup&name=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (forDose) setDoseSuggestions(data.results || []);
      else setSuggestions(data.results || []);
    } catch {
      // fallback to local
      const q = val.toLowerCase();
      const local = DRUG_DB
        .filter(d => d.name.toLowerCase().includes(q) || d.generic.toLowerCase().includes(q))
        .map(d => ({ rxcui:'local', name:d.name })).slice(0,6);
      if (forDose) setDoseSuggestions(local);
      else setSuggestions(local);
    } finally {
      setLoadingSuggest(false);
    }
  };

  const handleInteractInput = (val: string) => {
    setDrugInput(val);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => searchDrugs(val, false), 400);
  };

  const addDrug = (name: string, rxcui: string) => {
    if (drugList.find(d => d.name === name)) { toast.error('Already added'); return; }
    if (drugList.length >= 8) { toast.error('Max 8 drugs'); return; }
    setDrugList(prev => [...prev, { name, rxcui }]);
    setDrugInput(''); setSuggestions([]);
    setChecked(false); setLiveResults([]); setLocalResults([]);
  };

  // ── Run interaction check ─────────────────────────────────────────────────
  const runCheck = async () => {
    if (drugList.length < 2) { toast.error('Add at least 2 drugs'); return; }
    setLoadingCheck(true); setChecked(false);

    // Always run local check
    const localInter = checkInteractions(drugList.map(d => d.name));
    setLocalResults(localInter);

    // Try NLM live check with real RxCUIs
    const liveCuis = drugList.filter(d => d.rxcui !== 'local').map(d => d.rxcui);
    if (liveCuis.length >= 2) {
      try {
        const res  = await fetch(`/api/clinical?action=interact&rxcuis=${liveCuis.join(',')}`);
        const data = await res.json();
        if (data.interactions && !data.error) {
          setLiveResults(data.interactions);
          setApiStatus('live');
          toast.success(`NLM check complete — ${data.total} interaction(s) found`);
        } else {
          setApiStatus('fallback');
        }
      } catch {
        setApiStatus('fallback');
      }
    } else {
      setApiStatus('fallback');
      if (localInter.length === 0) toast.success('No interactions in local database');
      else toast.error(`${localInter.length} interaction(s) found`);
    }

    setChecked(true); setExpanded(null); setLoadingCheck(false);
  };

  // ── OpenFDA label fetch ────────────────────────────────────────────────────
  const fetchFDALabel = async (name: string) => {
    setLoadingFDA(true); setFdaLabel(null);
    try {
      const res  = await fetch(`/api/clinical?action=openfda&name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.found && data.result) setFdaLabel(data.result);
    } catch { /* ignore */ }
    setLoadingFDA(false);
  };

  const selectDoseDrug = async (name: string) => {
    const local = DRUG_DB.find(d =>
      d.name.toLowerCase().includes(name.toLowerCase()) ||
      d.generic.toLowerCase().includes(name.toLowerCase())
    );
    setSelectedDrug(local || null);
    setDoseSearch(name);
    setDoseSuggestions([]);
    setDoseResult(null);
    setFdaLabel(null);
    fetchFDALabel(local?.generic || name);
  };

  const calcDose = () => {
    if (!selectedDrug && !fdaLabel) { toast.error('Select a drug first'); return; }
    if (isChild && !weightKg) { toast.error('Enter patient weight for paediatric dose'); return; }
    const totalMonths = (parseFloat(ageYears||'0') * 12) + parseFloat(ageMonths||'0');
    const result = calculateDose(
      selectedDrug?.generic || doseSearch,
      parseFloat(weightKg||'70'),
      isChild,
      totalMonths
    );
    setDoseResult(result);
    if (!result) toast.error('Dose formula not in local database — see FDA info below');
  };

  // ── Combined interactions to display ──────────────────────────────────────
  const allInteractions = apiStatus === 'live' && liveResults.length > 0
    ? liveResults : localResults;
  const totalCount = allInteractions.length;

  return (
    <div className="space-y-5">

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7 w-fit">
        {([
          { key:'interactions', label:'💊 Drug Interaction Checker' },
          { key:'dosecalc',     label:'🧮 Dose Calculator' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${activeTab===t.key?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── INTERACTION CHECKER ───────────────────────────────────────────── */}
      {activeTab === 'interactions' && (
        <div className="space-y-4">

          {/* Data source badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="rounded-xl px-4 py-3 text-[12px] flex-1"
              style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)' }}>
              <span className="font-medium text-amber-800">Data Sources: </span>
              <span className="text-amber-700">
                🏥 NLM RxNav (live) · OpenFDA (live) · BNF/BNFC local database (fallback) — All free, no API key required
              </span>
            </div>
            {apiStatus === 'live' && (
              <span className="text-[11px] px-3 py-1.5 rounded-full font-medium"
                style={{ background:'#dcfce7', color:'#166534' }}>● NLM Live</span>
            )}
            {apiStatus === 'fallback' && (
              <span className="text-[11px] px-3 py-1.5 rounded-full font-medium"
                style={{ background:'#fef9e7', color:'#92400e' }}>● Local DB</span>
            )}
          </div>

          {/* Drug input */}
          <div className="card p-5">
            <div className="font-medium text-navy text-[14px] mb-4">Enter Drugs to Check</div>
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              {loadingSuggest && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gold animate-spin"/>}
              <input type="text" value={drugInput}
                onChange={e => handleInteractInput(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && suggestions.length>0) addDrug(suggestions[0].name, suggestions[0].rxcui); }}
                placeholder="Type any drug name — searches NLM RxNav database..."
                className="w-full border border-black/10 rounded-lg pl-9 pr-8 py-2.5 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-black/10 rounded-lg shadow-lg mt-1 overflow-hidden">
                  {suggestions.map(s => (
                    <button key={s.rxcui+s.name} onClick={() => addDrug(s.name, s.rxcui)}
                      className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-amber-50 border-b border-black/5 last:border-0 flex items-center justify-between">
                      <span className="font-medium text-navy">{s.name}</span>
                      {s.rxcui !== 'local' && <span className="text-[10px] text-gray-400 font-mono">RxCUI {s.rxcui}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Drug chips */}
            {drugList.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {drugList.map(d => (
                  <span key={d.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                    style={{ background:'#dbeafe', color:'#1e40af', border:'1px solid #bfdbfe' }}>
                    <Pill size={11}/>{d.name}
                    {d.rxcui !== 'local' && <span className="text-[10px] opacity-60">#{d.rxcui}</span>}
                    <button onClick={() => setDrugList(p => p.filter(x=>x.name!==d.name))} className="ml-0.5 hover:text-red-500">
                      <X size={11}/>
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={runCheck} disabled={drugList.length < 2 || loadingCheck}
                className="btn-gold gap-2 text-[13px] py-2.5 px-6">
                {loadingCheck
                  ? <><Loader2 size={14} className="animate-spin"/> Checking NLM...</>
                  : <><Shield size={14}/> Check Interactions</>}
              </button>
              {drugList.length > 0 && (
                <button onClick={() => { setDrugList([]); setChecked(false); setLiveResults([]); setLocalResults([]); setApiStatus('idle'); }}
                  className="btn-outline text-[12px] py-2 px-3 gap-1"><RefreshCw size={12}/> Clear</button>
              )}
            </div>
          </div>

          {/* Results */}
          {checked && (
            <div className="space-y-3">
              {/* Summary banner */}
              <div className={`rounded-xl p-4 flex items-center gap-4 ${totalCount===0?'border border-emerald-200':'border border-red-200'}`}
                style={{ background:totalCount===0?'#f0fdf4':'#fff0f0' }}>
                {totalCount === 0 ? (
                  <>
                    <CheckCircle size={24} className="text-emerald-600 flex-shrink-0"/>
                    <div>
                      <div className="font-semibold text-emerald-800">No interactions found</div>
                      <div className="text-[12px] text-emerald-600">
                        Source: {apiStatus==='live' ? 'NLM RxNav live database' : 'Local BNF/BNFC database'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={24} className="text-red-600 flex-shrink-0"/>
                    <div className="flex-1">
                      <div className="font-semibold text-red-800">{totalCount} Interaction(s) Detected</div>
                      <div className="text-[12px] text-red-600">
                        Source: {apiStatus==='live' ? '🏥 NLM RxNav live database' : '📚 Local BNF/BNFC database'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Interaction cards */}
              {allInteractions.map((inter, i) => {
                const severity = (inter as { severity: string }).severity?.toLowerCase() || 'unknown';
                const cfg = getSeverityCfg(severity);
                const description = (inter as { description?: string; effect?: string }).description || (inter as { effect?: string }).effect || '';
                const comment = (inter as { comment?: string; action?: string }).comment || (inter as { action?: string }).action || '';
                const mechanism = (inter as { mechanism?: string }).mechanism || '';
                const source = (inter as { source?: string }).source || 'Local DB';
                const d1 = (inter as { drug1: string }).drug1;
                const d2 = (inter as { drug2: string }).drug2;

                return (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ background:cfg.bg, border:`1px solid ${cfg.border}` }}>
                    <button className="w-full text-left px-5 py-4 flex items-center gap-4"
                      onClick={() => setExpanded(expanded===i?null:i)}>
                      <span className="text-[20px] flex-shrink-0">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[14px]" style={{ color:cfg.color }}>{d1}</span>
                          <span style={{ color:cfg.color }}>+</span>
                          <span className="font-semibold text-[14px]" style={{ color:cfg.color }}>{d2}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background:'rgba(255,255,255,0.6)', color:cfg.color }}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/60" style={{ color:cfg.color }}>{source}</span>
                        </div>
                        <div className="text-[12px] mt-0.5 truncate" style={{ color:cfg.color }}>{description}</div>
                      </div>
                      {expanded===i ? <ChevronUp size={16} style={{ color:cfg.color }}/> : <ChevronDown size={16} style={{ color:cfg.color }}/>}
                    </button>

                    {expanded === i && (
                      <div className="px-5 pb-4 space-y-3 border-t pt-3" style={{ borderColor:cfg.border }}>
                        {description && (
                          <div>
                            <div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color:cfg.color }}>Effect</div>
                            <div className="text-[13px]" style={{ color:cfg.color }}>{description}</div>
                          </div>
                        )}
                        {mechanism && (
                          <div>
                            <div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color:cfg.color }}>Mechanism</div>
                            <div className="text-[13px]" style={{ color:cfg.color }}>{mechanism}</div>
                          </div>
                        )}
                        {comment && (
                          <div className="rounded-lg p-3" style={{ background:'rgba(255,255,255,0.6)' }}>
                            <div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color:cfg.color }}>Clinical Action</div>
                            <div className="text-[13px] font-medium" style={{ color:cfg.color }}>{comment}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-2">
                <Info size={11}/>
                Data from NLM RxNav + local BNF/BNFC. Always use professional clinical judgement.
                <a href="https://rxnav.nlm.nih.gov" target="_blank" rel="noopener noreferrer"
                  className="text-gold hover:underline flex items-center gap-0.5">
                  RxNav <ExternalLink size={9}/>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DOSE CALCULATOR ───────────────────────────────────────────────── */}
      {activeTab === 'dosecalc' && (
        <div className="space-y-4">

          <div className="rounded-xl px-4 py-3 text-[12px]"
            style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)' }}>
            <span className="font-medium text-amber-800">Data Sources: </span>
            <span className="text-amber-700">
              OpenFDA labels (live) · BNF/BNFC local formulas · Weight-based mg/kg calculations
            </span>
          </div>

          <div className="card p-5">
            {/* Adult / Paediatric toggle */}
            <div className="flex gap-2 mb-5">
              {[{ val:true, label:'👶 Paediatric' }, { val:false, label:'🧑 Adult' }].map(t => (
                <button key={String(t.val)} onClick={() => { setIsChild(t.val); setDoseResult(null); }}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium border transition-all ${isChild===t.val?'bg-navy text-white border-navy':'border-black/10 text-gray-500'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drug search */}
            <div className="mb-4 relative">
              <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Drug Name</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                {loadingFDA && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gold animate-spin"/>}
                <input type="text" value={doseSearch}
                  onChange={e => { setDoseSearch(e.target.value); setSelectedDrug(null); setDoseResult(null); setFdaLabel(null);
                    if (suggestTimer.current) clearTimeout(suggestTimer.current);
                    suggestTimer.current = setTimeout(() => searchDrugs(e.target.value, true), 400);
                  }}
                  placeholder="Search any drug — NLM database..."
                  className="w-full border border-black/10 rounded-lg pl-8 pr-8 py-2.5 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
              </div>
              {doseSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-black/10 rounded-lg shadow-lg mt-1 overflow-hidden">
                  {doseSuggestions.map(s => (
                    <button key={s.rxcui+s.name} onClick={() => selectDoseDrug(s.name)}
                      className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-amber-50 border-b border-black/5 last:border-0">
                      <span className="font-medium text-navy">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedDrug && (
                <div className="mt-2 px-3 py-2 rounded-lg text-[12px]"
                  style={{ background:'#dcfce7', border:'1px solid #86efac' }}>
                  ✓ <span className="font-medium text-emerald-800">{selectedDrug.name}</span>
                  <span className="text-emerald-600 ml-2">— {selectedDrug.category}</span>
                </div>
              )}
            </div>

            {/* Patient details */}
            {isChild && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label:'Weight (kg) *', key:'weight',  state:weightKg,  set:setWeightKg,  type:'number', placeholder:'e.g. 18.5' },
                  { label:'Age (years)',   key:'agyears', state:ageYears,  set:setAgeYears,  type:'number', placeholder:'e.g. 5'    },
                  { label:'Age (months)', key:'agmons',  state:ageMonths, set:setAgeMonths, type:'number', placeholder:'e.g. 6'    },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={f.state}
                      onChange={e => f.set(e.target.value)}
                      className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                  </div>
                ))}
              </div>
            )}

            <button onClick={calcDose} className="btn-gold gap-2 text-[13px] py-2.5 px-6">
              <Calculator size={14}/> Calculate Dose
            </button>
          </div>

          {/* Local dose result */}
          {doseResult && selectedDrug && (
            <div className="card p-5 animate-in">
              <div className="flex items-center justify-between mb-4">
                <div className="font-display font-semibold text-navy text-[17px]">{selectedDrug.name}</div>
                <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background:'#dbeafe', color:'#1e40af' }}>
                  {isChild ? `Paediatric · ${weightKg}kg` : 'Adult'} · BNF/BNFC
                </span>
              </div>

              {doseResult.warning && (
                <div className="rounded-lg p-3 mb-4 flex items-center gap-2 text-[12px]"
                  style={{ background:'#fff7ed', border:'1px solid #fed7aa', color:'#92400e' }}>
                  <AlertTriangle size={14}/>{doseResult.warning}
                </div>
              )}

              <div className="rounded-xl p-5 mb-4" style={{ background:'#f9f7f3', border:'2px solid rgba(201,168,76,0.3)' }}>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label:'Calculated Dose', val:doseResult.dose,      big:true  },
                    { label:'Frequency',        val:doseResult.frequency, big:false },
                    { label:'Route',            val:doseResult.route,     big:false },
                    { label:'Max Daily Dose',   val:doseResult.dailyDose, big:false },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">{s.label}</div>
                      <div className={`font-bold ${s.big?'text-[24px]':'text-[14px]'} ${s.big?'text-gold':'text-navy'}`}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {doseResult.notes && (
                <div className="rounded-lg p-3 mb-4 text-[12px]"
                  style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1e40af' }}>
                  <span className="font-medium">Notes: </span>{doseResult.notes}
                </div>
              )}

              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-2">Formulations</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDrug.formulations.map(f => (
                    <span key={f} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{f}</span>
                  ))}
                </div>
              </div>

              {selectedDrug.contraindications.length > 0 && (
                <div className="rounded-lg p-3 mb-3" style={{ background:'#fff0f0', border:'1px solid #fecaca' }}>
                  <div className="text-[11px] uppercase tracking-widest text-red-600 font-medium mb-2">⚠ Contraindications</div>
                  {selectedDrug.contraindications.map(c => (
                    <div key={c} className="text-[12px] text-red-700">• {c}</div>
                  ))}
                </div>
              )}

              {(selectedDrug.renalAdjust || selectedDrug.hepaticAdjust) && (
                <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-2">
                  <Info size={11}/>
                  {selectedDrug.renalAdjust && 'Renal dose adjustment required. '}
                  {selectedDrug.hepaticAdjust && 'Hepatic dose adjustment required.'}
                </div>
              )}
            </div>
          )}

          {/* OpenFDA Live Label */}
          {fdaLabel && (
            <div className="card p-5 animate-in">
              <div className="flex items-center justify-between mb-4">
                <div className="font-medium text-navy text-[15px]">
                  📋 FDA Drug Label
                  {fdaLabel.genericName && <span className="text-gray-400 font-normal ml-2 text-[13px]">{fdaLabel.genericName}</span>}
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background:'#dbeafe', color:'#1e40af' }}>
                  Live · OpenFDA
                </span>
              </div>

              <div className="space-y-4">
                {fdaLabel.dosageAdmin && (
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-1.5">Dosage & Administration</div>
                    <div className="text-[13px] text-navy rounded-lg p-3 bg-gray-50 leading-relaxed">{fdaLabel.dosageAdmin}</div>
                  </div>
                )}
                {fdaLabel.pediatricUse && (
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-emerald-600 font-medium mb-1.5">👶 Paediatric Use</div>
                    <div className="text-[13px] text-navy rounded-lg p-3 leading-relaxed"
                      style={{ background:'#f0fdf4', border:'1px solid #bbf7d0' }}>{fdaLabel.pediatricUse}</div>
                  </div>
                )}
                {fdaLabel.contraindications && (
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-red-500 font-medium mb-1.5">Contraindications</div>
                    <div className="text-[13px] text-red-800 rounded-lg p-3 leading-relaxed"
                      style={{ background:'#fff0f0', border:'1px solid #fecaca' }}>{fdaLabel.contraindications}</div>
                  </div>
                )}
                {fdaLabel.interactions && (
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-amber-600 font-medium mb-1.5">Drug Interactions (FDA)</div>
                    <div className="text-[13px] text-amber-900 rounded-lg p-3 leading-relaxed"
                      style={{ background:'#fff9e6', border:'1px solid #fde68a' }}>{fdaLabel.interactions}</div>
                  </div>
                )}
                {fdaLabel.warnings && (
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-red-600 font-medium mb-1.5">⚠ Warnings</div>
                    <div className="text-[13px] text-red-800 rounded-lg p-3 leading-relaxed"
                      style={{ background:'#fff0f0', border:'1px solid #fca5a5' }}>{fdaLabel.warnings}</div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-[10px] text-gray-400">
                <span>Source: OpenFDA · U.S. National Library of Medicine</span>
                <a href={`https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-gold hover:underline flex items-center gap-0.5">
                  Full FDA Label <ExternalLink size={9}/>
                </a>
              </div>
            </div>
          )}

          {loadingFDA && (
            <div className="card p-6 flex items-center justify-center gap-3 text-gray-400 text-[13px]">
              <Loader2 size={18} className="animate-spin text-gold"/>
              Fetching FDA drug label...
            </div>
          )}

          {/* Drug browser */}
          <div className="card overflow-hidden">
            <button className="w-full px-5 py-4 flex items-center justify-between text-left"
              onClick={() => setShowDrugBrowser(!showDrugBrowser)}>
              <div className="font-medium text-navy text-[14px]">Local Drug Database ({DRUG_DB.length} drugs)</div>
              {showDrugBrowser ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
            </button>
            {showDrugBrowser && (
              <div className="divide-y divide-black/5 max-h-72 overflow-y-auto border-t border-black/5">
                {DRUG_DB.map(d => (
                  <button key={d.name} onClick={() => { selectDoseDrug(d.name); setActiveTab('dosecalc'); }}
                    className="w-full text-left px-5 py-3 hover:bg-amber-50/50 transition-colors">
                    <div className="font-medium text-navy text-[13px]">{d.name}</div>
                    <div className="text-[11px] text-gray-400">{d.category}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
