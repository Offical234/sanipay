'use client';

import React from 'react';
import { Menu, Bell, Shield, Activity } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';

export interface HeaderProps {
  onMobileMenuToggle: () => void;
  title?: string;
  subtitle?: string;
}

export function Header({
  onMobileMenuToggle,
  title,
  subtitle,
}: HeaderProps) {
  const user = getStoredUser();

  return (
    <header className="sticky top-0 z-30 h-20 bg-slate-950/70 border-b border-slate-800/80 backdrop-blur-xl px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-100 lg:hidden rounded-lg hover:bg-slate-900"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          {title && (
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* API Status Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Activity className="w-3.5 h-3.5" />
          <span>API Connected</span>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 text-xs font-medium">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>{user?.role || 'ADMIN'}</span>
        </div>
      </div>
    </header>
  );
}
