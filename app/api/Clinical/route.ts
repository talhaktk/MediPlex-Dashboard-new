import { NextRequest, NextResponse } from 'next/server';

const RXNAV   = 'https://rxnav.nlm.nih.gov/REST';
const OPENFDA = 'https://api.fda.gov/drug';

async function fetchSafe(url: string) {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // 1. Drug name search - NLM RxNorm
  if (action === 'lookup') {
    const name = searchParams.get('name') || '';
    const data = await fetchSafe(`${RXNAV}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=8`);
    const candidates = data?.approximateGroup?.candidate || [];
    const results = candidates
      .filter((c: { score: string }) => parseInt(c.score) > 40)
      .map((c: { rxcui: string; name: string }) => ({ rxcui: c.rxcui, name: c.name }))
      .slice(0, 8);
    return NextResponse.json({ results });
  }

  // 2. Drug interactions - NLM RxNav
  if (action === 'interact') {
    const rxcuis = searchParams.get('rxcuis') || '';
    const cuiList = rxcuis.split(',').filter(Boolean);
    if (cuiList.length < 2) return NextResponse.json({ interactions: [] });

    const data = await fetchSafe(`${RXNAV}/interaction/list.json?rxcuis=${cuiList.join('+')}`);
    const groups = data?.fullInteractionTypeGroup || [];
    const interactions: object[] = [];

    groups.forEach((group: { sourceName: string; fullInteractionType?: object[] }) => {
      (group.fullInteractionType || []).forEach((type: {
        minConcept?: { name: string }[];
        interactionPair?: {
          severity?: string;
          description?: string;
          interactionConcept?: { sourceConceptItem?: { comment?: string } }[];
        }[];
      }) => {
        const drugs = (type.minConcept || []).map(c => c.name);
        (type.interactionPair || []).forEach(pair => {
          interactions.push({
            drug1: drugs[0] || '', drug2: drugs[1] || '',
            severity: pair.severity || 'unknown',
            description: pair.description || '',
            comment: pair.interactionConcept?.[0]?.sourceConceptItem?.comment || '',
            source: group.sourceName,
          });
        });
      });
    });

    return NextResponse.json({ interactions, total: interactions.length });
  }

  // 3. OpenFDA full drug label
  if (action === 'openfda') {
    const name = searchParams.get('name') || '';
    let data = await fetchSafe(`${OPENFDA}/label.json?search=openfda.generic_name:"${encodeURIComponent(name)}"&limit=1`);
    if (!data?.results?.[0]) {
      data = await fetchSafe(`${OPENFDA}/label.json?search=openfda.brand_name:"${encodeURIComponent(name)}"&limit=1`);
    }
    if (!data?.results?.[0]) {
      data = await fetchSafe(`${OPENFDA}/label.json?search=${encodeURIComponent(name)}&limit=1`);
    }
    const r = data?.results?.[0];
    if (!r) return NextResponse.json({ found: false });

    return NextResponse.json({
      found: true,
      result: {
        brandName:         r.openfda?.brand_name?.[0]        || '',
        genericName:       r.openfda?.generic_name?.[0]       || '',
        manufacturer:      r.openfda?.manufacturer_name?.[0]  || '',
        dosageAdmin:       r.dosage_and_administration?.[0]?.slice(0, 1200) || '',
        warnings:          r.warnings?.[0]?.slice(0, 800)                   || '',
        contraindications: r.contraindications?.[0]?.slice(0, 600)          || '',
        interactions:      r.drug_interactions?.[0]?.slice(0, 800)          || '',
        pediatricUse:      r.pediatric_use?.[0]?.slice(0, 800)              || '',
        geriatricUse:      r.geriatric_use?.[0]?.slice(0, 400)              || '',
        pregnancy:         r.pregnancy?.[0]?.slice(0, 400)                  || '',
        howSupplied:       r.how_supplied?.[0]?.slice(0, 400)               || '',
      }
    });
  }

  // 4. Get drug details by RxCUI - dosing info
  if (action === 'rxdetail') {
    const rxcui = searchParams.get('rxcui') || '';
    const [props, related] = await Promise.all([
      fetchSafe(`${RXNAV}/rxcui/${rxcui}/properties.json`),
      fetchSafe(`${RXNAV}/rxcui/${rxcui}/related.json?tty=SCD+SBD+GPCK+BPCK`),
    ]);
    return NextResponse.json({
      name:     props?.properties?.name || '',
      synonym:  props?.properties?.synonym || '',
      related:  related?.relatedGroup?.conceptGroup || [],
    });
  }

  // 5. Search drug by name - get all forms
  if (action === 'rxsearch') {
    const name = searchParams.get('name') || '';
    const data = await fetchSafe(`${RXNAV}/drugs.json?name=${encodeURIComponent(name)}`);
    const groups = data?.drugGroup?.conceptGroup || [];
    const drugs: object[] = [];
    groups.forEach((g: { tty?: string; conceptProperties?: { rxcui: string; name: string; synonym?: string }[] }) => {
      (g.conceptProperties || []).forEach(d => {
        drugs.push({ rxcui: d.rxcui, name: d.name, tty: g.tty, synonym: d.synonym });
      });
    });
    return NextResponse.json({ drugs: drugs.slice(0, 20) });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
