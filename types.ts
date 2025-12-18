
export type OrderStatus = 'QUEUED' | 'EXECUTING' | 'SUCCESS' | 'FAILED';

export interface Order {
  id: string;
  baseToken: string;
  quoteToken: string;
  amount: number;
  status: OrderStatus;
  timestamp: string;
  idempotencyKey: string;
}

export interface SystemMetrics {
  workersActive: number;
  maxWorkers: number;
  queueDepth: number;
  throughput: number;
  healthStatus: 'healthy' | 'degraded' | 'down';
}
