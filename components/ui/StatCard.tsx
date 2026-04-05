'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  delay?: number;
}

export default function StatCard({ label, value, sub, icon: Icon, iconColor = '#c9a84c', trend, delay = 0 }: StatCardProps) {
  return (
    <div
      className="kpi-card animate-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-[10px] tracking-widest uppercase text-gray-400 font-medium mb-2">
            {label}
          </div>
          <div className="font-display text-[32px] font-semibold text-navy leading-none mb-2">
            {value}
          </div>
          {sub && (
            <div className="text-[12px] text-gray-400 font-light">{sub}</div>
          )}
          {trend && (
            <div className={`inline-flex items-center gap-1 text-[11px] font-medium mt-2 px-2 py-0.5 rounded-full ${
              trend.value >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3"
            style={{ background: `${iconColor}18` }}>
            <Icon size={18} style={{ color: iconColor }} />
          </div>
        )}
      </div>
    </div>
  );
}
