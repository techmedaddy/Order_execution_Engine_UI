
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Cpu, 
  Layers, 
  Copy, 
  Plus, 
  RefreshCcw,
  Zap,
  Terminal,
  ChevronDown,
  Monitor
} from 'lucide-react';
import { Order, OrderStatus, SystemMetrics } from '../types';
import { createOrder, resetState, fetchOrders, fetchMetrics } from '../src/lib/api';

// Mock Data Utilities
const generateId = () => `ord_${Math.random().toString(36).substr(2, 9)}`;
const generateTimestamp = () => new Date().toISOString();

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_7f2k9x1m5',
    baseToken: 'SOL',
    quoteToken: 'USDC',
    amount: 145.5,
    status: 'SUCCESS',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    idempotencyKey: 'idem-8123-af92'
  },
  {
    id: 'ord_1a8b3c4d5',
    baseToken: 'ETH',
    quoteToken: 'USDT',
    amount: 1.25,
    status: 'EXECUTING',
    timestamp: new Date(Date.now() - 1000 * 15).toISOString(),
    idempotencyKey: 'idem-9210-cc01'
  },
  {
    id: 'ord_9z0y1x2w3',
    baseToken: 'BTC',
    quoteToken: 'USDC',
    amount: 0.042,
    status: 'QUEUED',
    timestamp: new Date(Date.now() - 1000 * 5).toISOString(),
    idempotencyKey: 'idem-4411-bd22'
  }
];

const OrderExecutionDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    workersActive: 8,
    maxWorkers: 32,
    queueDepth: 42,
    throughput: 124,
    healthStatus: 'healthy'
  });

  const [form, setForm] = useState({
    baseToken: 'SOL',
    quoteToken: 'USDC',
    amount: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulation effect for "EXECUTING" orders
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders(prev => {
        // Guard: ensure prev is array
        if (!Array.isArray(prev)) {
          return [];
        }
        
        return prev.map(order => {
          if (order.status === 'QUEUED' && Math.random() > 0.7) {
            return { ...order, status: 'EXECUTING' };
          }
          if (order.status === 'EXECUTING' && Math.random() > 0.8) {
            return { ...order, status: Math.random() > 0.1 ? 'SUCCESS' : 'FAILED' };
          }
          return order;
        });
      });
      
      setMetrics(prev => {
        // Guard: ensure prev has required fields
        const safeMaxWorkers = typeof prev.maxWorkers === 'number' ? prev.maxWorkers : 32;
        const safeWorkersActive = typeof prev.workersActive === 'number' ? prev.workersActive : 0;
        const safeQueueDepth = typeof prev.queueDepth === 'number' ? prev.queueDepth : 0;
        
        return {
          ...prev,
          workersActive: Math.min(safeMaxWorkers, Math.max(4, safeWorkersActive + (Math.random() > 0.5 ? 1 : -1))),
          queueDepth: Math.max(0, safeQueueDepth + (Math.random() > 0.5 ? 2 : -2))
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) return;
    
    // Validate amount is not NaN
    const parsedAmount = parseFloat(form.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid positive number for amount.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call backend API to create order
      const newOrder = await createOrder({
        baseToken: form.baseToken,
        quoteToken: form.quoteToken,
        amount: parsedAmount,
      });
      
      // Update state with validated order
      setOrders(prev => {
        // Guard: ensure prev is array
        const safePrev = Array.isArray(prev) ? prev : [];
        return [newOrder, ...safePrev];
      });
      setForm(f => ({ ...f, amount: '' }));
      
      // Optionally refresh metrics after order creation
      const updatedMetrics = await fetchMetrics();
      setMetrics(updatedMetrics);
    } catch (error) {
      console.error('Failed to create order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to create order: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetState = async () => {
    try {
      await resetState();
      // Refresh orders and metrics after reset
      const [freshOrders, freshMetrics] = await Promise.all([
        fetchOrders(),
        fetchMetrics()
      ]);
      
      // Guard: validate freshOrders is array before setting
      if (Array.isArray(freshOrders)) {
        setOrders(freshOrders);
      } else {
        setOrders([]);
      }
      
      // Guard: validate freshMetrics has required structure
      if (freshMetrics && typeof freshMetrics === 'object') {
        setMetrics(freshMetrics);
      }
    } catch (error) {
      console.error('Failed to reset state:', error);
      alert('Failed to reset state. Please check console for details.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
              <Terminal className="w-6 h-6 text-emerald-500" />
              Order Execution Engine
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">System Healthy</span>
            </div>
          </div>
          <p className="text-sm text-zinc-400 font-medium">
            Idempotent <span className="text-zinc-600 px-1">•</span> Concurrent <span className="text-zinc-600 px-1">•</span> Event-driven
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900 border border-zinc-800 rounded-md">
            <Monitor className="w-4 h-4" />
            Infrastructure Logs
          </button>
          <button 
            onClick={handleResetState}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900 border border-zinc-800 rounded-md"
          >
            <RefreshCcw className="w-4 h-4" />
            Reset State
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form and Metrics */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Create Order Panel */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Create Execution Order
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase">Base Token</label>
                  <div className="relative">
                    <select 
                      value={form.baseToken}
                      onChange={e => setForm({...form, baseToken: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
                    >
                      <option>SOL</option>
                      <option>ETH</option>
                      <option>BTC</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-zinc-600 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase">Quote Token</label>
                  <div className="relative">
                    <select 
                      value={form.quoteToken}
                      onChange={e => setForm({...form, quoteToken: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
                    >
                      <option>USDC</option>
                      <option>USDT</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-zinc-600 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase">Execution Amount</label>
                <input 
                  type="number"
                  step="any"
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  placeholder="0.00"
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-4 py-2.5 outline-none focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-700"
                />
              </div>

              <div className="pt-2">
                <button 
                  disabled={isSubmitting || !form.amount}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-50 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 group shadow-lg shadow-emerald-900/10"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Submit Order
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Zap className="w-3 h-3 text-emerald-500" />
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tight">
                    Idempotency enforced per request
                  </p>
                </div>
              </div>
            </form>
          </section>

          {/* Metrics Section */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
             <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Concurrency Viz
              </h2>

              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-500 uppercase">Workers Active</span>
                    <span className="text-zinc-300">{metrics.workersActive} / {metrics.maxWorkers}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      style={{ width: `${(metrics.workersActive / metrics.maxWorkers) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-500 uppercase">Queue Depth</span>
                    <span className="text-zinc-300">{metrics.queueDepth} Tasks</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-zinc-500 transition-all duration-1000 ease-in-out"
                      style={{ width: `${Math.min(100, (metrics.queueDepth / 100) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[10px] uppercase text-zinc-500 font-bold">Throughput</span>
                    </div>
                    <p className="text-lg font-mono text-zinc-200">{metrics.throughput}<span className="text-[10px] text-zinc-500 ml-1">ops/s</span></p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Layers className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[10px] uppercase text-zinc-500 font-bold">Latency</span>
                    </div>
                    <p className="text-lg font-mono text-zinc-200">12<span className="text-[10px] text-zinc-500 ml-1">ms</span></p>
                  </div>
                </div>
              </div>
          </section>
        </div>

        {/* Right Column: Orders List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              Execution Backlog
            </h2>
            <div className="text-[10px] text-zinc-500 font-medium uppercase px-2 py-1 bg-zinc-900 border border-zinc-800 rounded">
              Live Feed
            </div>
          </div>

          <div className="space-y-3">
            {!Array.isArray(orders) || orders.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
                <Layers className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500 font-medium">No execution history found</p>
              </div>
            ) : (
              orders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onCopy={copyToClipboard}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface OrderCardProps {
  order: Order;
  onCopy: (text: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onCopy }) => {
  const statusConfig: Record<OrderStatus, { color: string; bg: string; icon: any; pulse?: boolean }> = {
    QUEUED: { 
      color: 'text-zinc-400', 
      bg: 'bg-zinc-800/50 border-zinc-700', 
      icon: Activity 
    },
    EXECUTING: { 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10 border-amber-500/20', 
      icon: Loader2, 
      pulse: true 
    },
    SUCCESS: { 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10 border-emerald-500/20', 
      icon: CheckCircle2 
    },
    FAILED: { 
      color: 'text-red-400', 
      bg: 'bg-red-500/10 border-red-500/20', 
      icon: AlertCircle 
    },
  };

  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
      <div className="flex items-start gap-4">
        <div className={`mt-1 p-2 rounded-lg ${config.bg} border flex items-center justify-center`}>
          <StatusIcon className={`w-5 h-5 ${config.color} ${config.pulse ? 'animate-spin' : ''}`} />
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-tighter">ID:</span>
            <span className="text-sm font-mono text-zinc-200 tracking-tight">{order.id}</span>
            <button 
              onClick={() => onCopy(order.id)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-600 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-zinc-100">{order.amount}</span>
            <span className="text-xs font-semibold text-zinc-500">{order.baseToken} / {order.quoteToken}</span>
          </div>
        </div>


      </div>

      <div className="flex items-center gap-6 justify-between md:justify-end">
        {order.idempotencyKey && (
  <div className="text-right hidden sm:block">
    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
      Idempotency Key
    </div>
    <div className="text-[11px] font-mono text-zinc-400">
      {order.idempotencyKey}
    </div>
  </div>
)}


        <div className="flex flex-col items-end gap-2">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border uppercase flex items-center gap-1.5 ${config.bg} ${config.color}`}>
            {order.status === 'EXECUTING' && <span className="w-1 h-1 rounded-full bg-amber-400 animate-ping"></span>}
            {order.status}
          </div>
          <span className="text-[10px] font-medium text-zinc-600 tabular-nums">
            {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderExecutionDashboard;
