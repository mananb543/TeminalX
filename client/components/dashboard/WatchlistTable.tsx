import React, { useState, useEffect } from 'react';
import { useTradingStore } from '../../stores/tradingStore.ts';
import { clientMarketService } from '../../lib/marketService.ts';
import { formatINR, formatUSD, formatPercent, formatLargeNumber } from '../../lib/formatters.ts';
import { TrendingUp, TrendingDown, ArrowUpRight, Trash2, RefreshCw } from 'lucide-react';
import { MarketQuote } from '../../types/market.ts';

interface WatchlistTableProps {
  onSelectStock: (symbol: string) => void;
}

export const WatchlistTable: React.FC<WatchlistTableProps> = ({ onSelectStock }) => {
  const { watchlist, removeFromWatchlist } = useTradingStore();
  const [quotes, setQuotes] = useState<MarketQuote[]>(() =>
    watchlist.map((sym) => clientMarketService.getQuote(sym)).filter(Boolean)
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (watchlist.length > 0) {
      setIsLoading(true);
      clientMarketService
        .fetchQuotes(watchlist)
        .then((data) => {
          if (data && data.length > 0) setQuotes(data);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setQuotes([]);
    }

    const unsubscribe = clientMarketService.subscribe(() => {
      setQuotes(watchlist.map((sym) => clientMarketService.getQuote(sym)).filter(Boolean));
    });
    return unsubscribe;
  }, [watchlist]);

  return (
    <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
            Active Watchlist
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#11161D] border border-[#1B222C] text-[#00C2FF]">
            {quotes.length} Tracked
          </span>
          {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-[#00C2FF]" />}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono mt-2">
          <thead>
            <tr className="border-b border-[#161D26] text-[11px] text-[#8B949E]">
              <th className="py-2 px-2 font-medium">SYMBOL</th>
              <th className="py-2 px-2 text-right font-medium">PRICE</th>
              <th className="py-2 px-2 text-right font-medium">CHANGE</th>
              <th className="py-2 px-2 text-right font-medium hidden sm:table-cell">VOLUME</th>
              <th className="py-2 px-2 text-right font-medium hidden md:table-cell">RSI (14)</th>
              <th className="py-2 px-2 text-right font-medium">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#161D26]/60">
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#8B949E]">
                  Your watchlist is empty. Search for symbols to track them.
                </td>
              </tr>
            ) : (
              quotes.map((quote) => {
                const isPositive = (quote.change || 0) >= 0;
                return (
                  <tr
                    key={quote.symbol}
                    className="hover:bg-[#11161D] transition-colors group cursor-pointer"
                    onClick={() => onSelectStock(quote.symbol)}
                  >
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F5F7FA] group-hover:text-[#00C2FF] transition-colors">
                          {quote.symbol}
                        </span>
                        <span className="text-[10px] text-[#8B949E] hidden lg:inline truncate max-w-[120px]">
                          {quote.name}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-2 text-right font-semibold text-[#F5F7FA] tabular-nums">
                      {quote.currency === 'USD' ? formatUSD(quote.price) : formatINR(quote.price, quote.price < 500)}
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <span
                        className={`font-semibold tabular-nums inline-flex items-center gap-0.5 ${
                          isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatPercent(quote.changePercent || 0)}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-right hidden sm:table-cell text-[#8B949E] tabular-nums">
                      {quote.volume ? formatLargeNumber(quote.volume) : 'N/A'}
                    </td>

                    <td className="py-2.5 px-2 text-right hidden md:table-cell text-[#8B949E] tabular-nums">
                      {quote.rsi ? quote.rsi.toFixed(1) : '52.0'}
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectStock(quote.symbol)}
                          className="p-1 rounded hover:bg-[#161D26] text-[#8B949E] hover:text-[#00C2FF] transition-colors"
                          title="Open Chart & Trade"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeFromWatchlist(quote.symbol)}
                          className="p-1 rounded hover:bg-[#EF4444]/15 text-[#8B949E] hover:text-[#EF4444] transition-colors"
                          title="Remove from Watchlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
