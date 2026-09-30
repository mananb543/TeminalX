import React from 'react';
import { useTradingStore } from '../stores/tradingStore.ts';
import { formatINR, formatPercent } from '../lib/formatters.ts';
import { TrendingUp, TrendingDown, PieChart, ArrowUpRight, ShieldCheck, Wallet } from 'lucide-react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip } from 'recharts';

interface PortfolioPageProps {
  onSelectStock: (symbol: string) => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onSelectStock }) => {
  const { holdings, balance, getPortfolioSummary, resetPortfolio } = useTradingStore();
  const summary = getPortfolioSummary();

  const isDailyPositive = summary.dailyPnL >= 0;
  const isTotalPositive = summary.totalPnL >= 0;

  // Pie chart asset allocation
  const COLORS = ['#00C2FF', '#22C55E', '#F59E0B', '#A855F7', '#EC4899', '#3B82F6'];
  const allocationData = [
    { name: 'Virtual Cash', value: summary.cashBalance, color: '#1B222C' },
    ...summary.holdings.map((h, i) => ({
      name: h.symbol,
      value: h.currentValue,
      color: COLORS[i % COLORS.length],
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7FA] font-mono tracking-tight">
            Portfolio & Holdings
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Active paper positions, equity distribution, and mark-to-market performance
          </p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Reset portfolio back to default ₹10,00,000 INR?')) {
              resetPortfolio();
            }
          }}
          className="px-3 py-1.5 rounded bg-[#11161D] hover:bg-[#161D26] border border-[#1B222C] text-xs font-mono text-[#8B949E] hover:text-[#00C2FF] transition-colors self-start sm:self-auto"
        >
          Reset Virtual Account
        </button>
      </div>

      {/* Top Net Worth Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[11px] font-mono text-[#8B949E] uppercase">Net Portfolio Value</div>
          <div className="text-2xl font-bold font-mono text-[#F5F7FA] tabular-nums mt-1">
            {formatINR(summary.totalPortfolioValue)}
          </div>
          <div className="text-xs text-[#8B949E] font-mono mt-0.5">
            Total Net Worth (Cash + Equities)
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[11px] font-mono text-[#8B949E] uppercase">Invested Capital</div>
          <div className="text-2xl font-bold font-mono text-[#F5F7FA] tabular-nums mt-1">
            {formatINR(summary.investedValue)}
          </div>
          <div className="text-xs text-[#8B949E] font-mono mt-0.5">
            Cost Basis: {formatINR(summary.costBasis)}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[11px] font-mono text-[#8B949E] uppercase">Total P&L (Unrealized)</div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
              isTotalPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
            }`}
          >
            {isTotalPositive ? '+' : ''}
            {formatINR(summary.totalPnL)}
          </div>
          <div className="text-xs text-[#8B949E] font-mono mt-0.5">
            Return: {formatPercent(summary.totalPnLPercent)}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[11px] font-mono text-[#8B949E] uppercase">Available Cash</div>
          <div className="text-2xl font-bold font-mono text-[#00C2FF] tabular-nums mt-1">
            {formatINR(summary.cashBalance)}
          </div>
          <div className="text-xs text-[#8B949E] font-mono mt-0.5">
            Unencumbered virtual liquidity
          </div>
        </div>
      </div>

      {/* Allocation breakdown + Holdings table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Holdings Table */}
        <div className="lg:col-span-8 bg-[#0D1117] border border-[#1B222C] rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
              Open Positions ({summary.holdings.length})
            </span>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#161D26] text-[11px] text-[#8B949E]">
                  <th className="py-2.5 px-2">HOLDING</th>
                  <th className="py-2.5 px-2 text-right">QTY</th>
                  <th className="py-2.5 px-2 text-right">AVG BUY</th>
                  <th className="py-2.5 px-2 text-right">LTP</th>
                  <th className="py-2.5 px-2 text-right">CURR VALUE</th>
                  <th className="py-2.5 px-2 text-right">UNREALIZED P&L</th>
                  <th className="py-2.5 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161D26]/60">
                {summary.holdings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8B949E]">
                      You currently have no open stock positions. Browse Markets to place a paper trade.
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
                          <div className="text-[10px] text-[#8B949E] truncate max-w-[120px]">
                            {h.companyName}
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
                          {formatINR(h.currentValue)}
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
                            className="px-2.5 py-1 rounded bg-[#161D26] hover:bg-[#00C2FF] text-[#00C2FF] hover:text-[#07090C] transition-colors text-[10px] font-bold"
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
          <div className="text-xs font-mono uppercase tracking-wider text-[#8B949E] pb-2 border-b border-[#1B222C]">
            Capital Allocation
          </div>

          <div className="h-52 w-full flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => formatINR(Number(val))}
                  contentStyle={{
                    backgroundColor: '#11161D',
                    borderColor: '#1B222C',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    borderRadius: '4px',
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1 text-xs font-mono border-t border-[#1B222C] pt-2">
            {allocationData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[#8B949E]">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate max-w-[100px] text-[#F5F7FA]">{item.name}</span>
                </div>
                <span className="tabular-nums">
                  {((item.value / summary.totalPortfolioValue) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
