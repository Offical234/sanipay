import React from 'react';
import { cn, getStatusTheme } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  showDot?: boolean;
}

export function Badge({
  className,
  status,
  variant,
  showDot = true,
  children,
  ...props
}: BadgeProps) {
  if (status) {
    const theme = getStatusTheme(status);
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase',
          theme.bg,
          theme.text,
          theme.border,
          className,
        )}
        {...props}
      >
        {showDot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', theme.dot)} />}
        {children || status}
      </span>
    );
  }

  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant || 'default'],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
