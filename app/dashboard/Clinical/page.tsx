import Topbar from '@/components/layout/Topbar';
import ClinicalClient from './ClinicalClient';

export default function ClinicalPage() {
  return (
    <>
      <Topbar title="Clinical Support" subtitle="Drug interactions, dose calculator, and clinical tools" />
      <main className="flex-1 p-8">
        <ClinicalClient
          bnfApiKey={process.env.BNF_API_KEY || ''}
        />
      </main>
    </>
  );
}
