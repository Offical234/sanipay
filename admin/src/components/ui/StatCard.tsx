import React from 'react';
import { Card } from './Card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string;
  subvalue?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'emerald' | 'blue' | 'amber' | 'purple';
}

export function StatCard({
  title,
  value,
  subvalue,
  icon,
  trend,
  color = 'emerald',
}: StatCardProps) {
  const colorStyles = {
    emerald: {
      glow: 'from-emerald-500/10 to-transparent',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      border: 'hover:border-emerald-500/40',
    },
    blue: {
      glow: 'from-blue-500/10 to-transparent',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      border: 'hover:border-blue-500/40',
    },
    amber: {
      glow: 'from-amber-500/10 to-transparent',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      border: 'hover:border-amber-500/40',
    },
    purple: {
      glow: 'from-purple-500/10 to-transparent',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      border: 'hover:border-purple-500/40',
    },
  };

  const style = colorStyles[color];

  return (
    <Card
      interactive
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        style.border,
      )}
    >
      <div
        className={cn(
          'absolute -right-6 -bottom-6 w-32 h-32 bg-gradient-to-br rounded-full blur-2xl pointer-events-none',
          style.glow,
        )}
      />
      <div className="flex items-center justify-between gap-4 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
            style.iconBg,
          )}
        >
          {icon}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-2xl font-bold tracking-tight text-slate-50 tabular-nums">
          {value}
        </span>
        {(subvalue || trend) && (
          <div className="flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={cn(
                  'font-medium',
                  trend.isPositive ? 'text-emerald-400' : 'text-rose-400',
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}
              </span>
            )}
            {subvalue && <span className="text-slate-500">{subvalue}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}
