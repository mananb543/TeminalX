import React, { useState, useEffect, useMemo } from 'react';
import { clientMarketService } from '../../lib/marketService.ts';
import { MarketQuote } from '../../types/market.ts';
import { formatINR, formatUSD, formatPercent, formatLargeNumber } from '../../lib/formatters.ts';
import { Search, TrendingUp, TrendingDown, ArrowUpRight, RefreshCw, AlertCircle } from 'lucide-react';

interface MarketsViewProps {
  onSelectStock: (symbol: string) => void;
}

export const MarketsView: React.FC<MarketsViewProps> = ({ onSelectStock }) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'symbol' | 'price' | 'changePercent' | 'volume'>('changePercent');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [quotes, setQuotes] = useState<MarketQuote[]>(() => clientMarketService.getAllQuotes());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const categories = [
    { id: 'ALL', label: 'All Markets' },
    { id: 'INDIAN_EQUITY', label: 'Indian Equities' },
    { id: 'INDIAN_INDEX', label: 'Indian Indices' },
    { id: 'GLOBAL_INDEX', label: 'Global Markets' },
    { id: 'CURRENCY', label: 'Currencies' },
    { id: 'COMMODITY', label: 'Commodities' },
  ];

  const loadQuotes = async () => {
    setIsLoading(true);
    setErrorNotice(null);
    try {
      const data = await clientMarketService.fetchQuotes();
      if (data && data.length > 0) {
        setQuotes(data);
      }
    } catch (err: any) {
      setErrorNotice(err.message || 'Market data temporarily unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
    const unsubscribe = clientMarketService.subscribe(() => {
      setQuotes(clientMarketService.getAllQuotes());
    });
    return unsubscribe;
  }, []);

  const filteredQuotes = useMemo(() => {
    return quotes
      .filter((q) => {
        const matchesCategory = activeCategory === 'ALL' || q.category === activeCategory;
        const matchesSearch =
          q.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (q.sector && q.sector.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        let valA = a[sortField] || 0;
        let valB = b[sortField] || 0;
        if (typeof valA === 'string') {
          return sortAsc
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
  }, [quotes, activeCategory, searchQuery, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Notice Banner if provider reports error */}
      {errorNotice && (
        <div className="p-3 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs font-mono text-[#EF4444] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Notice: {errorNotice}</span>
          </div>
          <button
            onClick={loadQuotes}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-xs cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Top Controls: Category Tabs & Search Input */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0D1117] border border-[#1B222C] rounded-lg p-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors shrink-0 cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[#00C2FF] text-[#0A0D12] font-bold'
                  : 'bg-[#11161D] text-[#8B949E] hover:text-[#F5F7FA] hover:bg-[#161D26] border border-[#1B222C]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#11161D] border border-[#1B222C] rounded pl-9 pr-3 py-1.5 text-xs text-[#F5F7FA] placeholder-[#505A66] focus:outline-none focus:border-[#00C2FF]/60 font-mono"
            />
          </div>
          <button
            onClick={loadQuotes}
            disabled={isLoading}
            className="p-1.5 rounded bg-[#11161D] border border-[#1B222C] text-[#8B949E] hover:text-[#00C2FF] transition-colors cursor-pointer"
            title="Refresh Quotes"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#00C2FF]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Markets Table */}
      <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1B222C] bg-[#11161D] text-[11px] text-[#8B949E]">
                <th
                  onClick={() => handleSort('symbol')}
                  className="py-3 px-4 font-medium cursor-pointer hover:text-[#F5F7FA]"
                >
                  SYMBOL / NAME
                </th>
                <th
                  onClick={() => handleSort('price')}
                  className="py-3 px-4 text-right font-medium cursor-pointer hover:text-[#F5F7FA]"
                >
                  PRICE
                </th>
                <th
                  onClick={() => handleSort('changePercent')}
                  className="py-3 px-4 text-right font-medium cursor-pointer hover:text-[#F5F7FA]"
                >
                  24H CHANGE
                </th>
                <th className="py-3 px-4 text-right font-medium hidden md:table-cell">24H HIGH / LOW</th>
                <th
                  onClick={() => handleSort('volume')}
                  className="py-3 px-4 text-right font-medium hidden sm:table-cell cursor-pointer hover:text-[#F5F7FA]"
                >
                  VOLUME
                </th>
                <th className="py-3 px-4 text-right font-medium hidden lg:table-cell">52W HIGH / LOW</th>
                <th className="py-3 px-4 text-right font-medium">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161D26]/60">
              {isLoading && filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8B949E]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#00C2FF]" />
                      <span>Loading real-time market quotes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8B949E]">
                    No securities match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => {
                  const isPositive = (quote.change || 0) >= 0;
                  return (
                    <tr
                      key={quote.symbol}
                      onClick={() => onSelectStock(quote.symbol)}
                      className="hover:bg-[#11161D] transition-colors group cursor-pointer"
                    >
                      {/* Symbol & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-bold text-[#F5F7FA] group-hover:text-[#00C2FF] transition-colors">
                              {quote.symbol}
                            </div>
                            <div className="text-[10px] text-[#8B949E] truncate max-w-[160px] sm:max-w-xs">
                              {quote.name}
                            </div>
                          </div>
                          <span className="text-[9px] px-1 py-0.5 rounded bg-[#161D26] text-[#8B949E] border border-[#1B222C]">
                            {quote.exchange}
                          </span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold text-[#F5F7FA] tabular-nums">
                          {quote.currency === 'USD' ? formatUSD(quote.price) : formatINR(quote.price, quote.price < 500)}
                        </div>
                        <div className="text-[10px] text-[#8B949E] tabular-nums">
                          Prev: {quote.previousClose ? (quote.currency === 'USD' ? formatUSD(quote.previousClose) : formatINR(quote.previousClose, quote.previousClose < 500)) : 'N/A'}
                        </div>
                      </td>

                      {/* Change */}
                      <td className="py-3 px-4 text-right">
                        <div
                          className={`font-semibold tabular-nums flex items-center justify-end gap-1 ${
                            isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
                          }`}
                        >
                          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          <span>
                            {isPositive ? '+' : ''}
                            {quote.change !== null ? quote.change.toFixed(2) : '0.00'}
                          </span>
                        </div>
                        <div
                          className={`text-[10px] tabular-nums ${
                            isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {formatPercent(quote.changePercent || 0)}
                        </div>
                      </td>

                      {/* 24H High / Low */}
                      <td className="py-3 px-4 text-right hidden md:table-cell text-[#8B949E] tabular-nums">
                        <div>H: {quote.high !== null ? (quote.currency === 'USD' ? formatUSD(quote.high) : formatINR(quote.high, quote.high < 500)) : 'N/A'}</div>
                        <div>L: {quote.low !== null ? (quote.currency === 'USD' ? formatUSD(quote.low) : formatINR(quote.low, quote.low < 500)) : 'N/A'}</div>
                      </td>

                      {/* Volume */}
                      <td className="py-3 px-4 text-right hidden sm:table-cell text-[#F5F7FA] tabular-nums">
                        {quote.volume ? formatLargeNumber(quote.volume) : 'N/A'}
                      </td>

                      {/* 52W Range */}
                      <td className="py-3 px-4 text-right hidden lg:table-cell text-[#8B949E] tabular-nums">
                        {quote.fiftyTwoWeekHigh !== null && quote.fiftyTwoWeekLow !== null
                          ? `${formatINR(quote.fiftyTwoWeekLow, false)} - ${formatINR(quote.fiftyTwoWeekHigh, false)}`
                          : 'N/A'}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStock(quote.symbol);
                          }}
                          className="px-2.5 py-1 rounded bg-[#161D26] group-hover:bg-[#00C2FF] text-[#8B949E] group-hover:text-[#0A0D12] text-[11px] font-semibold transition-all flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <span>Trade</span>
                          <ArrowUpRight className="w-3 h-3" />
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
    </div>
  );
};
