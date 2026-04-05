'use client';

import { useState, useMemo } from 'react';
import { Appointment } from '@/types';
import { formatUSDate } from '@/lib/sheets';
import StatusPill from '@/components/ui/StatusPill';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, parseISO, isValid, addMonths, subMonths, isToday
} from 'date-fns';

const STATUS_DOT: Record<string, string> = {
  Confirmed: '#1a7f5e',
  Cancelled: '#c53030',
  Rescheduled: '#b47a00',
  Pending: '#2b6cb0',
};

export default function CalendarClient({ data }: { data: Appointment[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 1)); // April 2026
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start with empty cells
  const startDow = monthStart.getDay(); // 0=Sun
  const prefixCells = Array(startDow).fill(null);

  // Build date→appointments map
  const aptByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    data.forEach(a => {
      const d = parseISO(a.appointmentDate);
      if (!isValid(d)) return;
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [data]);

  const selectedApts = selectedDay
    ? aptByDate.get(format(selectedDay, 'yyyy-MM-dd')) || []
    : [];

  const totalThisMonth = useMemo(() => {
    let count = 0;
    days.forEach(d => {
      count += aptByDate.get(format(d, 'yyyy-MM-dd'))?.length || 0;
    });
    return count;
  }, [days, aptByDate]);

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Calendar */}
      <div className="card lg:col-span-2">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <div>
            <div className="font-display font-semibold text-navy text-[18px]">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {totalThisMonth} appointments this month
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-gold transition-colors"
            >
              <ChevronLeft size={14} className="text-gray-500" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 text-[12px] rounded-lg border border-gray-200 hover:border-gold transition-colors text-gray-500"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-gold transition-colors"
            >
              <ChevronRight size={14} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map(d => (
              <div key={d} className="text-center text-[11px] text-gray-400 font-medium uppercase tracking-wider py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {prefixCells.map((_, i) => <div key={`pre-${i}`} />)}
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const apts = aptByDate.get(key) || [];
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isTodayDay = isToday(day);

              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay!) ? null : day)}
                  className={`min-h-[72px] rounded-xl p-1.5 cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-gold bg-amber-50'
                      : isTodayDay
                      ? 'border-navy/20 bg-navy/3'
                      : apts.length > 0
                      ? 'border-gray-100 hover:border-gold/40 hover:bg-amber-50/40'
                      : 'border-transparent hover:border-gray-100'
                  }`}
                >
                  <div className={`text-[12px] font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    isTodayDay
                      ? 'bg-navy text-white text-[11px]'
                      : isSelected
                      ? 'text-amber-800'
                      : 'text-gray-600'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {apts.length > 0 && (
                    <div className="space-y-0.5">
                      {apts.slice(0, 2).map((a, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1 truncate"
                          title={`${a.childName} - ${a.status}`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: STATUS_DOT[a.status] || '#8a9bb0' }} />
                          <span className="text-[10px] text-gray-600 truncate leading-tight">
                            {a.childName}
                          </span>
                        </div>
                      ))}
                      {apts.length > 2 && (
                        <div className="text-[10px] text-gray-400 pl-2.5">
                          +{apts.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 pb-4 flex gap-4 flex-wrap border-t border-black/5 pt-3">
          {Object.entries(STATUS_DOT).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Day sidebar */}
      <div className="space-y-4">
        {/* Month mini stats */}
        <div className="card p-4">
          <div className="font-medium text-navy text-[13px] mb-3">
            {format(currentMonth, 'MMMM')} at a Glance
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total', value: totalThisMonth, color: '#0a1628' },
              {
                label: 'Confirmed',
                value: days.reduce((acc, d) => acc + (aptByDate.get(format(d,'yyyy-MM-dd'))?.filter(a=>a.status==='Confirmed').length||0), 0),
                color: '#1a7f5e'
              },
              {
                label: 'Cancelled',
                value: days.reduce((acc, d) => acc + (aptByDate.get(format(d,'yyyy-MM-dd'))?.filter(a=>a.status==='Cancelled').length||0), 0),
                color: '#c53030'
              },
              {
                label: 'Rescheduled',
                value: days.reduce((acc, d) => acc + (aptByDate.get(format(d,'yyyy-MM-dd'))?.filter(a=>a.status==='Rescheduled').length||0), 0),
                color: '#b47a00'
              },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: '#faf8f4' }}>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{s.label}</div>
                <div className="text-[22px] font-display font-semibold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected day panel */}
        <div className="card flex-1">
          <div className="px-4 py-3.5 border-b border-black/5">
            <div className="font-medium text-navy text-[13px]">
              {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'Select a day'}
            </div>
            {selectedDay && (
              <div className="text-[11px] text-gray-400 mt-0.5">
                {selectedApts.length} appointment{selectedApts.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          <div className="divide-y divide-black/5">
            {!selectedDay && (
              <div className="px-4 py-8 text-center text-[13px] text-gray-400">
                Click a day on the calendar to see appointments
              </div>
            )}
            {selectedDay && selectedApts.length === 0 && (
              <div className="px-4 py-8 text-center text-[13px] text-gray-400">
                No appointments on this day
              </div>
            )}
            {selectedApts
              .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''))
              .map(a => (
                <div key={a.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-navy text-[13px]">{a.childName}</div>
                      <div className="text-[11px] text-gray-400">Parent: {a.parentName}</div>
                    </div>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-500">
                    <span>⏰ {a.appointmentTime || 'No time'}</span>
                    {a.childAge && <span>👤 Age {a.childAge}</span>}
                  </div>
                  {a.reason && (
                    <div className="mt-1 text-[11px] text-gray-600 bg-gray-50 rounded-lg px-2 py-1">
                      {a.reason}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
