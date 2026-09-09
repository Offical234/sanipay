'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Sliders,
  Plus,
  Edit2,
  RefreshCw,
  Key,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { api, ApiError } from '@/lib/api';
import { SystemSetting } from '@/types/admin';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Create Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/admin/system-settings');
      setSettings(res.data || []);
    } catch (err: any) {
      toastError(err instanceof ApiError ? err.message : 'Failed to load system settings');
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleOpenEdit = (setting: SystemSetting) => {
    setKey(setting.key);
    setValue(setting.value === '***' ? '' : setting.value);
    setDescription(setting.description || '');
    setModalOpen(true);
  };

  const handleOpenNew = () => {
    setKey('');
    setValue('');
    setDescription('');
    setModalOpen(true);
  };

  const handleSaveSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) {
      toastError('Please enter both key and value.');
      return;
    }

    setIsSaving(true);
    try {
      const res: any = await api.put('/admin/system-settings', {
        key: key.trim().toUpperCase(),
        value: value.trim(),
        description: description.trim() || undefined,
      });
      toastSuccess(res.message || 'System setting successfully updated.');
      setModalOpen(false);
      fetchSettings();
    } catch (err: any) {
      toastError(err instanceof ApiError ? err.message : 'Failed to save system setting');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            System Settings & Feature Flags
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure dynamic platform controls, maintenance switches, and global parameters
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchSettings}
            isLoading={isLoading}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </Button>

          <Button variant="primary" size="sm" onClick={handleOpenNew}>
            <Plus className="w-4 h-4" />
            <span>Add Setting</span>
          </Button>
        </div>
      </div>

      {/* Settings Grid / Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="py-3 px-5 font-semibold">Configuration Key</th>
                <th className="py-3 px-5 font-semibold">Current Value</th>
                <th className="py-3 px-5 font-semibold">Description</th>
                <th className="py-3 px-5 font-semibold">Last Modified</th>
                <th className="py-3 px-5 font-semibold text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {isLoading && settings.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                    Loading configuration flags...
                  </td>
                </tr>
              )}

              {!isLoading && settings.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                    No custom settings defined. Click "Add Setting" to define platform flags.
                  </td>
                </tr>
              )}

              {settings.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-xs font-semibold text-emerald-400">
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-slate-500" />
                      <span>{s.key}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-5 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200">
                      {s.value}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-xs text-slate-300 max-w-sm truncate">
                    {s.description || '—'}
                  </td>

                  <td className="py-3.5 px-5 text-xs text-slate-400">
                    {formatDateTime(s.updatedAt)}
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(s)}
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upsert Setting Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={key ? `Configure ${key}` : 'Define New System Setting'}
        description="Settings take effect instantly across all backend services."
      >
        <form onSubmit={handleSaveSetting} className="space-y-4">
          <Input
            label="Setting Key (UPPERCASE_SNAKE_CASE)"
            placeholder="e.g. MAINTENANCE_MODE"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            required
          />

          <Input
            label="Value (Stored as string)"
            placeholder="e.g. false or 100000"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300">
              Purpose / Description
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Global switch to pause VTU bill checkout during aggregator maintenance windows"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
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
              isLoading={isSaving}
            >
              Save Setting
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
