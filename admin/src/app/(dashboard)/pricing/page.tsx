'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  BadgePercent,
  Radio,
  Edit2,
  RefreshCw,
  TrendingUp,
  Percent,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api, ApiError } from '@/lib/api';
import { NetworkPricing, DataPlan } from '@/types/admin';
import { useToast } from '@/components/ui/Toast';

export default function PricingPage() {
  const [networks, setNetworks] = useState<NetworkPricing[]>([]);
  const [dataPlans, setDataPlans] = useState<DataPlan[]>([]);
  const [selectedNetworkFilter, setSelectedNetworkFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Network Airtime Discount Edit Modal
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkPricing | null>(null);
  const [discountBps, setDiscountBps] = useState<number>(300);
  const [isUpdatingNetwork, setIsUpdatingNetwork] = useState(false);

  // Data Plan Price Edit Modal
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [sellingPriceKobo, setSellingPriceKobo] = useState<number>(100000);
  const [planIsActive, setPlanIsActive] = useState(true);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [netRes, planRes]: any = await Promise.all([
        api.get('/admin/pricing/networks'),
        api.get('/admin/pricing/data-plans', {
          networkId: selectedNetworkFilter || undefined,
        }),
      ]);
      setNetworks(netRes.data || []);
      setDataPlans(planRes.data || []);
    } catch (err: any) {
      toastError(err instanceof ApiError ? err.message : 'Failed to load pricing data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedNetworkFilter, toastError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Network Update
  const handleOpenNetworkModal = (network: NetworkPricing) => {
    setSelectedNetwork(network);
    setDiscountBps(network.airtimeDiscountBps);
    setNetworkModalOpen(true);
  };

  const handleUpdateNetworkDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNetwork) return;

    setIsUpdatingNetwork(true);
    try {
      const res: any = await api.patch(`/admin/pricing/networks/${selectedNetwork.id}`, {
        airtimeDiscountBps: Number(discountBps),
      });
      toastSuccess(res.message || 'Network airtime discount updated successfully');
      setNetworkModalOpen(false);
      fetchData();
    } catch (err: any) {
      toastError(err instanceof ApiError ? err.message : 'Failed to update network discount');
    } finally {
      setIsUpdatingNetwork(false);
    }
  };

  // Handle Data Plan Update
  const handleOpenPlanModal = (plan: DataPlan) => {
    setSelectedPlan(plan);
    setSellingPriceKobo(Number(plan.sellingPriceKobo));
    setPlanIsActive(plan.isActive);
    setPlanModalOpen(true);
  };

  const handleUpdatePlanPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setIsUpdatingPlan(true);
    try {
      const res: any = await api.patch(`/admin/pricing/data-plans/${selectedPlan.id}`, {
        sellingPriceKobo: Number(sellingPriceKobo),
        isActive: planIsActive,
      });
      toastSuccess(res.message || 'Data plan pricing updated successfully');
      setPlanModalOpen(false);
      fetchData();
    } catch (err: any) {
      toastError(err instanceof ApiError ? err.message : 'Failed to update data plan');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            Pricing, Margins & Commission Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage real-time customer discounts, vendor margins, and data bundle selling prices
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchData}
          isLoading={isLoading}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload</span>
        </Button>
      </div>

      {/* Section 1: Telecom Airtime Discounts */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base font-bold text-slate-200">
            Telecom Networks — Airtime Cashbacks & Discounts
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {networks.map((net) => (
            <Card key={net.id} interactive className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-bold text-base text-slate-100">{net.name}</span>
                  <Badge status={net.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                </div>

                <div className="space-y-1 mb-4">
                  <span className="text-xs text-slate-400 block">Customer Discount:</span>
                  <span className="text-2xl font-black text-emerald-400 tabular-nums">
                    {net.airtimeDiscountPercent}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {net.airtimeDiscountBps} basis points (BPS)
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {net.dataPlansCount} data plans
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenNetworkModal(net)}
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Adjust</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Section 2: Data Bundle Catalog */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Data Bundle Catalog & Margins</CardTitle>
            <CardDescription>
              Control selling price in Kobo and calculate operational margins in real-time
            </CardDescription>
          </div>

          <div className="w-full sm:w-64">
            <Select
              value={selectedNetworkFilter}
              onChange={(e) => setSelectedNetworkFilter(e.target.value)}
            >
              <option value="">All Telecom Operators</option>
              {networks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="py-3 px-5 font-semibold">Plan Name</th>
                <th className="py-3 px-5 font-semibold">Operator</th>
                <th className="py-3 px-5 font-semibold">Validity</th>
                <th className="py-3 px-5 font-semibold">Cost Price</th>
                <th className="py-3 px-5 font-semibold">Selling Price</th>
                <th className="py-3 px-5 font-semibold">Gross Margin</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {isLoading && dataPlans.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                    Loading data plans...
                  </td>
                </tr>
              )}

              {!isLoading && dataPlans.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                    No data plans found for this filter.
                  </td>
                </tr>
              )}

              {dataPlans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-5 font-medium text-slate-200">
                    <div className="flex flex-col">
                      <span>{p.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{p.planCode}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {p.network.name}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-xs text-slate-300">
                    {p.validity}
                  </td>

                  <td className="py-3.5 px-5 text-xs text-slate-400 tabular-nums">
                    {p.costPriceFormatted}
                  </td>

                  <td className="py-3.5 px-5 font-bold text-slate-100 tabular-nums">
                    {p.sellingPriceFormatted}
                  </td>

                  <td className="py-3.5 px-5 font-semibold text-emerald-400 text-xs tabular-nums">
                    +{p.marginFormatted}
                  </td>

                  <td className="py-3.5 px-5">
                    <Badge status={p.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenPlanModal(p)}
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

      {/* Network Discount Modal */}
      <Modal
        isOpen={networkModalOpen}
        onClose={() => setNetworkModalOpen(false)}
        title={`Adjust ${selectedNetwork?.name} Airtime Margin`}
        description="Set the customer airtime discount in basis points (100 bps = 1.00% cashback)"
      >
        <form onSubmit={handleUpdateNetworkDiscount} className="space-y-4">
          <Input
            label="Airtime Discount in Basis Points (BPS)"
            type="number"
            min={0}
            max={2000}
            value={discountBps}
            onChange={(e) => setDiscountBps(Number(e.target.value))}
            required
          />

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center justify-between">
            <span>Effective Cashback to Customer:</span>
            <span className="font-bold text-emerald-400 text-sm tabular-nums">
              {(Number(discountBps) / 100).toFixed(2)}%
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setNetworkModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isUpdatingNetwork}
            >
              Save Discount
            </Button>
          </div>
        </form>
      </Modal>

      {/* Data Plan Price Modal */}
      <Modal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={`Edit ${selectedPlan?.name} Price`}
        description={`Set customer selling price for ${selectedPlan?.network?.name} (${selectedPlan?.validity})`}
      >
        <form onSubmit={handleUpdatePlanPrice} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Wholesale Cost Price:</span>
              <span className="font-semibold text-slate-200">
                {selectedPlan?.costPriceFormatted}
              </span>
            </div>
          </div>

          <Input
            label="Selling Price in Kobo (e.g. 150000 = ₦1,500.00)"
            type="number"
            min={100}
            value={sellingPriceKobo}
            onChange={(e) => setSellingPriceKobo(Number(e.target.value))}
            required
          />

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
            <span className="text-emerald-300">Customer Display Price:</span>
            <span className="font-bold text-emerald-400 text-base tabular-nums">
              ₦{(Number(sellingPriceKobo) / 100).toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-medium text-slate-300">Plan Availability:</span>
            <button
              type="button"
              onClick={() => setPlanIsActive(!planIsActive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                planIsActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {planIsActive ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active & Available</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Disabled</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setPlanModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isUpdatingPlan}
            >
              Update Pricing
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
