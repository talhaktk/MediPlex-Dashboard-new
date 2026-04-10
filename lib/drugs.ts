// ─────────────────────────────────────────────────────────────────────────────
// MediPlex Drug Database — Based on BNF/BNFC published dosing guidelines
// Sources: BNF for Children, WHO Essential Medicines for Children
// ─────────────────────────────────────────────────────────────────────────────

export interface DrugDose {
  name:          string;
  generic:       string;
  category:      string;
  formulations:  string[];
  pediatric: {
    neonatal?:   string;
    infant?:     string;  // 1 month - 2 years
    child?:      string;  // 2-11 years
    adolescent?: string;  // 12-17 years
    mgPerKg?:    number;  // mg/kg/dose
    mgPerKgDay?: number;  // mg/kg/day
    maxDose?:    number;  // mg
    maxDoseDay?: number;  // mg/day
    frequency:   string;
    route:       string;
    notes?:      string;
  };
  adult: {
    dose:        string;
    frequency:   string;
    route:       string;
    maxDose?:    string;
    notes?:      string;
  };
  contraindications: string[];
  interactions:      string[];
  sideEffects:       string[];
  renalAdjust?:      boolean;
  hepaticAdjust?:    boolean;
}

export const DRUG_DB: DrugDose[] = [
  // ── Analgesics / Antipyretics ─────────────────────────────────────────────
  {
    name: 'Paracetamol (Acetaminophen)',
    generic: 'paracetamol',
    category: 'Analgesic / Antipyretic',
    formulations: ['Tablet 500mg', 'Syrup 120mg/5ml', 'Syrup 250mg/5ml', 'Suppository 125mg', 'IV 10mg/ml'],
    pediatric: {
      infant:     '60–125mg every 4–6 hours',
      child:      '250–500mg every 4–6 hours',
      adolescent: '500mg–1g every 4–6 hours',
      mgPerKg:    15,
      maxDose:    1000,
      maxDoseDay: 4000,
      frequency:  'Every 4–6 hours (max 4 doses/day)',
      route:      'Oral / Rectal / IV',
      notes:      'Do not exceed 5 doses in 24 hours. Reduce dose in hepatic impairment.',
    },
    adult: {
      dose:     '500mg–1g',
      frequency:'Every 4–6 hours',
      route:    'Oral / Rectal / IV',
      maxDose:  '4g/day',
      notes:    'Reduce to 3g/day in chronic alcohol use or liver disease',
    },
    contraindications: ['Severe hepatic impairment', 'Hypersensitivity to paracetamol'],
    interactions: ['Warfarin (↑ anticoagulant effect)', 'Isoniazid (↑ hepatotoxicity risk)', 'Alcohol (↑ hepatotoxicity)'],
    sideEffects: ['Hepatotoxicity (overdose)', 'Rash', 'Blood disorders (rare)'],
    hepaticAdjust: true,
  },
  {
    name: 'Ibuprofen',
    generic: 'ibuprofen',
    category: 'NSAID / Analgesic / Antipyretic',
    formulations: ['Tablet 200mg', 'Tablet 400mg', 'Syrup 100mg/5ml', 'Gel 5%'],
    pediatric: {
      infant:     '5mg/kg every 6–8 hours (3 months+)',
      child:      '5–10mg/kg every 6–8 hours',
      adolescent: '200–400mg every 6–8 hours',
      mgPerKg:    10,
      maxDose:    400,
      maxDoseDay: 1200,
      frequency:  'Every 6–8 hours with food',
      route:      'Oral',
      notes:      'Avoid under 3 months. Give with food. Avoid in dehydration.',
    },
    adult: {
      dose:     '200–400mg',
      frequency:'Every 4–6 hours',
      route:    'Oral',
      maxDose:  '2.4g/day (OTC) / 3.2g/day (prescription)',
    },
    contraindications: ['< 3 months', 'Renal impairment', 'Active peptic ulcer', 'Asthma (NSAID-sensitive)', 'Dehydration'],
    interactions: ['Warfarin (↑ bleeding)', 'ACE inhibitors (↓ effect + renal risk)', 'Methotrexate (↑ toxicity)', 'Aspirin (↑ GI risk)'],
    sideEffects: ['GI upset', 'GI bleeding', 'Renal impairment', 'Fluid retention', 'Hypertension'],
    renalAdjust: true,
  },
  {
    name: 'Aspirin',
    generic: 'aspirin',
    category: 'Analgesic / Antiplatelet',
    formulations: ['Tablet 75mg', 'Tablet 300mg', 'Dispersible tablet 300mg'],
    pediatric: {
      child:      'NOT recommended under 16 (Reye syndrome risk)',
      adolescent: '300–900mg (Kawasaki disease: 30–100mg/kg/day under specialist)',
      mgPerKg:    0,
      frequency:  'Avoid in children',
      route:      'Oral',
      notes:      '⚠️ AVOID in children < 16 years — risk of Reye syndrome. Exception: Kawasaki disease under specialist supervision.',
    },
    adult: {
      dose:     '300–900mg',
      frequency:'Every 4–6 hours',
      route:    'Oral',
      maxDose:  '4g/day',
      notes:    'Antiplatelet: 75mg once daily',
    },
    contraindications: ['Children < 16 years', 'Peptic ulcer', 'Haemophilia', 'Gout', 'Severe hepatic/renal impairment'],
    interactions: ['Warfarin (↑ bleeding)', 'Ibuprofen (↓ antiplatelet effect)', 'Methotrexate (↑ toxicity)'],
    sideEffects: ['GI irritation', 'Bleeding', 'Reye syndrome (children)', 'Bronchospasm'],
    renalAdjust: true,
    hepaticAdjust: true,
  },

  // ── Antibiotics ───────────────────────────────────────────────────────────
  {
    name: 'Amoxicillin',
    generic: 'amoxicillin',
    category: 'Antibiotic — Penicillin',
    formulations: ['Capsule 250mg', 'Capsule 500mg', 'Syrup 125mg/5ml', 'Syrup 250mg/5ml', 'IV 500mg'],
    pediatric: {
      neonatal:   '30mg/kg/day in 2 divided doses',
      infant:     '20–40mg/kg/day in 3 divided doses',
      child:      '25–50mg/kg/day in 3 divided doses',
      adolescent: '250–500mg every 8 hours',
      mgPerKgDay: 40,
      maxDose:    500,
      maxDoseDay: 3000,
      frequency:  'Every 8 hours',
      route:      'Oral / IV / IM',
      notes:      'Standard for mild-moderate infections. For severe: 80–100mg/kg/day',
    },
    adult: {
      dose:     '250–500mg',
      frequency:'Every 8 hours or 3g single dose (UTI)',
      route:    'Oral / IV',
      maxDose:  '3g/day',
    },
    contraindications: ['Penicillin allergy', 'Infectious mononucleosis (↑ rash risk)'],
    interactions: ['Warfarin (↑ anticoagulant effect)', 'Methotrexate (↑ toxicity)', 'OCP (↓ efficacy — counsel)'],
    sideEffects: ['Diarrhoea', 'Rash', 'Nausea', 'Hypersensitivity', 'C.diff (prolonged use)'],
    renalAdjust: true,
  },
  {
    name: 'Amoxicillin-Clavulanate (Co-amoxiclav / Augmentin)',
    generic: 'co-amoxiclav',
    category: 'Antibiotic — Beta-lactam + inhibitor',
    formulations: ['Tablet 375mg (250/125)', 'Tablet 625mg (500/125)', 'Syrup 228mg/5ml (200/28.5)', 'Syrup 457mg/5ml (400/57)', 'IV 1.2g'],
    pediatric: {
      neonatal:   '30mg/kg/day (amoxicillin component) in 2 doses',
      infant:     '22.5–45mg/kg/day in 2–3 divided doses (based on amoxicillin)',
      child:      '25–45mg/kg/day in 2–3 divided doses',
      adolescent: '375–625mg every 8–12 hours',
      mgPerKgDay: 40,
      maxDose:    625,
      maxDoseDay: 3000,
      frequency:  'Every 8–12 hours WITH food',
      route:      'Oral / IV',
      notes:      'Always give WITH food to reduce GI side effects. Use 7:1 ratio formulation for children.',
    },
    adult: {
      dose:     '375mg–625mg',
      frequency:'Every 8–12 hours',
      route:    'Oral / IV',
      maxDose:  '1.875g/day (oral)',
      notes:    'Take with food. IV: 1.2g every 8 hours',
    },
    contraindications: ['Penicillin allergy', 'Previous co-amoxiclav jaundice/hepatic dysfunction', 'Mononucleosis'],
    interactions: ['Warfarin (↑ effect)', 'Methotrexate', 'Allopurinol (↑ rash)'],
    sideEffects: ['Diarrhoea (common)', 'Nausea', 'Rash', 'Cholestatic jaundice', 'Hepatitis'],
    hepaticAdjust: true,
  },
  {
    name: 'Azithromycin',
    generic: 'azithromycin',
    category: 'Antibiotic — Macrolide',
    formulations: ['Tablet 250mg', 'Tablet 500mg', 'Syrup 200mg/5ml', 'IV 500mg'],
    pediatric: {
      infant:     '10mg/kg on day 1, then 5mg/kg for 4 days',
      child:      '10mg/kg on day 1 (max 500mg), then 5mg/kg/day for 4 days',
      adolescent: '500mg on day 1, then 250mg/day for 4 days',
      mgPerKg:    10,
      maxDose:    500,
      frequency:  'Once daily (3–5 day course)',
      route:      'Oral / IV',
      notes:      'Give on empty stomach. Single dose 1g for chlamydia.',
    },
    adult: {
      dose:     '500mg day 1, then 250mg days 2–5',
      frequency:'Once daily',
      route:    'Oral / IV',
      maxDose:  '500mg/day',
    },
    contraindications: ['Macrolide allergy', 'QT prolongation', 'Severe hepatic impairment'],
    interactions: ['Antacids (↓ absorption)', 'Warfarin (↑ effect)', 'Ergotamine', 'QT-prolonging drugs (↑ risk)'],
    sideEffects: ['GI upset', 'Hepatotoxicity (rare)', 'QT prolongation', 'Hearing loss (high dose)'],
    hepaticAdjust: true,
  },
  {
    name: 'Cetirizine',
    generic: 'cetirizine',
    category: 'Antihistamine',
    formulations: ['Tablet 10mg', 'Syrup 5mg/5ml'],
    pediatric: {
      infant:     '2.5mg once daily (6–24 months)',
      child:      '5mg once daily (2–6 years) / 10mg once daily (6–12 years)',
      adolescent: '10mg once daily',
      frequency:  'Once daily (evening)',
      route:      'Oral',
      notes:      'Licensed from 6 months. Less sedating than chlorphenamine.',
    },
    adult: {
      dose:     '10mg',
      frequency:'Once daily',
      route:    'Oral',
      maxDose:  '10mg/day',
    },
    contraindications: ['Severe renal impairment (use 5mg)', 'Hypersensitivity'],
    interactions: ['CNS depressants (↑ sedation)', 'Alcohol'],
    sideEffects: ['Drowsiness', 'Dry mouth', 'Headache'],
    renalAdjust: true,
  },
  {
    name: 'Salbutamol (Albuterol)',
    generic: 'salbutamol',
    category: 'Bronchodilator — Beta-2 agonist',
    formulations: ['Inhaler 100mcg/puff', 'Nebuliser solution 2.5mg/2.5ml', 'Syrup 2mg/5ml', 'Tablet 2mg', 'Tablet 4mg'],
    pediatric: {
      neonatal:   '100–200mcg via nebuliser',
      infant:     '2.5mg via nebuliser / 100–200mcg inhaler',
      child:      '2.5–5mg via nebuliser / 100–200mcg inhaler PRN',
      adolescent: '2.5–5mg nebuliser / 100–200mcg inhaler',
      frequency:  'Every 4–6 hours PRN or as directed',
      route:      'Inhaled / Nebulised / Oral (not preferred)',
      notes:      'Inhaled route preferred. Oral rarely used. Monitor heart rate.',
    },
    adult: {
      dose:     '100–200mcg inhaler or 2.5–5mg nebuliser',
      frequency:'Every 4–6 hours PRN',
      route:    'Inhaled / Nebulised',
    },
    contraindications: ['Hypersensitivity', 'Pre-term labour treatment (IV use)'],
    interactions: ['Beta-blockers (antagonism)', 'Digoxin (↓ level)', 'Theophylline (↑ hypokalaemia)'],
    sideEffects: ['Tremor', 'Tachycardia', 'Hypokalaemia (high dose)', 'Headache'],
  },
  {
    name: 'Prednisolone',
    generic: 'prednisolone',
    category: 'Corticosteroid',
    formulations: ['Tablet 5mg', 'Tablet 25mg', 'Syrup 5mg/5ml', 'Syrup 15mg/5ml'],
    pediatric: {
      child:      '1–2mg/kg/day (max 40mg) for acute asthma',
      adolescent: '20–40mg/day',
      mgPerKgDay: 1,
      maxDoseDay: 40,
      frequency:  'Once daily in the morning',
      route:      'Oral',
      notes:      'Croup: single dose 0.15mg/kg. Asthma: 3–5 day course. Nephrotic: 2mg/kg/day max 60mg.',
    },
    adult: {
      dose:     '5–60mg',
      frequency:'Once daily (morning)',
      route:    'Oral',
      maxDose:  '60mg/day initial',
    },
    contraindications: ['Systemic infection (without antimicrobial cover)', 'Live vaccines'],
    interactions: ['NSAIDs (↑ GI risk)', 'Warfarin (variable)', 'Antidiabetics (↑ glucose)', 'Vaccines (↓ response)'],
    sideEffects: ['Cushingoid features', 'Growth suppression', 'Adrenal suppression', 'Osteoporosis', 'Hyperglycaemia'],
    renalAdjust: false,
  },
  {
    name: 'Metronidazole',
    generic: 'metronidazole',
    category: 'Antibiotic — Nitroimidazole',
    formulations: ['Tablet 200mg', 'Tablet 400mg', 'Syrup 200mg/5ml', 'IV 500mg/100ml', 'Suppository 500mg'],
    pediatric: {
      neonatal:   '7.5mg/kg every 12 hours',
      infant:     '7.5mg/kg every 8 hours',
      child:      '7.5mg/kg (max 400mg) every 8 hours',
      adolescent: '200–400mg every 8 hours',
      mgPerKg:    7.5,
      maxDose:    400,
      maxDoseDay: 1200,
      frequency:  'Every 8 hours',
      route:      'Oral / IV / Rectal',
      notes:      'Avoid alcohol during and 48h after treatment. Dental infections: 7–10 days.',
    },
    adult: {
      dose:     '200–400mg',
      frequency:'Every 8 hours (7–10 days)',
      route:    'Oral / IV / Rectal',
      maxDose:  '4g/day (severe)',
    },
    contraindications: ['First trimester pregnancy', 'Hypersensitivity'],
    interactions: ['Alcohol (disulfiram reaction)', 'Warfarin (↑ effect)', 'Lithium (↑ toxicity)', 'Phenytoin'],
    sideEffects: ['Metallic taste', 'Nausea', 'Peripheral neuropathy (prolonged)', 'Disulfiram reaction with alcohol'],
    hepaticAdjust: true,
  },
  {
    name: 'Omeprazole',
    generic: 'omeprazole',
    category: 'Proton Pump Inhibitor',
    formulations: ['Capsule 10mg', 'Capsule 20mg', 'Capsule 40mg', 'IV 40mg'],
    pediatric: {
      infant:     '0.7–1.4mg/kg once daily (GERD)',
      child:      '10–20mg once daily',
      adolescent: '20–40mg once daily',
      mgPerKg:    1,
      maxDose:    40,
      frequency:  'Once daily (30 min before food)',
      route:      'Oral / IV',
      notes:      'Licensed from 1 year for GERD. Take 30–60 min before food.',
    },
    adult: {
      dose:     '20–40mg',
      frequency:'Once daily',
      route:    'Oral / IV',
      maxDose:  '40mg/day (80mg in Zollinger-Ellison)',
    },
    contraindications: ['Hypersensitivity to PPIs'],
    interactions: ['Clopidogrel (↓ antiplatelet effect)', 'Methotrexate (↑ toxicity)', 'Atazanavir (↓ absorption)', 'Digoxin'],
    sideEffects: ['Headache', 'GI disturbance', 'C.diff (long-term)', 'Hypomagnesaemia', 'Bone fractures (long-term)'],
    hepaticAdjust: true,
  },
  {
    name: 'Chlorphenamine (Chlorpheniramine)',
    generic: 'chlorphenamine',
    category: 'Antihistamine — Sedating',
    formulations: ['Tablet 4mg', 'Syrup 2mg/5ml', 'Injection 10mg/ml'],
    pediatric: {
      infant:     '1mg every 6 hours (1–2 years)',
      child:      '1–2mg every 6 hours (2–5 years) / 2–4mg every 6 hours (6–12 years)',
      adolescent: '4mg every 6 hours',
      frequency:  'Every 6 hours (max 4 doses/day)',
      route:      'Oral / IM / IV / SC',
      notes:      'Causes sedation. Used in allergic reactions, anaphylaxis (IM/IV). Avoid in premature infants.',
    },
    adult: {
      dose:     '4mg',
      frequency:'Every 4–6 hours',
      route:    'Oral / IV / IM',
      maxDose:  '24mg/day',
    },
    contraindications: ['Premature infants', 'Neonates', 'MAOI use'],
    interactions: ['CNS depressants (↑ sedation)', 'MAOIs (↑ anticholinergic effects)', 'Alcohol'],
    sideEffects: ['Sedation', 'Dry mouth', 'Urinary retention', 'Blurred vision', 'Constipation'],
  },
  {
    name: 'Oral Rehydration Salts (ORS)',
    generic: 'oral rehydration salts',
    category: 'Electrolyte Replacement',
    formulations: ['Sachet (WHO formula)', 'Sachet (reduced osmolarity)'],
    pediatric: {
      neonatal:   '50–100ml/kg over 3–4 hours',
      infant:     '50–100ml/kg over 3–4 hours for dehydration',
      child:      '50–100ml/kg over 3–4 hours + replacement of ongoing losses',
      adolescent: '50–100ml/kg for mild-moderate dehydration',
      frequency:  'Give small amounts frequently',
      route:      'Oral / NG',
      notes:      'WHO reduced osmolarity (245mOsm/L) preferred. Give 5–10ml every 1–2 min initially.',
    },
    adult: {
      dose:     '200–400ml after each loose stool',
      frequency:'As needed',
      route:    'Oral',
    },
    contraindications: ['Severe dehydration (use IV)', 'Paralytic ileus', 'Intractable vomiting'],
    interactions: [],
    sideEffects: ['Vomiting if given too fast'],
  },
];

// ── Interaction Database ──────────────────────────────────────────────────────
export interface DrugInteraction {
  drug1:    string;
  drug2:    string;
  severity: 'severe' | 'moderate' | 'mild';
  effect:   string;
  mechanism:string;
  action:   string;
}

export const INTERACTION_DB: DrugInteraction[] = [
  { drug1:'warfarin',       drug2:'ibuprofen',       severity:'severe',   effect:'Increased bleeding risk', mechanism:'Ibuprofen inhibits platelet aggregation and may displace warfarin from protein binding', action:'Avoid combination. If necessary, monitor INR closely and reduce warfarin dose.' },
  { drug1:'warfarin',       drug2:'aspirin',         severity:'severe',   effect:'Major bleeding risk',     mechanism:'Additive anticoagulant effects + GI irritation', action:'Avoid unless specifically indicated (e.g. mechanical heart valve). Closely monitor INR.' },
  { drug1:'warfarin',       drug2:'paracetamol',     severity:'moderate', effect:'Increased anticoagulant effect', mechanism:'Paracetamol reduces warfarin metabolism at doses > 2g/day', action:'Use lowest effective dose of paracetamol. Monitor INR if regular use.' },
  { drug1:'warfarin',       drug2:'metronidazole',   severity:'severe',   effect:'Significantly increased INR', mechanism:'Metronidazole inhibits CYP2C9, reducing warfarin metabolism', action:'Avoid if possible. If necessary, reduce warfarin dose by 25–50% and monitor INR daily.' },
  { drug1:'warfarin',       drug2:'azithromycin',    severity:'moderate', effect:'Increased anticoagulant effect', mechanism:'Azithromycin may inhibit warfarin metabolism', action:'Monitor INR closely during and after azithromycin course.' },
  { drug1:'warfarin',       drug2:'amoxicillin',     severity:'moderate', effect:'Increased anticoagulant effect', mechanism:'Amoxicillin reduces gut flora producing Vitamin K', action:'Monitor INR during antibiotic course.' },
  { drug1:'ibuprofen',      drug2:'aspirin',         severity:'moderate', effect:'Ibuprofen antagonises antiplatelet effect of aspirin', mechanism:'Competitive binding to COX-1', action:'Take aspirin at least 30 min before ibuprofen. Consider alternative analgesic.' },
  { drug1:'ibuprofen',      drug2:'methotrexate',    severity:'severe',   effect:'Methotrexate toxicity', mechanism:'NSAIDs reduce renal clearance of methotrexate', action:'Avoid combination. If unavoidable, withhold NSAID 24h before methotrexate and monitor closely.' },
  { drug1:'ibuprofen',      drug2:'prednisolone',    severity:'moderate', effect:'Increased GI ulceration risk', mechanism:'Additive GI mucosal damage', action:'Use with gastroprotection (PPI/H2 antagonist). Avoid if possible.' },
  { drug1:'metronidazole',  drug2:'alcohol',         severity:'severe',   effect:'Disulfiram-like reaction (flushing, vomiting, tachycardia)', mechanism:'Metronidazole inhibits aldehyde dehydrogenase', action:'Avoid alcohol during treatment and for 48 hours after completing course.' },
  { drug1:'prednisolone',   drug2:'ibuprofen',       severity:'moderate', effect:'Increased GI bleeding risk', mechanism:'Both drugs damage GI mucosa by different mechanisms', action:'Add PPI cover. Consider paracetamol as alternative analgesic.' },
  { drug1:'salbutamol',     drug2:'prednisolone',    severity:'mild',     effect:'Hypokalaemia risk', mechanism:'Both drugs lower serum potassium', action:'Monitor potassium in severe asthma treated with high doses of both.' },
  { drug1:'omeprazole',     drug2:'methotrexate',    severity:'moderate', effect:'Increased methotrexate toxicity', mechanism:'PPIs reduce renal tubular secretion of methotrexate', action:'Withhold omeprazole around high-dose methotrexate. Monitor methotrexate levels.' },
  { drug1:'cetirizine',     drug2:'alcohol',         severity:'mild',     effect:'Increased sedation', mechanism:'Additive CNS depression', action:'Advise patients to avoid alcohol.' },
  { drug1:'chlorphenamine', drug2:'alcohol',         severity:'moderate', effect:'Increased sedation', mechanism:'Additive CNS depression', action:'Avoid alcohol. Warn patients about driving.' },
  { drug1:'azithromycin',   drug2:'metronidazole',   severity:'moderate', effect:'QT prolongation risk', mechanism:'Both prolong QT interval', action:'ECG monitoring recommended. Avoid in patients with cardiac risk factors.' },
  { drug1:'amoxicillin',    drug2:'methotrexate',    severity:'moderate', effect:'Increased methotrexate toxicity', mechanism:'Amoxicillin reduces renal clearance of methotrexate', action:'Monitor methotrexate levels closely if combination unavoidable.' },
];

export function checkInteractions(drugs: string[]): DrugInteraction[] {
  const results: DrugInteraction[] = [];
  const normalised = drugs.map(d => d.toLowerCase().trim());

  for (let i = 0; i < normalised.length; i++) {
    for (let j = i + 1; j < normalised.length; j++) {
      const a = normalised[i];
      const b = normalised[j];

      INTERACTION_DB.forEach(interaction => {
        const d1 = interaction.drug1.toLowerCase();
        const d2 = interaction.drug2.toLowerCase();

        const match =
          (a.includes(d1) || d1.includes(a)) && (b.includes(d2) || d2.includes(b)) ||
          (a.includes(d2) || d2.includes(a)) && (b.includes(d1) || d1.includes(b));

        if (match) results.push(interaction);
      });
    }
  }

  return results;
}

export function calculateDose(drugName: string, weightKg: number, isChild: boolean, ageMonths: number): {
  dose: string;
  frequency: string;
  route: string;
  dailyDose: string;
  notes: string;
  warning?: string;
} | null {
  const drug = DRUG_DB.find(d =>
    d.generic.toLowerCase().includes(drugName.toLowerCase()) ||
    d.name.toLowerCase().includes(drugName.toLowerCase())
  );
  if (!drug) return null;

  if (!isChild) {
    return {
      dose:      drug.adult.dose,
      frequency: drug.adult.frequency,
      route:     drug.adult.route,
      dailyDose: drug.adult.maxDose || '—',
      notes:     drug.adult.notes || '',
    };
  }

  const p = drug.pediatric;
  let calculatedDose = '';
  let warning = '';

  if (p.mgPerKg) {
    const raw = weightKg * p.mgPerKg;
    const capped = p.maxDose ? Math.min(raw, p.maxDose) : raw;
    calculatedDose = `${Math.round(capped)}mg per dose`;
    if (raw > (p.maxDose || Infinity)) {
      warning = `⚠️ Dose capped at maximum ${p.maxDose}mg`;
    }
  } else if (p.mgPerKgDay) {
    const raw = weightKg * p.mgPerKgDay;
    const capped = p.maxDoseDay ? Math.min(raw, p.maxDoseDay) : raw;
    calculatedDose = `${Math.round(capped)}mg/day`;
  }

  const ageLabel = ageMonths < 1  ? p.neonatal   || p.infant || p.child || '—'
                 : ageMonths < 24 ? p.infant     || p.child  || '—'
                 : ageMonths < 144? p.child      || '—'
                 : p.adolescent || p.child || '—';

  return {
    dose:      calculatedDose || ageLabel,
    frequency: p.frequency,
    route:     p.route,
    dailyDose: p.maxDoseDay ? `Max ${p.maxDoseDay}mg/day` : '—',
    notes:     p.notes || '',
    warning,
  };
}
