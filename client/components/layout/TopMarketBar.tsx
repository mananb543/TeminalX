import React from 'react';
import { Search, RotateCcw, Wallet, Globe, ShieldCheck } from 'lucide-react';
import { useTradingStore } from '../../stores/tradingStore.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import { clientMarketService } from '../../lib/marketService.ts';
import { formatINR, formatUSD, formatPercent } from '../../lib/formatters.ts';

interface TopMarketBarProps {
  onOpenSearch: () => void;
  onSelectStock: (symbol: string) => void;
}

export const TopMarketBar: React.FC<TopMarketBarProps> = ({ onOpenSearch, onSelectStock }) => {
  const { balance, resetPortfolio } = useTradingStore();
  const { dbStatus } = useAuthStore();
  const tickerSymbols = ['NIFTY 50', 'SENSEX', 'USD/INR', 'S&P 500', 'NASDAQ'];
  const [tickers, setTickers] = React.useState(() =>
    tickerSymbols.map((s) => clientMarketService.getQuote(s))
  );

  React.useEffect(() => {
    clientMarketService.fetchQuotes(tickerSymbols).then((data) => {
      if (data && data.length > 0) setTickers(data);
    }).catch(() => {});

    const unsubscribe = clientMarketService.subscribe(() => {
      setTickers(tickerSymbols.map((s) => clientMarketService.getQuote(s)));
    });
    return unsubscribe;
  }, []);

  return (
    <header className="h-12 w-full bg-[#0D1117] border-b border-[#1B222C] flex items-center justify-between px-3 md:px-4 text-xs select-none sticky top-0 z-30">
      {/* Left ticker marquee/row */}
      <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar py-1">
        {tickers.map((ticker) => {
          if (!ticker) return null;
          const isPositive = ticker.change >= 0;
          return (
            <button
              key={ticker.symbol}
              onClick={() => onSelectStock(ticker.symbol)}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#161D26] transition-colors cursor-pointer shrink-0 text-left"
            >
              <span className="font-mono font-medium text-[#F5F7FA] text-[11px] sm:text-xs">
                {ticker.symbol}
              </span>
              <span className="font-mono text-[#F5F7FA] tabular-nums text-[11px] sm:text-xs">
                {ticker.currency === 'USD' ? formatUSD(ticker.price) : formatINR(ticker.price, ticker.price < 500)}
              </span>
              <span
                className={`font-mono text-[10px] sm:text-[11px] tabular-nums ${
                  isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}
              >
                {formatPercent(ticker.changePercent)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#11161D] hover:bg-[#161D26] border border-[#1B222C] rounded text-[#8B949E] hover:text-[#F5F7FA] transition-colors"
          title="Search markets (Press /)"
        >
          <Search className="w-3.5 h-3.5 text-[#00C2FF]" />
          <span className="hidden sm:inline text-[11px]">Search Ticker</span>
          <kbd className="hidden md:inline px-1 py-0.2 text-[9px] font-mono bg-[#1B222C] rounded text-[#8B949E]">
            /
          </kbd>
        </button>

        {/* Database Status Badge */}
        {dbStatus?.status === 'CONNECTED' ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#22C55E]/10 border border-[#22C55E]/30 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[#22C55E] font-semibold">CONNECTED / MONGODB</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#11161D] border border-[#1B222C] text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
            <span className="text-[#8B949E] font-semibold">DISCONNECTED / IN-MEMORY</span>
          </div>
        )}

        {/* Available Virtual Cash */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#1B222C]">
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <Wallet className="w-3.5 h-3.5 text-[#8B949E]" />
            <span className="text-[#8B949E] hidden lg:inline">Cash:</span>
            <span className="font-semibold text-[#F5F7FA] tabular-nums">
              {formatINR(balance, false)}
            </span>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Reset virtual portfolio balance back to ₹10,00,000 INR?')) {
                resetPortfolio();
              }
            }}
            title="Reset Virtual Balance"
            className="p-1 rounded text-[#8B949E] hover:text-[#00C2FF] hover:bg-[#161D26] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
