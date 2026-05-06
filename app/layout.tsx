import type { Metadata, Viewport } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';
import PWAInstaller from '@/components/PWAInstaller';
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
  title: 'MediPlex — Clinic Command Centre',
  description: 'Premium appointment & patient management dashboard for modern clinics',
  keywords: ['clinic', 'appointments', 'dashboard', 'medical', 'pediatric', 'EHR'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MediPlex',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
    shortcut: '/icons/icon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#0a1628',
    'msapplication-tap-highlight': 'no',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0a1628' },
    { media: '(prefers-color-scheme: dark)',  color: '#0a1628' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="font-sans bg-cream text-navy antialiased">
        <SessionProviderWrapper>
          {children}
          <PWAInstaller />
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
        {/* Service Worker registration */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(function(reg) {
                  console.log('[MediPlex] SW registered:', reg.scope);
                })
                .catch(function(err) {
                  console.warn('[MediPlex] SW registration failed:', err);
                });
              navigator.serviceWorker.addEventListener('message', function(event) {
                if (event.data?.type === 'NAVIGATE' && event.data.url) {
                  window.location.href = event.data.url;
                }
              });
            });
          }
        `}} />
      </body>
    </html>
  );
}
