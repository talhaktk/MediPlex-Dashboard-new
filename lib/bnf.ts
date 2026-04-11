// ─────────────────────────────────────────────────────────────────────────────
// MediPlex BNF/BNFC Drug Database
// Based on British National Formulary (BNF) and BNF for Children (BNFC)
// Public domain clinical dosing information
// ─────────────────────────────────────────────────────────────────────────────

export interface DrugInfo {
  name:        string;
  generic:     string;
  rxcui:       string;
  category:    string;
  forms:       string[];
  paediatric:  {
    neonatal?:   string;
    age1to11m?:  string;  // 1 month to 11 months
    age1to4y?:   string;  // 1-4 years
    age5to11y?:  string;  // 5-11 years
    age12to17y?: string;  // 12-17 years
    mgPerKg?:    number;
    maxDose?:    number;
    frequency:   string;
    route:       string;
    notes?:      string;
    warning?:    string;
  };
  adult: {
    standard:    string;
    max?:        string;
    frequency:   string;
    route:       string;
    notes?:      string;
  };
  contraindications: string[];
  cautions:          string[];
  sideEffects:       string[];
  monitoring?:       string;
  renalDose?:        string;
  hepaticDose?:      string;
}

export interface Interaction {
  drugs:     string[];
  severity:  'Contraindicated' | 'Severe' | 'Moderate' | 'Mild';
  effect:    string;
  mechanism: string;
  action:    string;
}

// ── Drug Database ─────────────────────────────────────────────────────────────
export const BNF_DRUGS: DrugInfo[] = [
  {
    name: 'Paracetamol (Acetaminophen)',
    generic: 'paracetamol', rxcui: '161',
    category: 'Analgesic / Antipyretic',
    forms: ['Tablet 500mg', 'Dispersible tablet 500mg', 'Oral suspension 120mg/5ml', 'Oral suspension 250mg/5ml', 'Suppository 60mg/125mg/250mg/500mg', 'IV infusion 10mg/ml'],
    paediatric: {
      neonatal:   '20mg/kg loading, then 10-15mg/kg every 6-8h',
      age1to11m:  '30-60mg every 4-6h (max 4 doses/24h)',
      age1to4y:   '120-250mg every 4-6h (max 4 doses/24h)',
      age5to11y:  '250-500mg every 4-6h (max 4 doses/24h)',
      age12to17y: '500mg-1g every 4-6h (max 4g/day)',
      mgPerKg: 15, maxDose: 1000,
      frequency: 'Every 4-6 hours (max 4 doses in 24 hours)',
      route: 'Oral / Rectal / IV',
      notes: 'Maximum 4 doses in 24 hours. Weight-based dosing: 15mg/kg/dose.',
      warning: 'Do not exceed stated dose. Hepatotoxicity risk in overdose.',
    },
    adult: {
      standard: '500mg-1g', max: '4g/day',
      frequency: 'Every 4-6 hours', route: 'Oral / Rectal / IV',
      notes: 'Reduce to max 3g/day in hepatic impairment or chronic alcohol use.',
    },
    contraindications: ['Hypersensitivity to paracetamol', 'Severe hepatic impairment'],
    cautions: ['Hepatic impairment', 'Chronic alcohol dependence', 'Malnutrition', 'Renal impairment (IV)'],
    sideEffects: ['Hepatotoxicity (overdose)', 'Rarely: thrombocytopenia, rash, hypersensitivity'],
    monitoring: 'LFTs in overdose. Paracetamol levels 4h post-ingestion in overdose.',
    hepaticDose: 'Reduce dose or avoid in severe hepatic impairment.',
  },
  {
    name: 'Ibuprofen',
    generic: 'ibuprofen', rxcui: '5640',
    category: 'NSAID / Analgesic / Antipyretic',
    forms: ['Tablet 200mg/400mg/600mg', 'Oral suspension 100mg/5ml', 'Gel 5%'],
    paediatric: {
      age1to11m:  '5mg/kg 3-4 times daily (3 months+)',
      age1to4y:   '5-10mg/kg 3-4 times daily',
      age5to11y:  '200-300mg 3-4 times daily',
      age12to17y: '300-400mg 3-4 times daily',
      mgPerKg: 10, maxDose: 400,
      frequency: 'Every 6-8 hours with food',
      route: 'Oral',
      notes: 'Give with or after food. Avoid in dehydration.',
      warning: 'Avoid in children under 3 months. Avoid in dehydration or renal impairment.',
    },
    adult: {
      standard: '200-400mg', max: '2.4g/day (OTC) / 3.2g/day (prescription)',
      frequency: 'Every 4-6 hours', route: 'Oral',
      notes: 'Take with food. Lowest effective dose for shortest time.',
    },
    contraindications: ['Age <3 months', 'Active peptic ulcer', 'Severe renal/hepatic/cardiac failure', 'NSAID hypersensitivity', 'Aspirin-sensitive asthma', 'Dehydration', '3rd trimester pregnancy'],
    cautions: ['Elderly', 'Asthma', 'Hypertension', 'Renal impairment', 'Cardiac disease', 'Concurrent anticoagulants'],
    sideEffects: ['GI upset', 'GI bleeding/ulceration', 'Renal impairment', 'Fluid retention', 'Hypertension', 'Bronchospasm (aspirin-sensitive)'],
    monitoring: 'Renal function in prolonged use or high risk. BP.',
    renalDose: 'Avoid if eGFR <30ml/min.',
  },
  {
    name: 'Aspirin',
    generic: 'aspirin', rxcui: '1191',
    category: 'Analgesic / Antiplatelet / Antipyretic',
    forms: ['Tablet 75mg (dispersible)', 'Tablet 300mg (dispersible)', 'Suppository 150mg/300mg/600mg'],
    paediatric: {
      age12to17y: '300-900mg every 4-6h (max 4g/day) — analgesic use',
      frequency: 'Every 4-6 hours',
      route: 'Oral',
      warning: '⛔ AVOID in children under 16 years — risk of Reye syndrome (fatal encephalopathy). Exception: Kawasaki disease 30-100mg/kg/day under specialist supervision only.',
    },
    adult: {
      standard: '300-900mg (analgesic) / 75mg once daily (antiplatelet)',
      max: '4g/day (analgesic)',
      frequency: 'Every 4-6h (analgesic) / Once daily (antiplatelet)',
      route: 'Oral',
      notes: 'Take after food. Dispersible tablet preferred.',
    },
    contraindications: ['Children <16 years (Reye syndrome)', 'Active peptic ulcer', 'Haemophilia', 'Severe hepatic impairment', 'NSAID hypersensitivity', 'Gout'],
    cautions: ['Elderly', 'Asthma', 'Renal impairment', 'Concurrent anticoagulants', 'Pregnancy (avoid 3rd trimester)'],
    sideEffects: ['GI irritation', 'GI bleeding', 'Reye syndrome (children)', 'Bronchospasm', 'Tinnitus (high doses)', 'Prolonged bleeding time'],
    monitoring: 'INR if on warfarin. Symptoms of GI bleeding.',
    renalDose: 'Avoid if eGFR <10ml/min.',
  },
  {
    name: 'Amoxicillin',
    generic: 'amoxicillin', rxcui: '723',
    category: 'Antibiotic — Aminopenicillin',
    forms: ['Capsule 250mg/500mg', 'Oral suspension 125mg/5ml', 'Oral suspension 250mg/5ml', 'Injection 250mg/500mg/1g'],
    paediatric: {
      neonatal:   '30mg/kg every 12h (up to 7 days old); every 8h (over 7 days)',
      age1to11m:  '125mg 3 times daily',
      age1to4y:   '250mg 3 times daily',
      age5to11y:  '250-500mg 3 times daily',
      age12to17y: '500mg 3 times daily (up to 1g 3 times daily for severe)',
      mgPerKg: 25, maxDose: 500,
      frequency: 'Every 8 hours (3 times daily)',
      route: 'Oral / IV / IM',
      notes: 'Double dose for severe infections (50mg/kg/day). Can be taken with or without food.',
    },
    adult: {
      standard: '250-500mg', max: '3g/day (oral)',
      frequency: 'Every 8 hours', route: 'Oral / IV / IM',
      notes: '3g single dose for uncomplicated UTI.',
    },
    contraindications: ['Penicillin hypersensitivity', 'Infectious mononucleosis (↑ rash risk)'],
    cautions: ['Renal impairment', 'History of allergy', 'Prolonged courses (risk of superinfection)'],
    sideEffects: ['Diarrhoea (common)', 'Nausea', 'Rash (especially in mononucleosis)', 'Hypersensitivity reactions', 'Clostridium difficile (prolonged use)'],
    monitoring: 'Renal function in prolonged use.',
    renalDose: 'Reduce frequency if eGFR <30ml/min.',
  },
  {
    name: 'Co-amoxiclav (Augmentin)',
    generic: 'co-amoxiclav', rxcui: '723',
    category: 'Antibiotic — Penicillin + β-lactamase inhibitor',
    forms: ['Tablet 375mg (250/125)', 'Tablet 625mg (500/125)', 'Suspension 125/31 per 5ml', 'Suspension 250/62 per 5ml', 'IV 600mg/1.2g'],
    paediatric: {
      neonatal:   '30mg/kg (amoxicillin component) every 12h',
      age1to11m:  '0.25ml/kg of 125/31 suspension 3 times daily',
      age1to4y:   '5ml of 125/31 suspension 3 times daily',
      age5to11y:  '5ml of 250/62 suspension 3 times daily',
      age12to17y: '375-625mg 3 times daily',
      mgPerKg: 25, maxDose: 500,
      frequency: 'Every 8 hours WITH food',
      route: 'Oral / IV',
      notes: 'ALWAYS give with food to reduce GI side effects. Use 7:1 ratio formulation for children.',
      warning: 'Risk of cholestatic jaundice — avoid if previous co-amoxiclav-associated jaundice.',
    },
    adult: {
      standard: '375-625mg', max: '1.875g/day (oral)',
      frequency: 'Every 8-12 hours WITH food', route: 'Oral / IV',
      notes: 'IV: 1.2g every 8h. Always take with food.',
    },
    contraindications: ['Penicillin hypersensitivity', 'Previous co-amoxiclav jaundice/hepatic dysfunction', 'Infectious mononucleosis'],
    cautions: ['Hepatic impairment', 'Renal impairment', 'History of allergy'],
    sideEffects: ['Diarrhoea (very common)', 'Nausea', 'Rash', 'Cholestatic jaundice', 'Hepatitis (rare)'],
    monitoring: 'LFTs in prolonged use or hepatic impairment.',
    hepaticDose: 'Avoid in severe hepatic impairment.',
    renalDose: 'Reduce dose if eGFR <30ml/min.',
  },
  {
    name: 'Azithromycin',
    generic: 'azithromycin', rxcui: '18631',
    category: 'Antibiotic — Macrolide',
    forms: ['Capsule 250mg', 'Tablet 500mg', 'Oral suspension 200mg/5ml', 'IV 500mg'],
    paediatric: {
      age1to11m:  '10mg/kg once daily for 3 days',
      age1to4y:   '10mg/kg (max 500mg) on day 1, then 5mg/kg (max 250mg) days 2-5',
      age5to11y:  '10mg/kg (max 500mg) on day 1, then 5mg/kg (max 250mg) days 2-5',
      age12to17y: '500mg on day 1, then 250mg on days 2-5',
      mgPerKg: 10, maxDose: 500,
      frequency: 'Once daily (3-5 day course)',
      route: 'Oral / IV',
      notes: 'Give capsules on empty stomach. Suspension can be taken with food.',
    },
    adult: {
      standard: '500mg day 1, then 250mg days 2-5',
      max: '500mg/day', frequency: 'Once daily', route: 'Oral / IV',
      notes: 'Single 1g dose for chlamydia. Give capsules on empty stomach.',
    },
    contraindications: ['Macrolide hypersensitivity', 'History of QT prolongation', 'Severe hepatic impairment'],
    cautions: ['Cardiac arrhythmias', 'QT prolongation risk', 'Myasthenia gravis', 'Renal/hepatic impairment'],
    sideEffects: ['GI disturbance (common)', 'QT prolongation', 'Hepatotoxicity (rare)', 'Hearing disturbance (high dose)'],
    monitoring: 'ECG if cardiac risk factors. LFTs in prolonged use.',
    hepaticDose: 'Avoid in severe hepatic impairment.',
  },
  {
    name: 'Metronidazole',
    generic: 'metronidazole', rxcui: '4337',
    category: 'Antibiotic — Nitroimidazole / Antiprotozoal',
    forms: ['Tablet 200mg/400mg/500mg', 'Oral suspension 200mg/5ml', 'IV infusion 500mg/100ml', 'Suppository 500mg/1g', 'Gel 0.75%'],
    paediatric: {
      neonatal:   '7.5mg/kg every 12h (0-7 days); every 8h (7-28 days)',
      age1to11m:  '7.5mg/kg every 8h',
      age1to4y:   '7.5mg/kg (max 400mg) every 8h',
      age5to11y:  '7.5mg/kg (max 400mg) every 8h',
      age12to17y: '400mg every 8h',
      mgPerKg: 7.5, maxDose: 400,
      frequency: 'Every 8 hours',
      route: 'Oral / IV / Rectal',
      notes: 'Avoid alcohol during and for 48h after course. Metallic taste is common.',
    },
    adult: {
      standard: '400mg every 8h (anaerobic infections)',
      max: '4g/day (severe infections)', frequency: 'Every 8 hours', route: 'Oral / IV / Rectal',
      notes: 'Avoid alcohol during and 48h after. 7-10 day course for most infections.',
    },
    contraindications: ['First trimester pregnancy (relative)', 'Hypersensitivity'],
    cautions: ['Hepatic impairment', 'Disulfiram use', 'Lithium therapy', 'Avoid alcohol'],
    sideEffects: ['Metallic taste (very common)', 'Nausea', 'Peripheral neuropathy (prolonged)', 'Disulfiram-like reaction with alcohol', 'Dark urine'],
    monitoring: 'Neurological symptoms in prolonged use.',
    hepaticDose: 'Reduce dose in severe hepatic impairment.',
  },
  {
    name: 'Clarithromycin',
    generic: 'clarithromycin', rxcui: '21212',
    category: 'Antibiotic — Macrolide',
    forms: ['Tablet 250mg/500mg', 'Oral suspension 125mg/5ml', 'Oral suspension 250mg/5ml', 'IV 500mg'],
    paediatric: {
      age1to11m:  '7.5mg/kg twice daily',
      age1to4y:   '125mg twice daily',
      age5to11y:  '250mg twice daily',
      age12to17y: '250-500mg twice daily',
      mgPerKg: 7.5, maxDose: 500,
      frequency: 'Every 12 hours (twice daily)',
      route: 'Oral / IV',
      notes: 'Can be taken with or without food. 7 days for most infections.',
    },
    adult: {
      standard: '250-500mg', max: '1g/day',
      frequency: 'Every 12 hours', route: 'Oral / IV',
    },
    contraindications: ['Macrolide hypersensitivity', 'QT prolongation', 'Severe hepatic impairment', 'Concurrent: ergotamine, statins (see interactions)'],
    cautions: ['Cardiac arrhythmias', 'Hepatic/renal impairment', 'Myasthenia gravis'],
    sideEffects: ['GI disturbance', 'Hepatotoxicity', 'QT prolongation', 'Taste disturbance'],
    monitoring: 'ECG if cardiac risk. LFTs.',
    renalDose: 'Halve dose if eGFR <30ml/min.',
  },
  {
    name: 'Ciprofloxacin',
    generic: 'ciprofloxacin', rxcui: '2551',
    category: 'Antibiotic — Fluoroquinolone',
    forms: ['Tablet 250mg/500mg/750mg', 'Oral suspension 250mg/5ml', 'IV infusion 2mg/ml', 'Eye drops 0.3%'],
    paediatric: {
      age1to11m:  '10-15mg/kg twice daily (specialist use)',
      age1to4y:   '10-15mg/kg (max 750mg) twice daily',
      age5to11y:  '10-15mg/kg (max 750mg) twice daily',
      age12to17y: '250-750mg twice daily',
      mgPerKg: 15, maxDose: 750,
      frequency: 'Every 12 hours (twice daily)',
      route: 'Oral / IV',
      notes: 'Use with caution in children — risk of arthropathy. Reserved for resistant/serious infections.',
      warning: 'Avoid routine use in children. Risk of tendinopathy. Take 2h before antacids/iron/dairy.',
    },
    adult: {
      standard: '250-750mg', max: '1.5g/day (oral)',
      frequency: 'Every 12 hours', route: 'Oral / IV',
      notes: 'Take 2h before or 6h after antacids/iron/calcium. Avoid in tendon disorders.',
    },
    contraindications: ['Quinolone hypersensitivity', 'History of tendon disorders with quinolones', 'QT prolongation'],
    cautions: ['Epilepsy', 'G6PD deficiency', 'Myasthenia gravis', 'Elderly (tendon risk)'],
    sideEffects: ['GI disturbance', 'Tendinopathy/rupture', 'CNS effects (dizziness, headache)', 'QT prolongation', 'Photosensitivity'],
    monitoring: 'Tendon pain — stop immediately if occurs.',
    renalDose: 'Reduce dose if eGFR <30ml/min.',
  },
  {
    name: 'Omeprazole',
    generic: 'omeprazole', rxcui: '7646',
    category: 'Proton Pump Inhibitor (PPI)',
    forms: ['Capsule 10mg/20mg/40mg', 'MUPS tablet 10mg/20mg/40mg', 'IV 40mg'],
    paediatric: {
      age1to11m:  '700mcg/kg once daily (GERD — specialist)',
      age1to4y:   '10mg once daily',
      age5to11y:  '10-20mg once daily',
      age12to17y: '20-40mg once daily',
      mgPerKg: 1, maxDose: 40,
      frequency: 'Once daily, 30-60 minutes before food',
      route: 'Oral / IV',
      notes: 'Capsules can be opened and contents mixed with slightly acidic drink. Do not crush tablets.',
    },
    adult: {
      standard: '20-40mg', max: '80mg/day (Zollinger-Ellison)',
      frequency: 'Once daily (30-60 min before food)', route: 'Oral / IV',
      notes: 'Maintenance: 10-20mg daily. Swallow capsules whole.',
    },
    contraindications: ['PPI hypersensitivity'],
    cautions: ['Risk of hypomagnesaemia (>1 year use)', 'Clostridium difficile risk', 'Osteoporosis risk (long-term)', 'Hepatic impairment'],
    sideEffects: ['Headache', 'GI disturbance', 'Hypomagnesaemia (long-term)', 'C. difficile', 'Bone fractures (long-term)', 'Vitamin B12 deficiency (long-term)'],
    monitoring: 'Mg²⁺ if on prolonged therapy. Reassess need regularly.',
    hepaticDose: 'Max 20mg/day in severe hepatic impairment.',
  },
  {
    name: 'Prednisolone',
    generic: 'prednisolone', rxcui: '8638',
    category: 'Corticosteroid',
    forms: ['Tablet 1mg/5mg/10mg/25mg', 'Soluble tablet 5mg', 'Oral solution 5mg/5ml', 'Oral solution 10mg/5ml'],
    paediatric: {
      neonatal:   'Specialist use only',
      age1to11m:  '1-2mg/kg once daily (acute asthma: 1-2mg/kg, max 40mg)',
      age1to4y:   '1-2mg/kg (max 40mg) once daily',
      age5to11y:  '1-2mg/kg (max 40mg) once daily',
      age12to17y: '40mg once daily',
      mgPerKg: 1, maxDose: 40,
      frequency: 'Once daily in the morning',
      route: 'Oral',
      notes: 'Acute asthma: 1-2mg/kg/day (max 40mg) for 3-5 days. Croup: single dose 0.15mg/kg. Nephrotic syndrome: 2mg/kg/day (max 60mg).',
      warning: 'Growth suppression with prolonged use. Adrenal suppression. Do not stop abruptly after prolonged use.',
    },
    adult: {
      standard: '5-60mg daily',
      max: '60mg/day initially',
      frequency: 'Once daily in the morning', route: 'Oral',
      notes: 'Reduce gradually if used >3 weeks. Steroid card if prolonged use. Take with food.',
    },
    contraindications: ['Systemic infection without antimicrobial cover (relative)', 'Live vaccines during immunosuppressive doses'],
    cautions: ['Diabetes', 'Hypertension', 'Peptic ulcer', 'Osteoporosis', 'Psychiatric disorders', 'Ocular herpes simplex'],
    sideEffects: ['Cushing syndrome (prolonged)', 'Adrenal suppression', 'Growth retardation (children)', 'Hyperglycaemia', 'Osteoporosis', 'Hypertension', 'Mood changes', 'Increased infection risk'],
    monitoring: 'Blood glucose. Blood pressure. Bone density (long-term). Growth in children.',
  },
  {
    name: 'Salbutamol (Albuterol)',
    generic: 'salbutamol', rxcui: '435',
    category: 'Short-acting Beta-2 agonist (SABA) — Bronchodilator',
    forms: ['Inhaler 100mcg/actuation', 'Nebuliser solution 2.5mg/2.5ml', 'Nebuliser solution 5mg/2.5ml', 'Syrup 2mg/5ml', 'Tablet 2mg/4mg', 'IV'],
    paediatric: {
      neonatal:   '100-200mcg via nebuliser every 4-6h',
      age1to11m:  '2.5mg via nebuliser / 100mcg inhaler every 4-6h PRN',
      age1to4y:   '2.5mg via nebuliser / 100-200mcg inhaler PRN',
      age5to11y:  '2.5-5mg via nebuliser / 200mcg inhaler PRN',
      age12to17y: '2.5-5mg via nebuliser / 200-400mcg inhaler PRN',
      frequency: 'Every 4-6 hours PRN (up to 4x/day regularly)',
      route: 'Inhaled (preferred) / Nebulised / Oral (rarely)',
      notes: 'Inhaled route preferred. Spacer device for children. Acute severe asthma: 2.5-5mg nebuliser every 20-30 min.',
      warning: 'Hypokalaemia risk with high doses. Monitor heart rate.',
    },
    adult: {
      standard: '100-200mcg inhaler / 2.5mg nebuliser',
      frequency: 'Every 4-6 hours PRN', route: 'Inhaled / Nebulised',
      notes: 'Use spacer. Acute: up to 4 puffs every 10-20 min in emergency.',
    },
    contraindications: ['Hypersensitivity'],
    cautions: ['Hyperthyroidism', 'Cardiovascular disease', 'Diabetes', 'Hypokalaemia risk (high doses)'],
    sideEffects: ['Tremor', 'Palpitations/tachycardia', 'Headache', 'Hypokalaemia (high doses)', 'Paradoxical bronchospasm (rarely)'],
    monitoring: 'Potassium in high doses. Heart rate.',
  },
  {
    name: 'Cetirizine',
    generic: 'cetirizine', rxcui: '20610',
    category: 'Non-sedating Antihistamine (H1)',
    forms: ['Tablet 10mg', 'Oral solution 5mg/5ml', 'Oral drops 10mg/ml'],
    paediatric: {
      age1to11m:  '0.25mg/kg twice daily (6-12 months, unlicensed)',
      age1to4y:   '2.5mg twice daily',
      age5to11y:  '5mg twice daily or 10mg once daily',
      age12to17y: '10mg once daily',
      mgPerKg: 0.25, maxDose: 10,
      frequency: 'Once or twice daily',
      route: 'Oral',
      notes: 'Can be taken with or without food. Evening dosing may reduce any sedation.',
    },
    adult: {
      standard: '10mg', max: '10mg/day',
      frequency: 'Once daily', route: 'Oral',
      notes: 'Halve dose in renal impairment.',
    },
    contraindications: ['Hypersensitivity to cetirizine or hydroxyzine'],
    cautions: ['Renal impairment', 'Epilepsy', 'Urinary retention', 'Prostatic hypertrophy'],
    sideEffects: ['Somnolence', 'Headache', 'Dry mouth', 'Dizziness', 'Fatigue'],
    renalDose: '5mg/day if eGFR 30-50ml/min. 5mg every 2 days if eGFR <30ml/min.',
  },
  {
    name: 'Metformin',
    generic: 'metformin', rxcui: '6809',
    category: 'Biguanide — Antidiabetic',
    forms: ['Tablet 500mg/850mg/1000mg', 'Oral solution 500mg/5ml', 'Modified-release tablet 500mg/750mg/1000mg'],
    paediatric: {
      age5to11y:  '500mg once daily with meals (type 2 DM — specialist)',
      age12to17y: '500mg 2-3 times daily with meals, increase gradually',
      mgPerKg: 0, maxDose: 2000,
      frequency: 'With or after meals (reduces GI side effects)',
      route: 'Oral',
      notes: 'Increase dose slowly over 4 weeks. Max 2g/day in children.',
    },
    adult: {
      standard: '500mg 2-3 times daily with meals',
      max: '3g/day (in 2-3 divided doses)',
      frequency: 'With meals (2-3 times daily)', route: 'Oral',
      notes: 'Start 500mg once or twice daily, increase slowly. Modified-release taken once daily with evening meal.',
    },
    contraindications: ['eGFR <30ml/min', 'Acute/decompensated heart failure', 'Respiratory failure', 'Hepatic impairment', 'Alcohol misuse', 'Iodinated contrast (stop 48h before)'],
    cautions: ['Renal impairment (monitor)', 'Elderly', 'Contrast media', 'Surgery (omit on day of)'],
    sideEffects: ['GI disturbance (very common — nausea, diarrhoea)', 'Lactic acidosis (rare but serious)', 'Vitamin B12 deficiency (long-term)', 'Metallic taste'],
    monitoring: 'eGFR at least annually. Vitamin B12 every 2-3 years.',
    renalDose: 'Reduce dose if eGFR 30-45ml/min. Stop if eGFR <30ml/min.',
  },
  {
    name: 'Atorvastatin',
    generic: 'atorvastatin', rxcui: '83367',
    category: 'Statin — HMG-CoA reductase inhibitor',
    forms: ['Tablet 10mg/20mg/40mg/80mg'],
    paediatric: {
      age5to11y:  '5-10mg once daily (familial hypercholesterolaemia — specialist)',
      age12to17y: '10-20mg once daily',
      frequency: 'Once daily (any time)',
      route: 'Oral',
      notes: 'Specialist use only in children. Monitor LFTs.',
    },
    adult: {
      standard: '10-80mg once daily',
      max: '80mg/day',
      frequency: 'Once daily (any time of day)', route: 'Oral',
      notes: 'Start 10mg for primary prevention. 80mg for high cardiovascular risk.',
    },
    contraindications: ['Active liver disease', 'Unexplained elevated LFTs', 'Pregnancy', 'Breastfeeding', 'Myopathy'],
    cautions: ['Hypothyroidism', 'Alcohol misuse', 'History of muscle disorders', 'Concurrent drugs increasing statin levels'],
    sideEffects: ['Myalgia (common)', 'Elevated CK', 'Rhabdomyolysis (rare)', 'Hepatotoxicity', 'GI disturbance', 'Hyperglycaemia'],
    monitoring: 'LFTs before and 3 months after starting. CK if myalgia. Fasting lipids.',
    hepaticDose: 'Avoid in active liver disease.',
  },
  {
    name: 'Warfarin',
    generic: 'warfarin', rxcui: '11289',
    category: 'Anticoagulant — Vitamin K antagonist',
    forms: ['Tablet 0.5mg/1mg/3mg/5mg'],
    paediatric: {
      neonatal:   '0.1mg/kg loading (specialist only)',
      age1to11m:  '0.1-0.2mg/kg/day adjusted to INR',
      age1to4y:   '0.1mg/kg/day adjusted to INR',
      age5to11y:  '0.1mg/kg/day adjusted to INR',
      age12to17y: 'Individualised — same as adult',
      frequency: 'Once daily at same time each day',
      route: 'Oral',
      notes: 'Dose entirely guided by INR. Very sensitive to drug and food interactions.',
      warning: 'Extremely sensitive to interactions. INR monitoring essential.',
    },
    adult: {
      standard: '5-10mg loading, then individualised',
      frequency: 'Once daily (same time)',
      route: 'Oral',
      notes: 'Target INR depends on indication (usually 2-3 for AF/DVT, 2.5-3.5 for mechanical valves). Consistent vitamin K intake.',
    },
    contraindications: ['Peptic ulcer', 'Severe hypertension', 'Bacterial endocarditis', 'Recent surgery on CNS or eye', 'Pregnancy (1st and 3rd trimester)'],
    cautions: ['Numerous drug interactions', 'Inconsistent vitamin K intake', 'Elderly', 'Renal/hepatic impairment'],
    sideEffects: ['Haemorrhage (main risk)', 'Skin necrosis (rare)', 'Purple toe syndrome'],
    monitoring: 'INR — check frequently when starting, changing dose, or starting new drugs. Target INR based on indication.',
  },
  {
    name: 'Amlodipine',
    generic: 'amlodipine', rxcui: '17767',
    category: 'Calcium channel blocker (dihydropyridine)',
    forms: ['Tablet 5mg/10mg', 'Oral solution 5mg/5ml'],
    paediatric: {
      age1to11m:  '0.1-0.3mg/kg once daily (hypertension — specialist)',
      age1to4y:   '0.1-0.3mg/kg once daily',
      age5to11y:  '2.5-5mg once daily',
      age12to17y: '5mg once daily (max 10mg)',
      mgPerKg: 0.1, maxDose: 10,
      frequency: 'Once daily',
      route: 'Oral',
    },
    adult: {
      standard: '5mg once daily', max: '10mg/day',
      frequency: 'Once daily', route: 'Oral',
      notes: 'Can be taken with or without food.',
    },
    contraindications: ['Cardiogenic shock', 'Significant aortic stenosis', 'Unstable angina', 'Hypersensitivity'],
    cautions: ['Hepatic impairment', 'Elderly', 'Heart failure'],
    sideEffects: ['Peripheral oedema (common)', 'Headache', 'Flushing', 'Dizziness', 'Palpitations', 'Ankle swelling'],
    hepaticDose: 'Start with 2.5mg; titrate slowly in hepatic impairment.',
  },
  {
    name: 'Lisinopril',
    generic: 'lisinopril', rxcui: '29046',
    category: 'ACE Inhibitor',
    forms: ['Tablet 2.5mg/5mg/10mg/20mg', 'Oral solution 1mg/ml'],
    paediatric: {
      age1to4y:   '0.07mg/kg once daily (max 5mg) — hypertension, specialist',
      age5to11y:  '0.07mg/kg once daily (max 5mg)',
      age12to17y: '2.5-5mg once daily',
      mgPerKg: 0.07, maxDose: 40,
      frequency: 'Once daily',
      route: 'Oral',
      warning: 'Contraindicated in renal artery stenosis. Monitor potassium and renal function.',
    },
    adult: {
      standard: '2.5-10mg once daily (start low)',
      max: '80mg/day', frequency: 'Once daily', route: 'Oral',
      notes: 'Start 2.5mg in heart failure or post-MI. Check K⁺ and renal function 1-2 weeks after starting.',
    },
    contraindications: ['Angioedema history', 'Bilateral renal artery stenosis', 'Pregnancy', 'Concurrent sacubitril-valsartan'],
    cautions: ['Renal impairment', 'Hyperkalaemia risk', 'Elderly', 'Volume depletion'],
    sideEffects: ['Dry persistent cough (very common — class effect)', 'Hyperkalaemia', 'Renal impairment', 'Hypotension (first dose)', 'Angioedema (rare but serious)'],
    monitoring: 'K⁺ and creatinine 1-2 weeks after starting and after dose changes. BP.',
    renalDose: 'Reduce starting dose; adjust based on response.',
  },
  {
    name: 'Furosemide',
    generic: 'furosemide', rxcui: '4603',
    category: 'Loop diuretic',
    forms: ['Tablet 20mg/40mg/500mg', 'Oral solution 20mg/5ml', 'Injection 10mg/ml'],
    paediatric: {
      neonatal:   '0.5-1mg/kg every 12-24h',
      age1to11m:  '0.5-2mg/kg 1-2 times daily',
      age1to4y:   '0.5-2mg/kg (max 80mg) 1-2 times daily',
      age5to11y:  '0.5-2mg/kg (max 80mg) 1-2 times daily',
      age12to17y: '20-40mg in the morning',
      mgPerKg: 1, maxDose: 80,
      frequency: 'Once or twice daily (morning)',
      route: 'Oral / IV / IM',
      notes: 'Take in morning to avoid nocturia. Monitor electrolytes.',
    },
    adult: {
      standard: '20-80mg daily', max: '600mg/day (resistant oedema)',
      frequency: 'Once or twice daily in the morning', route: 'Oral / IV',
      notes: 'Monitor electrolytes, especially K⁺.',
    },
    contraindications: ['Anuria', 'Comatose/pre-comatose hepatic failure', 'Hypovolaemia', 'Hypokalaemia', 'Hyponatraemia'],
    cautions: ['Prostatic hypertrophy', 'Hepatic impairment', 'Gout', 'Diabetes'],
    sideEffects: ['Hypokalaemia', 'Hyponatraemia', 'Hypochloraemic alkalosis', 'Ototoxicity (IV high dose)', 'Gout', 'Hyperuricaemia'],
    monitoring: 'Electrolytes (Na⁺, K⁺) regularly. Renal function. BP.',
    renalDose: 'Higher doses may be needed. Avoid in severe renal failure (except specialist use).',
  },
  {
    name: 'Ondansetron',
    generic: 'ondansetron', rxcui: '103234',
    category: '5-HT3 antagonist — Antiemetic',
    forms: ['Tablet 4mg/8mg', 'Orodispersible tablet 4mg/8mg', 'Oral lyophilisate 4mg/8mg', 'Oral solution 4mg/5ml', 'IV/IM injection 2mg/ml', 'Suppository 16mg'],
    paediatric: {
      neonatal:   'Not recommended',
      age1to11m:  '0.1mg/kg IV (max 4mg) — specialist, for chemotherapy-induced',
      age1to4y:   '0.1mg/kg (max 4mg) 3 times daily',
      age5to11y:  '4mg 3 times daily',
      age12to17y: '8mg twice daily (oral)',
      mgPerKg: 0.1, maxDose: 8,
      frequency: 'Every 8-12 hours',
      route: 'Oral / IV / IM',
      notes: 'For postoperative N&V: single 0.1mg/kg IV (max 4mg). Licensed from 1 month for PONV.',
    },
    adult: {
      standard: '4-8mg 2-3 times daily',
      max: '24mg/day (oral) / 32mg/day (IV - specialist)',
      frequency: 'Every 8-12 hours', route: 'Oral / IV / IM',
      notes: 'IV: max 16mg single dose. QT prolongation risk — limit IV doses.',
    },
    contraindications: ['Congenital QT prolongation', 'Concurrent apomorphine'],
    cautions: ['Subacute intestinal obstruction', 'Cardiac arrhythmias', 'QT prolongation', 'Hepatic impairment'],
    sideEffects: ['Constipation (common)', 'Headache', 'Flushing', 'QT prolongation', 'Dizziness'],
    monitoring: 'ECG if IV high doses or cardiac risk.',
    hepaticDose: 'Max 8mg/day in severe hepatic impairment.',
  },
];

// ── Interaction Database ────────────────────────────────────────────────────
export const BNF_INTERACTIONS: Interaction[] = [
  // Warfarin interactions
  {drugs:['warfarin','aspirin'],        severity:'Severe',         effect:'Significantly increased bleeding risk — additive anticoagulant + antiplatelet effects', mechanism:'Aspirin inhibits platelet function and has anticoagulant properties; may displace warfarin from protein binding', action:'Avoid unless specifically indicated (e.g. mechanical heart valve with AF). If used together, use lowest aspirin dose (75mg) and monitor INR closely.'},
  {drugs:['warfarin','ibuprofen'],      severity:'Severe',         effect:'Major increase in bleeding risk', mechanism:'NSAIDs inhibit platelet aggregation, cause GI mucosal damage, and may displace warfarin from protein binding', action:'Avoid NSAIDs with warfarin. Use paracetamol for analgesia. If NSAID essential, add gastroprotection and monitor INR.'},
  {drugs:['warfarin','naproxen'],       severity:'Severe',         effect:'Major increase in bleeding risk', mechanism:'NSAID antiplatelet effect + GI mucosal damage', action:'Avoid. Use paracetamol instead.'},
  {drugs:['warfarin','metronidazole'],  severity:'Severe',         effect:'INR significantly increased — major bleeding risk', mechanism:'Metronidazole inhibits CYP2C9 (main warfarin metabolising enzyme), reducing warfarin clearance by up to 50%', action:'Avoid if possible. If essential, reduce warfarin dose by 25-50% and monitor INR daily during course and 1 week after.'},
  {drugs:['warfarin','fluconazole'],    severity:'Severe',         effect:'INR greatly increased', mechanism:'Fluconazole strongly inhibits CYP2C9', action:'Avoid if possible. If essential, reduce warfarin dose by 50% and monitor INR closely.'},
  {drugs:['warfarin','amiodarone'],     severity:'Severe',         effect:'INR greatly increased — develops slowly over weeks', mechanism:'Amiodarone inhibits CYP2C9 and CYP3A4; effect persists weeks after stopping amiodarone', action:'Reduce warfarin dose by 30-50% when starting amiodarone. Monitor INR weekly until stable.'},
  {drugs:['warfarin','ciprofloxacin'],  severity:'Moderate',       effect:'INR may increase', mechanism:'Ciprofloxacin reduces gut flora affecting Vitamin K production and may inhibit warfarin metabolism', action:'Monitor INR more frequently during antibiotic course and 1 week after.'},
  {drugs:['warfarin','azithromycin'],   severity:'Moderate',       effect:'INR may increase', mechanism:'May inhibit warfarin metabolism', action:'Monitor INR during and after course.'},
  {drugs:['warfarin','clarithromycin'], severity:'Moderate',       effect:'INR increased', mechanism:'Clarithromycin inhibits CYP3A4', action:'Monitor INR closely during course.'},
  {drugs:['warfarin','amoxicillin'],    severity:'Mild',           effect:'INR may increase slightly', mechanism:'Gut flora reduction reducing Vitamin K production', action:'Monitor INR during course.'},
  {drugs:['warfarin','paracetamol'],    severity:'Moderate',       effect:'INR may increase at doses >1.5-2g/day', mechanism:'Paracetamol reduces warfarin metabolism; mechanism not fully understood', action:'Use lowest effective dose. Monitor INR if taking regularly.'},

  // NSAID interactions
  {drugs:['aspirin','ibuprofen'],       severity:'Moderate',       effect:'Ibuprofen competitively blocks aspirin antiplatelet effect', mechanism:'Ibuprofen occupies COX-1 binding site, preventing irreversible acetylation by aspirin', action:'Take aspirin at least 30 minutes before ibuprofen, or use an alternative analgesic (paracetamol).'},
  {drugs:['ibuprofen','methotrexate'],  severity:'Severe',         effect:'Methotrexate toxicity — potentially fatal', mechanism:'NSAIDs reduce renal tubular secretion of methotrexate, increasing levels significantly', action:'Contraindicated with high-dose methotrexate. With low-dose methotrexate: avoid or withhold NSAID and monitor MTX levels.'},
  {drugs:['ibuprofen','prednisolone'],  severity:'Moderate',       effect:'Increased risk of GI ulceration and bleeding', mechanism:'Additive gastric mucosal damage — NSAIDs inhibit prostaglandins, corticosteroids impair mucosal healing', action:'Add PPI gastroprotection (e.g. omeprazole 20mg). Prefer paracetamol if appropriate.'},
  {drugs:['ibuprofen','lithium'],       severity:'Severe',         effect:'Lithium toxicity — neurotoxicity risk', mechanism:'NSAIDs reduce renal lithium clearance by inhibiting prostaglandin-mediated renal blood flow', action:'Avoid NSAIDs with lithium. Use paracetamol instead. If NSAID essential, reduce lithium dose and monitor levels closely.'},
  {drugs:['ibuprofen','furosemide'],    severity:'Moderate',       effect:'Reduced diuretic effect; risk of acute renal failure', mechanism:'NSAIDs inhibit prostaglandin-mediated renal blood flow, opposing diuretic effect', action:'Avoid if possible. Monitor BP, fluid balance, and renal function. Prefer paracetamol.'},
  {drugs:['ibuprofen','lisinopril'],    severity:'Moderate',       effect:'Reduced antihypertensive effect; acute renal failure risk (triple whammy: ACEI + diuretic + NSAID)', mechanism:'NSAIDs reduce prostaglandin-mediated vasodilation needed for renal perfusion', action:'Avoid if possible, especially in the elderly or those with renal impairment. Monitor BP and renal function.'},

  // Statin interactions
  {drugs:['simvastatin','clarithromycin'],severity:'Severe',       effect:'Greatly increased simvastatin levels — rhabdomyolysis risk', mechanism:'Clarithromycin is a potent CYP3A4 inhibitor; simvastatin is extensively metabolised by CYP3A4', action:'Stop simvastatin during clarithromycin course. Restart after completing antibiotic.'},
  {drugs:['simvastatin','amiodarone'],  severity:'Severe',         effect:'Increased simvastatin levels — myopathy/rhabdomyolysis risk', mechanism:'Amiodarone inhibits CYP3A4', action:'Limit simvastatin to 20mg/day when used with amiodarone.'},
  {drugs:['simvastatin','amlodipine'],  severity:'Moderate',       effect:'Increased simvastatin exposure', mechanism:'Amlodipine weakly inhibits CYP3A4', action:'Limit simvastatin to 20mg/day. Alternatively, switch to a statin not metabolised by CYP3A4 (e.g. pravastatin, rosuvastatin).'},
  {drugs:['atorvastatin','clarithromycin'],severity:'Moderate',    effect:'Increased atorvastatin levels — myopathy risk', mechanism:'Clarithromycin inhibits CYP3A4', action:'Use lowest effective atorvastatin dose during clarithromycin. Monitor for muscle symptoms.'},

  // Cardiac medications
  {drugs:['digoxin','amiodarone'],      severity:'Severe',         effect:'Digoxin toxicity — nausea, bradycardia, arrhythmias', mechanism:'Amiodarone increases digoxin levels by ~50% (reduced renal and non-renal clearance)', action:'Reduce digoxin dose by 50% when starting amiodarone. Monitor digoxin levels and ECG closely.'},
  {drugs:['digoxin','clarithromycin'],  severity:'Severe',         effect:'Digoxin toxicity', mechanism:'Clarithromycin reduces gut bacteria that metabolise digoxin, increasing absorption by up to 40%', action:'Monitor digoxin levels closely. May need to reduce digoxin dose.'},
  {drugs:['metronidazole','alcohol'],   severity:'Severe',         effect:'Disulfiram-like reaction: severe flushing, vomiting, palpitations, hypotension', mechanism:'Metronidazole inhibits aldehyde dehydrogenase, causing acetaldehyde accumulation', action:'Absolutely avoid all alcohol during treatment and for 48 hours after completing course.'},
  {drugs:['clopidogrel','omeprazole'],  severity:'Moderate',       effect:'Reduced antiplatelet effect of clopidogrel', mechanism:'Omeprazole inhibits CYP2C19, which is needed to convert clopidogrel to its active metabolite', action:'Use pantoprazole or lansoprazole instead of omeprazole or esomeprazole.'},
  {drugs:['sildenafil','nitrates'],     severity:'Contraindicated',effect:'Severe, potentially fatal hypotension', mechanism:'Synergistic vasodilation — both increase cGMP levels in vascular smooth muscle', action:'Absolutely contraindicated. Never combine. Nitrates must be avoided for 24h after sildenafil.'},

  // Antibiotic interactions
  {drugs:['ciprofloxacin','antacids'],  severity:'Moderate',       effect:'Ciprofloxacin absorption reduced by up to 90%', mechanism:'Divalent/trivalent cations (Mg²⁺, Al³⁺, Ca²⁺) chelate ciprofloxacin in gut', action:'Take ciprofloxacin 2h before or 6h after antacids, iron, zinc, calcium, or dairy.'},
  {drugs:['metformin','alcohol'],       severity:'Moderate',       effect:'Increased risk of lactic acidosis', mechanism:'Alcohol promotes lactic acidosis in combination with metformin', action:'Advise patient to avoid excessive alcohol. Avoid in binge drinkers.'},
  {drugs:['levothyroxine','calcium'],   severity:'Moderate',       effect:'Reduced levothyroxine absorption by up to 40%', mechanism:'Calcium forms insoluble complex with levothyroxine in gut', action:'Take levothyroxine at least 4 hours apart from calcium supplements, antacids, or iron.'},
  {drugs:['tramadol','sertraline'],     severity:'Severe',         effect:'Serotonin syndrome — agitation, hyperthermia, tremor, tachycardia', mechanism:'Additive serotonergic effects — both increase serotonin levels', action:'Avoid combination. If essential, start tramadol at lowest dose and monitor closely for serotonin syndrome symptoms.'},
  {drugs:['carbamazepine','clarithromycin'],severity:'Severe',     effect:'Carbamazepine toxicity — dizziness, diplopia, ataxia, vomiting', mechanism:'Clarithromycin inhibits CYP3A4, which metabolises carbamazepine', action:'Avoid if possible. If essential, reduce carbamazepine dose and monitor levels closely.'},
  {drugs:['phenytoin','fluconazole'],   severity:'Severe',         effect:'Phenytoin toxicity — nystagmus, ataxia, sedation', mechanism:'Fluconazole inhibits CYP2C9, phenytoin\'s main metabolising enzyme', action:'Monitor phenytoin levels closely. Reduce phenytoin dose as needed.'},
  {drugs:['lithium','furosemide'],      severity:'Severe',         effect:'Lithium toxicity — tremor, confusion, cardiac arrhythmias', mechanism:'Furosemide reduces renal lithium excretion by increasing sodium and water loss', action:'Monitor lithium levels closely if diuretic is necessary. Keep adequate sodium intake.'},
  {drugs:['azithromycin','metronidazole'],severity:'Moderate',     effect:'Increased risk of QT prolongation', mechanism:'Both drugs independently prolong QT interval; additive effect', action:'ECG monitoring recommended, particularly in patients with cardiac risk factors. Avoid in known QT prolongation.'},
];

export function searchDrugs(query: string): DrugInfo[] {
  const q = query.toLowerCase();
  return BNF_DRUGS.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.generic.toLowerCase().includes(q) ||
    d.category.toLowerCase().includes(q)
  ).slice(0, 10);
}

export function checkInteractions(drugNames: string[]): Interaction[] {
  const norm = drugNames.map(n => n.toLowerCase());
  return BNF_INTERACTIONS.filter(inter =>
    inter.drugs.every(drug =>
      norm.some(n => n.includes(drug) || drug.includes(n.split(' ')[0]))
    )
  );
}

export function getDrugInfo(name: string): DrugInfo | null {
  const q = name.toLowerCase();
  return BNF_DRUGS.find(d =>
    d.name.toLowerCase().includes(q) ||
    d.generic.toLowerCase().includes(q)
  ) || null;
}

export function calcPaedDose(drug: DrugInfo, weightKg: number, ageMonths: number): string {
  const p = drug.paediatric;
  if (p.mgPerKg && p.mgPerKg > 0) {
    const raw  = weightKg * p.mgPerKg;
    const dose = p.maxDose ? Math.min(raw, p.maxDose) : raw;
    const capped = raw > (p.maxDose || Infinity);
    return `${Math.round(dose * 10) / 10}mg per dose${capped ? ` (capped at max ${p.maxDose}mg)` : ''}`;
  }
  if (ageMonths < 1  && p.neonatal)   return p.neonatal;
  if (ageMonths < 12 && p.age1to11m)  return p.age1to11m;
  if (ageMonths < 60 && p.age1to4y)   return p.age1to4y;
  if (ageMonths < 144 && p.age5to11y) return p.age5to11y;
  if (p.age12to17y) return p.age12to17y;
  return p.age1to4y || p.age5to11y || '—';
}
