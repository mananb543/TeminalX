import React, { useState, useEffect } from 'react';
import {
  analyticsService,
  RiskMetricsResult,
  PortfolioAllocationResult,
  TradeAnalyticsResult,
  BenchmarkComparisonResult,
  PortfolioSummaryMetrics,
} from '../lib/analyticsService.ts';
import { formatINR, formatPercent } from '../lib/formatters.ts';
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Activity,
  Layers,
  PieChart as PieChartIcon,
  RefreshCw,
  Info,
  AlertCircle,
  Clock,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<PortfolioSummaryMetrics | null>(null);
  const [risk, setRisk] = useState<RiskMetricsResult | null>(null);
  const [allocation, setAllocation] = useState<PortfolioAllocationResult | null>(null);
  const [trades, setTrades] = useState<TradeAnalyticsResult | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkComparisonResult | null>(null);
  const [benchmarkRange, setBenchmarkRange] = useState<string>('1M');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBenchmarkLoading, setIsBenchmarkLoading] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const ranges = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

  const loadAllAnalytics = async () => {
    setIsLoading(true);
    setErrorNotice(null);
    try {
      const [sumData, riskData, allocData, tradeData] = await Promise.all([
        analyticsService.getPortfolio(),
        analyticsService.getRiskMetrics(),
        analyticsService.getAllocation(),
        analyticsService.getTradeAnalytics(),
      ]);

      if (sumData) setSummary(sumData);
      if (riskData) setRisk(riskData);
      if (allocData) setAllocation(allocData);
      if (tradeData) setTrades(tradeData);
    } catch (err: any) {
      setErrorNotice(err.message || 'Error loading analytics parameters');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBenchmark = async (range: string) => {
    setIsBenchmarkLoading(true);
    try {
      const bData = await analyticsService.getBenchmarkComparison(range);
      if (bData) setBenchmark(bData);
    } catch {
      // ignore
    } finally {
      setIsBenchmarkLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, []);

  useEffect(() => {
    loadBenchmark(benchmarkRange);
  }, [benchmarkRange]);

  const totalReturn = summary?.totalReturnPercent ?? 0;
  const isReturnPositive = totalReturn >= 0;

  return (
    <div className="space-y-5">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7FA] font-mono tracking-tight flex items-center gap-2">
            <span>Portfolio Analytics & Risk Engine</span>
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-[#00C2FF]" />}
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Quantitative risk parameters, benchmark performance attribution, and trade execution metrics
          </p>
        </div>

        <button
          onClick={() => {
            loadAllAnalytics();
            loadBenchmark(benchmarkRange);
          }}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#11161D] hover:bg-[#161D26] border border-[#1B222C] text-xs font-mono text-[#8B949E] hover:text-[#00C2FF] transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00C2FF]' : ''}`} />
          <span>Recalculate Metrics</span>
        </button>
      </div>

      {errorNotice && (
        <div className="p-3 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs font-mono text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* 1. SECTION 1: Key Performance Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-[#0D1117] border border-[#1B222C] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#8B949E]">Total Return</div>
          <div className={`text-xl font-bold font-mono mt-1 tabular-nums ${isReturnPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {isReturnPositive ? '+' : ''}{formatPercent(totalReturn)}
          </div>
          <div className="text-[10px] text-[#8B949E] font-mono mt-0.5">
            Total PnL: {formatINR(summary?.totalPnL || 0)}
          </div>
        </div>

        <div className="p-3.5 bg-[#0D1117] border border-[#1B222C] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#8B949E]">Realized P&L</div>
          <div className={`text-xl font-bold font-mono mt-1 tabular-nums ${(summary?.realizedPnL || 0) >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {(summary?.realizedPnL || 0) >= 0 ? '+' : ''}{formatINR(summary?.realizedPnL || 0)}
          </div>
          <div className="text-[10px] text-[#8B949E] font-mono mt-0.5">Closed Positions</div>
        </div>

        <div className="p-3.5 bg-[#0D1117] border border-[#1B222C] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#8B949E]">Unrealized P&L</div>
          <div className={`text-xl font-bold font-mono mt-1 tabular-nums ${(summary?.unrealizedPnL || 0) >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {(summary?.unrealizedPnL || 0) >= 0 ? '+' : ''}{formatINR(summary?.unrealizedPnL || 0)}
          </div>
          <div className="text-[10px] text-[#8B949E] font-mono mt-0.5">Open Positions</div>
        </div>

        <div className="p-3.5 bg-[#0D1117] border border-[#1B222C] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#8B949E]">Win Rate (Holdings)</div>
          <div className="text-xl font-bold font-mono text-[#00C2FF] mt-1 tabular-nums">
            {formatPercent(summary?.winRatePercent || 0)}
          </div>
          <div className="text-[10px] text-[#8B949E] font-mono mt-0.5">
            {summary?.winningPositionsCount || 0}W / {summary?.losingPositionsCount || 0}L of {summary?.positionsCount || 0}
          </div>
        </div>

        <div className="p-3.5 bg-[#0D1117] border border-[#1B222C] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#8B949E]">Total Trades</div>
          <div className="text-xl font-bold font-mono text-[#F5F7FA] mt-1 tabular-nums">
            {trades?.totalTrades || 0}
          </div>
          <div className="text-[10px] text-[#8B949E] font-mono mt-0.5">
            {trades?.buyOrdersCount || 0} Buy / {trades?.sellOrdersCount || 0} Sell
          </div>
        </div>

        <div className="p-3.5 bg-[#0D1117] border border-[#1B222C] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#8B949E]">Profit Factor</div>
          <div className="text-xl font-bold font-mono text-[#F5F7FA] mt-1 tabular-nums">
            {trades?.profitFactor !== null && trades?.profitFactor !== undefined ? trades.profitFactor.toFixed(2) : 'N/A'}
          </div>
          <div className="text-[10px] text-[#8B949E] font-mono mt-0.5">Gross Win / Gross Loss</div>
        </div>
      </div>

      {/* 2. SECTION 2: Portfolio vs NIFTY 50 Benchmark Comparison */}
      <div className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1B222C] gap-2">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00C2FF]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
                Portfolio vs NIFTY 50 Benchmark (Normalized Base 100)
              </span>
              {isBenchmarkLoading && <RefreshCw className="w-3 h-3 animate-spin text-[#00C2FF]" />}
            </div>
            <div className="text-[11px] text-[#8B949E] font-mono mt-0.5 flex items-center gap-3">
              <span>
                Portfolio Return: <strong className="text-[#00C2FF]">{formatPercent(benchmark?.portfolioTotalReturnPercent || 0)}</strong>
              </span>
              <span>
                NIFTY 50 Return: <strong className="text-[#F59E0B]">{formatPercent(benchmark?.benchmarkTotalReturnPercent || 0)}</strong>
              </span>
              <span>
                Excess Alpha: <strong className={(benchmark?.excessReturnPercent || 0) >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                  {(benchmark?.excessReturnPercent || 0) >= 0 ? '+' : ''}{formatPercent(benchmark?.excessReturnPercent || 0)}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center rounded bg-[#11161D] border border-[#1B222C] p-0.5 self-start sm:self-auto">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setBenchmarkRange(r)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
                  benchmarkRange === r
                    ? 'bg-[#00C2FF] text-[#07090C] font-bold'
                    : 'text-[#8B949E] hover:text-[#F5F7FA]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full mt-4">
          {!benchmark?.points || benchmark.points.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-[#8B949E]">
              Loading benchmark comparison series...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={benchmark.points} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                  tickFormatter={(v) => v.toFixed(0)}
                  width={40}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${val.toFixed(2)} pts`,
                    name === 'portfolioNormalized' ? 'TerminalX Portfolio' : 'NIFTY 50 Benchmark',
                  ]}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#11161D',
                    borderColor: '#1B222C',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    borderRadius: '6px',
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs font-mono text-[#8B949E]">
                      {value === 'portfolioNormalized' ? 'TerminalX Portfolio' : 'NIFTY 50 Benchmark'}
                    </span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="portfolioNormalized"
                  stroke="#00C2FF"
                  strokeWidth={2}
                  dot={false}
                  name="portfolioNormalized"
                />
                <Line
                  type="monotone"
                  dataKey="benchmarkNormalized"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  name="benchmarkNormalized"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-2 text-[10px] text-[#505A66] font-mono">
          {benchmark?.disclaimer}
        </div>
      </div>

      {/* 3. SECTION 3: Quantitative Risk Metrics */}
      <div className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg">
        <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00C2FF]" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
              Portfolio Risk Metrics (Configured Risk-Free Rate: {(risk?.riskFreeRate ? (risk.riskFreeRate * 100).toFixed(1) : '6.0')}%)
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#8B949E]">
            {risk?.observationsCount || 0} Observations
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {/* Volatility */}
          <div className="p-3.5 rounded bg-[#11161D] border border-[#1B222C] flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono text-[#8B949E] uppercase">Annualized Volatility (σ)</div>
              <div className="text-xl font-bold font-mono text-[#F5F7FA] mt-1 tabular-nums">
                {risk?.volatility.status === 'CALCULATED'
                  ? `${risk.volatility.value}%`
                  : <span className="text-xs text-[#EAB308] font-normal">{risk?.volatility.message || 'Insufficient history'}</span>}
              </div>
            </div>
            <div className="text-[10px] text-[#8B949E] font-mono mt-2">
              Annualized standard deviation of daily logarithmic returns (√252)
            </div>
          </div>

          {/* Sharpe Ratio */}
          <div className="p-3.5 rounded bg-[#11161D] border border-[#1B222C] flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono text-[#8B949E] uppercase">Sharpe Ratio</div>
              <div className="text-xl font-bold font-mono text-[#00C2FF] mt-1 tabular-nums">
                {risk?.sharpeRatio.status === 'CALCULATED'
                  ? risk.sharpeRatio.value?.toFixed(2)
                  : <span className="text-xs text-[#EAB308] font-normal">{risk?.sharpeRatio.message || 'Insufficient history'}</span>}
              </div>
            </div>
            <div className="text-[10px] text-[#8B949E] font-mono mt-2">
              Excess return over risk-free rate per unit of annualized total risk
            </div>
          </div>

          {/* Max Drawdown */}
          <div className="p-3.5 rounded bg-[#11161D] border border-[#1B222C] flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono text-[#8B949E] uppercase">Maximum Drawdown</div>
              <div className="text-xl font-bold font-mono text-[#EF4444] mt-1 tabular-nums">
                {risk?.maxDrawdown.maxDrawdownPercent !== undefined
                  ? `${risk.maxDrawdown.maxDrawdownPercent}%`
                  : '0.00%'}
              </div>
            </div>
            <div className="text-[10px] text-[#8B949E] font-mono mt-2">
              Peak-to-trough retracement (Duration: {risk?.maxDrawdown.drawdownDurationDays || 0} days)
            </div>
          </div>

          {/* Beta */}
          <div className="p-3.5 rounded bg-[#11161D] border border-[#1B222C] flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono text-[#8B949E] uppercase">Beta (vs NIFTY 50)</div>
              <div className="text-xl font-bold font-mono text-[#F5F7FA] mt-1 tabular-nums">
                {risk?.beta.status === 'CALCULATED'
                  ? risk.beta.value?.toFixed(2)
                  : <span className="text-xs text-[#EAB308] font-normal">{risk?.beta.message || 'Insufficient history'}</span>}
              </div>
            </div>
            <div className="text-[10px] text-[#8B949E] font-mono mt-2">
              Systematic market risk sensitivity: Cov(R_p, R_m) / Var(R_m)
            </div>
          </div>

          {/* Alpha */}
          <div className="p-3.5 rounded bg-[#11161D] border border-[#1B222C] flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono text-[#8B949E] uppercase">Jensen's Alpha</div>
              <div className={`text-xl font-bold font-mono mt-1 tabular-nums ${risk?.alpha.status === 'CALCULATED' && (risk.alpha.value || 0) >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                {risk?.alpha.status === 'CALCULATED'
                  ? `${(risk.alpha.value || 0) >= 0 ? '+' : ''}${risk.alpha.value}%`
                  : <span className="text-xs text-[#EAB308] font-normal">{risk?.alpha.message || 'Insufficient history'}</span>}
              </div>
            </div>
            <div className="text-[10px] text-[#8B949E] font-mono mt-2">
              Annualized excess return above CAPM benchmark expectation
            </div>
          </div>

          {/* Historical VaR */}
          <div className="p-3.5 rounded bg-[#11161D] border border-[#1B222C] flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono text-[#8B949E] uppercase">Historical 1-Day VaR (95%)</div>
              <div className="text-xl font-bold font-mono text-[#F5F7FA] mt-1 tabular-nums">
                {risk?.valueAtRisk95.status === 'CALCULATED' && risk.valueAtRisk95.value
                  ? formatINR(risk.valueAtRisk95.value.amount)
                  : <span className="text-xs text-[#EAB308] font-normal">{risk?.valueAtRisk95.message || 'Insufficient history'}</span>}
              </div>
            </div>
            <div className="text-[10px] text-[#8B949E] font-mono mt-2">
              {risk?.valueAtRisk95.status === 'CALCULATED' && risk.valueAtRisk95.value
                ? `${risk.valueAtRisk95.value.percent}% of portfolio at 95% historical 1-day threshold`
                : 'Empirical 5th percentile daily loss threshold'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. SECTION 4 & 5: Allocation & Concentration Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sector Exposure Bar Chart */}
        <div className="lg:col-span-7 bg-[#0D1117] border border-[#1B222C] rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
              Sector Exposure Breakdown (% of Net Portfolio)
            </span>
            <span className="text-[10px] font-mono text-[#8B949E]">
              {allocation?.sectors.length || 0} Industry Sectors
            </span>
          </div>

          <div className="h-60 w-full mt-3">
            {!allocation?.sectors || allocation.sectors.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-[#8B949E]">
                100% Cash allocation. Hold equities to generate sector breakdown.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={allocation.sectors}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#161D26" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#505A66"
                    fontSize={10}
                    tick={{ fill: '#8B949E', fontFamily: 'monospace' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    dataKey="sector"
                    type="category"
                    stroke="#505A66"
                    fontSize={11}
                    tick={{ fill: '#F5F7FA', fontFamily: 'monospace' }}
                    width={130}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Allocation']}
                    contentStyle={{
                      backgroundColor: '#11161D',
                      borderColor: '#1B222C',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="weightPercent" fill="#00C2FF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Concentration Analysis Card */}
        <div className="lg:col-span-5 bg-[#0D1117] border border-[#1B222C] rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-[#8B949E] pb-2 border-b border-[#1B222C]">
            Portfolio Concentration Measurements
          </div>

          <div className="divide-y divide-[#161D26] text-xs font-mono my-2">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#8B949E]">Largest Position Weight:</span>
              <span className="text-[#F5F7FA] font-bold">
                {formatPercent(allocation?.concentration.largestPositionPercent || 0)}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#8B949E]">Top 3 Positions Weight:</span>
              <span className="text-[#F5F7FA] font-bold">
                {formatPercent(allocation?.concentration.top3PositionsPercent || 0)}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#8B949E]">Top 5 Positions Weight:</span>
              <span className="text-[#F5F7FA] font-bold">
                {formatPercent(allocation?.concentration.top5PositionsPercent || 0)}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#8B949E]">Cash Allocation %:</span>
              <span className="text-[#00C2FF] font-bold">
                {formatPercent(allocation?.concentration.cashAllocationPercent || 100)}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#8B949E]">Active Securities Count:</span>
              <span className="text-[#F5F7FA] font-bold">
                {allocation?.concentration.numberOfPositions || 0}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#8B949E]">Herfindahl Index (HHI):</span>
              <span className="text-[#F5F7FA] font-bold">
                {allocation?.concentration.herfindahlIndex || 10000}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#11161D] border border-[#1B222C] text-[10px] text-[#8B949E] leading-relaxed">
            HHI measures asset concentration across holdings on a 0–10,000 scale. Lower values denote broader portfolio diversification.
          </div>
        </div>
      </div>

      {/* 5. SECTION 6: Trade Statistics & Execution Audit */}
      <div className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg">
        <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#00C2FF]" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
              Paper Trading Execution Statistics
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#8B949E]">
            {trades?.closedTradesCount || 0} Closed Round-Trip Trades
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-[#11161D] border border-[#1B222C]">
            <span className="text-[10px] text-[#8B949E] block uppercase">Closed Trades</span>
            <span className="text-base font-bold text-[#F5F7FA] mt-0.5 block">{trades?.closedTradesCount || 0}</span>
          </div>

          <div className="p-2.5 rounded bg-[#11161D] border border-[#1B222C]">
            <span className="text-[10px] text-[#8B949E] block uppercase">Win Rate</span>
            <span className="text-base font-bold text-[#00C2FF] mt-0.5 block">{formatPercent(trades?.winRatePercent || 0)}</span>
          </div>

          <div className="p-2.5 rounded bg-[#11161D] border border-[#1B222C]">
            <span className="text-[10px] text-[#8B949E] block uppercase">Gross Profit</span>
            <span className="text-base font-bold text-[#22C55E] mt-0.5 block">+{formatINR(trades?.grossProfit || 0)}</span>
          </div>

          <div className="p-2.5 rounded bg-[#11161D] border border-[#1B222C]">
            <span className="text-[10px] text-[#8B949E] block uppercase">Gross Loss</span>
            <span className="text-base font-bold text-[#EF4444] mt-0.5 block">-{formatINR(trades?.grossLoss || 0)}</span>
          </div>

          <div className="p-2.5 rounded bg-[#11161D] border border-[#1B222C]">
            <span className="text-[10px] text-[#8B949E] block uppercase">Avg Win</span>
            <span className="text-base font-bold text-[#22C55E] mt-0.5 block">+{formatINR(trades?.avgWinningTradeAmount || 0)}</span>
          </div>

          <div className="p-2.5 rounded bg-[#11161D] border border-[#1B222C]">
            <span className="text-[10px] text-[#8B949E] block uppercase">Avg Loss</span>
            <span className="text-base font-bold text-[#EF4444] mt-0.5 block">-{formatINR(trades?.avgLosingTradeAmount || 0)}</span>
          </div>

          <div className="p-2.5 rounded bg-[#11161D] border border-[#1B222C]">
            <span className="text-[10px] text-[#8B949E] block uppercase">Avg Hold Time</span>
            <span className="text-base font-bold text-[#F5F7FA] mt-0.5 block">{trades?.avgHoldingPeriodHours || 0}h</span>
          </div>
        </div>

        {/* Closed Trades Audit Log */}
        {trades?.recentClosedTrades && trades.recentClosedTrades.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#1B222C]">
            <div className="text-[11px] font-mono text-[#8B949E] uppercase pb-2">
              Recent Completed Round-Trip Executions
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#161D26] text-[10px] text-[#8B949E]">
                    <th className="py-2 px-2">SYMBOL</th>
                    <th className="py-2 px-2 text-right">QTY</th>
                    <th className="py-2 px-2 text-right">BUY PRICE</th>
                    <th className="py-2 px-2 text-right">SELL PRICE</th>
                    <th className="py-2 px-2 text-right">REALIZED P&L</th>
                    <th className="py-2 px-2 text-right">HOLDING TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161D26]/60">
                  {trades.recentClosedTrades.map((ct) => {
                    const isWin = ct.realizedPnL >= 0;
                    return (
                      <tr key={ct.id} className="hover:bg-[#11161D] transition-colors">
                        <td className="py-2 px-2 font-bold text-[#F5F7FA]">{ct.symbol}</td>
                        <td className="py-2 px-2 text-right text-[#8B949E] tabular-nums">{ct.quantity}</td>
                        <td className="py-2 px-2 text-right text-[#8B949E] tabular-nums">{formatINR(ct.buyPrice)}</td>
                        <td className="py-2 px-2 text-right text-[#F5F7FA] tabular-nums">{formatINR(ct.sellPrice)}</td>
                        <td className={`py-2 px-2 text-right tabular-nums font-bold ${isWin ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                          {isWin ? '+' : ''}{formatINR(ct.realizedPnL)} ({formatPercent(ct.realizedPnLPercent)})
                        </td>
                        <td className="py-2 px-2 text-right text-[#8B949E] tabular-nums">{ct.holdingPeriodHours}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
