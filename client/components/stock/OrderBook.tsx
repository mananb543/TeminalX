import React, { useMemo } from 'react';
import { clientMarketService } from '../../lib/marketService.ts';
import { formatINR } from '../../lib/formatters.ts';

interface OrderBookProps {
  symbol: string;
}

export const OrderBook: React.FC<OrderBookProps> = ({ symbol }) => {
  const orderBook = useMemo(() => clientMarketService.getOrderBook(symbol), [symbol]);

  const maxBidQty = Math.max(...orderBook.bids.map((b) => b.quantity), 1);
  const maxAskQty = Math.max(...orderBook.asks.map((a) => a.quantity), 1);

  return (
    <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg p-3 text-xs font-mono">
      <div className="flex items-center justify-between pb-2 border-b border-[#1B222C]">
        <span className="font-semibold text-[#F5F7FA]">ORDER BOOK (L2 DEPTH)</span>
        <span className="text-[11px] text-[#8B949E]">
          Spread: <span className="text-[#00C2FF]">₹{orderBook.spread.toFixed(2)}</span>
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-2 gap-4 py-1.5 text-[10px] text-[#8B949E] border-b border-[#161D26]">
        <div className="grid grid-cols-3">
          <span>ORDERS</span>
          <span className="text-right">QTY</span>
          <span className="text-right text-[#22C55E]">BID</span>
        </div>
        <div className="grid grid-cols-3">
          <span className="text-left text-[#EF4444]">ASK</span>
          <span className="text-right">QTY</span>
          <span className="text-right">ORDERS</span>
        </div>
      </div>

      {/* Depth Rows */}
      <div className="divide-y divide-[#161D26]/40">
        {orderBook.bids.map((bid, i) => {
          const ask = orderBook.asks[i];
          const bidWidth = Math.min(100, Math.round((bid.quantity / maxBidQty) * 100));
          const askWidth = ask ? Math.min(100, Math.round((ask.quantity / maxAskQty) * 100)) : 0;

          return (
            <div key={i} className="grid grid-cols-2 gap-4 py-1 relative">
              {/* Bid Column */}
              <div className="relative grid grid-cols-3 items-center z-10">
                <span className="text-[10px] text-[#8B949E]">{bid.orders}</span>
                <span className="text-right text-[#F5F7FA] tabular-nums">{bid.quantity}</span>
                <span className="text-right font-medium text-[#22C55E] tabular-nums">
                  {bid.price.toFixed(2)}
                </span>
                {/* Visual Depth Bar (Green from right) */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-[#22C55E]/10 pointer-events-none -z-10"
                  style={{ width: `${bidWidth}%` }}
                />
              </div>

              {/* Ask Column */}
              <div className="relative grid grid-cols-3 items-center z-10">
                <span className="text-left font-medium text-[#EF4444] tabular-nums">
                  {ask ? ask.price.toFixed(2) : '-'}
                </span>
                <span className="text-right text-[#F5F7FA] tabular-nums">
                  {ask ? ask.quantity : '-'}
                </span>
                <span className="text-right text-[10px] text-[#8B949E]">{ask ? ask.orders : '-'}</span>
                {/* Visual Depth Bar (Red from left) */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-[#EF4444]/10 pointer-events-none -z-10"
                  style={{ width: `${askWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Depth Totals */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1B222C] text-[11px]">
        <div className="flex justify-between text-[#8B949E]">
          <span>Total Bids:</span>
          <span className="font-semibold text-[#22C55E] tabular-nums">
            {orderBook.totalBidQty.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between text-[#8B949E]">
          <span>Total Asks:</span>
          <span className="font-semibold text-[#EF4444] tabular-nums">
            {orderBook.totalAskQty.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
};
