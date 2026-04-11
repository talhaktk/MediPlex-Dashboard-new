import { NextRequest, NextResponse } from 'next/server';

const RXNAV   = 'https://rxnav.nlm.nih.gov/REST';
const OPENFDA = 'https://api.fda.gov/drug';

async function get(url: string) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

const LOCAL_DB = [
  {d:['warfarin','aspirin'],        s:'High',     e:'Major bleeding risk — additive anticoagulant + antiplatelet effects',                     a:'Avoid. If necessary monitor INR closely.'},
  {d:['warfarin','ibuprofen'],      s:'High',     e:'Increased bleeding — ibuprofen displaces warfarin and inhibits platelets',                a:'Avoid NSAIDs. Use paracetamol instead.'},
  {d:['warfarin','naproxen'],       s:'High',     e:'Increased bleeding risk',                                                                  a:'Avoid NSAIDs with warfarin.'},
  {d:['warfarin','diclofenac'],     s:'High',     e:'Increased bleeding risk',                                                                  a:'Avoid NSAIDs with warfarin.'},
  {d:['warfarin','metronidazole'],  s:'High',     e:'INR significantly increased — metronidazole inhibits CYP2C9',                             a:'Reduce warfarin 25-50%, monitor INR daily.'},
  {d:['warfarin','fluconazole'],    s:'High',     e:'INR significantly increased',                                                              a:'Reduce warfarin dose, monitor INR closely.'},
  {d:['warfarin','amiodarone'],     s:'High',     e:'INR greatly increased — amiodarone inhibits warfarin metabolism',                         a:'Reduce warfarin 30-50%, frequent INR monitoring.'},
  {d:['warfarin','ciprofloxacin'],  s:'Moderate', e:'INR may increase',                                                                         a:'Monitor INR during antibiotic course.'},
  {d:['warfarin','azithromycin'],   s:'Moderate', e:'INR may increase',                                                                         a:'Monitor INR during antibiotic course.'},
  {d:['warfarin','clarithromycin'], s:'Moderate', e:'INR may increase',                                                                         a:'Monitor INR during antibiotic course.'},
  {d:['warfarin','amoxicillin'],    s:'Moderate', e:'INR may increase — gut flora reduction reduces Vitamin K',                                a:'Monitor INR during antibiotic course.'},
  {d:['warfarin','paracetamol'],    s:'Moderate', e:'INR may increase at doses >2g/day',                                                        a:'Use lowest dose. Monitor INR with regular use.'},
  {d:['aspirin','ibuprofen'],       s:'Moderate', e:'Ibuprofen reduces antiplatelet effect of aspirin',                                         a:'Take aspirin 30 min before ibuprofen.'},
  {d:['aspirin','clopidogrel'],     s:'Moderate', e:'Increased bleeding — dual antiplatelet therapy',                                           a:'Often intentional in cardiac patients. Monitor bleeding.'},
  {d:['metronidazole','alcohol'],   s:'High',     e:'Disulfiram-like reaction: flushing, vomiting, tachycardia',                               a:'No alcohol during treatment and 48h after.'},
  {d:['ibuprofen','methotrexate'],  s:'High',     e:'Methotrexate toxicity — NSAIDs reduce renal clearance',                                   a:'Avoid. Withhold NSAID 24h before methotrexate.'},
  {d:['ibuprofen','prednisolone'],  s:'Moderate', e:'Increased GI ulceration risk',                                                             a:'Add PPI cover. Use paracetamol instead.'},
  {d:['ibuprofen','lithium'],       s:'High',     e:'Lithium toxicity — NSAIDs reduce renal lithium clearance',                                a:'Avoid. Use paracetamol instead.'},
  {d:['simvastatin','amiodarone'],  s:'High',     e:'Risk of myopathy/rhabdomyolysis',                                                          a:'Limit simvastatin to 20mg/day with amiodarone.'},
  {d:['simvastatin','clarithromycin'],s:'High',   e:'Greatly increased statin levels — rhabdomyolysis risk',                                   a:'Stop statin during clarithromycin course.'},
  {d:['atorvastatin','clarithromycin'],s:'Moderate',e:'Increased statin levels',                                                               a:'Use lowest statin dose, monitor muscle symptoms.'},
  {d:['digoxin','amiodarone'],      s:'High',     e:'Digoxin toxicity — amiodarone increases digoxin levels by 50%',                           a:'Reduce digoxin dose by 50%, monitor levels.'},
  {d:['digoxin','clarithromycin'],  s:'High',     e:'Digoxin toxicity — clarithromycin increases digoxin absorption',                          a:'Monitor digoxin levels closely.'},
  {d:['ciprofloxacin','antacids'],  s:'Moderate', e:'Reduced ciprofloxacin absorption by 50%',                                                  a:'Take ciprofloxacin 2h before or 6h after antacids.'},
  {d:['azithromycin','metronidazole'],s:'Moderate',e:'QT prolongation risk',                                                                   a:'ECG monitoring recommended in cardiac patients.'},
  {d:['clopidogrel','omeprazole'],  s:'Moderate', e:'Reduced antiplatelet effect of clopidogrel',                                               a:'Consider pantoprazole instead.'},
  {d:['metformin','alcohol'],       s:'Moderate', e:'Increased risk of lactic acidosis',                                                        a:'Avoid excessive alcohol with metformin.'},
  {d:['phenytoin','fluconazole'],   s:'High',     e:'Phenytoin toxicity — inhibited metabolism',                                                a:'Monitor phenytoin levels, reduce dose if needed.'},
  {d:['tramadol','ssri'],           s:'High',     e:'Serotonin syndrome risk',                                                                  a:'Avoid combination. Monitor for agitation, hyperthermia.'},
  {d:['amlodipine','simvastatin'],  s:'Moderate', e:'Increased simvastatin exposure',                                                           a:'Limit simvastatin to 20mg/day.'},
  {d:['prednisolone','aspirin'],    s:'Moderate', e:'Increased GI bleeding risk',                                                               a:'Add PPI gastroprotection.'},
  {d:['prednisolone','ibuprofen'],  s:'Moderate', e:'Increased GI ulceration',                                                                  a:'Add PPI. Use paracetamol instead.'},
  {d:['furosemide','ibuprofen'],    s:'Moderate', e:'Reduced diuretic effect and risk of renal impairment',                                    a:'Monitor renal function and fluid balance.'},
  {d:['ramipril','ibuprofen'],      s:'Moderate', e:'Reduced antihypertensive effect, risk of renal impairment',                               a:'Monitor BP and renal function. Avoid if possible.'},
  {d:['lithium','diclofenac'],      s:'High',     e:'Lithium toxicity',                                                                         a:'Avoid NSAIDs with lithium.'},
  {d:['carbamazepine','clarithromycin'],s:'High', e:'Carbamazepine toxicity — inhibited metabolism',                                           a:'Avoid. Monitor carbamazepine levels if unavoidable.'},
  {d:['sildenafil','nitrates'],     s:'High',     e:'Severe hypotension — additive vasodilation',                                               a:'Absolutely contraindicated. Do not combine.'},
];

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
    const results: { rxcui: string; name: string }[] = [];
    const s1 = await get(`${RXNAV}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=10`);
    for (const c of (s1?.approximateGroup?.candidate || [])) {
      if (c.rxcui && c.name && !results.find((r: {rxcui:string}) => r.rxcui === c.rxcui))
        results.push({ rxcui: c.rxcui, name: c.name });
    }
    const s2 = await get(`${RXNAV}/drugs.json?name=${encodeURIComponent(name)}`);
    for (const g of (s2?.drugGroup?.conceptGroup || [])) {
      for (const d of (g.conceptProperties || [])) {
        if (d.rxcui && d.name && !results.find((r: {rxcui:string}) => r.rxcui === d.rxcui))
          results.push({ rxcui: d.rxcui, name: d.name });
      }
    }
    return NextResponse.json({ results: results.slice(0, 10) });
  }

  if (action === 'interact') {
    const rxcuis    = (searchParams.get('rxcuis')    || '').split(',').filter(Boolean);
    const drugNames = (searchParams.get('drugnames') || '').split(',').filter(Boolean);
    if (rxcuis.length < 2) return NextResponse.json({ interactions: [] });

    const interactions: object[] = [];

    // Try NLM live
    for (const rxcui of rxcuis) {
      const data = await get(`${RXNAV}/interaction/interaction.json?rxcui=${rxcui}`);
      for (const group of (data?.interactionTypeGroup || [])) {
        for (const type of (group.interactionType || [])) {
          for (const pair of (type.interactionPair || [])) {
            const c = pair.interactionConcept || [];
            if (c.length >= 2) {
              const cui0 = c[0]?.minConceptItem?.rxcui;
              const cui1 = c[1]?.minConceptItem?.rxcui;
              if (rxcuis.includes(cui0) && rxcuis.includes(cui1)) {
                interactions.push({
                  drug1: c[0]?.minConceptItem?.name || '',
                  drug2: c[1]?.minConceptItem?.name || '',
                  severity: pair.severity || 'unknown',
                  description: pair.description || '',
                  comment: c[0]?.sourceConceptItem?.comment || '',
                  source: group.sourceName || 'NLM RxNav',
                });
              }
            }
          }
        }
      }
    }

    // Always add local matches
    for (const m of localCheck(drugNames)) {
      interactions.push(m);
    }

    // Deduplicate
    const seen: string[] = [];
    const unique = interactions.filter(i => {
      const x = i as {drug1:string;drug2:string};
      const key = [x.drug1.toLowerCase(), x.drug2.toLowerCase()].sort().join('||');
      if (seen.includes(key)) return false;
      seen.push(key); return true;
    });

    return NextResponse.json({ interactions: unique, total: unique.length });
  }

  if (action === 'openfda') {
    const searches = [
      `${OPENFDA}/label.json?search=openfda.generic_name:"${encodeURIComponent(name)}"&limit=1`,
      `${OPENFDA}/label.json?search=openfda.brand_name:"${encodeURIComponent(name)}"&limit=1`,
      `${OPENFDA}/label.json?search=openfda.generic_name:${encodeURIComponent(name)}&limit=1`,
      `${OPENFDA}/label.json?search=${encodeURIComponent(name)}&limit=1`,
    ];
    let result = null;
    for (const url of searches) {
      const d = await get(url);
      if (d?.results?.[0]) { result = d.results[0]; break; }
    }
    if (!result) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, result: {
      brandName:         result.openfda?.brand_name?.[0]       || '',
      genericName:       result.openfda?.generic_name?.[0]      || '',
      manufacturer:      result.openfda?.manufacturer_name?.[0] || '',
      dosageAdmin:       (result.dosage_and_administration?.[0]  || '').slice(0,1500),
      warnings:          (result.warnings?.[0]                   || '').slice(0,1000),
      contraindications: (result.contraindications?.[0]          || '').slice(0,800),
      interactions:      (result.drug_interactions?.[0]          || '').slice(0,1000),
      pediatricUse:      (result.pediatric_use?.[0]              || '').slice(0,1000),
      geriatricUse:      (result.geriatric_use?.[0]              || '').slice(0,600),
      pregnancy:         (result.pregnancy?.[0]                  || '').slice(0,600),
      howSupplied:       (result.how_supplied?.[0]               || '').slice(0,600),
    }});
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
