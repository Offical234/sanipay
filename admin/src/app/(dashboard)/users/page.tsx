'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users as UsersIcon,
  Search,
  Filter,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Wallet,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api, ApiError } from '@/lib/api';
import { AdminUser } from '@/types/admin';
import { PaginationMeta } from '@/types/api';
import { formatDateShort } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Status Change Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED'>('SUSPENDED');
  const [statusReason, setStatusReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/admin/users', {
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
      });
      setUsers(res.data || []);
      setMeta(res.meta || null);
    } catch (err: any) {
      toastError(err instanceof ApiError ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, roleFilter, toastError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenStatusModal = (user: AdminUser) => {
    setSelectedUser(user);
    setNewStatus(user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
    setStatusReason('');
    setStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedUser) return;
    setIsUpdatingStatus(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}/status`, {
        status: newStatus,
        reason: statusReason || undefined,
      });
      toastSuccess(
        `User ${selectedUser.email} account has been ${
          newStatus === 'ACTIVE' ? 'activated' : 'suspended'
        }.`,
      );
      setStatusModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toastError(err instanceof ApiError ? err.message : 'Failed to update user status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            User Directory & Accounts
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Search, inspect KYC tier, view wallet holdings, and regulate account states
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchUsers}
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
              placeholder="Search by email, phone number, or name..."
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
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Account Statuses</option>
              <option value="ACTIVE">ACTIVE Only</option>
              <option value="SUSPENDED">SUSPENDED Only</option>
            </Select>
          </div>

          <div className="sm:col-span-3">
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All User Roles</option>
              <option value="CUSTOMER">CUSTOMER</option>
              <option value="AGENT">AGENT</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="FINANCE_ADMIN">FINANCE_ADMIN</option>
              <option value="SUPPORT">SUPPORT</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Users Table Card */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="py-3 px-5 font-semibold">User Details</th>
                <th className="py-3 px-5 font-semibold">Role</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold">Wallet Balance</th>
                <th className="py-3 px-5 font-semibold">Orders</th>
                <th className="py-3 px-5 font-semibold">Joined</th>
                <th className="py-3 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    Loading users directory...
                  </td>
                </tr>
              )}

              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    No users matching criteria.
                  </td>
                </tr>
              )}

              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-100">
                        {u.fullName || 'Unnamed User'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{u.email}</span>
                      <span className="text-[11px] text-slate-500">{u.phone}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {u.role}
                    </span>
                  </td>

                  <td className="py-3.5 px-5">
                    <Badge status={u.status} />
                  </td>

                  <td className="py-3.5 px-5 font-semibold text-slate-100 tabular-nums">
                    {u.walletBalance?.formatted || '₦0.00'}
                  </td>

                  <td className="py-3.5 px-5 text-xs text-slate-400">
                    <span className="font-medium text-slate-200">
                      {u.transactionCount}
                    </span>{' '}
                    txns
                  </td>

                  <td className="py-3.5 px-5 text-xs text-slate-400">
                    {formatDateShort(u.createdAt)}
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <Button
                      variant={u.status === 'ACTIVE' ? 'danger' : 'outline'}
                      size="sm"
                      onClick={() => handleOpenStatusModal(u)}
                    >
                      {u.status === 'ACTIVE' ? (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Activate</span>
                        </>
                      )}
                    </Button>
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
              Showing <span className="font-semibold text-slate-200">{users.length}</span> of{' '}
              <span className="font-semibold text-slate-200">{meta.totalCount}</span> total users
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

      {/* Account Status Toggle Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={newStatus === 'ACTIVE' ? 'Activate Account' : 'Suspend Account'}
        description={`Configure regulatory status for ${selectedUser?.email}`}
      >
        <div className="space-y-4">
          <div
            className={`p-3 rounded-xl border text-xs leading-relaxed ${
              newStatus === 'SUSPENDED'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            }`}
          >
            {newStatus === 'SUSPENDED'
              ? 'Warning: Suspending this account will immediately revoke all access tokens, block new wallet debits, and prevent bill payments.'
              : 'Activating this account will restore full access to wallet services, bill vending, and profile actions.'}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300">
              Administrative Reason (Logged to Audit Trail)
            </label>
            <textarea
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="e.g. KYC verification pending / Suspicious transaction activity"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={newStatus === 'SUSPENDED' ? 'danger' : 'primary'}
              size="md"
              isLoading={isUpdatingStatus}
              onClick={handleConfirmStatusChange}
            >
              Confirm {newStatus === 'SUSPENDED' ? 'Suspension' : 'Activation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
