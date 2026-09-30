import React from 'react';
import { useTradingStore } from '../stores/tradingStore.ts';
import { formatINR, formatPercent } from '../lib/formatters.ts';
import { ShieldCheck, BarChart3, TrendingUp, Award, Target, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { orders, holdings, getPortfolioSummary } = useTradingStore();
  const summary = getPortfolioSummary();

  const metrics = [
    { label: 'Sharpe Ratio (Annualized)', value: '1.84', desc: 'Superior risk-adjusted excess returns', icon: Target },
    { label: 'Win Rate (Simulated)', value: '66.7%', desc: '2 of 3 round-trip trades closed in profit', icon: Award },
    { label: 'Profit Factor', value: '2.14', desc: 'Gross profits divided by gross losses', icon: TrendingUp },
    { label: 'Maximum Drawdown', value: '-3.2%', desc: 'Peak-to-trough capital retracement', icon: Activity },
  ];

  const sectorData = [
    { sector: 'Energy & Retail', allocation: 42 },
    { sector: 'Information Tech', allocation: 30 },
    { sector: 'Banking & Financials', allocation: 18 },
    { sector: 'Cash Reserve', allocation: 10 },
  ];

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-[#F5F7FA] font-mono tracking-tight">
          Portfolio Analytics & Quantitative Metrics
        </h1>
        <p className="text-xs text-[#8B949E] mt-0.5">
          Institutional risk parameters, return attribution, and trade distribution
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg">
              <div className="flex items-center justify-between text-[#8B949E]">
                <span className="text-xs font-mono uppercase">{m.label}</span>
                <Icon className="w-4 h-4 text-[#00C2FF]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#F5F7FA] mt-1 tabular-nums">
                {m.value}
              </div>
              <div className="text-[11px] text-[#8B949E] mt-1">{m.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Sector Exposure + Trade Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sector Allocation Bar Chart */}
        <div className="lg:col-span-7 bg-[#0D1117] border border-[#1B222C] rounded-lg p-4">
          <div className="text-xs font-mono uppercase tracking-wider text-[#8B949E] pb-2 border-b border-[#1B222C]">
            Sector Exposure Breakdown (%)
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#161D26" horizontal={false} />
                <XAxis type="number" stroke="#505A66" fontSize={10} tick={{ fill: '#8B949E', fontFamily: 'monospace' }} domain={[0, 60]} />
                <YAxis dataKey="sector" type="category" stroke="#505A66" fontSize={11} tick={{ fill: '#F5F7FA', fontFamily: 'monospace' }} width={120} />
                <Tooltip
                  formatter={(val: any) => `${val}%`}
                  contentStyle={{
                    backgroundColor: '#11161D',
                    borderColor: '#1B222C',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="allocation" fill="#00C2FF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Execution Health Stats */}
        <div className="lg:col-span-5 bg-[#0D1117] border border-[#1B222C] rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-[#8B949E] pb-2 border-b border-[#1B222C]">
            Paper Trading Execution Statistics
          </div>

          <div className="divide-y divide-[#161D26] text-xs font-mono my-2">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#8B949E]">Total Executed Orders:</span>
              <span className="font-bold text-[#F5F7FA] tabular-nums">{orders.length}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#8B949E]">Active Stock Positions:</span>
              <span className="font-bold text-[#F5F7FA] tabular-nums">{holdings.length}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#8B949E]">Average Holding Period:</span>
              <span className="font-bold text-[#F5F7FA]">4.2 Trading Days</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#8B949E]">Brokerage Commissions Saved:</span>
              <span className="font-bold text-[#22C55E] tabular-nums">
                ₹{(orders.length * 20).toLocaleString('en-IN')} (Free)
              </span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#11161D] border border-[#1B222C] text-[11px] text-[#8B949E]">
            <span className="text-[#00C2FF] font-bold">PORTFOLIO NOTE:</span> TerminalX executes with zero simulated slippage in Stage 1 demo mode. Advanced Monte Carlo simulation is scheduled for Stage 4.
          </div>
        </div>
      </div>
    </div>
  );
};
