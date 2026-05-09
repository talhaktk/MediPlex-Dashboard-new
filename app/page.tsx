import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import LandingPage from '@/components/landing/LandingPage';

const BASE_URL = 'https://mediplex.io';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: 'MediPlex — AI-Powered HMIS for Modern Clinics | UK Registered',
  description: 'MediPlex is a complete AI clinic management system: smart scheduling, AI clinical scribe (SOAP notes), WhatsApp AI receptionist, billing, prescriptions, lab integration and clinic growth tools. Trusted by 500+ clinics across UK, Pakistan, Australia, UAE and more.',
  keywords: [
    'clinic management software', 'HMIS', 'AI clinical scribe', 'WhatsApp AI receptionist',
    'healthcare software UK', 'medical practice management', 'clinic EHR', 'AI SOAP notes',
    'appointment scheduling software', 'clinic billing software', 'patient portal',
    'telemedicine software', 'clinic analytics', 'prescription software', 'lab integration',
    'clinic marketing', 'MediPlex', 'GDPR compliant healthcare', 'pediatric software',
  ],
  authors: [{ name: 'KLASSICAL HOLDINGS LTD', url: BASE_URL }],
  creator: 'KLASSICAL HOLDINGS LTD',
  publisher: 'MediPlex',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 } },
  alternates: { canonical: BASE_URL },
  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: 'MediPlex',
    title: 'MediPlex — AI-Powered HMIS for Modern Clinics',
    description: 'Complete clinic management: AI Scribe, WhatsApp AI Receptionist, Billing, Lab Integration, Analytics & Clinic Growth. 500+ clinics worldwide. Start free trial.',
    locale: 'en_GB',
    images: [{ url: '/icons/icon.svg', width: 512, height: 512, alt: 'MediPlex — AI Clinic Management' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MediPlex — AI-Powered HMIS for Modern Clinics',
    description: 'Complete clinic management: AI Scribe, WhatsApp AI Receptionist, Billing, Labs & Growth. 500+ clinics. Start free.',
    images: ['/icons/icon.svg'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'MediPlex',
      url: BASE_URL,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web, iOS, Android',
      description: 'AI-powered clinic management system with appointment scheduling, AI clinical scribe, WhatsApp AI receptionist, billing, prescriptions, lab integration and marketing tools.',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'GBP',
        lowPrice: '150',
        highPrice: '210',
        offerCount: '2',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '500',
        bestRating: '5',
      },
      featureList: [
        'AI Clinical Scribe — SOAP Notes, Prescriptions, Referrals',
        'WhatsApp AI Receptionist — 24/7 Booking & Reminders',
        'Smart Appointment Scheduling',
        'Billing & Invoicing',
        'Lab Integration & Orders',
        'Patient Portal',
        'Analytics Dashboard',
        'Telemedicine / Video Consult',
        'Offline Mode (PWA)',
        'Meta & Google Ads Management',
        'SEO Clinic Website',
        'Email Marketing',
      ],
    },
    {
      '@type': 'Organization',
      name: 'KLASSICAL HOLDINGS LTD',
      legalName: 'KLASSICAL HOLDINGS LTD',
      url: BASE_URL,
      logo: `${BASE_URL}/icons/icon.svg`,
      foundingLocation: 'United Kingdom',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'GB',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'info@klassicalholdings.com',
        telephone: '+447776387877',
        availableLanguage: 'English',
        contactOption: 'TollFree',
        hoursAvailable: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
          opens: '00:00',
          closes: '23:59',
        },
      },
      sameAs: ['https://linkedin.com', 'https://twitter.com'],
    },
    {
      '@type': 'WebSite',
      url: BASE_URL,
      name: 'MediPlex',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/features?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
