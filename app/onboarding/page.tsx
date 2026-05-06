import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

export const metadata: Metadata = {
  title: 'Get Started — MediPlex',
  description: 'Set up your clinic in minutes. Free 14-day trial, no credit card required.',
};

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');
  return <OnboardingWizard />;
}
