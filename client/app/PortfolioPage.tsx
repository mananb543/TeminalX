import React, { useState, useEffect } from 'react';
import { useTradingStore } from '../stores/tradingStore.ts';
import { analyticsService, PortfolioSummaryMetrics, PerformanceDataPoint } from '../lib/analyticsService.ts';
import { formatINR, formatPercent } from '../lib/formatters.ts';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ShieldCheck,
  Wallet,
  RefreshCw,
  Clock,
  Layers,
  Activity,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

interface PortfolioPageProps {
  onSelectStock: (symbol: string) => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onSelectStock }) => {
  const { resetPortfolio } = useTradingStore();
  const [summary, setSummary] = useState<PortfolioSummaryMetrics | null>(null);
  const [history, setHistory] = useState<PerformanceDataPoint[]>([]);
  const [selectedRange, setSelectedRange] = useState<string>('1M');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isChartLoading, setIsChartLoading] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const ranges = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];

  const loadPortfolioData = async () => {
    setIsLoading(true);
    setErrorNotice(null);
    try {
      const data = await analyticsService.getPortfolio();
      if (data) {
        setSummary(data);
      }
    } catch (err: any) {
      setErrorNotice(err.message || 'Unable to fetch portfolio analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async (range: string) => {
    setIsChartLoading(true);
    try {
      const pts = await analyticsService.getPerformance(range);
      setHistory(pts);
    } catch {
      // ignore
    } finally {
      setIsChartLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolioData();
  }, []);

  useEffect(() => {
    loadHistory(selectedRange);
  }, [selectedRange]);

  const totalVal = summary?.totalPortfolioValue ?? 1000000;
  const cashBal = summary?.cashBalance ?? 1000000;
  const investedVal = summary?.investedValue ?? 0;
  const totalPnL = summary?.totalPnL ?? 0;
  const totalReturn = summary?.totalReturnPercent ?? 0;
  const dayPnL = summary?.dayPnL ?? 0;
  const dayReturn = summary?.dayReturnPercent ?? 0;

  const isTotalPositive = totalPnL >= 0;
  const isDayPositive = dayPnL >= 0;

  // Chart gradient & colors
  const isNetPositive = (history.length > 1 && history[history.length - 1].totalValue >= history[0].totalValue) || isTotalPositive;
  const chartStrokeColor = isNetPositive ? '#22C55E' : '#EF4444';
  const chartFillId = isNetPositive ? 'colorEquityGreen' : 'colorEquityRed';

  // Capital Allocation Data for Pie Chart
  const COLORS = ['#00C2FF', '#22C55E', '#F59E0B', '#A855F7', '#EC4899', '#3B82F6', '#14B8A6'];
  const allocationData = [
    { name: 'Virtual Cash', value: cashBal, color: '#273546' },
    ...(summary?.holdings || []).map((h, i) => ({
      name: h.symbol,
      value: h.marketValue,
      color: COLORS[i % COLORS.length],
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7FA] font-mono tracking-tight flex items-center gap-2">
            <span>Portfolio & Holdings</span>
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-[#00C2FF]" />}
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Mark-to-market valuations, equity curve analytics, and position attribution
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadPortfolioData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#11161D] hover:bg-[#161D26] border border-[#1B222C] text-xs font-mono text-[#8B949E] hover:text-[#00C2FF] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00C2FF]' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm('Reset portfolio back to default ₹10,00,000 virtual balance?')) {
                resetPortfolio();
                loadPortfolioData();
              }
            }}
            className="px-3 py-1.5 rounded bg-[#11161D] hover:bg-[#161D26] border border-[#1B222C] text-xs font-mono text-[#8B949E] hover:text-[#EF4444] transition-colors cursor-pointer"
          >
            Reset Account
          </button>
        </div>
      </div>

      {errorNotice && (
        <div className="p-3 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs font-mono text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* 1. Top Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">Total Portfolio Value</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-[#F5F7FA] tabular-nums mt-1 truncate">
            {formatINR(totalVal)}
          </div>
          <div className="text-[10px] text-[#8B949E] font-mono mt-0.5">Cash + Held Securities</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">Available Cash</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-[#00C2FF] tabular-nums mt-1 truncate">
            {formatINR(cashBal)}
          </div>
          <div className="text-[10px] text-[#8B949E] font-mono mt-0.5">
            {formatPercent((cashBal / (totalVal || 1)) * 100)} of Portfolio
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">Invested Value</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-[#F5F7FA] tabular-nums mt-1 truncate">
            {formatINR(investedVal)}
          </div>
          <div className="text-[10px] text-[#8B949E] font-mono mt-0.5">
            Cost: {formatINR(summary?.totalCostBasis || 0)}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">Total P&L (Unrealized)</div>
          <div className={`text-lg sm:text-xl font-bold font-mono tabular-nums mt-1 truncate ${isTotalPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {isTotalPositive ? '+' : ''}{formatINR(summary?.unrealizedPnL || 0)}
          </div>
          <div className={`text-[10px] font-mono mt-0.5 ${isTotalPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {isTotalPositive ? '+' : ''}{formatPercent(summary?.unrealizedPnLPercent || 0)}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">Today's P&L</div>
          <div className={`text-lg sm:text-xl font-bold font-mono tabular-nums mt-1 truncate ${isDayPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {isDayPositive ? '+' : ''}{formatINR(dayPnL)}
          </div>
          <div className={`text-[10px] font-mono mt-0.5 ${isDayPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {isDayPositive ? '+' : ''}{formatPercent(dayReturn)}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">Total Return %</div>
          <div className={`text-lg sm:text-xl font-bold font-mono tabular-nums mt-1 truncate ${isTotalPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {isTotalPositive ? '+' : ''}{formatPercent(totalReturn)}
          </div>
          <div className="text-[10px] text-[#8B949E] font-mono mt-0.5">
            Initial: {formatINR(summary?.initialCapital || 1000000)}
          </div>
        </div>
      </div>

      {/* 2. Interactive Portfolio Equity Curve Chart */}
      <div className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1B222C] gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00C2FF]" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
              Portfolio Equity Curve
            </span>
            {isChartLoading && <RefreshCw className="w-3 h-3 animate-spin text-[#00C2FF]" />}
          </div>

          <div className="flex items-center rounded bg-[#11161D] border border-[#1B222C] p-0.5 self-start sm:self-auto">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
                  selectedRange === r
                    ? 'bg-[#00C2FF] text-[#07090C] font-bold'
                    : 'text-[#8B949E] hover:text-[#F5F7FA]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full mt-4 relative">
          {history.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-[#8B949E]">
              Building historical snapshot timeline...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEquityGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorEquityRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#161D26" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#505A66"
                  fontSize={10}
                  tickLine={false}
                  tick={{ fill: '#8B949E', fontFamily: 'monospace' }}
                  tickFormatter={(val) => {
                    const parts = val.split('-');
                    return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : val;
                  }}
                />
                <YAxis
                  stroke="#505A66"
                  fontSize={10}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tick={{ fill: '#8B949E', fontFamily: 'monospace' }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  width={55}
                />
                <Tooltip
                  formatter={(val: any) => [formatINR(val), 'Portfolio Value']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#11161D',
                    borderColor: '#1B222C',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    borderRadius: '6px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stroke={chartStrokeColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#${chartFillId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Open Holdings Table + Capital Allocation Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Holdings Table */}
        <div className="lg:col-span-8 bg-[#0D1117] border border-[#1B222C] rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
                Open Securities & Positions
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#11161D] border border-[#1B222C] text-[#00C2FF]">
                {summary?.holdings.length || 0} Positions
              </span>
            </div>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#161D26] text-[11px] text-[#8B949E]">
                  <th className="py-2.5 px-2">SECURITY</th>
                  <th className="py-2.5 px-2 text-right">QTY</th>
                  <th className="py-2.5 px-2 text-right">AVG BUY</th>
                  <th className="py-2.5 px-2 text-right">LTP</th>
                  <th className="py-2.5 px-2 text-right">MARKET VALUE</th>
                  <th className="py-2.5 px-2 text-right">WEIGHT</th>
                  <th className="py-2.5 px-2 text-right">UNREALIZED P&L</th>
                  <th className="py-2.5 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161D26]/60">
                {!summary?.holdings || summary.holdings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#8B949E]">
                      No active security positions. Search or browse the Markets terminal to place paper trades.
                    </td>
                  </tr>
                ) : (
                  summary.holdings.map((h) => {
                    const isProfitable = h.unrealizedPnL >= 0;
                    return (
                      <tr
                        key={h.symbol}
                        className="hover:bg-[#11161D] transition-colors cursor-pointer group"
                        onClick={() => onSelectStock(h.symbol)}
                      >
                        <td className="py-3 px-2">
                          <div className="font-bold text-[#F5F7FA] group-hover:text-[#00C2FF] transition-colors">
                            {h.symbol}
                          </div>
                          <div className="text-[10px] text-[#8B949E] truncate max-w-[130px]">
                            {h.name}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right text-[#F5F7FA] tabular-nums">
                          {h.quantity}
                        </td>
                        <td className="py-3 px-2 text-right text-[#8B949E] tabular-nums">
                          {formatINR(h.averagePrice)}
                        </td>
                        <td className="py-3 px-2 text-right text-[#F5F7FA] tabular-nums font-medium">
                          {formatINR(h.currentPrice)}
                        </td>
                        <td className="py-3 px-2 text-right text-[#F5F7FA] tabular-nums font-semibold">
                          {formatINR(h.marketValue)}
                        </td>
                        <td className="py-3 px-2 text-right text-[#00C2FF] tabular-nums font-medium">
                          {formatPercent(h.weightPercent)}
                        </td>
                        <td
                          className={`py-3 px-2 text-right tabular-nums font-bold ${
                            isProfitable ? 'text-[#22C55E]' : 'text-[#EF4444]'
                          }`}
                        >
                          <div>
                            {isProfitable ? '+' : ''}
                            {formatINR(h.unrealizedPnL)}
                          </div>
                          <div className="text-[10px] font-normal">
                            ({formatPercent(h.unrealizedPnLPercent)})
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectStock(h.symbol)}
                            className="px-2.5 py-1 rounded bg-[#161D26] hover:bg-[#00C2FF] text-[#00C2FF] hover:text-[#07090C] transition-colors text-[10px] font-bold cursor-pointer"
                          >
                            TRADE
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Capital Allocation Pie Chart */}
        <div className="lg:col-span-4 bg-[#0D1117] border border-[#1B222C] rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#8B949E] pb-2 border-b border-[#1B222C]">
              Asset Allocation (% Weight)
            </div>

            <div className="h-52 w-full flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatINR(val), 'Value']}
                    contentStyle={{
                      backgroundColor: '#11161D',
                      borderColor: '#1B222C',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      borderRadius: '6px',
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#1B222C] text-xs font-mono">
            {allocationData.map((item, idx) => {
              const pct = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[#8B949E] truncate max-w-[120px]">{item.name}</span>
                  </div>
                  <span className="font-semibold text-[#F5F7FA] tabular-nums">
                    {formatPercent(pct)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
