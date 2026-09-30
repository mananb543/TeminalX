import React, { useState, useEffect } from 'react';
import { Search, X, ArrowUpRight, TrendingUp } from 'lucide-react';
import { clientMarketService } from '../../lib/marketService.ts';
import { MarketQuote } from '../../types/market.ts';
import { formatINR, formatUSD, formatPercent } from '../../lib/formatters.ts';

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock: (symbol: string) => void;
}

export const CommandSearchModal: React.FC<CommandSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStock,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MarketQuote[]>([]);

  useEffect(() => {
    if (isOpen) {
      setResults(clientMarketService.getAllQuotes());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(clientMarketService.getAllQuotes());
      return;
    }

    const timer = setTimeout(() => {
      clientMarketService.fetchSearch(query).then((items) => {
        if (items && items.length > 0) {
          const quotes: MarketQuote[] = items.map((it: any) => {
            if (it.price) return it;
            const existing = clientMarketService.getQuote(it.symbol);
            return {
              ...existing,
              symbol: it.symbol,
              name: it.name || existing.name,
              exchange: it.exchange || existing.exchange,
            };
          });
          setResults(quotes);
        } else {
          setResults(clientMarketService.searchQuotes(query));
        }
      }).catch(() => {
        setResults(clientMarketService.searchQuotes(query));
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcut ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#0D1117] border border-[#1B222C] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#1B222C] bg-[#11161D]">
          <Search className="w-5 h-5 text-[#8B949E] mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol, company name, or index (e.g. RELIANCE, TCS, NIFTY 50)..."
            className="w-full bg-transparent text-sm text-[#F5F7FA] placeholder-[#505A66] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-[#8B949E] hover:text-[#F5F7FA] rounded hover:bg-[#1B222C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Results List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-[#1B222C]">
          {results.length === 0 ? (
            <div className="py-12 text-center text-[#8B949E] text-sm">
              No matching ticker or security found for "{query}"
            </div>
          ) : (
            results.map((quote) => {
              const isPositive = quote.change >= 0;
              return (
                <div
                  key={quote.symbol}
                  onClick={() => {
                    onSelectStock(quote.symbol);
                    onClose();
                  }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#161D26] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#1B222C] flex items-center justify-center font-mono text-xs font-semibold text-[#00C2FF]">
                      {quote.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-[#F5F7FA] group-hover:text-[#00C2FF] transition-colors">
                          {quote.symbol}
                        </span>
                        <span className="text-[11px] text-[#8B949E] uppercase tracking-wider font-mono">
                          {quote.exchange}
                        </span>
                      </div>
                      <div className="text-xs text-[#8B949E] truncate max-w-xs">{quote.name}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-sm font-medium text-[#F5F7FA] tabular-nums">
                      {quote.currency === 'USD' ? formatUSD(quote.price) : formatINR(quote.price)}
                    </div>
                    <div
                      className={`font-mono text-xs tabular-nums flex items-center justify-end gap-1 ${
                        isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
                      }`}
                    >
                      <TrendingUp className={`w-3 h-3 ${!isPositive && 'rotate-180'}`} />
                      {formatPercent(quote.changePercent)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#07090C] border-t border-[#1B222C] flex items-center justify-between text-[11px] text-[#8B949E]">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-[#11161D] border border-[#1B222C] font-mono">ESC</span>
            <span>to close</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[#00C2FF]">
            <span>PAPER TRADING DEMO FEED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
