import { AppointmentStatus } from '@/types';

const config: Record<string, { cls: string; label: string }> = {
  Confirmed:   { cls: 'pill-confirmed',   label: 'Confirmed' },
  Cancelled:   { cls: 'pill-cancelled',   label: 'Cancelled' },
  Rescheduled: { cls: 'pill-rescheduled', label: 'Rescheduled' },
  Pending:     { cls: 'pill-pending',     label: 'Pending' },
  'No-Show':   { cls: 'pill-no-show',     label: 'No-Show' },
  Completed:   { cls: 'pill-completed',   label: 'Completed' },
};

export default function StatusPill({ status }: { status: string }) {
  const c = config[status] || { cls: 'pill-pending', label: status || 'Pending' };
  return <span className={`pill ${c.cls}`}>{c.label}</span>;
}
