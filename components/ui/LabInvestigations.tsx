'use client';

import { useState } from 'react';
import { Plus, X, FlaskConical } from 'lucide-react';

const COMMON_LABS = [
  { name:'CBC (Complete Blood Count)', cat:'Haematology' },
  { name:'CRP (C-Reactive Protein)', cat:'Inflammatory' },
  { name:'ESR', cat:'Inflammatory' },
  { name:'Blood Culture & Sensitivity', cat:'Microbiology' },
  { name:'LFTs (Liver Function Tests)', cat:'Biochemistry' },
  { name:'RFTs (Renal Function Tests)', cat:'Biochemistry' },
  { name:'Blood Sugar Random', cat:'Biochemistry' },
  { name:'Blood Sugar Fasting', cat:'Biochemistry' },
  { name:'HbA1c', cat:'Biochemistry' },
  { name:'Serum Electrolytes', cat:'Biochemistry' },
  { name:'Thyroid Profile (TSH/T3/T4)', cat:'Endocrine' },
  { name:'Vitamin D (25-OH)', cat:'Vitamins' },
  { name:'Vitamin B12', cat:'Vitamins' },
  { name:'Urine RE/ME', cat:'Urology' },
  { name:'Urine Culture & Sensitivity', cat:'Microbiology' },
  { name:'Stool RE/ME', cat:'GI' },
  { name:'Chest X-Ray', cat:'Radiology' },
  { name:'Abdominal Ultrasound', cat:'Radiology' },
  { name:'ECG', cat:'Cardiology' },
  { name:'Echocardiography', cat:'Cardiology' },
  { name:'Blood Film / Peripheral Smear', cat:'Haematology' },
  { name:'Dengue NS1 + IgM/IgG', cat:'Serology' },
  { name:'Typhoid (Widal / Typhidot)', cat:'Serology' },
  { name:'Malaria RDT / Film', cat:'Serology' },
  { name:'Hepatitis B & C', cat:'Serology' },
  { name:'HIV Screening', cat:'Serology' },
  { name:'Prothrombin Time (PT/INR)', cat:'Coagulation' },
  { name:'Serum Calcium', cat:'Biochemistry' },
  { name:'Iron Studies (Serum Iron/TIBC/Ferritin)', cat:'Haematology' },
  { name:'Peak Flow / Spirometry', cat:'Pulmonology' },
];

const URGENCY = ['Routine','Urgent','STAT'];
const CATS = ['All', ...Array.from(new Set(COMMON_LABS.map(l => l.cat)))];

export interface LabRequest {
  id: string;
  name: string;
  urgency: 'Routine'|'Urgent'|'STAT';
  instructions: string;
}

interface Props {
  labs: LabRequest[];
  onChange: (labs: LabRequest[]) => void;
}

function labId() { return `LAB-${Math.random().toString(36).slice(2,7).toUpperCase()}`; }

export default function LabInvestigations({ labs, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [showPanel, setShowPanel] = useState(false);
  const [custom, setCustom] = useState('');

  const filtered = COMMON_LABS.filter(l =>
    (cat === 'All' || l.cat === cat) &&
    (!search || l.name.toLowerCase().includes(search.toLowerCase()))
  );

  const addLab = (name: string) => {
    if (labs.find(l => l.name === name)) return;
    onChange([...labs, { id: labId(), name, urgency: 'Routine', instructions: '' }]);
  };

  const removeLab = (id: string) => onChange(labs.filter(l => l.id !== id));

  const updateLab = (id: string, field: keyof LabRequest, val: string) =>
    onChange(labs.map(l => l.id === id ? {...l, [field]: val} : l));

  const addCustom = () => {
    if (!custom.trim()) return;
    addLab(custom.trim());
    setCustom('');
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium flex items-center gap-1.5">
          <FlaskConical size={12}/> Lab Investigations
        </label>
        <button onClick={() => setShowPanel(!showPanel)}
          className="text-[11px] text-gold hover:text-amber-700 font-medium flex items-center gap-1">
          <Plus size={11}/> Add Labs
        </button>
      </div>

      {/* Selected labs */}
      {labs.length > 0 && (
        <div className="space-y-2 mb-3">
          {labs.map(l => (
            <div key={l.id} className="rounded-xl p-3" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.15)'}}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-navy">{l.name}</span>
                  <select value={l.urgency} onChange={e => updateLab(l.id, 'urgency', e.target.value)}
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold border-0 outline-none cursor-pointer"
                    style={{background:l.urgency==='STAT'?'#fee2e2':l.urgency==='Urgent'?'#fff7ed':'#f0fdf4',color:l.urgency==='STAT'?'#991b1b':l.urgency==='Urgent'?'#92400e':'#166534'}}>
                    {URGENCY.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <button onClick={() => removeLab(l.id)} className="text-gray-300 hover:text-red-400"><X size={13}/></button>
              </div>
              <input type="text" placeholder="Special instructions (optional)" value={l.instructions}
                onChange={e => updateLab(l.id, 'instructions', e.target.value)}
                className="w-full border border-black/10 rounded-lg px-3 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
            </div>
          ))}
        </div>
      )}

      {/* Lab selection panel */}
      {showPanel && (
        <div className="rounded-xl p-4 space-y-3" style={{background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.25)'}}>
          <div className="flex gap-2">
            <input type="text" placeholder="Search labs..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 border border-black/10 rounded-lg px-3 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
            <input type="text" placeholder="Custom test..." value={custom} onChange={e => setCustom(e.target.value)}
              onKeyDown={e => e.key==='Enter' && addCustom()}
              className="flex-1 border border-black/10 rounded-lg px-3 py-1.5 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
            <button onClick={addCustom} className="btn-gold text-[11px] py-1.5 px-3">Add</button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
                style={{background:cat===c?'#0a1628':'rgba(0,0,0,0.05)',color:cat===c?'#fff':'#6b7280'}}>
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
            {filtered.map(l => {
              const selected = labs.find(x => x.name === l.name);
              return (
                <button key={l.name} onClick={() => selected ? removeLab(selected.id) : addLab(l.name)}
                  className="text-left px-3 py-2 rounded-lg text-[12px] transition-all"
                  style={{background:selected?'rgba(201,168,76,0.15)':'rgba(255,255,255,0.8)',border:`1px solid ${selected?'rgba(201,168,76,0.4)':'rgba(0,0,0,0.08)'}`,color:selected?'#a07a2a':'#374151'}}>
                  {selected && '✓ '}{l.name}
                </button>
              );
            })}
          </div>
          <button onClick={() => setShowPanel(false)} className="text-[11px] text-gray-400 hover:text-gray-600">Done</button>
        </div>
      )}
    </div>
  );
}
