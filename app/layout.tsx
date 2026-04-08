import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'MediPlex — Pediatric Command Centre',
  description: 'Premium appointment & patient management dashboard for pediatric clinics',
  keywords: ['pediatric', 'clinic', 'appointments', 'dashboard', 'medical'],
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <body className="font-sans bg-cream text-navy antialiased">
        <SessionProviderWrapper>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0a1628',
                color: '#faf8f4',
                border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: '10px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
              },
              success: { iconTheme: { primary: '#c9a84c', secondary: '#0a1628' } },
            }}
          />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
