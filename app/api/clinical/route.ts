import { NextRequest, NextResponse } from 'next/server';

const OPENFDA = 'https://api.fda.gov/drug';
const RXNAV   = 'https://rxnav.nlm.nih.gov/REST';

async function get(url: string) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

const DRUGS = [
  {name:'Aspirin',rxcui:'1191',generic:'aspirin'},
  {name:'Paracetamol (Acetaminophen)',rxcui:'161',generic:'paracetamol'},
  {name:'Ibuprofen',rxcui:'5640',generic:'ibuprofen'},
  {name:'Warfarin',rxcui:'11289',generic:'warfarin'},
  {name:'Metformin',rxcui:'6809',generic:'metformin'},
  {name:'Atorvastatin',rxcui:'83367',generic:'atorvastatin'},
  {name:'Simvastatin',rxcui:'36567',generic:'simvastatin'},
  {name:'Amoxicillin',rxcui:'723',generic:'amoxicillin'},
  {name:'Co-amoxiclav (Augmentin)',rxcui:'723',generic:'amoxicillin clavulanate'},
  {name:'Azithromycin',rxcui:'18631',generic:'azithromycin'},
  {name:'Clarithromycin',rxcui:'21212',generic:'clarithromycin'},
  {name:'Ciprofloxacin',rxcui:'2551',generic:'ciprofloxacin'},
  {name:'Metronidazole',rxcui:'4337',generic:'metronidazole'},
  {name:'Fluconazole',rxcui:'4450',generic:'fluconazole'},
  {name:'Omeprazole',rxcui:'7646',generic:'omeprazole'},
  {name:'Pantoprazole',rxcui:'40790',generic:'pantoprazole'},
  {name:'Prednisolone',rxcui:'8638',generic:'prednisolone'},
  {name:'Dexamethasone',rxcui:'3264',generic:'dexamethasone'},
  {name:'Salbutamol (Albuterol)',rxcui:'435',generic:'albuterol'},
  {name:'Cetirizine',rxcui:'20610',generic:'cetirizine'},
  {name:'Chlorphenamine',rxcui:'2725',generic:'chlorphenamine'},
  {name:'Loratadine',rxcui:'203802',generic:'loratadine'},
  {name:'Clopidogrel',rxcui:'41493',generic:'clopidogrel'},
  {name:'Amlodipine',rxcui:'17767',generic:'amlodipine'},
  {name:'Lisinopril',rxcui:'29046',generic:'lisinopril'},
  {name:'Ramipril',rxcui:'35208',generic:'ramipril'},
  {name:'Losartan',rxcui:'203160',generic:'losartan'},
  {name:'Metoprolol',rxcui:'6918',generic:'metoprolol'},
  {name:'Atenolol',rxcui:'1202',generic:'atenolol'},
  {name:'Bisoprolol',rxcui:'19484',generic:'bisoprolol'},
  {name:'Furosemide',rxcui:'4603',generic:'furosemide'},
  {name:'Spironolactone',rxcui:'9997',generic:'spironolactone'},
  {name:'Digoxin',rxcui:'3407',generic:'digoxin'},
  {name:'Amiodarone',rxcui:'703',generic:'amiodarone'},
  {name:'Phenytoin',rxcui:'8183',generic:'phenytoin'},
  {name:'Carbamazepine',rxcui:'2002',generic:'carbamazepine'},
  {name:'Valproate',rxcui:'11118',generic:'valproic acid'},
  {name:'Lithium',rxcui:'6142',generic:'lithium carbonate'},
  {name:'Sertraline',rxcui:'36437',generic:'sertraline'},
  {name:'Fluoxetine',rxcui:'4493',generic:'fluoxetine'},
  {name:'Amitriptyline',rxcui:'704',generic:'amitriptyline'},
  {name:'Diazepam',rxcui:'3322',generic:'diazepam'},
  {name:'Tramadol',rxcui:'10689',generic:'tramadol'},
  {name:'Codeine',rxcui:'2670',generic:'codeine'},
  {name:'Morphine',rxcui:'7052',generic:'morphine'},
  {name:'Naproxen',rxcui:'7258',generic:'naproxen'},
  {name:'Diclofenac',rxcui:'3355',generic:'diclofenac'},
  {name:'Methotrexate',rxcui:'6851',generic:'methotrexate'},
  {name:'Hydroxychloroquine',rxcui:'5521',generic:'hydroxychloroquine'},
  {name:'Doxycycline',rxcui:'3640',generic:'doxycycline'},
  {name:'Trimethoprim',rxcui:'10829',generic:'trimethoprim'},
  {name:'Nitrofurantoin',rxcui:'7454',generic:'nitrofurantoin'},
  {name:'Sildenafil',rxcui:'135447',generic:'sildenafil'},
  {name:'Levothyroxine',rxcui:'10582',generic:'levothyroxine'},
  {name:'Glibenclamide',rxcui:'4815',generic:'glyburide'},
  {name:'Glimepiride',rxcui:'25789',generic:'glimepiride'},
  {name:'Cefuroxime',rxcui:'2193',generic:'cefuroxime'},
  {name:'Ceftriaxone',rxcui:'2193',generic:'ceftriaxone'},
  {name:'Vancomycin',rxcui:'11124',generic:'vancomycin'},
  {name:'Ondansetron',rxcui:'103234',generic:'ondansetron'},
  {name:'Domperidone',rxcui:'3494',generic:'domperidone'},
  {name:'Metoclopramide',rxcui:'6915',generic:'metoclopramide'},
  {name:'Heparin',rxcui:'5224',generic:'heparin'},
  {name:'Enoxaparin',rxcui:'67108',generic:'enoxaparin'},
  {name:'Nifedipine',rxcui:'7417',generic:'nifedipine'},
  {name:'Propranolol',rxcui:'8787',generic:'propranolol'},
  {name:'Allopurinol',rxcui:'519',generic:'allopurinol'},
  {name:'Colchicine',rxcui:'2683',generic:'colchicine'},
  {name:'Folic Acid',rxcui:'4511',generic:'folic acid'},
  {name:'Ferrous Sulfate',rxcui:'4423',generic:'ferrous sulfate'},
  {name:'Vitamin D3',rxcui:'41914',generic:'cholecalciferol'},
  {name:'Erythromycin',rxcui:'4053',generic:'erythromycin'},
  {name:'Acyclovir',rxcui:'213',generic:'acyclovir'},
  {name:'Oseltamivir (Tamiflu)',rxcui:'203563',generic:'oseltamivir'},
];

const LOCAL_DB = [
  {d:['warfarin','aspirin'],           s:'High',     e:'Major bleeding risk — additive anticoagulant + antiplatelet effects',     a:'Avoid. Monitor INR closely if unavoidable.'},
  {d:['warfarin','ibuprofen'],         s:'High',     e:'Increased bleeding — ibuprofen displaces warfarin and inhibits platelets',a:'Avoid NSAIDs. Use paracetamol instead.'},
  {d:['warfarin','naproxen'],          s:'High',     e:'Increased bleeding risk',                                                  a:'Avoid NSAIDs with warfarin.'},
  {d:['warfarin','diclofenac'],        s:'High',     e:'Increased bleeding risk',                                                  a:'Avoid NSAIDs with warfarin.'},
  {d:['warfarin','metronidazole'],     s:'High',     e:'INR significantly increased — metronidazole inhibits CYP2C9',             a:'Reduce warfarin 25-50%, monitor INR daily.'},
  {d:['warfarin','fluconazole'],       s:'High',     e:'INR significantly increased — fluconazole inhibits CYP2C9',               a:'Reduce warfarin dose, monitor INR closely.'},
  {d:['warfarin','amiodarone'],        s:'High',     e:'INR greatly increased — amiodarone inhibits warfarin metabolism',         a:'Reduce warfarin 30-50%, frequent INR monitoring.'},
  {d:['warfarin','ciprofloxacin'],     s:'Moderate', e:'INR may increase',                                                         a:'Monitor INR during antibiotic course.'},
  {d:['warfarin','azithromycin'],      s:'Moderate', e:'INR may increase',                                                         a:'Monitor INR during antibiotic course.'},
  {d:['warfarin','clarithromycin'],    s:'Moderate', e:'INR may increase',                                                         a:'Monitor INR during antibiotic course.'},
  {d:['warfarin','amoxicillin'],       s:'Moderate', e:'INR may increase',                                                         a:'Monitor INR during antibiotic course.'},
  {d:['warfarin','paracetamol'],       s:'Moderate', e:'INR may increase at doses >2g/day',                                        a:'Use lowest dose. Monitor INR with regular use.'},
  {d:['aspirin','ibuprofen'],          s:'Moderate', e:'Ibuprofen reduces antiplatelet effect of aspirin',                         a:'Take aspirin 30 min before ibuprofen.'},
  {d:['aspirin','clopidogrel'],        s:'Moderate', e:'Increased bleeding — dual antiplatelet therapy',                           a:'Often intentional in cardiac patients. Monitor bleeding.'},
  {d:['metronidazole','alcohol'],      s:'High',     e:'Disulfiram-like reaction: flushing, vomiting, tachycardia',               a:'No alcohol during treatment and 48h after.'},
  {d:['ibuprofen','methotrexate'],     s:'High',     e:'Methotrexate toxicity — NSAIDs reduce renal clearance',                   a:'Avoid. Withhold NSAID 24h before methotrexate.'},
  {d:['ibuprofen','prednisolone'],     s:'Moderate', e:'Increased GI ulceration risk',                                             a:'Add PPI cover. Use paracetamol instead.'},
  {d:['ibuprofen','lithium'],          s:'High',     e:'Lithium toxicity — NSAIDs reduce renal lithium clearance',                a:'Avoid. Use paracetamol instead.'},
  {d:['simvastatin','amiodarone'],     s:'High',     e:'Risk of myopathy/rhabdomyolysis',                                         a:'Limit simvastatin to 20mg/day with amiodarone.'},
  {d:['simvastatin','clarithromycin'], s:'High',     e:'Greatly increased statin levels — rhabdomyolysis risk',                   a:'Stop statin during clarithromycin course.'},
  {d:['atorvastatin','clarithromycin'],s:'Moderate', e:'Increased statin levels',                                                  a:'Use lowest statin dose, monitor muscle symptoms.'},
  {d:['digoxin','amiodarone'],         s:'High',     e:'Digoxin toxicity — amiodarone increases digoxin levels by 50%',           a:'Reduce digoxin dose by 50%, monitor levels.'},
  {d:['digoxin','clarithromycin'],     s:'High',     e:'Digoxin toxicity — clarithromycin increases digoxin absorption',          a:'Monitor digoxin levels closely.'},
  {d:['clopidogrel','omeprazole'],     s:'Moderate', e:'Reduced antiplatelet effect of clopidogrel',                               a:'Consider pantoprazole instead.'},
  {d:['metformin','alcohol'],          s:'Moderate', e:'Increased risk of lactic acidosis',                                        a:'Avoid excessive alcohol with metformin.'},
  {d:['phenytoin','fluconazole'],      s:'High',     e:'Phenytoin toxicity — inhibited metabolism',                                a:'Monitor phenytoin levels, reduce dose if needed.'},
  {d:['tramadol','sertraline'],        s:'High',     e:'Serotonin syndrome risk',                                                  a:'Avoid. Monitor for agitation, hyperthermia.'},
  {d:['tramadol','fluoxetine'],        s:'High',     e:'Serotonin syndrome risk',                                                  a:'Avoid combination.'},
  {d:['amlodipine','simvastatin'],     s:'Moderate', e:'Increased simvastatin exposure',                                           a:'Limit simvastatin to 20mg/day.'},
  {d:['prednisolone','aspirin'],       s:'Moderate', e:'Increased GI bleeding risk',                                               a:'Add PPI gastroprotection.'},
  {d:['furosemide','ibuprofen'],       s:'Moderate', e:'Reduced diuretic effect and risk of renal impairment',                    a:'Monitor renal function and fluid balance.'},
  {d:['ramipril','ibuprofen'],         s:'Moderate', e:'Reduced antihypertensive effect, risk of renal impairment',               a:'Monitor BP and renal function.'},
  {d:['sildenafil','nitrates'],        s:'High',     e:'Severe hypotension — additive vasodilation',                              a:'Absolutely contraindicated. Do not combine.'},
  {d:['carbamazepine','clarithromycin'],s:'High',    e:'Carbamazepine toxicity — inhibited metabolism',                           a:'Avoid. Monitor levels if unavoidable.'},
  {d:['lithium','furosemide'],         s:'High',     e:'Lithium toxicity — diuretics reduce renal clearance',                    a:'Monitor lithium levels closely.'},
];

function searchLocal(q: string) {
  const query = q.toLowerCase();
  return DRUGS.filter(d =>
    d.name.toLowerCase().includes(query) ||
    d.generic.toLowerCase().includes(query)
  ).slice(0, 10);
}

function localCheck(names: string[]) {
  const norm = names.map(n => n.toLowerCase());
  return LOCAL_DB.filter(entry =>
    entry.d.every(drug => norm.some(n => n.includes(drug) || drug.includes(n.split(' ')[0])))
  ).map(entry => ({
    drug1: entry.d[0], drug2: entry.d[1],
    severity: entry.s, description: entry.e,
    comment: entry.a, source: 'Clinical DB (BNF/NLM)',
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || '';
  const name   = searchParams.get('name')   || '';

  if (action === 'lookup') {
    const local = searchLocal(name);
    if (local.length > 0)
      return NextResponse.json({ results: local.map(d => ({ rxcui: d.rxcui, name: d.name, generic: d.generic })) });
    const s1 = await get(`${RXNAV}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=8`);
    const results = (s1?.approximateGroup?.candidate || []).map((c: {rxcui:string;name:string}) => ({ rxcui: c.rxcui, name: c.name, generic: c.name })).slice(0, 8);
    return NextResponse.json({ results });
  }

  if (action === 'interact') {
    const rxcuis    = (searchParams.get('rxcuis')    || '').split(',').filter(Boolean);
    const drugNames = (searchParams.get('drugnames') || '').split(',').filter(Boolean);
    if (rxcuis.length < 2) return NextResponse.json({ interactions: [] });
    const interactions: object[] = [];
    for (const m of localCheck(drugNames)) interactions.push(m);
    for (const rxcui of rxcuis) {
      const data = await get(`${RXNAV}/interaction/interaction.json?rxcui=${rxcui}`);
      for (const group of (data?.interactionTypeGroup || [])) {
        for (const type of (group.interactionType || [])) {
          for (const pair of (type.interactionPair || [])) {
            const c = pair.interactionConcept || [];
            if (c.length >= 2) {
              interactions.push({ drug1: c[0]?.minConceptItem?.name||'', drug2: c[1]?.minConceptItem?.name||'', severity: pair.severity||'unknown', description: pair.description||'', comment: c[0]?.sourceConceptItem?.comment||'', source: group.sourceName||'NLM RxNav' });
            }
          }
        }
      }
    }
    const seen: string[] = [];
    const unique = interactions.filter(i => { const x = i as {drug1:string;drug2:string}; const key = [x.drug1.toLowerCase(),x.drug2.toLowerCase()].sort().join('||'); if (seen.includes(key)) return false; seen.push(key); return true; });
    return NextResponse.json({ interactions: unique, total: unique.length });
  }

  if (action === 'openfda') {
    // Use the generic name passed directly — avoid combination drug results
    const genericName = searchParams.get('generic') || name;
    const searches = [
      `${OPENFDA}/label.json?search=openfda.generic_name:"${encodeURIComponent(genericName)}"&limit=3`,
      `${OPENFDA}/label.json?search=openfda.generic_name:${encodeURIComponent(genericName)}&limit=3`,
      `${OPENFDA}/label.json?search=${encodeURIComponent(genericName)}&limit=3`,
    ];
    let result = null;
    for (const url of searches) {
      const d = await get(url);
      // Pick result where generic name matches and is NOT a combination drug
      const results = d?.results || [];
      const single = results.find((r: Record<string,unknown>) => {
        const gen = ((r.openfda as Record<string,string[]>)?.generic_name?.[0] || '').toLowerCase();
        return gen.includes(genericName.toLowerCase()) && !gen.includes(' and ');
      });
      if (single) { result = single; break; }
      if (results[0]) { result = results[0]; break; }
    }
    if (!result) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, result: {
      brandName:         (result.openfda as Record<string,string[]>)?.brand_name?.[0]       || '',
      genericName:       (result.openfda as Record<string,string[]>)?.generic_name?.[0]      || '',
      manufacturer:      (result.openfda as Record<string,string[]>)?.manufacturer_name?.[0] || '',
      dosageAdmin:       ((result.dosage_and_administration as string[])?.[0]  || '').slice(0,2000),
      warnings:          ((result.warnings as string[])?.[0]                   || '').slice(0,1000),
      contraindications: ((result.contraindications as string[])?.[0]          || '').slice(0,800),
      interactions:      ((result.drug_interactions as string[])?.[0]          || '').slice(0,1000),
      pediatricUse:      ((result.pediatric_use as string[])?.[0]              || '').slice(0,1000),
      geriatricUse:      ((result.geriatric_use as string[])?.[0]              || '').slice(0,600),
      pregnancy:         ((result.pregnancy as string[])?.[0]                  || '').slice(0,600),
      howSupplied:       ((result.how_supplied as string[])?.[0]               || '').slice(0,600),
    }});
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
