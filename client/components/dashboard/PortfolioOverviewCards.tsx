import React from 'react';
import { useTradingStore } from '../../stores/tradingStore.ts';
import { formatINR, formatPercent } from '../../lib/formatters.ts';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Layers } from 'lucide-react';

export const PortfolioOverviewCards: React.FC = () => {
  const { getPortfolioSummary } = useTradingStore();
  const summary = getPortfolioSummary();

  const isDailyPositive = summary.dailyPnL >= 0;
  const isTotalPositive = summary.totalPnL >= 0;

  const cards = [
    {
      title: 'Portfolio Net Worth',
      value: formatINR(summary.totalPortfolioValue),
      subtext: `Invested: ${formatINR(summary.investedValue)}`,
      badge: 'Real-Time Mark-to-Market',
      icon: Layers,
      highlight: 'neutral',
    },
    {
      title: 'Daily P&L',
      value: `${isDailyPositive ? '+' : ''}${formatINR(summary.dailyPnL)}`,
      subtext: `${formatPercent(summary.dailyPnLPercent)} today`,
      isPositive: isDailyPositive,
      icon: isDailyPositive ? TrendingUp : TrendingDown,
      highlight: isDailyPositive ? 'green' : 'red',
    },
    {
      title: 'Total Unrealized Return',
      value: `${isTotalPositive ? '+' : ''}${formatINR(summary.totalPnL)}`,
      subtext: `${formatPercent(summary.totalPnLPercent)} all-time`,
      isPositive: isTotalPositive,
      icon: isTotalPositive ? TrendingUp : TrendingDown,
      highlight: isTotalPositive ? 'green' : 'red',
    },
    {
      title: 'Available Virtual Cash',
      value: formatINR(summary.cashBalance),
      subtext: 'Virtual Capital · Zero Risk',
      badge: 'Buying Power',
      icon: Wallet,
      highlight: 'accent',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg flex flex-col justify-between hover:border-[#263140] transition-colors"
          >
            <div className="flex items-center justify-between text-[#8B949E] mb-2">
              <span className="text-xs font-medium uppercase tracking-wider font-mono">
                {card.title}
              </span>
              <Icon
                className={`w-4 h-4 ${
                  card.highlight === 'green'
                    ? 'text-[#22C55E]'
                    : card.highlight === 'red'
                    ? 'text-[#EF4444]'
                    : card.highlight === 'accent'
                    ? 'text-[#00C2FF]'
                    : 'text-[#8B949E]'
                }`}
              />
            </div>

            <div>
              <div
                className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                  card.highlight === 'green'
                    ? 'text-[#22C55E]'
                    : card.highlight === 'red'
                    ? 'text-[#EF4444]'
                    : 'text-[#F5F7FA]'
                }`}
              >
                {card.value}
              </div>
              <div className="text-xs font-mono text-[#8B949E] mt-1 flex items-center justify-between">
                <span>{card.subtext}</span>
                {card.badge && (
                  <span className="text-[10px] text-[#505A66] uppercase">{card.badge}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
