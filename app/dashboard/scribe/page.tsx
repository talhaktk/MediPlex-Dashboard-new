import { Suspense } from 'react';
import ScribeClient from './ScribeClient';

export default function ScribePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-white/50">Loading AI Scribe...</div>}>
      <ScribeClient />
    </Suspense>
  );
}
