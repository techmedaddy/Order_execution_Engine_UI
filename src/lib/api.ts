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
 * Helper function to make API requests
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

    return await response.json();
  } catch (error) {
    console.error(`API request to ${url} failed:`, error);
    throw error;
  }
}

/**
 * Create a new order
 */
export async function createOrder(orderData: {
  baseToken: string;
  quoteToken: string;
  amount: number;
}): Promise<Order> {
  return apiRequest<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

/**
 * Fetch all orders
 */
export async function fetchOrders(): Promise<Order[]> {
  return apiRequest<Order[]>('/api/orders');
}

/**
 * Fetch system metrics
 */
export async function fetchMetrics(): Promise<SystemMetrics> {
  return apiRequest<SystemMetrics>('/api/metrics');
}

/**
 * Reset system state
 */
export async function resetState(): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/reset', {
    method: 'POST',
  });
}

/**
 * Export the base URL for debugging purposes
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
