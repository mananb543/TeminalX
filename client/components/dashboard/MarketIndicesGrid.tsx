import React, { useState, useEffect } from 'react';
import { clientMarketService } from '../../lib/marketService.ts';
import { formatINR, formatUSD, formatPercent } from '../../lib/formatters.ts';
import { TrendingUp, TrendingDown, ArrowUpRight, RefreshCw } from 'lucide-react';
import { MarketQuote } from '../../types/market.ts';

interface MarketIndicesGridProps {
  onSelectStock: (symbol: string) => void;
}

export const MarketIndicesGrid: React.FC<MarketIndicesGridProps> = ({ onSelectStock }) => {
  const [overview, setOverview] = useState(() => clientMarketService.getMarketOverview());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/markets/overview')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setOverview(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    const unsubscribe = clientMarketService.subscribe(() => {
      setOverview(clientMarketService.getMarketOverview());
    });
    return unsubscribe;
  }, []);

  const majorIndices: MarketQuote[] = [
    ...(overview.indianIndices || []),
    ...(overview.globalIndices || []),
    ...(overview.commodities || []),
  ];

  return (
    <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
            Market Overview (Major Benchmarks)
          </span>
          {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-[#00C2FF]" />}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-3">
        {majorIndices.map((item) => {
          const isPositive = (item.change || 0) >= 0;
          return (
            <div
              key={item.symbol}
              onClick={() => onSelectStock(item.symbol)}
              className="p-3 rounded bg-[#11161D] border border-[#1B222C] hover:border-[#00C2FF]/40 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#F5F7FA] group-hover:text-[#00C2FF] transition-colors">
                  {item.symbol}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#505A66] group-hover:text-[#00C2FF] transition-colors" />
              </div>
              <div className="text-[10px] text-[#8B949E] truncate mt-0.5">{item.name}</div>

              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-sm font-semibold text-[#F5F7FA] tabular-nums">
                  {item.currency === 'USD' ? formatUSD(item.price) : formatINR(item.price, item.price < 500)}
                </span>
                <span
                  className={`font-mono text-[11px] font-semibold tabular-nums flex items-center gap-0.5 ${
                    isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {formatPercent(item.changePercent || 0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
