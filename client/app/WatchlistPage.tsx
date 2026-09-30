import React, { useState } from 'react';
import { useTradingStore } from '../stores/tradingStore.ts';
import { clientMarketService } from '../lib/marketService.ts';
import { formatINR, formatUSD, formatPercent, formatLargeNumber } from '../lib/formatters.ts';
import { Star, Plus, Trash2, TrendingUp, TrendingDown, Search } from 'lucide-react';

interface WatchlistPageProps {
  onSelectStock: (symbol: string) => void;
  onOpenSearch: () => void;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({ onSelectStock, onOpenSearch }) => {
  const { watchlist, removeFromWatchlist } = useTradingStore();
  const [filter, setFilter] = useState('');

  const quotes = watchlist
    .map((sym) => clientMarketService.getQuote(sym))
    .filter(Boolean)
    .filter(
      (q) =>
        q.symbol.toLowerCase().includes(filter.toLowerCase()) ||
        q.name.toLowerCase().includes(filter.toLowerCase())
    );

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7FA] font-mono tracking-tight">
            Custom Watchlists
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Real-time multi-asset price monitor and quick execution queue
          </p>
        </div>
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#00C2FF] hover:bg-[#00A8DE] text-[#07090C] text-xs font-mono font-bold transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Symbol to Watchlist</span>
        </button>
      </div>

      {/* Filter / Search inside watchlist */}
      <div className="p-3 bg-[#0D1117] border border-[#1B222C] rounded-lg flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-2.5" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter current watchlist..."
            className="w-full bg-[#11161D] border border-[#1B222C] focus:border-[#00C2FF] rounded pl-9 pr-3 py-1.5 text-xs font-mono text-[#F5F7FA] placeholder-[#505A66] focus:outline-none"
          />
        </div>
        <div className="text-xs font-mono text-[#8B949E]">
          Tracking <span className="text-[#00C2FF] font-bold">{quotes.length}</span> Securities
        </div>
      </div>

      {/* Watchlist Detailed Table */}
      <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1B222C] bg-[#11161D] text-[11px] text-[#8B949E]">
                <th className="py-3 px-3">SECURITY</th>
                <th className="py-3 px-3 text-right">LTP</th>
                <th className="py-3 px-3 text-right">24H CHANGE</th>
                <th className="py-3 px-3 text-right hidden sm:table-cell">DAY HIGH / LOW</th>
                <th className="py-3 px-3 text-right hidden md:table-cell">VOLUME</th>
                <th className="py-3 px-3 text-right hidden lg:table-cell">RSI (14)</th>
                <th className="py-3 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161D26]/60">
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#8B949E]">
                    No securities in your watchlist. Click "Add Symbol to Watchlist" to start tracking.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => {
                  const isPositive = q.change >= 0;
                  return (
                    <tr
                      key={q.symbol}
                      onClick={() => onSelectStock(q.symbol)}
                      className="hover:bg-[#11161D] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <Star className="w-3.5 h-3.5 text-[#00C2FF] fill-[#00C2FF]" />
                          <div>
                            <div className="font-bold text-[#F5F7FA] group-hover:text-[#00C2FF] transition-colors">
                              {q.symbol}
                            </div>
                            <div className="text-[11px] text-[#8B949E] truncate max-w-xs">{q.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-[#F5F7FA] tabular-nums">
                        {q.currency === 'USD' ? formatUSD(q.price) : formatINR(q.price)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold tabular-nums ${
                          isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
                        }`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          <span>{formatPercent(q.changePercent)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-[11px] text-[#8B949E] tabular-nums hidden sm:table-cell">
                        {formatINR(q.high, false)} / {formatINR(q.low, false)}
                      </td>
                      <td className="py-3 px-3 text-right text-[11px] text-[#8B949E] tabular-nums hidden md:table-cell">
                        {formatLargeNumber(q.volume)}
                      </td>
                      <td className="py-3 px-3 text-right text-[11px] tabular-nums hidden lg:table-cell">
                        {(q.rsi || 50).toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSelectStock(q.symbol)}
                            className="px-2.5 py-1 rounded bg-[#161D26] hover:bg-[#00C2FF] text-[#00C2FF] hover:text-[#07090C] transition-colors text-[10px] font-bold"
                          >
                            TRADE
                          </button>
                          <button
                            onClick={() => removeFromWatchlist(q.symbol)}
                            className="p-1 text-[#505A66] hover:text-[#EF4444] rounded transition-colors"
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
    </div>
  );
};
