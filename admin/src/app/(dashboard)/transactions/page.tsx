'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ReceiptText,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { api, ApiError } from '@/lib/api';
import { AdminTransaction } from '@/types/admin';
import { PaginationMeta } from '@/types/api';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { error: toastError } = useToast();

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/admin/transactions', {
        page,
        limit: 15,
        search: search.trim() || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setTransactions(res.data || []);
      setMeta(res.meta || null);
    } catch (err: any) {
      toastError(err instanceof ApiError ? err.message : 'Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, typeFilter, statusFilter, toastError]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            Master Transaction Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete audit trail across airtime, data, utility bills, and payment gateways
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchTransactions}
          isLoading={isLoading}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <Input
              placeholder="Search reference, recipient phone, meter, or customer email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Service Types</option>
              <option value="AIRTIME_PURCHASE">Airtime Purchase</option>
              <option value="DATA_PURCHASE">Data Purchase</option>
              <option value="ELECTRICITY_BILL">Electricity Bill</option>
              <option value="CABLE_SUBSCRIPTION">Cable TV</option>
              <option value="WALLET_FUNDING">Wallet Funding</option>
              <option value="WALLET_TRANSFER">P2P Transfer</option>
              <option value="REFUND">Refund</option>
              <option value="REFERRAL_BONUS">Referral Commission</option>
            </Select>
          </div>

          <div className="sm:col-span-3">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="REFUNDED">REFUNDED</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Transactions Table Card */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="py-3 px-5 font-semibold">Reference</th>
                <th className="py-3 px-5 font-semibold">Customer</th>
                <th className="py-3 px-5 font-semibold">Service Type</th>
                <th className="py-3 px-5 font-semibold">Amount</th>
                <th className="py-3 px-5 font-semibold">Provider</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold">Date & Time</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {isLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    Loading ledger records...
                  </td>
                </tr>
              )}

              {!isLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    No transactions matching criteria.
                  </td>
                </tr>
              )}

              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-xs text-slate-200">
                    <div className="flex flex-col">
                      <span>{tx.reference}</span>
                      {tx.providerReference && (
                        <span className="text-[10px] text-slate-500">
                          Ext: {tx.providerReference}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200">{tx.user.name}</span>
                      <span className="text-xs text-slate-400 font-mono">{tx.user.email}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-5 text-xs font-medium text-slate-300">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                      {tx.type.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 font-semibold text-slate-100 tabular-nums">
                    {tx.amountFormatted}
                  </td>

                  <td className="py-3.5 px-5 text-xs font-mono text-slate-300">
                    {tx.providerName}
                  </td>

                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-1.5">
                      <Badge status={tx.status} />
                      {tx.failureReason && (
                        <span
                          title={tx.failureReason}
                          className="text-rose-400 cursor-help"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-5 text-xs text-slate-400">
                    {formatDateTime(tx.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {meta && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-900/30 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-200">{transactions.length}</span> of{' '}
              <span className="font-semibold text-slate-200">{meta.totalCount}</span> records
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </Button>

              <span className="px-2 font-medium text-slate-300">
                Page {meta.page} of {meta.totalPages || 1}
              </span>

              <Button
                variant="secondary"
                size="sm"
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
