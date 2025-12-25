import type { Order, SystemMetrics } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not defined');
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const text = await response.text();
      if (text && text.length < 200) message = text;
    } catch {}
    throw new Error(message);
  }

  if (endpoint === '/api/metrics') {
    return (await response.text()) as unknown as T;
  }

  return (await response.json()) as T;
}

/* ---------------- ORDERS ---------------- */

export async function createOrder(orderData: {
  baseToken: string;
  quoteToken: string;
  amount: number;
}): Promise<Order> {
  const idempotencyKey = generateUUID();

  const response = await apiRequest<any>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });

  const order = response?.order ?? response?.data ?? response;

  if (!order || typeof order !== 'object') {
    throw new Error('Invalid order response');
  }

  if (
    typeof order.id !== 'string' ||
    typeof order.baseToken !== 'string' ||
    typeof order.quoteToken !== 'string' ||
    typeof order.amount !== 'number' ||
    typeof order.status !== 'string'
  ) {
    throw new Error('Order response missing required fields');
  }

  return {
    id: order.id,
    baseToken: order.baseToken,
    quoteToken: order.quoteToken,
    amount: order.amount,
    status: order.status,
    timestamp: order.timestamp ?? order.createdAt ?? new Date().toISOString(),
    idempotencyKey: order.idempotencyKey,
  };
}

export async function fetchOrders(): Promise<Order[]> {
  try {
    const response = await apiRequest<any>('/api/orders');

    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.orders)) return response.orders;
    if (Array.isArray(response?.data)) return response.data;

    return [];
  } catch {
    return [];
  }
}

/* ---------------- METRICS ---------------- */

export async function fetchMetrics(): Promise<SystemMetrics> {
  try {
    const response = await apiRequest<any>('/api/metrics');

    if (typeof response === 'string') {
      return {
        workersActive: 0,
        maxWorkers: 0,
        queueDepth: 0,
        throughput: 0,
        healthStatus: 'healthy',
      };
    }

    return {
      workersActive: typeof response.workersActive === 'number' ? response.workersActive : 0,
      maxWorkers: typeof response.maxWorkers === 'number' ? response.maxWorkers : 0,
      queueDepth: typeof response.queueDepth === 'number' ? response.queueDepth : 0,
      throughput: typeof response.throughput === 'number' ? response.throughput : 0,
      healthStatus: ['healthy', 'degraded', 'down'].includes(response.healthStatus)
        ? response.healthStatus
        : 'healthy',
    };
  } catch {
    return {
      workersActive: 0,
      maxWorkers: 0,
      queueDepth: 0,
      throughput: 0,
      healthStatus: 'degraded',
    };
  }
}

/* ---------------- RESET ---------------- */

export async function resetState(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest<any>('/api/reset', { method: 'POST' });
    return {
      success: response?.success === true || response?.status === 'ok',
      message: response?.message ?? 'Reset completed',
    };
  } catch {
    return {
      success: false,
      message: 'Reset failed',
    };
  }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
