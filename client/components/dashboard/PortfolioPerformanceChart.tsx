import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatINR } from '../../lib/formatters.ts';
import { useTradingStore } from '../../stores/tradingStore.ts';

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y';

export const PortfolioPerformanceChart: React.FC = () => {
  const { getPortfolioSummary } = useTradingStore();
  const summary = getPortfolioSummary();
  const [range, setRange] = useState<TimeRange>('1M');

  // Synthetic portfolio equity curve trajectory
  const generateHistory = (currentVal: number) => {
    const points: { date: string; value: number }[] = [];
    const count = range === '1W' ? 7 : range === '1M' ? 30 : range === '3M' ? 90 : 180;
    const base = 1000000; // Starting ₹10 Lakhs
    const diff = currentVal - base;

    for (let i = count; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      const progress = (count - i) / count;
      const noise = (Math.sin(i * 0.7) + (Math.random() - 0.5) * 0.4) * 8000;
      const val = +(base + diff * progress + noise).toFixed(2);
      points.push({ date: dateStr, value: Math.max(950000, val) });
    }

    if (points.length > 0) {
      points[points.length - 1].value = currentVal;
    }
    return points;
  };

  const chartData = generateHistory(summary.totalPortfolioValue);
  const isPositive = summary.totalPortfolioValue >= 1000000;

  return (
    <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg p-4">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1B222C] gap-2">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
            Portfolio Performance
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xl font-bold font-mono text-[#F5F7FA] tabular-nums">
              {formatINR(summary.totalPortfolioValue)}
            </span>
            <span
              className={`text-xs font-mono font-semibold ${
                isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatINR(summary.totalPortfolioValue - 1000000)} (
              {(((summary.totalPortfolioValue - 1000000) / 1000000) * 100).toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Time range pills */}
        <div className="flex items-center gap-1 bg-[#11161D] p-0.5 rounded border border-[#1B222C] self-start sm:self-center">
          {(['1W', '1M', '3M', '6M', '1Y'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                range === r
                  ? 'bg-[#1B222C] text-[#00C2FF] font-semibold'
                  : 'text-[#8B949E] hover:text-[#F5F7FA]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#00C2FF' : '#EF4444'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isPositive ? '#00C2FF' : '#EF4444'} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#161D26" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#505A66"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#8B949E', fontFamily: "'JetBrains Mono', monospace" }}
            />
            <YAxis
              stroke="#505A66"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
              tick={{ fill: '#8B949E', fontFamily: "'JetBrains Mono', monospace" }}
              orientation="right"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#11161D] border border-[#1B222C] p-2 rounded shadow-lg font-mono text-xs">
                      <div className="text-[#8B949E]">{payload[0].payload.date}</div>
                      <div className="font-bold text-[#F5F7FA] mt-0.5">
                        {formatINR(payload[0].value as number)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isPositive ? '#00C2FF' : '#EF4444'}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#equityGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
