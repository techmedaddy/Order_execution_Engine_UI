/**
 * API Client for Order Execution Engine
 * 
 * This module provides a centralized API client that reads the backend URL
 * from environment variables. This allows the frontend to work in both:
 * - Local development: VITE_API_BASE_URL=http://localhost:7542
 * - Docker environment: VITE_API_BASE_URL=http://backend:7542
 * 
 * The API base URL is configured via:
 * - .env file for local development (npm run dev)
 * - .env.docker file for Docker deployment (docker compose up)
 */

import type { Order, SystemMetrics } from '../../types';

// Read API base URL from Vite environment variables
// This value is injected at build time by Vite
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Fail fast if configuration is missing
if (!API_BASE_URL) {
  throw new Error(
    'VITE_API_BASE_URL is not defined. ' +
    'Please ensure you have either .env (local) or .env.docker (Docker) configured.'
  );
}

/**
 * Helper function to make API requests with content-type aware parsing
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      // Try to extract error message from backend
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        }
      } catch {
        // If error parsing fails, use default message
      }
      throw new Error(errorMessage);
    }

    // Content-type aware parsing
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      return text as unknown as T;
    }
  } catch (error) {
    console.error(`API request to ${url} failed:`, error);
    throw error;
  }
}

/**
 * Create a new order with strict runtime validation
 * Handles backend response shapes: Order | { order: Order } | { data: Order }
 */
export async function createOrder(orderData: {
  baseToken: string;
  quoteToken: string;
  amount: number;
}): Promise<Order> {
  // Generate unique idempotency key for this request
  const idempotencyKey = crypto.randomUUID();
  
  const response = await apiRequest<any>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });
  
  // Handle all valid backend response shapes
  let order: any;
  if (response && typeof response === 'object') {
    if (response.order) {
      order = response.order;
    } else if (response.data) {
      order = response.data;
    } else {
      order = response;
    }
  } else {
    throw new Error('Invalid response: expected object');
  }
  
  // Strict validation: verify ALL required Order fields exist
  if (!order || typeof order !== 'object') {
    throw new Error('Invalid response: order data is not an object');
  }
  
  if (typeof order.id !== 'string' || !order.id) {
    throw new Error('Invalid response: missing or invalid id');
  }
  
  if (typeof order.baseToken !== 'string' || !order.baseToken) {
    throw new Error('Invalid response: missing or invalid baseToken');
  }
  
  if (typeof order.quoteToken !== 'string' || !order.quoteToken) {
    throw new Error('Invalid response: missing or invalid quoteToken');
  }
  
  if (typeof order.amount !== 'number') {
    throw new Error('Invalid response: missing or invalid amount');
  }
  
  if (typeof order.status !== 'string' || !order.status) {
    throw new Error('Invalid response: missing or invalid status');
  }
  
  if (typeof order.timestamp !== 'string' || !order.timestamp) {
    throw new Error('Invalid response: missing or invalid timestamp');
  }
  
  if (typeof order.idempotencyKey !== 'string' || !order.idempotencyKey) {
    throw new Error('Invalid response: missing or invalid idempotencyKey');
  }
  
  return order as Order;
}

/**
 * Fetch all orders with runtime validation - always returns array
 */
export async function fetchOrders(): Promise<Order[]> {
  try {
    const response = await apiRequest<any>('/api/orders');
    
    // Direct array
    if (Array.isArray(response)) {
      return response;
    }
    
    // Wrapped in 'orders' key
    if (response && Array.isArray(response.orders)) {
      return response.orders;
    }
    
    // Wrapped in 'data' key
    if (response && Array.isArray(response.data)) {
      return response.data;
    }
    
    // Fallback to empty array
    return [];
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return [];
  }
}

/**
 * Fetch system metrics with full validation
 */
export async function fetchMetrics(): Promise<SystemMetrics> {
  try {
    const response = await apiRequest<any>('/api/metrics');
    
    // If response is string (Prometheus format), return defaults
    if (typeof response === 'string') {
      console.log('Metrics endpoint returned Prometheus format');
      return {
        workersActive: 0,
        maxWorkers: 0,
        queueDepth: 0,
        throughput: 0,
        healthStatus: 'healthy'
      };
    }
    
    // If response is object, validate and fill missing fields
    if (response && typeof response === 'object') {
      return {
        workersActive: typeof response.workersActive === 'number' ? response.workersActive : 0,
        maxWorkers: typeof response.maxWorkers === 'number' ? response.maxWorkers : 0,
        queueDepth: typeof response.queueDepth === 'number' ? response.queueDepth : 0,
        throughput: typeof response.throughput === 'number' ? response.throughput : 0,
        healthStatus: ['healthy', 'degraded', 'down'].includes(response.healthStatus) 
          ? response.healthStatus 
          : 'healthy'
      };
    }
    
    // Fallback defaults
    return {
      workersActive: 0,
      maxWorkers: 0,
      queueDepth: 0,
      throughput: 0,
      healthStatus: 'healthy'
    };
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return {
      workersActive: 0,
      maxWorkers: 0,
      queueDepth: 0,
      throughput: 0,
      healthStatus: 'degraded'
    };
  }
}

/**
 * Reset system state with validation
 */
export async function resetState(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest<any>('/api/reset', {
      method: 'POST',
    });
    
    return {
      success: response?.success === true || response?.status === 'ok',
      message: response?.message || response?.status || 'Reset completed'
    };
  } catch (error) {
    console.error('Failed to reset state:', error);
    return { success: false, message: 'Reset failed' };
  }
}

/**
 * Export the base URL for debugging purposes
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

