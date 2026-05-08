'use client';
import { useEffect, useState } from 'react';
import { X, Bell, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

type Announcement = {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  expires_at: string | null;
};

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: React.ElementType; iconColor: string; titleColor: string }> = {
  info:    { bg: 'rgba(43,108,176,0.12)', border: 'rgba(43,108,176,0.35)', icon: Info,          iconColor: '#63b3ed', titleColor: '#90cdf4' },
  warning: { bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.4)',   icon: AlertTriangle,  iconColor: '#f6ad55', titleColor: '#fbd38d' },
  success: { bg: 'rgba(26,127,94,0.12)',  border: 'rgba(26,127,94,0.4)',   icon: CheckCircle2,   iconColor: '#4ade80', titleColor: '#86efac' },
  urgent:  { bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.4)',   icon: AlertTriangle,  iconColor: '#fc8181', titleColor: '#fca5a5' },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem('dismissed_announcements');
    const storedIds: number[] = stored ? JSON.parse(stored) : [];
    setDismissed(new Set(storedIds));

    fetch('/api/announcements')
      .then(r => r.json())
      .then(({ announcements: data }) => setAnnouncements(data || []))
      .catch(() => {});
  }, []);

  const dismiss = (id: number) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('dismissed_announcements', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (!visible.length) return null;

  return (
    <div className="flex flex-col gap-2 px-6 pt-4">
      {visible.map(a => {
        const style = TYPE_STYLES[a.type] || TYPE_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={a.id}
            className="flex items-start gap-3 rounded-xl px-4 py-3"
            style={{ background: style.bg, border: `1px solid ${style.border}` }}
          >
            <Icon size={15} style={{ color: style.iconColor, marginTop: 1, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold mr-2" style={{ color: style.titleColor }}>{a.title}</span>
              <span className="text-[12px] text-white/60">{a.message}</span>
            </div>
            <button
              onClick={() => dismiss(a.id)}
              className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0 mt-0.5"
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
