export interface DashboardOverview {
  users: {
    total: number;
    active: number;
    suspended: number;
    pendingVerification: number;
  };
  transactions: {
    total: number;
    today: number;
    thisMonth: number;
    byStatus: {
      successful: number;
      failed: number;
      refunded: number;
      processing: number;
    };
  };
  revenue: {
    totalKobo: string;
    totalFormatted: string;
    todayKobo: string;
    todayFormatted: string;
    thisMonthKobo: string;
    thisMonthFormatted: string;
  };
  wallets: {
    totalFundsHeldKobo: string;
    totalFundsHeldFormatted: string;
  };
  volumeByType: Array<{
    type: string;
    count: number;
    volumeKobo: string;
    volumeFormatted: string;
  }>;
  recentActivity: Array<{
    id: string;
    reference: string;
    type: string;
    status: string;
    amountFormatted: string;
    user: {
      name: string;
      phone: string;
    };
    createdAt: string;
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  phone: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  fullName: string | null;
  bvnVerified: boolean;
  walletBalance: {
    kobo: string;
    formatted: string;
    isLocked: boolean;
  } | null;
  transactionCount: number;
  ticketCount: number;
  createdAt: string;
}

export interface AdminTransaction {
  id: string;
  reference: string;
  type: string;
  status: 'SUCCESS' | 'FAILED' | 'PROCESSING' | 'REFUNDED';
  amountFormatted: string;
  amountKobo: string;
  netAmountKobo: string;
  netAmountFormatted: string;
  providerName: string;
  providerReference?: string | null;
  failureReason?: string | null;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  createdAt: string;
}

export interface AdminRefund {
  id: string;
  transactionId: string;
  transactionRef: string;
  transactionType: string;
  amountKobo: string;
  amountFormatted: string;
  status: string;
  reason: string;
  processedBy: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  createdAt: string;
}

export interface NetworkPricing {
  id: string;
  code: string;
  name: string;
  airtimeDiscountBps: number;
  airtimeDiscountPercent: string;
  isActive: boolean;
  airtimeEnabled: boolean;
  dataEnabled: boolean;
  dataPlansCount: number;
  airtimeTxnCount: number;
  dataTxnCount: number;
  updatedAt: string;
}

export interface DataPlan {
  id: string;
  planCode: string;
  name: string;
  type: string;
  validity: string;
  costPriceKobo: string;
  costPriceFormatted: string;
  sellingPriceKobo: string;
  sellingPriceFormatted: string;
  marginKobo: string;
  marginFormatted: string;
  isActive: boolean;
  network: {
    id: string;
    code: string;
    name: string;
  };
  updatedAt: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  isSecret: boolean;
  updatedAt: string;
}
