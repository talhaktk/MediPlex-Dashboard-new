
'use client';
import { useState, useEffect } from 'react';
export function SettingsSavedBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const handler = () => {
      setShow(true);
      setTimeout(() => setShow(false), 3000);
    };
    window.addEventListener('clinic-settings-saved', handler);
    return () => window.removeEventListener('clinic-settings-saved', handler);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-[13px] font-medium text-white animate-in"
      style={{background:'#1a7f5e',border:'1px solid rgba(255,255,255,0.2)'}}>
      ✅ Settings saved — applied across all sessions
    </div>
  );
}
