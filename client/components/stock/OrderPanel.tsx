import React, { useState } from 'react';
import { MarketQuote } from '../../types/market.ts';
import { OrderSide, OrderType } from '../../types/trading.ts';
import { useTradingStore } from '../../stores/tradingStore.ts';
import { formatINR, formatUSD } from '../../lib/formatters.ts';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';

interface OrderPanelProps {
  quote: MarketQuote;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({ quote }) => {
  const { balance, holdings, placeOrder } = useTradingStore();

  const [orderSide, setOrderSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<number>(10);
  const [limitPrice, setLimitPrice] = useState<number>(quote.price);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);

  // Check if user already holds shares of this stock
  const currentHolding = holdings.find((h) => h.symbol === quote.symbol);
  const holdingQty = currentHolding ? currentHolding.quantity : 0;

  // Pricing math
  const effectivePrice = orderType === 'LIMIT' ? limitPrice : quote.price;
  const estimatedTotal = +(effectivePrice * quantity).toFixed(2);
  const canAfford = orderSide === 'BUY' ? balance >= estimatedTotal : holdingQty >= quantity;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await placeOrder({
        symbol: quote.symbol,
        type: orderSide,
        orderType,
        quantity: Math.floor(quantity),
        limitPrice: orderType === 'LIMIT' ? limitPrice : undefined,
      });

      setFeedback({
        message: result.message,
        success: result.success,
      });
    } catch (err: any) {
      setFeedback({
        message: err.message || 'Failed to place order',
        success: false,
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Quick quantity allocation buttons
  const setQuickAllocation = (percent: number) => {
    if (orderSide === 'BUY') {
      const maxAffordable = Math.floor(balance / effectivePrice);
      const targetQty = Math.max(1, Math.floor(maxAffordable * (percent / 100)));
      setQuantity(targetQty);
    } else {
      const targetQty = Math.max(1, Math.floor(holdingQty * (percent / 100)));
      setQuantity(targetQty);
    }
  };

  return (
    <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg p-4 flex flex-col justify-between">
      <div>
        {/* Header / Mode */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1B222C] text-xs">
          <div className="font-mono font-semibold text-[#F5F7FA]">ORDER TICKET</div>
          <div className="text-[11px] text-[#00C2FF] font-mono">SIMULATION</div>
        </div>

        {/* Buy / Sell Tabs */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            type="button"
            onClick={() => {
              setOrderSide('BUY');
              setFeedback(null);
            }}
            className={`py-2 rounded text-xs font-mono font-bold transition-all ${
              orderSide === 'BUY'
                ? 'bg-[#22C55E] text-[#07090C] shadow-sm'
                : 'bg-[#11161D] text-[#8B949E] hover:text-[#F5F7FA] border border-[#1B222C]'
            }`}
          >
            BUY {quote.symbol}
          </button>
          <button
            type="button"
            onClick={() => {
              setOrderSide('SELL');
              setFeedback(null);
            }}
            className={`py-2 rounded text-xs font-mono font-bold transition-all ${
              orderSide === 'SELL'
                ? 'bg-[#EF4444] text-white shadow-sm'
                : 'bg-[#11161D] text-[#8B949E] hover:text-[#F5F7FA] border border-[#1B222C]'
            }`}
          >
            SELL {quote.symbol}
          </button>
        </div>

        {/* Order Type: Market / Limit */}
        <div className="mt-4">
          <div className="text-[11px] font-mono text-[#8B949E] uppercase mb-1.5">Order Type</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderType('MARKET')}
              className={`py-1.5 px-3 rounded text-xs font-mono transition-colors text-center ${
                orderType === 'MARKET'
                  ? 'bg-[#161D26] text-[#00C2FF] border border-[#00C2FF]/30 font-semibold'
                  : 'bg-[#11161D] text-[#8B949E] hover:text-[#F5F7FA] border border-[#1B222C]'
              }`}
            >
              MARKET
            </button>
            <button
              type="button"
              onClick={() => setOrderType('LIMIT')}
              className={`py-1.5 px-3 rounded text-xs font-mono transition-colors text-center ${
                orderType === 'LIMIT'
                  ? 'bg-[#161D26] text-[#00C2FF] border border-[#00C2FF]/30 font-semibold'
                  : 'bg-[#11161D] text-[#8B949E] hover:text-[#F5F7FA] border border-[#1B222C]'
              }`}
            >
              LIMIT
            </button>
          </div>
        </div>

        {/* Quantity Field */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#8B949E] mb-1.5">
            <span>Quantity (Shares)</span>
            {orderSide === 'SELL' && (
              <span>Held: {holdingQty}</span>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-[#11161D] border border-[#1B222C] focus:border-[#00C2FF] rounded px-3 py-2 text-sm font-mono text-[#F5F7FA] tabular-nums focus:outline-none"
            />
            <div className="absolute right-2 top-1.5 flex gap-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-6 h-6 rounded bg-[#1B222C] text-[#8B949E] hover:text-[#F5F7FA] flex items-center justify-center font-mono text-xs"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-6 h-6 rounded bg-[#1B222C] text-[#8B949E] hover:text-[#F5F7FA] flex items-center justify-center font-mono text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick % buttons */}
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setQuickAllocation(pct)}
                className="py-1 bg-[#11161D] hover:bg-[#161D26] border border-[#1B222C] rounded text-[10px] font-mono text-[#8B949E] hover:text-[#F5F7FA] transition-colors"
              >
                {pct === 100 ? 'MAX' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Limit Price Field if LIMIT selected */}
        {orderType === 'LIMIT' && (
          <div className="mt-4">
            <div className="text-[11px] font-mono text-[#8B949E] uppercase mb-1.5">Limit Price (₹)</div>
            <input
              type="number"
              step="0.05"
              value={limitPrice}
              onChange={(e) => setLimitPrice(parseFloat(e.target.value) || quote.price)}
              className="w-full bg-[#11161D] border border-[#1B222C] focus:border-[#00C2FF] rounded px-3 py-2 text-sm font-mono text-[#F5F7FA] tabular-nums focus:outline-none"
            />
          </div>
        )}

        {/* Estimated Value & Summary */}
        <div className="mt-5 p-3 rounded bg-[#11161D] border border-[#1B222C] space-y-2 text-xs">
          <div className="flex items-center justify-between text-[#8B949E]">
            <span>Execution Price:</span>
            <span className="font-mono text-[#F5F7FA] tabular-nums">
              {formatINR(effectivePrice)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#8B949E]">
            <span>Brokerage & Taxes:</span>
            <span className="font-mono text-[#22C55E] tabular-nums">₹0.00 (Zero)</span>
          </div>
          <div className="pt-2 border-t border-[#1B222C] flex items-center justify-between font-medium">
            <span className="text-[#F5F7FA]">Estimated Total:</span>
            <span className="font-mono text-base font-bold text-[#F5F7FA] tabular-nums">
              {formatINR(estimatedTotal)}
            </span>
          </div>
        </div>

        {/* Available Cash indicator */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-[#8B949E]">
          <span className="flex items-center gap-1">
            <Wallet className="w-3 h-3 text-[#00C2FF]" />
            Virtual Cash:
          </span>
          <span className="font-mono text-[#F5F7FA] tabular-nums font-semibold">
            {formatINR(balance, false)}
          </span>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-3 p-2.5 rounded text-xs flex items-start gap-2 ${
              feedback.success
                ? 'bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]'
                : 'bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]'
            }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-tight">{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Place Order CTA Button */}
      <div className="mt-5">
        <button
          type="button"
          disabled={isSubmitting || !canAfford}
          onClick={handlePlaceOrder}
          className={`w-full py-3 rounded text-sm font-mono font-bold tracking-wide transition-all shadow-md ${
            !canAfford
              ? 'bg-[#1B222C] text-[#505A66] cursor-not-allowed'
              : orderSide === 'BUY'
              ? 'bg-[#22C55E] hover:bg-[#16A34A] text-[#07090C] hover:shadow-lg'
              : 'bg-[#EF4444] hover:bg-[#DC2626] text-white hover:shadow-lg'
          }`}
        >
          {isSubmitting
            ? 'EXECUTING...'
            : !canAfford
            ? orderSide === 'BUY'
              ? 'INSUFFICIENT FUNDS'
              : 'INSUFFICIENT SHARES'
            : `PLACE PAPER ${orderSide} ORDER`}
        </button>
      </div>
    </div>
  );
};
