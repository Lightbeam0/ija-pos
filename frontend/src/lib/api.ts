const API_BASE = '/api';

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    window.location.reload();
    throw new Error('Authentication failed');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  auth: {
    login:  (pin: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ pin }) }),
    me:     ()            => request('/auth/me'),
    logout: ()            => request('/auth/logout', { method: 'POST' }),
  },

  parts: {
    search:       (query: string)            => request(`/parts/search?q=${encodeURIComponent(query)}`),
    getByBarcode: (code: string)             => request(`/parts/barcode/${encodeURIComponent(code)}`),
    getById:      (id: string)               => request(`/parts/${id}`),
    getByCategory:(categoryId: string, page = 1, limit = 50) =>
      request(`/parts/category/${categoryId}?page=${page}&limit=${limit}`),
    list:         (page = 1, limit = 50)     => request(`/parts?page=${page}&limit=${limit}`),
  },

  sales: {
    create: (data: {
      items:           { partId: string; quantity: number }[];
      discountAmount:  number;
      paymentMethod:   string;
      paymentReceived?: number;
      notes?:          string;
    }) => request('/sales', { method: 'POST', body: JSON.stringify(data) }),
    getById: (id: string) => request(`/sales/${id}`),
    // FIX: removed todaySummary() — it duplicated api.dashboard.today()
    // and was never used anywhere in the frontend.
  },

  dashboard: {
    today:    () => request('/dashboard/today'),
    lowStock: () => request('/dashboard/low-stock'),
  },

  users: {
    list:   ()                                                    => request('/users'),
    create: (data: { name: string; pin: string; role?: string }) =>
      request('/users', { method: 'POST', body: JSON.stringify(data) }),
  },
};
