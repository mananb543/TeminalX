import React, { useState, useEffect, useRef } from 'react';
import { Search, RotateCcw, Wallet, Bell, AlertTriangle, AlertCircle, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { useTradingStore } from '../../stores/tradingStore.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import { clientMarketService } from '../../lib/marketService.ts';
import { alertClient, AlertNotificationItem } from '../../lib/alertClient.ts';
import { formatINR, formatUSD, formatPercent } from '../../lib/formatters.ts';

interface TopMarketBarProps {
  onOpenSearch: () => void;
  onSelectStock: (symbol: string) => void;
  onNavigateAlerts?: () => void;
}

export const TopMarketBar: React.FC<TopMarketBarProps> = ({
  onOpenSearch,
  onSelectStock,
  onNavigateAlerts,
}) => {
  const { balance, resetPortfolio } = useTradingStore();
  const { dbStatus, isAuthenticated } = useAuthStore();
  const tickerSymbols = ['NIFTY 50', 'SENSEX', 'USD/INR', 'S&P 500', 'NASDAQ'];
  const [tickers, setTickers] = useState(() =>
    tickerSymbols.map((s) => clientMarketService.getQuote(s))
  );

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AlertNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [notifOpen]);

  // Load unread count and latest notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchNotifs = () => {
      alertClient
        .getNotifications({ limit: 5 })
        .then((data) => {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        })
        .catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 25000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

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

        {/* Notification Bell Dropdown */}
        {isAuthenticated && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-1.5 bg-[#11161D] hover:bg-[#161D26] border border-[#1B222C] rounded text-[#8B949E] hover:text-[#F5F7FA] transition-colors cursor-pointer"
              title="Alert Notifications"
            >
              <Bell className="w-3.5 h-3.5 text-[#00C2FF]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[#00C2FF] text-[#07090C] text-[9px] font-bold font-mono flex items-center justify-center tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Flyout Notification Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-[#0D1117] border border-[#1B222C] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-3 border-b border-[#1B222C] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F5F7FA]">Incident Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-mono text-[#00C2FF]">({unreadCount} unread)</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      alertClient.markAllAsRead().then(() => {
                        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                        setUnreadCount(0);
                      });
                    }}
                    className="text-[10px] font-mono text-[#8B949E] hover:text-[#00C2FF]"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#1B222C]/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#8B949E] font-mono">
                      No recent alert incidents
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 text-xs transition-colors hover:bg-[#11161D] ${
                          !n.read ? 'bg-[#11161D]/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 shrink-0">
                            {n.severity === 'CRITICAL' ? (
                              <AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" />
                            ) : n.severity === 'WARNING' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#00C2FF]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[#F5F7FA] text-[11px] leading-tight truncate">
                              {n.title}
                            </div>
                            <div className="text-[11px] text-[#8B949E] line-clamp-2 mt-0.5">
                              {n.message}
                            </div>
                            <div className="text-[9px] font-mono text-[#505A66] mt-1">
                              {new Date(n.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-[#1B222C] bg-[#090C10] text-center">
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      onNavigateAlerts?.();
                    }}
                    className="w-full py-1 text-xs font-mono text-[#00C2FF] hover:underline flex items-center justify-center gap-1"
                  >
                    <span>Open Alert Manager & History</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
