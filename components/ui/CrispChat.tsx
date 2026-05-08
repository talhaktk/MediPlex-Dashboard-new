'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

const WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || '';

export default function CrispChat() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!WEBSITE_ID || typeof window === 'undefined' || (window as any).$crisp) return;
    (window as any).$crisp = [];
    (window as any).CRISP_WEBSITE_ID = WEBSITE_ID;
    const s = document.createElement('script');
    s.src = 'https://client.crisp.chat/l.js';
    s.async = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!WEBSITE_ID || typeof window === 'undefined' || !(window as any).$crisp) return;
    const user = session?.user as any;
    if (user?.email) {
      (window as any).$crisp.push(['set', 'user:email', [user.email]]);
      if (user.name) (window as any).$crisp.push(['set', 'user:nickname', [user.name]]);
    }
  }, [session]);

  return null;
}
