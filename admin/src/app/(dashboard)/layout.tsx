'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { isAuthenticated, getStoredUser, isAllowedAdminRole } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  '/overview': {
    title: 'Financial & Operational Overview',
    subtitle: 'Real-time revenue, transaction volumes, and gateway health',
  },
  '/users': {
    title: 'User Directory',
    subtitle: 'Search, review KYC, and manage platform customer accounts',
  },
  '/transactions': {
    title: 'Master Transaction Ledger',
    subtitle: 'Historical transaction records across all VTU and payment channels',
  },
  '/refunds': {
    title: 'Dispute & Refund Console',
    subtitle: 'Review failed transactions and process manual wallet credits',
  },
  '/pricing': {
    title: 'Pricing & Commission Margins',
    subtitle: 'Configure telecom airtime discounts and dynamic data bundle prices',
  },
  '/settings': {
    title: 'System Settings',
    subtitle: 'Global feature flags, maintenance modes, and configuration keys',
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }

    const user = getStoredUser();
    if (!user || !isAllowedAdminRole(user.role)) {
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-xs text-slate-400 font-medium">
          Verifying security credentials...
        </span>
      </div>
    );
  }

  const currentMeta =
    ROUTE_META[pathname] || {
      title: 'Console',
      subtitle: 'SaniPay Operations',
    };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-row">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
        />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
