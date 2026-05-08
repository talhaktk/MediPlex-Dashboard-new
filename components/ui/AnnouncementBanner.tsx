'use client';
import { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Info, Megaphone } from 'lucide-react';

type Announcement = {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  expires_at: string | null;
};

const TYPE_STYLES: Record<string, {
  bg: string; border: string; leftBorder: string;
  icon: React.ElementType; iconColor: string; titleColor: string; textColor: string;
}> = {
  info: {
    bg: '#eff6ff', border: '#bfdbfe', leftBorder: '#3b82f6',
    icon: Info, iconColor: '#2563eb', titleColor: '#1d4ed8', textColor: '#1e40af',
  },
  warning: {
    bg: '#fffbeb', border: '#fde68a', leftBorder: '#f59e0b',
    icon: AlertTriangle, iconColor: '#d97706', titleColor: '#92400e', textColor: '#78350f',
  },
  success: {
    bg: '#f0fdf4', border: '#bbf7d0', leftBorder: '#22c55e',
    icon: CheckCircle2, iconColor: '#16a34a', titleColor: '#15803d', textColor: '#166534',
  },
  urgent: {
    bg: '#fef2f2', border: '#fecaca', leftBorder: '#ef4444',
    icon: Megaphone, iconColor: '#dc2626', titleColor: '#991b1b', textColor: '#7f1d1d',
  },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissed_announcements');
      const ids: number[] = stored ? JSON.parse(stored) : [];
      setDismissed(new Set(ids));
    } catch {}

    fetch('/api/announcements')
      .then(r => r.json())
      .then(({ announcements: data }) => setAnnouncements(data || []))
      .catch(() => {});
  }, []);

  const dismiss = (id: number) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('dismissed_announcements', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (!visible.length) return null;

  return (
    <div className="flex flex-col gap-2 px-6 pt-4">
      {visible.map(a => {
        const s = TYPE_STYLES[a.type] || TYPE_STYLES.info;
        const Icon = s.icon;
        return (
          <div
            key={a.id}
            className="flex items-start gap-3 rounded-xl px-4 py-3"
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderLeft: `4px solid ${s.leftBorder}`,
            }}
          >
            <Icon size={15} style={{ color: s.iconColor, marginTop: 1, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-bold mr-2" style={{ color: s.titleColor }}>{a.title}</span>
              <span className="text-[12px]" style={{ color: s.textColor }}>{a.message}</span>
            </div>
            <button
              onClick={() => dismiss(a.id)}
              className="flex-shrink-0 mt-0.5 rounded hover:opacity-60 transition-opacity"
              style={{ color: s.iconColor }}
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
