import React, { useState, useEffect } from 'react';
import { useTradingStore } from '../stores/tradingStore.ts';
import { clientMarketService } from '../lib/marketService.ts';
import { StockHeader } from '../components/stock/StockHeader.tsx';
import { TechnicalIndicatorsBar } from '../components/stock/TechnicalIndicatorsBar.tsx';
import { TradingChart } from '../components/stock/TradingChart.tsx';
import { OrderPanel } from '../components/stock/OrderPanel.tsx';
import { OrderBook } from '../components/stock/OrderBook.tsx';
import { formatINR, formatUSD, formatLargeNumber } from '../lib/formatters.ts';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { MarketQuote, CandleData } from '../types/market.ts';

interface StockDetailPageProps {
  symbol: string;
}

export const StockDetailPage: React.FC<StockDetailPageProps> = ({ symbol }) => {
  const { timeframe, setTimeframe, indicators, toggleIndicator } = useTradingStore();

  const [quote, setQuote] = useState<MarketQuote>(() => clientMarketService.getQuote(symbol));
  const [candles, setCandles] = useState<CandleData[]>(() =>
    clientMarketService.getHistoricalCandles(symbol, timeframe)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch live quote and candles from API
  const loadStockData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [fetchedQuote, fetchedCandles] = await Promise.all([
        clientMarketService.fetchQuote(symbol).catch((err) => {
          setErrorMessage(err.message || 'Market data temporarily unavailable');
          return clientMarketService.getQuote(symbol);
        }),
        clientMarketService.fetchHistoricalCandles(symbol, timeframe).catch(() => {
          return clientMarketService.getHistoricalCandles(symbol, timeframe);
        }),
      ]);

      if (fetchedQuote) setQuote(fetchedQuote);
      if (fetchedCandles && fetchedCandles.length > 0) setCandles(fetchedCandles);
    } catch (err: any) {
      setErrorMessage(err.message || 'Market data temporarily unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
    // Auto refresh quote every 20 seconds
    const interval = setInterval(() => {
      clientMarketService.fetchQuote(symbol).then((q) => q && setQuote(q)).catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  return (
    <div className="space-y-4">
      {/* Provider Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs font-mono text-[#EF4444] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Notice: {errorMessage}</span>
          </div>
          <button
            onClick={loadStockData}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-xs cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 1. Header with Live Quotes and 24H stats */}
      <StockHeader quote={quote} />

      {/* 2. Main Terminal Layout: Left Chart + Right Order Execution Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Indicators Bar + Chart + Order Book */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Timeframe & Technical Studies bar */}
          <TechnicalIndicatorsBar
            timeframe={timeframe}
            onSelectTimeframe={setTimeframe}
            indicators={indicators}
            onToggleIndicator={toggleIndicator}
          />

          {/* Interactive Lightweight Financial Candlestick Chart */}
          <div className="h-[460px] w-full relative">
            {isLoading && candles.length === 0 ? (
              <div className="absolute inset-0 bg-[#0D1117] flex items-center justify-center rounded-lg border border-[#1B222C]">
                <div className="flex items-center gap-2 text-xs font-mono text-[#8B949E]">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#00C2FF]" />
                  <span>Loading market candles for {symbol}...</span>
                </div>
              </div>
            ) : (
              <TradingChart candles={candles} indicators={indicators} symbol={quote.symbol} />
            )}
          </div>

          {/* Order Book Level 2 Depth */}
          <OrderBook symbol={quote.symbol} />
        </div>

        {/* Right Column: Order Execution Panel + Fundamental Overview */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Paper Trading Execution Panel */}
          <OrderPanel quote={quote} />

          {/* Financial Profile & Key Metrics */}
          <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg p-4 text-xs font-mono">
            <div className="text-[#8B949E] uppercase tracking-wider font-semibold pb-2 border-b border-[#1B222C]">
              Technical & Fundamental Metrics
            </div>

            <div className="divide-y divide-[#161D26] mt-1">
              <div className="py-2 flex items-center justify-between">
                <span className="text-[#8B949E]">52-Week Range</span>
                <span className="text-[#F5F7FA] tabular-nums">
                  {quote.fiftyTwoWeekLow !== null && quote.fiftyTwoWeekHigh !== null
                    ? `${formatINR(quote.fiftyTwoWeekLow, false)} - ${formatINR(quote.fiftyTwoWeekHigh, false)}`
                    : 'N/A'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-[#8B949E]">VWAP</span>
                <span className="text-[#F5F7FA] tabular-nums">
                  {quote.vwap ? formatINR(quote.vwap) : 'Dynamic'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-[#8B949E]">P/E Ratio</span>
                <span className="text-[#F5F7FA] tabular-nums">{quote.peRatio || 'N/A'}</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-[#8B949E]">Market Cap</span>
                <span className="text-[#F5F7FA] tabular-nums">
                  {quote.marketCap ? `₹${formatLargeNumber(quote.marketCap * 1e7)}` : 'Large Cap'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-[#8B949E]">RSI (14)</span>
                <span
                  className={`font-bold tabular-nums ${
                    (quote.rsi || 50) > 70
                      ? 'text-[#EF4444]'
                      : (quote.rsi || 50) < 30
                      ? 'text-[#22C55E]'
                      : 'text-[#00C2FF]'
                  }`}
                >
                  {(quote.rsi || 52.4).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
