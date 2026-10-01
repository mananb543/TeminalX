/**
 * TerminalX - Client Analytics Service
 * Connects to /api/analytics endpoints with session credentials and typed responses.
 */

export interface PortfolioSummaryMetrics {
  totalPortfolioValue: number;
  cashBalance: number;
  investedValue: number;
  totalCostBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalPnL: number;
  totalReturnPercent: number;
  dayPnL: number;
  dayReturnPercent: number;
  positionsCount: number;
  winningPositionsCount: number;
  losingPositionsCount: number;
  winRatePercent: number;
  initialCapital: number;
  holdings: Array<{
    id: string;
    symbol: string;
    name: string;
    quantity: number;
    averagePrice: number;
    totalCost: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    dayChange: number;
    dayChangePercent: number;
    dayPnL: number;
    weightPercent: number;
    sector: string;
    exchange: string;
    currency: 'INR' | 'USD';
    isWinning: boolean;
  }>;
  updatedAt: string;
}

export interface PerformanceDataPoint {
  date: string;
  timestamp: string;
  totalValue: number;
  cash: number;
  investedValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dailyReturnPercent: number;
  cumulativeReturnPercent: number;
}

export interface MetricWithSufficiency<T> {
  value: T | null;
  status: 'CALCULATED' | 'INSUFFICIENT_DATA';
  message?: string;
}

export interface RiskMetricsResult {
  riskFreeRate: number;
  observationsCount: number;
  volatility: MetricWithSufficiency<number>;
  sharpeRatio: MetricWithSufficiency<number>;
  maxDrawdown: {
    maxDrawdownPercent: number;
    drawdownDurationDays: number;
    peakValue: number;
    troughValue: number;
    peakDate: string;
    troughDate: string;
  };
  beta: MetricWithSufficiency<number>;
  alpha: MetricWithSufficiency<number>;
  valueAtRisk95: MetricWithSufficiency<{
    amount: number;
    percent: number;
    confidenceLevel: string;
    horizon: string;
  }>;
  updatedAt: string;
}

export interface PortfolioAllocationResult {
  totalPortfolioValue: number;
  cashAllocation: {
    marketValue: number;
    weightPercent: number;
  };
  securities: Array<{
    symbol: string;
    name: string;
    quantity: number;
    currentPrice: number;
    marketValue: number;
    weightPercent: number;
    sector: string;
    exchange: string;
  }>;
  sectors: Array<{
    sector: string;
    marketValue: number;
    weightPercent: number;
    symbolsCount: number;
    symbols: string[];
  }>;
  assetClasses: Array<{
    assetClass: 'EQUITIES' | 'CASH';
    label: string;
    marketValue: number;
    weightPercent: number;
  }>;
  concentration: {
    largestPositionPercent: number;
    top3PositionsPercent: number;
    top5PositionsPercent: number;
    numberOfPositions: number;
    cashAllocationPercent: number;
    herfindahlIndex: number;
  };
}

export interface TradeAnalyticsResult {
  totalTrades: number;
  buyOrdersCount: number;
  sellOrdersCount: number;
  closedTradesCount: number;
  winningTradesCount: number;
  losingTradesCount: number;
  breakEvenTradesCount: number;
  winRatePercent: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  avgWinningTradeAmount: number;
  avgLosingTradeAmount: number;
  largestWinningTrade: number;
  largestLosingTrade: number;
  avgHoldingPeriodHours: number;
  recentClosedTrades: Array<{
    id: string;
    symbol: string;
    quantity: number;
    buyPrice: number;
    sellPrice: number;
    buyTotal: number;
    sellTotal: number;
    realizedPnL: number;
    realizedPnLPercent: number;
    buyDate: string;
    sellDate: string;
    holdingPeriodHours: number;
    isWinning: boolean;
  }>;
}

export interface BenchmarkComparisonResult {
  symbol: string;
  name: string;
  range: string;
  points: Array<{
    date: string;
    timestamp: string;
    portfolioNormalized: number;
    benchmarkNormalized: number;
    portfolioValue: number;
    benchmarkPrice: number;
  }>;
  portfolioTotalReturnPercent: number;
  benchmarkTotalReturnPercent: number;
  excessReturnPercent: number;
  disclaimer: string;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('terminalx_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const analyticsService = {
  async getPortfolio(): Promise<PortfolioSummaryMetrics | null> {
    try {
      const res = await fetch('/api/analytics/portfolio', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  },

  async getPerformance(range = '1M'): Promise<PerformanceDataPoint[]> {
    try {
      const res = await fetch(`/api/analytics/performance?range=${range}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.success && Array.isArray(json.data) ? json.data : [];
    } catch {
      return [];
    }
  },

  async getRiskMetrics(): Promise<RiskMetricsResult | null> {
    try {
      const res = await fetch('/api/analytics/risk', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  },

  async getAllocation(): Promise<PortfolioAllocationResult | null> {
    try {
      const res = await fetch('/api/analytics/allocation', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  },

  async getTradeAnalytics(): Promise<TradeAnalyticsResult | null> {
    try {
      const res = await fetch('/api/analytics/trades', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  },

  async getBenchmarkComparison(range = '1M'): Promise<BenchmarkComparisonResult | null> {
    try {
      const res = await fetch(`/api/analytics/benchmark?range=${range}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  },
};
