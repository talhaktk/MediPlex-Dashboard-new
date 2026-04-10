import { NextRequest, NextResponse } from 'next/server';

// ── NLM RxNorm Base URLs (completely free, no API key needed) ─────────────────
const RXNAV  = 'https://rxnav.nlm.nih.gov/REST';
const OPENFDA = 'https://api.fda.gov/drug';

// ── Helper: fetch with timeout ────────────────────────────────────────────────
async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── GET /api/clinical?action=lookup&name=ibuprofen ───────────────────────────
// GET /api/clinical?action=interact&rxcuis=5640,1049562
// GET /api/clinical?action=openfda&name=ibuprofen
// GET /api/clinical?action=dosing&name=amoxicillin

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    // ── 1. Drug name → RxCUI lookup ──────────────────────────────────────────
    if (action === 'lookup') {
      const name = searchParams.get('name') || '';
      if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

      // Approximate match first
      const url = `${RXNAV}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=6`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error('RxNav lookup failed');
      const data = await res.json();

      const candidates = data?.approximateGroup?.candidate || [];
      const results = candidates
        .filter((c: { rxcui: string; score: string; rank: string }) => parseInt(c.score) > 50)
        .map((c: { rxcui: string; name?: string }) => ({ rxcui: c.rxcui, name: c.name || name }))
        .slice(0, 6);

      // If approximate doesn't work, try exact
      if (results.length === 0) {
        const exactUrl = `${RXNAV}/rxcui.json?name=${encodeURIComponent(name)}&allSourcesFlag=0`;
        const exactRes = await fetchWithTimeout(exactUrl);
        const exactData = await exactRes.json();
        const rxcui = exactData?.idGroup?.rxnormId?.[0];
        if (rxcui) results.push({ rxcui, name });
      }

      return NextResponse.json({ results });
    }

    // ── 2. Drug interaction check using RxCUIs ────────────────────────────────
    if (action === 'interact') {
      const rxcuis = searchParams.get('rxcuis') || '';
      if (!rxcuis) return NextResponse.json({ interactions: [] });

      const cuiList = rxcuis.split(',').map(c => c.trim()).filter(Boolean);
      if (cuiList.length < 2) return NextResponse.json({ interactions: [] });

      const url = `${RXNAV}/interaction/list.json?rxcuis=${cuiList.join('+')}`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error('Interaction API failed');
      const data = await res.json();

      const groups = data?.fullInteractionTypeGroup || [];
      const interactions: {
        drug1: string;
        drug2: string;
        severity: string;
        description: string;
        comment: string;
        source: string;
      }[] = [];

      groups.forEach((group: {
        sourceName: string;
        fullInteractionType?: {
          minConcept?: { name: string }[];
          interactionPair?: {
            severity?: string;
            description?: string;
            interactionConcept?: {
              minConceptItem?: { name: string };
              sourceConceptItem?: { comment?: string };
            }[];
          }[];
        }[];
      }) => {
        const source = group.sourceName;
        (group.fullInteractionType || []).forEach((type: {
          minConcept?: { name: string }[];
          interactionPair?: {
            severity?: string;
            description?: string;
            interactionConcept?: {
              minConceptItem?: { name: string };
              sourceConceptItem?: { comment?: string };
            }[];
          }[];
        }) => {
          const drugs = (type.minConcept || []).map((c: { name: string }) => c.name);
          (type.interactionPair || []).forEach((pair: {
            severity?: string;
            description?: string;
            interactionConcept?: {
              minConceptItem?: { name: string };
              sourceConceptItem?: { comment?: string };
            }[];
          }) => {
            interactions.push({
              drug1:       drugs[0] || '',
              drug2:       drugs[1] || '',
              severity:    pair.severity || 'unknown',
              description: pair.description || '',
              comment:     pair.interactionConcept?.[0]?.sourceConceptItem?.comment || '',
              source,
            });
          });
        });
      });

      return NextResponse.json({ interactions, total: interactions.length });
    }

    // ── 3. OpenFDA drug label (warnings, interactions, dosing) ────────────────
    if (action === 'openfda') {
      const name = searchParams.get('name') || '';
      if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

      const url = `${OPENFDA}/label.json?search=openfda.generic_name:"${encodeURIComponent(name)}"&limit=1`;
      const res = await fetchWithTimeout(url);

      if (!res.ok) {
        // Try brand name search
        const url2 = `${OPENFDA}/label.json?search=openfda.brand_name:"${encodeURIComponent(name)}"&limit=1`;
        const res2 = await fetchWithTimeout(url2);
        if (!res2.ok) return NextResponse.json({ found: false });
        const data2 = await res2.json();
        return NextResponse.json({ found: true, result: extractFDALabel(data2.results?.[0]) });
      }

      const data = await res.json();
      return NextResponse.json({ found: true, result: extractFDALabel(data.results?.[0]) });
    }

    // ── 4. OpenFDA adverse events summary ─────────────────────────────────────
    if (action === 'adverse') {
      const name = searchParams.get('name') || '';
      const url  = `${OPENFDA}/event.json?search=patient.drug.medicinalproduct:"${encodeURIComponent(name)}"&count=patient.reaction.reactionmeddrapt.exact&limit=10`;
      const res  = await fetchWithTimeout(url);
      if (!res.ok) return NextResponse.json({ events: [] });
      const data = await res.json();
      return NextResponse.json({ events: data.results || [] });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'API error';
    return NextResponse.json({ error: msg, fallback: true }, { status: 503 });
  }
}

function extractFDALabel(result: Record<string, unknown> | undefined) {
  if (!result) return null;
  return {
    brandName:         (result.openfda as Record<string, string[]>)?.brand_name?.[0]           || '',
    genericName:       (result.openfda as Record<string, string[]>)?.generic_name?.[0]          || '',
    manufacturer:      (result.openfda as Record<string, string[]>)?.manufacturer_name?.[0]     || '',
    dosageAdmin:       (result.dosage_and_administration as string[])?.[0]?.slice(0, 800)       || '',
    warnings:          (result.warnings as string[])?.[0]?.slice(0, 600)                        || '',
    contraindications: (result.contraindications as string[])?.[0]?.slice(0, 400)               || '',
    interactions:      (result.drug_interactions as string[])?.[0]?.slice(0, 600)               || '',
    pediatricUse:      (result.pediatric_use as string[])?.[0]?.slice(0, 500)                   || '',
    pregnancyCategory: (result.pregnancy as string[])?.[0]?.slice(0, 300)                       || '',
  };
}