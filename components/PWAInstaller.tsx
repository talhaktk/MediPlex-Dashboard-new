'use client';

import { useEffect, useState } from 'react';
import { Download, X, Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';

declare global {
  interface Window { __pwaInstallPrompt?: any; }
}

export default function PWAInstaller() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showBanner, setShowBanner]       = useState(false);
  const [dismissed,  setDismissed]        = useState(false);
  const [pushEnabled, setPushEnabled]     = useState(false);
  const [pushLoading, setPushLoading]     = useState(false);

  useEffect(() => {
    // Don't show if already installed as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as any).standalone) return;

    const dismissed = sessionStorage.getItem('pwa-banner-dismissed');
    if (dismissed) return;

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      window.__pwaInstallPrompt = e;
      // Show banner after 3s on first visit
      setTimeout(() => setShowBanner(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Check push notification status
  useEffect(() => {
    if (!('Notification' in window)) return;
    setPushEnabled(Notification.permission === 'granted');
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') toast.success('MediPlex installed to home screen!');
    setInstallPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  };

  const handleEnablePush = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toast.error('Push notifications not supported in this browser');
      return;
    }
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        setPushLoading(false);
        return;
      }
      setPushEnabled(true);
      const reg = await navigator.serviceWorker.ready;

      // Fetch VAPID public key from server
      const res = await fetch('/api/push/vapid-key');
      if (res.ok) {
        const { vapidKey } = await res.json();
        if (vapidKey) {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub.toJSON()),
          });
          toast.success('Push notifications enabled!');
        } else {
          toast.success('Notifications enabled (local only)');
        }
      } else {
        toast.success('Notifications enabled (local only)');
      }
    } catch (err: any) {
      toast.error('Could not enable notifications: ' + (err?.message || 'Unknown error'));
    }
    setPushLoading(false);
    setShowBanner(false);
  };

  if (!showBanner && !dismissed) return null;
  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 animate-in slide-in-from-bottom-4">
      <div className="rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#0a1628', border: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
            <span className="text-[#0a1628] font-bold text-sm">M+</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-[13px]">Install MediPlex App</div>
            <div className="text-white/50 text-[11px] mt-0.5">Add to home screen for a faster, native-like experience</div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {installPrompt && (
                <button onClick={handleInstall}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
                  style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}>
                  <Download size={11} /> Install App
                </button>
              )}
              <button onClick={handleEnablePush} disabled={pushEnabled || pushLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                {pushEnabled ? <><BellOff size={11} /> Enabled</> : pushLoading ? 'Enabling…' : <><Bell size={11} /> Notifications</>}
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-white/30 hover:text-white/60 flex-shrink-0 mt-0.5 transition-all">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer  = new ArrayBuffer(rawData.length);
  const arr     = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}
