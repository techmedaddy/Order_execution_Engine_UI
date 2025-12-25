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
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
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
 * Create a new order with runtime validation
 */
export async function createOrder(orderData: {
  baseToken: string;
  quoteToken: string;
  amount: number;
}): Promise<Order | null> {
  try {
    const response = await apiRequest<any>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    
    // Handle wrapped responses
    const order = response?.order || response;
    
    // Validate order shape
    if (order && typeof order === 'object' && 
        typeof order.id === 'string' && 
        typeof order.status === 'string') {
      return order as Order;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to create order:', error);
    return null;
  }
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

