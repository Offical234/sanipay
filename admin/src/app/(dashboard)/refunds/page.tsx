'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  RotateCcw,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api, ApiError } from '@/lib/api';
import { AdminRefund } from '@/types/admin';
import { PaginationMeta } from '@/types/api';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Manual Refund Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchRefunds = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/admin/refunds', { page, limit: 15 });
      setRefunds(res.data || []);
      setMeta(res.meta || null);
    } catch (err: any) {
      toastError(err instanceof ApiError ? err.message : 'Failed to fetch refunds');
    } finally {
      setIsLoading(false);
    }
  }, [page, toastError]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim() || !reason.trim()) {
      toastError('Please enter both Transaction ID and justification reason.');
      return;
    }

    setIsProcessing(true);
    try {
      const res: any = await api.post('/admin/refunds/process', {
        transactionId: transactionId.trim(),
        reason: reason.trim(),
      });
      toastSuccess(res.message || 'Refund successfully processed and credited to user wallet!');
      setModalOpen(false);
      setTransactionId('');
      setReason('');
      fetchRefunds();
    } catch (err: any) {
      toastError(err instanceof ApiError ? err.message : 'Refund processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            Dispute & Refund Console
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit refund history and process authorized reverse wallet credits for failed orders
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchRefunds}
            isLoading={isLoading}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Process Manual Refund</span>
          </Button>
        </div>
      </div>

      {/* Refunds Table Card */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="py-3 px-5 font-semibold">Txn Reference</th>
                <th className="py-3 px-5 font-semibold">Recipient / User</th>
                <th className="py-3 px-5 font-semibold">Amount Credited</th>
                <th className="py-3 px-5 font-semibold">Reason</th>
                <th className="py-3 px-5 font-semibold">Processed By</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold">Processed Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {isLoading && refunds.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    Loading refunds records...
                  </td>
                </tr>
              )}

              {!isLoading && refunds.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    No refunds processed yet.
                  </td>
                </tr>
              )}

              {refunds.map((rf) => (
                <tr key={rf.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-xs text-slate-200">
                    <div className="flex flex-col">
                      <span>{rf.transactionRef}</span>
                      <span className="text-[10px] text-slate-500">{rf.transactionType}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200">{rf.user.name}</span>
                      <span className="text-xs text-slate-400 font-mono">{rf.user.email}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-5 font-bold text-emerald-400 tabular-nums">
                    {rf.amountFormatted}
                  </td>

                  <td className="py-3.5 px-5 text-xs text-slate-300 max-w-xs truncate">
                    {rf.reason}
                  </td>

                  <td className="py-3.5 px-5 text-xs text-slate-400 font-mono">
                    {rf.processedBy.substring(0, 10)}...
                  </td>

                  <td className="py-3.5 px-5">
                    <Badge status={rf.status} />
                  </td>

                  <td className="py-3.5 px-5 text-xs text-slate-400">
                    {formatDateTime(rf.createdAt)}
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
              Showing <span className="font-semibold text-slate-200">{refunds.length}</span> of{' '}
              <span className="font-semibold text-slate-200">{meta.totalCount}</span> refunds
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

      {/* Manual Refund Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Execute Manual Transaction Refund"
        description="Verify the target transaction ID and credit the exact amount back to the user's wallet."
      >
        <form onSubmit={handleProcessRefund} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span className="leading-relaxed">
              This action triggers an ACID transaction: the transaction will be permanently
              marked REFUNDED, the user wallet credited, and an audit log recorded.
            </span>
          </div>

          <Input
            label="Transaction ID (UUID)"
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300">
              Dispute Resolution Justification
            </label>
            <textarea
              rows={3}
              placeholder="e.g. VTPass returned response code 016 (Transaction Failed), customer verified airtime not received."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isProcessing}
            >
              Authorize & Process Refund
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
