export interface ApiResponse<T = any> {
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'SUPPORT' | 'CUSTOMER' | 'AGENT';
    status: 'ACTIVE' | 'SUSPENDED';
    profile?: {
      fullName?: string;
      avatarUrl?: string;
    };
  };
}
