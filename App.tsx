
import React from 'react';
import OrderExecutionDashboard from './components/OrderExecutionDashboard';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-950">
        <OrderExecutionDashboard />
      </div>
    </ErrorBoundary>
  );
};

export default App;
