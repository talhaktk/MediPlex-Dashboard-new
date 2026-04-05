'use client';

import { Appointment, ReasonStat } from '@/types';
import { computeMonthlyStats } from '@/lib/sheets';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  Confirmed: '#1a7f5e',
  Cancelled: '#c53030',
  Rescheduled: '#b47a00',
  Pending: '#2b6cb0',
};

export default function OverviewCharts({ data, reasons }: { data: Appointment[]; reasons: ReasonStat[] }) {
  const monthly = computeMonthlyStats(data);

  const pieData = Object.entries(
    data.reduce((acc, a) => {
      const s = a.status || 'Pending';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Monthly Bar Chart */}
      <div className="card lg:col-span-2 animate-in stagger-1">
        <div className="px-5 py-4 border-b border-black/5">
          <div className="font-medium text-navy text-[14px]">Monthly Appointment Volume</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Confirmed vs Cancelled vs Rescheduled</div>
        </div>
        <div className="p-5" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} barSize={8} barGap={2}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8a9bb0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#8a9bb0' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{
                  background: '#0a1628', border: '1px solid rgba(201,168,76,0.25)',
                  borderRadius: 8, color: '#faf8f4', fontSize: 12
                }}
              />
              <Bar dataKey="confirmed" name="Confirmed" fill="#1a7f5e" radius={[3,3,0,0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill="#c53030" radius={[3,3,0,0]} />
              <Bar dataKey="rescheduled" name="Rescheduled" fill="#b47a00" radius={[3,3,0,0]} />
              <Bar dataKey="pending" name="Pending" fill="#2b6cb0" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Manual legend */}
        <div className="px-5 pb-4 flex gap-4 flex-wrap">
          {['Confirmed','Cancelled','Rescheduled','Pending'].map(s => (
            <span key={s} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: STATUS_COLORS[s] }} />
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Donut chart */}
      <div className="card animate-in stagger-2">
        <div className="px-5 py-4 border-b border-black/5">
          <div className="font-medium text-navy text-[14px]">Status Breakdown</div>
          <div className="text-[11px] text-gray-400 mt-0.5">All appointments</div>
        </div>
        <div className="p-5 flex flex-col items-center">
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name] || '#8a9bb0'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#0a1628', border: '1px solid rgba(201,168,76,0.25)',
                    borderRadius: 8, color: '#faf8f4', fontSize: 12
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full space-y-2 mt-2">
            {pieData.map(entry => (
              <div key={entry.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: STATUS_COLORS[entry.name] || '#8a9bb0' }} />
                  {entry.name}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-navy">{entry.value}</span>
                  <span className="text-gray-400 text-[11px]">
                    ({Math.round(entry.value / data.length * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
