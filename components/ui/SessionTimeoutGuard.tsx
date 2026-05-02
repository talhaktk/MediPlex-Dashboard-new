'use client';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import { useClinicSettings } from '@/lib/useClinicSettings';

export function SessionTimeoutGuard() {
  const { settings } = useClinicSettings();
  const timeoutRef = useRef<NodeJS.Timeout|null>(null);
  const [warning, setWarning] = useState(false);
  const warningRef = useRef<NodeJS.Timeout|null>(null);

  const reset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    setWarning(false);

    const timeoutMins = settings?.session_timeout || 60;
    const timeoutMs = timeoutMins * 60 * 1000;
    const warnMs = Math.max(timeoutMs - 2 * 60 * 1000, timeoutMs * 0.9); // warn 2min before

    warningRef.current = setTimeout(() => setWarning(true), warnMs);
    timeoutRef.current = setTimeout(() => {
      signOut({ callbackUrl: '/login' });
    }, timeoutMs);
  };

  useEffect(() => {
    if (!settings?.session_timeout) return;
    const events = ['mousedown','keydown','scroll','touchstart','click'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [settings?.session_timeout]);

  if (!warning) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}}>
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center">
        <div className="text-3xl mb-3">⏰</div>
        <div className="font-bold text-navy text-[16px] mb-2">Session Expiring Soon</div>
        <div className="text-[13px] text-gray-500 mb-5">
          Your session will expire in 2 minutes due to inactivity.
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="flex-1 btn-gold py-2.5 text-[13px] font-semibold">
            Stay Logged In
          </button>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
