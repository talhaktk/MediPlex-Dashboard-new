// lib/scribeStore.ts
// Shared store bridging AI Scribe ↔ Prescription tab

const SCRIBE_KEY = 'mediplex_scribe_output';

export interface ScribeOutput {
  patientName: string;
  patientAge: string;
  parentName: string;
  mode: 'soap' | 'prescription' | 'discharge' | 'referral' | 'sick_cert' | 'preauth';
  output: string;
  generatedAt: string;
}

export function saveScribeOutput(data: ScribeOutput) {
  try { localStorage.setItem(SCRIBE_KEY, JSON.stringify(data)); } catch {}
}

export function getScribeOutput(): ScribeOutput | null {
  try {
    const raw = localStorage.getItem(SCRIBE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearScribeOutput() {
  try { localStorage.removeItem(SCRIBE_KEY); } catch {}
}
