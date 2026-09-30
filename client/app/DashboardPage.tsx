import React from 'react';
import { PortfolioOverviewCards } from '../components/dashboard/PortfolioOverviewCards.tsx';
import { PortfolioPerformanceChart } from '../components/dashboard/PortfolioPerformanceChart.tsx';
import { WatchlistTable } from '../components/dashboard/WatchlistTable.tsx';
import { MarketIndicesGrid } from '../components/dashboard/MarketIndicesGrid.tsx';
import { RecentOrdersTable } from '../components/dashboard/RecentOrdersTable.tsx';
import { Sparkles, Clock } from 'lucide-react';

import { useAuthStore } from '../stores/authStore.ts';

interface DashboardPageProps {
  onSelectStock: (symbol: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectStock }) => {
  const { user } = useAuthStore();

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-4">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7FA] font-mono tracking-tight">
            {getGreeting()}, {user?.name || 'Trader'}
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            {user?.email ? (
              <span>
                Authenticated as <span className="text-[#00C2FF] font-mono">{user.email}</span> · MongoDB Atlas Connected
              </span>
            ) : (
              'Indian & Global markets session active · Paper Trading Portfolio (₹10,00,000 Starting Allocation)'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#8B949E]">
          <Clock className="w-3.5 h-3.5 text-[#00C2FF]" />
          <span>NSE/BSE Regular Session</span>
        </div>
      </div>

      {/* 1. Portfolio Overview Metric Cards */}
      <PortfolioOverviewCards />

      {/* 2. Portfolio Performance Equity Curve */}
      <PortfolioPerformanceChart />

      {/* 3. Market Overview Grid */}
      <MarketIndicesGrid onSelectStock={onSelectStock} />

      {/* 4. Watchlist Table */}
      <WatchlistTable onSelectStock={onSelectStock} />

      {/* 5. Recent Simulated Orders Table */}
      <RecentOrdersTable onSelectStock={onSelectStock} limit={5} />
    </div>
  );
};
