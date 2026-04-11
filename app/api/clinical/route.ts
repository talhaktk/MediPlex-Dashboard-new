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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || '';
  const name   = searchParams.get('name')   || '';

  // ── Drug search ────────────────────────────────────────────────────────────
  if (action === 'lookup') {
    const results: { rxcui: string; name: string }[] = [];

    const s1 = await get(`${RXNAV}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=10`);
    for (const c of (s1?.approximateGroup?.candidate || [])) {
      if (c.rxcui && c.name && !results.find((r: { rxcui: string }) => r.rxcui === c.rxcui)) {
        results.push({ rxcui: c.rxcui, name: c.name });
      }
    }

    const s2 = await get(`${RXNAV}/drugs.json?name=${encodeURIComponent(name)}`);
    for (const g of (s2?.drugGroup?.conceptGroup || [])) {
      for (const d of (g.conceptProperties || [])) {
        if (d.rxcui && d.name && !results.find((r: { rxcui: string }) => r.rxcui === d.rxcui)) {
          results.push({ rxcui: d.rxcui, name: d.name });
        }
      }
    }

    return NextResponse.json({ results: results.slice(0, 10) });
  }

  // ── Drug interactions ──────────────────────────────────────────────────────
  if (action === 'interact') {
    const rxcuis = (searchParams.get('rxcuis') || '').split(',').filter(Boolean);
    if (rxcuis.length < 2) return NextResponse.json({ interactions: [] });

    const allInteractions: {
      drug1: string; drug2: string; severity: string;
      description: string; comment: string; source: string;
    }[] = [];

    // Query each drug individually — correct NLM API pattern
    for (const rxcui of rxcuis) {
      const data = await get(`${RXNAV}/interaction/interaction.json?rxcui=${rxcui}`);
      const groups = data?.interactionTypeGroup || [];

      for (const group of groups) {
        for (const type of (group.interactionType || [])) {
          for (const pair of (type.interactionPair || [])) {
            const concepts = pair.interactionConcept || [];
            if (concepts.length >= 2) {
              allInteractions.push({
                drug1:       concepts[0]?.minConceptItem?.name || '',
                drug2:       concepts[1]?.minConceptItem?.name || '',
                severity:    pair.severity || 'unknown',
                description: pair.description || '',
                comment:     concepts[0]?.sourceConceptItem?.comment || '',
                source:      group.sourceName || 'NLM',
              });
            }
          }
        }
      }
    }

    // Deduplicate by drug pair
    const seen: string[] = [];
    const unique = allInteractions.filter(i => {
      const key = [i.drug1, i.drug2].sort().join('||');
      if (seen.includes(key)) return false;
      seen.push(key);
      return true;
    });

    return NextResponse.json({ interactions: unique, total: unique.length });
  }

  // ── OpenFDA drug label ─────────────────────────────────────────────────────
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

    return NextResponse.json({
      found: true,
      result: {
        brandName:         result.openfda?.brand_name?.[0]       || '',
        genericName:       result.openfda?.generic_name?.[0]      || '',
        manufacturer:      result.openfda?.manufacturer_name?.[0] || '',
        dosageAdmin:       (result.dosage_and_administration?.[0]  || '').slice(0, 1500),
        warnings:          (result.warnings?.[0]                   || '').slice(0, 1000),
        contraindications: (result.contraindications?.[0]          || '').slice(0, 800),
        interactions:      (result.drug_interactions?.[0]          || '').slice(0, 1000),
        pediatricUse:      (result.pediatric_use?.[0]              || '').slice(0, 1000),
        geriatricUse:      (result.geriatric_use?.[0]              || '').slice(0, 600),
        pregnancy:         (result.pregnancy?.[0]                  || '').slice(0, 600),
        howSupplied:       (result.how_supplied?.[0]               || '').slice(0, 600),
      }
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
