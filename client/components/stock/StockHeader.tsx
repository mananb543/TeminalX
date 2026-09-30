import React from 'react';
import { MarketQuote } from '../../types/market.ts';
import { formatINR, formatUSD, formatPercent, formatLargeNumber } from '../../lib/formatters.ts';
import { Star, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { useTradingStore } from '../../stores/tradingStore.ts';

interface StockHeaderProps {
  quote: MarketQuote;
}

export const StockHeader: React.FC<StockHeaderProps> = ({ quote }) => {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useTradingStore();
  const isWatchlisted = watchlist.includes(quote.symbol);
  const isPositive = quote.change >= 0;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg">
      {/* Left: Ticker & Company Name */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded bg-[#11161D] border border-[#1B222C] flex items-center justify-center font-mono font-bold text-sm text-[#00C2FF] shrink-0">
          {quote.symbol.slice(0, 3)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-tight text-[#F5F7FA]">
              {quote.symbol}
            </h1>
            <span className="px-1.5 py-0.5 rounded bg-[#161D26] border border-[#1B222C] text-[10px] font-mono text-[#8B949E]">
              {quote.exchange}
            </span>
            <span className="text-xs text-[#8B949E] hidden sm:inline">· {quote.sector || 'Equities'}</span>
          </div>
          <div className="text-xs text-[#8B949E] mt-0.5">{quote.name}</div>
        </div>
      </div>

      {/* Center/Right: Pricing and Stats */}
      <div className="flex flex-wrap items-center gap-6">
        {/* Main Price Block */}
        <div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#F5F7FA]">
            {quote.currency === 'USD' ? formatUSD(quote.price) : formatINR(quote.price)}
          </div>
          <div
            className={`flex items-center gap-1.5 text-xs font-mono tabular-nums font-semibold mt-0.5 ${
              isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>
              {isPositive ? '+' : ''}
              {quote.currency === 'USD' ? formatUSD(quote.change) : formatINR(quote.change)}
            </span>
            <span>({formatPercent(quote.changePercent)})</span>
          </div>
        </div>

        {/* Key Metrics Chips */}
        <div className="hidden lg:grid grid-cols-4 gap-4 pl-4 border-l border-[#1B222C] text-xs">
          <div>
            <div className="text-[10px] text-[#8B949E] font-mono uppercase">24H High</div>
            <div className="font-mono text-[#F5F7FA] tabular-nums mt-0.5">
              {formatINR(quote.high)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#8B949E] font-mono uppercase">24H Low</div>
            <div className="font-mono text-[#F5F7FA] tabular-nums mt-0.5">
              {formatINR(quote.low)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#8B949E] font-mono uppercase">Volume</div>
            <div className="font-mono text-[#F5F7FA] tabular-nums mt-0.5">
              {formatLargeNumber(quote.volume)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#8B949E] font-mono uppercase">52W Range</div>
            <div className="font-mono text-[#F5F7FA] tabular-nums mt-0.5 text-[11px]">
              {formatINR(quote.fiftyTwoWeekLow, false)} - {formatINR(quote.fiftyTwoWeekHigh, false)}
            </div>
          </div>
        </div>

        {/* Watchlist toggle */}
        <button
          onClick={() => (isWatchlisted ? removeFromWatchlist(quote.symbol) : addToWatchlist(quote.symbol))}
          className={`p-2 rounded border transition-colors ${
            isWatchlisted
              ? 'bg-[#00C2FF]/10 border-[#00C2FF]/40 text-[#00C2FF]'
              : 'bg-[#11161D] border-[#1B222C] text-[#8B949E] hover:text-[#F5F7FA]'
          }`}
          title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
          <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-[#00C2FF]' : ''}`} />
        </button>
      </div>
    </div>
  );
};
