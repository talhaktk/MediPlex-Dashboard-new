'use client';

import { useState } from 'react';
import { Plus, X, FlaskConical } from 'lucide-react';

export const COMMON_LABS = [
  // Haematology
  { name:'CBC (Complete Blood Count)', cat:'Haematology' },
  { name:'Blood Film / Peripheral Smear', cat:'Haematology' },
  { name:'Iron Studies (Serum Iron/TIBC/Ferritin)', cat:'Haematology' },
  { name:'Reticulocyte Count', cat:'Haematology' },
  { name:'G6PD Level', cat:'Haematology' },
  // Inflammatory / Infection
  { name:'CRP (C-Reactive Protein)', cat:'Inflammatory' },
  { name:'ESR', cat:'Inflammatory' },
  { name:'Procalcitonin', cat:'Inflammatory' },
  // Microbiology
  { name:'Blood Culture & Sensitivity', cat:'Microbiology' },
  { name:'Urine Culture & Sensitivity', cat:'Microbiology' },
  { name:'Throat Swab C/S', cat:'Microbiology' },
  { name:'Stool Culture & Sensitivity', cat:'Microbiology' },
  { name:'MRSA Screen', cat:'Microbiology' },
  // Biochemistry
  { name:'LFTs (Liver Function Tests)', cat:'Biochemistry' },
  { name:'RFTs (Renal Function Tests)', cat:'Biochemistry' },
  { name:'Lipid Profile', cat:'Biochemistry' },
  { name:'Blood Sugar Random', cat:'Biochemistry' },
  { name:'Blood Sugar Fasting', cat:'Biochemistry' },
  { name:'HbA1c', cat:'Biochemistry' },
  { name:'Serum Electrolytes', cat:'Biochemistry' },
  { name:'Serum Calcium', cat:'Biochemistry' },
  { name:'Serum Magnesium', cat:'Biochemistry' },
  { name:'Serum Phosphate', cat:'Biochemistry' },
  { name:'Serum Uric Acid', cat:'Biochemistry' },
  { name:'Serum Albumin', cat:'Biochemistry' },
  { name:'Serum Ammonia', cat:'Biochemistry' },
  { name:'Lactate (Serum)', cat:'Biochemistry' },
  // Endocrine
  { name:'Thyroid Profile (TSH/T3/T4)', cat:'Endocrine' },
  { name:'Free T3 / Free T4', cat:'Endocrine' },
  { name:'Cortisol (Morning)', cat:'Endocrine' },
  { name:'Insulin Level', cat:'Endocrine' },
  { name:'Growth Hormone', cat:'Endocrine' },
  { name:'IGF-1', cat:'Endocrine' },
  { name:'Parathyroid Hormone (PTH)', cat:'Endocrine' },
  // Vitamins / Nutrition
  { name:'Vitamin D (25-OH)', cat:'Vitamins' },
  { name:'Vitamin B12', cat:'Vitamins' },
  { name:'Folate', cat:'Vitamins' },
  { name:'Vitamin A', cat:'Vitamins' },
  { name:'Zinc Level', cat:'Vitamins' },
  // Urology
  { name:'Urine RE/ME', cat:'Urology' },
  { name:'24hr Urine Protein', cat:'Urology' },
  { name:'Urine Microalbumin', cat:'Urology' },
  { name:'Urine Calcium/Creatinine Ratio', cat:'Urology' },
  { name:'Urine Sodium/Potassium', cat:'Urology' },
  // GI
  { name:'Stool RE/ME', cat:'GI' },
  { name:'Stool Occult Blood', cat:'GI' },
  { name:'H. pylori Stool Antigen', cat:'GI' },
  { name:'H. pylori Serology', cat:'GI' },
  // Serology / Infectious Disease
  { name:'Dengue NS1 + IgM/IgG', cat:'Serology' },
  { name:'Typhoid (Widal / Typhidot)', cat:'Serology' },
  { name:'Malaria RDT / Film', cat:'Serology' },
  { name:'Hepatitis B (HBsAg)', cat:'Serology' },
  { name:'Hepatitis B Profile (HBsAg/HBeAg/Anti-HBs)', cat:'Serology' },
  { name:'Hepatitis C (Anti-HCV)', cat:'Serology' },
  { name:'HIV Screening', cat:'Serology' },
  { name:'TORCH Panel', cat:'Serology' },
  { name:'EBV Monospot / VCA IgM', cat:'Serology' },
  { name:'CMV IgM/IgG', cat:'Serology' },
  { name:'COVID-19 PCR', cat:'Serology' },
  { name:'Influenza A/B Rapid', cat:'Serology' },
  { name:'RSV Antigen', cat:'Serology' },
  { name:'Brucella Serology', cat:'Serology' },
  // Coagulation
  { name:'Prothrombin Time (PT/INR)', cat:'Coagulation' },
  { name:'APTT', cat:'Coagulation' },
  { name:'Fibrinogen', cat:'Coagulation' },
  { name:'D-Dimer', cat:'Coagulation' },
  { name:'Bleeding Time / Clotting Time', cat:'Coagulation' },
  // Cardiology
  { name:'ECG (12-Lead)', cat:'Cardiology' },
  { name:'Echocardiography', cat:'Cardiology' },
  { name:'Troponin I / hs-cTnI', cat:'Cardiology' },
  { name:'BNP / NT-proBNP', cat:'Cardiology' },
  { name:'CK-MB', cat:'Cardiology' },
  // Radiology
  { name:'Chest X-Ray (PA view)', cat:'Radiology' },
  { name:'Chest X-Ray (AP + Lateral)', cat:'Radiology' },
  { name:'Abdomen X-Ray (Erect + Supine)', cat:'Radiology' },
  { name:'Skull X-Ray', cat:'Radiology' },
  { name:'Spine X-Ray (Cervical/Thoracic/Lumbosacral)', cat:'Radiology' },
  { name:'Wrist / Hand X-Ray', cat:'Radiology' },
  { name:'Knee X-Ray', cat:'Radiology' },
  { name:'Bone Age (Left Hand X-Ray)', cat:'Radiology' },
  { name:'Abdominal Ultrasound', cat:'Radiology' },
  { name:'Pelvic Ultrasound', cat:'Radiology' },
  { name:'Renal Ultrasound (KUB)', cat:'Radiology' },
  { name:'Thyroid Ultrasound', cat:'Radiology' },
  { name:'Scrotal Ultrasound', cat:'Radiology' },
  { name:'Hip Ultrasound', cat:'Radiology' },
  { name:'Cranial Ultrasound (Neonatal)', cat:'Radiology' },
  { name:'CT Head (Non-Contrast)', cat:'Radiology' },
  { name:'CT Head (With Contrast)', cat:'Radiology' },
  { name:'CT Chest', cat:'Radiology' },
  { name:'CT Abdomen & Pelvis', cat:'Radiology' },
  { name:'MRI Brain', cat:'Radiology' },
  { name:'MRI Spine', cat:'Radiology' },
  { name:'MRI Knee / Shoulder', cat:'Radiology' },
  { name:'DMSA Scan', cat:'Radiology' },
  { name:'MAG3 Renogram', cat:'Radiology' },
  { name:'VCUG (Micturating Cystourethrogram)', cat:'Radiology' },
  // Pulmonology
  { name:'Peak Flow / Spirometry', cat:'Pulmonology' },
  { name:'Chest CT (High-Resolution)', cat:'Pulmonology' },
  { name:'Sweat Chloride Test', cat:'Pulmonology' },
];

// Expansion of panel names → individual parameters (for QR lab upload)
export const LAB_EXPANSIONS: Record<string, { name: string; category: string }[]> = {
  'CBC (Complete Blood Count)': [
    { name:'Hemoglobin', category:'CBC' }, { name:'WBC', category:'CBC' },
    { name:'Platelets', category:'CBC' }, { name:'Hematocrit', category:'CBC' },
    { name:'MCV', category:'CBC' }, { name:'MCH', category:'CBC' }, { name:'MCHC', category:'CBC' },
    { name:'Neutrophils', category:'CBC' }, { name:'Lymphocytes', category:'CBC' },
    { name:'Eosinophils', category:'CBC' }, { name:'Monocytes', category:'CBC' },
  ],
  'LFTs (Liver Function Tests)': [
    { name:'ALT', category:'LFT' }, { name:'AST', category:'LFT' }, { name:'ALP', category:'LFT' },
    { name:'GGT', category:'LFT' }, { name:'Total Bilirubin', category:'LFT' },
    { name:'Direct Bilirubin', category:'LFT' }, { name:'Albumin', category:'LFT' },
    { name:'Total Protein', category:'LFT' },
  ],
  'RFTs (Renal Function Tests)': [
    { name:'Creatinine', category:'RFT' }, { name:'BUN', category:'RFT' },
    { name:'Urea', category:'RFT' }, { name:'Uric Acid', category:'RFT' }, { name:'eGFR', category:'RFT' },
  ],
  'Lipid Profile': [
    { name:'Total Cholesterol', category:'Lipids' }, { name:'LDL', category:'Lipids' },
    { name:'HDL', category:'Lipids' }, { name:'Triglycerides', category:'Lipids' },
  ],
  'Thyroid Profile (TSH/T3/T4)': [
    { name:'TSH', category:'Thyroid' }, { name:'T3', category:'Thyroid' }, { name:'T4', category:'Thyroid' },
  ],
  'Free T3 / Free T4': [
    { name:'Free T3', category:'Thyroid' }, { name:'Free T4', category:'Thyroid' },
  ],
  'Serum Electrolytes': [
    { name:'Sodium', category:'Electrolytes' }, { name:'Potassium', category:'Electrolytes' },
    { name:'Chloride', category:'Electrolytes' }, { name:'Bicarbonate', category:'Electrolytes' },
  ],
  'Iron Studies (Serum Iron/TIBC/Ferritin)': [
    { name:'Serum Iron', category:'Iron' }, { name:'TIBC', category:'Iron' }, { name:'Ferritin', category:'Iron' },
  ],
  'Prothrombin Time (PT/INR)': [
    { name:'PT', category:'Coagulation' }, { name:'INR', category:'Coagulation' }, { name:'APTT', category:'Coagulation' },
  ],
  'Blood Sugar Random': [{ name:'RBS', category:'Blood Sugar' }],
  'Blood Sugar Fasting': [{ name:'FBS', category:'Blood Sugar' }],
  'HbA1c': [{ name:'HbA1c', category:'Blood Sugar' }],
  'CRP (C-Reactive Protein)': [{ name:'CRP', category:'Inflammation' }],
  'ESR': [{ name:'ESR', category:'Inflammation' }],
  'Vitamin D (25-OH)': [{ name:'Vitamin D', category:'Vitamins' }],
  'Vitamin B12': [{ name:'Vitamin B12', category:'Vitamins' }],
  'Folate': [{ name:'Folate', category:'Vitamins' }],
  'Troponin I / hs-cTnI': [{ name:'Troponin I', category:'Cardiac' }],
};

const URGENCY = ['Routine','Urgent','STAT'];
const CATS = ['All', ...Array.from(new Set(COMMON_LABS.map(l => l.cat)))];

export interface LabRequest {
  id: string;
  name: string;
  cat: string;
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

  const addLab = (name: string, labCat: string) => {
    if (labs.find(l => l.name === name)) return;
    onChange([...labs, { id: labId(), name, cat: labCat, urgency: 'Routine', instructions: '' }]);
  };

  const removeLab = (id: string) => onChange(labs.filter(l => l.id !== id));

  const updateLab = (id: string, field: keyof LabRequest, val: string) =>
    onChange(labs.map(l => l.id === id ? {...l, [field]: val} : l));

  const addCustom = () => {
    if (!custom.trim()) return;
    addLab(custom.trim(), 'Custom');
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
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
            {filtered.map(l => {
              const sel = labs.find(x => x.name === l.name);
              return (
                <button key={l.name} onClick={() => sel ? removeLab(sel.id) : addLab(l.name, l.cat)}
                  className="text-left px-3 py-2 rounded-lg text-[12px] transition-all"
                  style={{background:sel?'rgba(201,168,76,0.15)':'rgba(255,255,255,0.8)',border:`1px solid ${sel?'rgba(201,168,76,0.4)':'rgba(0,0,0,0.08)'}`,color:sel?'#a07a2a':'#374151'}}>
                  {sel && '✓ '}{l.name}
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
