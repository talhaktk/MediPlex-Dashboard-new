import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import LandingPage from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'MediPlex — The Complete HMIS for Modern Clinics',
  description: 'AI-powered clinic management: appointments, prescriptions, billing, AI scribe, WhatsApp reminders and more. Trusted by 500+ clinics globally.',
  keywords: ['clinic management', 'HMIS', 'healthcare software', 'AI scribe', 'medical software UK', 'clinic EHR'],
  openGraph: {
    title: 'MediPlex — AI for Smart Healthcare',
    description: 'The Complete HMIS for Modern Clinics. Start your 14-day free trial.',
    type: 'website',
  },
};

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');
  return <LandingPage />;
}
