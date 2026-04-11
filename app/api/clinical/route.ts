import { NextRequest, NextResponse } from 'next/server';
const RXNAV = 'https://rxnav.nlm.nih.gov/REST';
const OPENFDA = 'https://api.fda.gov/drug';
async function get(url: string) {
  try { const r = await fetch(url, { cache:'no-store' }); if (!r.ok) return null; return await r.json(); } catch { return null; }
}
async function toIngredient(rxcui: string): Promise<string> {
  const d = await get(`${RXNAV}/rxcui/${rxcui}/related.json?tty=IN`);
  const props = d?.relatedGroup?.conceptGroup?.find((g: {tty:string}) => g.tty === 'IN')?.conceptProperties;
  return props?.[0]?.rxcui || rxcui;
}
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || '';
  const name   = searchParams.get('name')   || '';
  if (action === 'lookup') {
    const results: { rxcui: string; name: string }[] = [];
    const s2 = await get(`${RXNAV}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=10`);
    for (const c of (s2?.approximateGroup?.candidate || [])) {
      if (c.rxcui && c.name && !results.find((r: {rxcui:string}) => r.rxcui === c.rxcui)) results.push({ rxcui: c.rxcui, name: c.name });
    }
    const s3 = await get(`${RXNAV}/drugs.json?name=${encodeURIComponent(name)}`);
    for (const g of (s3?.drugGroup?.conceptGroup || [])) {
      for (const d of (g.conceptProperties || [])) {
        if (d.rxcui && d.name && !results.find((r: {rxcui:string}) => r.rxcui === d.rxcui)) results.push({ rxcui: d.rxcui, name: d.name });
      }
    }
    return NextResponse.json({ results: results.slice(0, 10) });
  }
  if (action === 'interact') {
    const rxcuis = (searchParams.get('rxcuis') || '').split(',').filter(Boolean);
    if (rxcuis.length < 2) return NextResponse.json({ interactions: [] });
    const ingredientCuis = await Promise.all(rxcuis.map(toIngredient));
const unique = ingredientCuis.filter((v, i, a) => a.indexOf(v) === i);
    const data = await get(`${RXNAV}/interaction/list.json?rxcuis=${unique.join('+')}`);
    const interactions: object[] = [];
    for (const group of (data?.fullInteractionTypeGroup || [])) {
      for (const type of (group.fullInteractionType || [])) {
        const drugs = (type.minConcept || []).map((c: {name:string}) => c.name);
        for (const pair of (type.interactionPair || [])) {
          interactions.push({ drug1: drugs[0]||'', drug2: drugs[1]||'', severity: pair.severity||'unknown', description: pair.description||'', comment: pair.interactionConcept?.[0]?.sourceConceptItem?.comment||'', source: group.sourceName||'NLM' });
        }
      }
    }
    return NextResponse.json({ interactions, total: interactions.length });
  }
  if (action === 'openfda') {
    const searches = [
      `${OPENFDA}/label.json?search=openfda.generic_name:"${encodeURIComponent(name)}"&limit=1`,
      `${OPENFDA}/label.json?search=openfda.brand_name:"${encodeURIComponent(name)}"&limit=1`,
      `${OPENFDA}/label.json?search=openfda.generic_name:${encodeURIComponent(name)}&limit=1`,
      `${OPENFDA}/label.json?search=${encodeURIComponent(name)}&limit=1`,
    ];
    let result = null;
    for (const url of searches) { const d = await get(url); if (d?.results?.[0]) { result = d.results[0]; break; } }
    if (!result) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, result: {
      brandName: result.openfda?.brand_name?.[0]||'', genericName: result.openfda?.generic_name?.[0]||'',
      manufacturer: result.openfda?.manufacturer_name?.[0]||'',
      dosageAdmin: (result.dosage_and_administration?.[0]||'').slice(0,1500),
      warnings: (result.warnings?.[0]||'').slice(0,1000),
      contraindications: (result.contraindications?.[0]||'').slice(0,800),
      interactions: (result.drug_interactions?.[0]||'').slice(0,1000),
      pediatricUse: (result.pediatric_use?.[0]||'').slice(0,1000),
      geriatricUse: (result.geriatric_use?.[0]||'').slice(0,600),
      pregnancy: (result.pregnancy?.[0]||'').slice(0,600),
      howSupplied: (result.how_supplied?.[0]||'').slice(0,600),
    }});
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
