const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || res.statusText || 'Request failed');
  }
  return data as T;
}

// Auth
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    request<{ user: User; token: string; subscription: Subscription }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ user: User; token: string; subscription: Subscription }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  google: (data: { email: string; name?: string }) =>
    request<{ user: User; token: string; subscription: Subscription }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Scan
export const scanApi = {
  result: (id: string | number) =>
    request<Exposure>(`/api/scan/result/${id}`),
  scan: () =>
    request<{ exposures: Exposure[]; count: number; scanned: string }>('/api/scan', {
      method: 'POST',
    }),
  search: (email: string) =>
    request<{ exposures: Exposure[]; count: number; scanned: string }>('/api/scan/search', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  results: () =>
    request<{ exposures: Exposure[] }>('/api/scan/results'),
};

// Dashboard
export const dashboardApi = {
  stats: () =>
    request<{ stats: DashboardStats; subscription: Subscription }>('/api/dashboard'),
};

// Subscription
export const subscriptionApi = {
  get: () => request<Subscription>('/api/subscription'),
};

// Billing
export const billingApi = {
  createCheckout: (priceId?: string) =>
    request<{ url: string }>('/api/billing/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId: priceId || undefined }),
    }),
  setupIntent: () =>
    request<{ clientSecret: string }>('/api/billing/setup-intent', {
      method: 'POST',
    }),
};

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Subscription {
  status: string;
  isPremium: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  exempt?: boolean;
  currentPeriodEnd?: string | null;
  plan?: string;
}

export interface Exposure {
  id?: number;
  type: string;
  source: string;
  data: string;
  risk: string;
  date: string;
  status: string;
  aiAssessment?: string;
  breach_name?: string;
  breach_domain?: string;
  breach_date?: string;
  breach_description?: string;
  data_classes?: string;
  severity?: string;
}

export interface DashboardStats {
  totalExposures: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  removed: number;
}
