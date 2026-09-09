'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  Users,
  ArrowUpRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import { DashboardOverview } from '@/types/admin';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export default function OverviewPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { error: toastError } = useToast();

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/admin/dashboard/overview');
      setData(res.data);
    } catch (err: any) {
      toastError(err instanceof ApiError ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner with Refresh Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            Operations & Revenue Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry and ledger performance for Nigerian digital services
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchOverview}
          isLoading={isLoading}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={data?.revenue?.totalFormatted || '₦0.00'}
          subvalue={`This month: ${data?.revenue?.thisMonthFormatted || '₦0.00'}`}
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          color="emerald"
        />

        <StatCard
          title="Today's Volume"
          value={data?.revenue?.todayFormatted || '₦0.00'}
          subvalue={`${data?.transactions?.today || 0} transactions today`}
          icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
          color="blue"
        />

        <StatCard
          title="Platform Funds Held"
          value={data?.wallets?.totalFundsHeldFormatted || '₦0.00'}
          subvalue="Customer wallet balances"
          icon={<Wallet className="w-5 h-5 text-purple-400" />}
          color="purple"
        />

        <StatCard
          title="Registered Users"
          value={String(data?.users?.total || 0)}
          subvalue={`${data?.users?.active || 0} active • ${data?.users?.suspended || 0} suspended`}
          icon={<Users className="w-5 h-5 text-amber-400" />}
          color="amber"
        />
      </div>

      {/* Middle Row: Volume Breakdown & Transaction Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Volume Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Service Volume Distribution</CardTitle>
                <CardDescription>Successful delivery across digital utilities</CardDescription>
              </div>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
          </CardHeader>

          <div className="space-y-4">
            {(!data?.volumeByType || data.volumeByType.length === 0) && (
              <div className="py-12 text-center text-slate-500 text-sm">
                No transaction volume recorded yet.
              </div>
            )}

            {data?.volumeByType?.map((item) => (
              <div
                key={item.type}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-slate-200 block">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      {item.count} successful orders
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-slate-100 tabular-nums">
                    {item.volumeFormatted}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Transaction Health Status */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Health</CardTitle>
            <CardDescription>All-time state distribution</CardDescription>
          </CardHeader>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Successful</span>
              </div>
              <span className="font-bold text-emerald-300 text-sm tabular-nums">
                {data?.transactions?.byStatus?.successful || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-medium">
                <Clock className="w-4 h-4" />
                <span>Processing / Queued</span>
              </div>
              <span className="font-bold text-amber-300 text-sm tabular-nums">
                {data?.transactions?.byStatus?.processing || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
              <div className="flex items-center gap-2 text-rose-400 font-medium">
                <XCircle className="w-4 h-4" />
                <span>Failed</span>
              </div>
              <span className="font-bold text-rose-300 text-sm tabular-nums">
                {data?.transactions?.byStatus?.failed || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
              <div className="flex items-center gap-2 text-purple-400 font-medium">
                <RotateCcw className="w-4 h-4" />
                <span>Refunded</span>
              </div>
              <span className="font-bold text-purple-300 text-sm tabular-nums">
                {data?.transactions?.byStatus?.refunded || 0}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Section: Recent Activity Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Operational Activity</CardTitle>
              <CardDescription>Latest orders across web and mobile channels</CardDescription>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              <span>View All Transactions</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 border-b border-slate-800/80 bg-slate-900/40">
              <tr>
                <th className="py-3 px-4 font-semibold">Reference</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(!data?.recentActivity || data.recentActivity.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No recent transactions found.
                  </td>
                </tr>
              )}

              {data?.recentActivity?.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                    {tx.reference}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-200">{tx.user.name}</span>
                      <span className="text-xs text-slate-400">{tx.user.phone || '—'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                    {tx.type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-100 tabular-nums">
                    {tx.amountFormatted}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={tx.status} />
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-400">
                    {formatDateTime(tx.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
