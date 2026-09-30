import React from 'react';
import { useTradingStore } from '../../stores/tradingStore.ts';
import { formatINR, formatDate } from '../../lib/formatters.ts';
import { CheckCircle2, Clock } from 'lucide-react';

interface RecentOrdersTableProps {
  onSelectStock: (symbol: string) => void;
  limit?: number;
}

export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({ onSelectStock, limit = 5 }) => {
  const { orders } = useTradingStore();
  const displayedOrders = limit ? orders.slice(0, limit) : orders;

  return (
    <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
            Recent Simulated Orders
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#11161D] border border-[#1B222C] text-[#8B949E]">
            {orders.length} Total
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono mt-2">
          <thead>
            <tr className="border-b border-[#161D26] text-[11px] text-[#8B949E]">
              <th className="py-2 px-2 font-medium">ORDER ID</th>
              <th className="py-2 px-2 font-medium">SYMBOL</th>
              <th className="py-2 px-2 font-medium">SIDE</th>
              <th className="py-2 px-2 font-medium">TYPE</th>
              <th className="py-2 px-2 text-right font-medium">QTY</th>
              <th className="py-2 px-2 text-right font-medium">PRICE</th>
              <th className="py-2 px-2 text-right font-medium">TOTAL VALUE</th>
              <th className="py-2 px-2 text-right font-medium">STATUS</th>
              <th className="py-2 px-2 text-right font-medium hidden md:table-cell">TIME</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#161D26]/60">
            {displayedOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[#8B949E]">
                  No paper orders placed yet. Select a stock to place your first trade.
                </td>
              </tr>
            ) : (
              displayedOrders.map((ord) => {
                const isBuy = ord.type === 'BUY';
                return (
                  <tr key={ord.id} className="hover:bg-[#11161D] transition-colors">
                    <td className="py-2.5 px-2 text-[#8B949E] text-[11px]">{ord.id}</td>
                    <td className="py-2.5 px-2 font-bold text-[#F5F7FA]">
                      <button
                        onClick={() => onSelectStock(ord.symbol)}
                        className="hover:text-[#00C2FF] transition-colors"
                      >
                        {ord.symbol}
                      </button>
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isBuy ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                        }`}
                      >
                        {ord.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-[#8B949E]">{ord.orderType}</td>
                    <td className="py-2.5 px-2 text-right text-[#F5F7FA] tabular-nums">
                      {ord.quantity}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[#F5F7FA] tabular-nums">
                      {formatINR(ord.price)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-[#F5F7FA] tabular-nums">
                      {formatINR(ord.totalValue)}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#22C55E]">
                        <CheckCircle2 className="w-3 h-3" />
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-[11px] text-[#8B949E] tabular-nums hidden md:table-cell">
                      {formatDate(ord.timestamp)}
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
