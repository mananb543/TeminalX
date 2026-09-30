import React, { useState } from 'react';
import { useTradingStore } from '../stores/tradingStore.ts';
import { formatINR, formatDate } from '../lib/formatters.ts';
import { CheckCircle2, Filter, Download } from 'lucide-react';

interface OrdersPageProps {
  onSelectStock: (symbol: string) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ onSelectStock }) => {
  const { orders } = useTradingStore();
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const filteredOrders = orders.filter((o) => (filterType === 'ALL' ? true : o.type === filterType));

  const exportCSV = () => {
    const headers = 'Order ID,Symbol,Side,Type,Quantity,Price,Total Value,Status,Timestamp\n';
    const rows = orders
      .map(
        (o) =>
          `${o.id},${o.symbol},${o.type},${o.orderType},${o.quantity},${o.price},${o.totalValue},${o.status},${o.timestamp}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminalx_orders_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7FA] font-mono tracking-tight">
            Order Book & Trade History
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Full audit log of simulated executions, market/limit fills, and paper transaction receipts
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#11161D] hover:bg-[#161D26] border border-[#1B222C] text-xs font-mono text-[#8B949E] hover:text-[#F5F7FA] transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#00C2FF]" />
          <span>Export Order Ledger (CSV)</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-2 bg-[#0D1117] border border-[#1B222C] rounded-lg text-xs font-mono">
        <span className="text-[#8B949E] px-2 flex items-center gap-1">
          <Filter className="w-3 h-3 text-[#00C2FF]" /> Filter:
        </span>
        {(['ALL', 'BUY', 'SELL'] as const).map((side) => (
          <button
            key={side}
            onClick={() => setFilterType(side)}
            className={`px-3 py-1 rounded transition-colors ${
              filterType === side
                ? 'bg-[#161D26] text-[#00C2FF] font-semibold border border-[#1B222C]'
                : 'text-[#8B949E] hover:text-[#F5F7FA]'
            }`}
          >
            {side === 'ALL' ? 'All Orders' : `${side} Only`}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1B222C] bg-[#11161D] text-[11px] text-[#8B949E]">
                <th className="py-3 px-3">ORDER ID</th>
                <th className="py-3 px-3">SECURITY</th>
                <th className="py-3 px-3">SIDE</th>
                <th className="py-3 px-3">ORDER TYPE</th>
                <th className="py-3 px-3 text-right">QUANTITY</th>
                <th className="py-3 px-3 text-right">FILL PRICE</th>
                <th className="py-3 px-3 text-right">TOTAL VALUE</th>
                <th className="py-3 px-3 text-right">STATUS</th>
                <th className="py-3 px-3 text-right">EXECUTION TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161D26]/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-[#8B949E]">
                    No orders matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isBuy = ord.type === 'BUY';
                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-[#11161D] transition-colors cursor-pointer group"
                      onClick={() => onSelectStock(ord.symbol)}
                    >
                      <td className="py-3 px-3 text-[#8B949E] text-[11px]">{ord.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#F5F7FA] group-hover:text-[#00C2FF] transition-colors">
                          {ord.symbol}
                        </div>
                        <div className="text-[10px] text-[#8B949E] truncate max-w-[120px]">
                          {ord.companyName}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isBuy ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                          }`}
                        >
                          {ord.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#8B949E]">{ord.orderType}</td>
                      <td className="py-3 px-3 text-right font-medium text-[#F5F7FA] tabular-nums">
                        {ord.quantity}
                      </td>
                      <td className="py-3 px-3 text-right text-[#F5F7FA] tabular-nums">
                        {formatINR(ord.price)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#F5F7FA] tabular-nums">
                        {formatINR(ord.totalValue)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#22C55E]">
                          <CheckCircle2 className="w-3 h-3" />
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-[11px] text-[#8B949E] tabular-nums">
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
    </div>
  );
};
