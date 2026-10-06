import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Star,
  PieChart,
  ClipboardList,
  BarChart3,
  Brain,
  Newspaper,
  Bell,
  Settings,
  User,
  Zap,
  LogOut,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.ts';
import { useTradingStore } from '../../stores/tradingStore.ts';
import { formatINR } from '../../lib/formatters.ts';
import { alertClient } from '../../lib/alertClient.ts';

export type ActiveTab =
  | 'dashboard'
  | 'markets'
  | 'stock'
  | 'watchlist'
  | 'portfolio'
  | 'orders'
  | 'analytics'
  | 'intelligence'
  | 'news'
  | 'alerts'
  | 'settings'
  | 'login';

interface SidebarProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  mobileOpen,
  onToggleMobile,
}) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { balance } = useTradingStore();
  const [unreadAlerts, setUnreadAlerts] = React.useState(0);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    alertClient.getUnreadCount().then(setUnreadAlerts).catch(() => {});
    const interval = setInterval(() => {
      alertClient.getUnreadCount().then(setUnreadAlerts).catch(() => {});
    }, 25000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'watchlist', label: 'Watchlist', icon: Star },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'intelligence', label: 'Intelligence', icon: Brain },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ];

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out of TerminalX?')) {
      await logout();
      onNavigate('login');
      if (mobileOpen) onToggleMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={onToggleMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-60 bg-[#0D1117] border-r border-[#1B222C] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding Section */}
        <div>
          <div className="h-14 px-4 flex items-center justify-between border-b border-[#1B222C]">
            <div
              onClick={() => {
                onNavigate(isAuthenticated ? 'dashboard' : 'login');
                if (mobileOpen) onToggleMobile();
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded bg-[#11161D] border border-[#1B222C] flex items-center justify-center text-[#00C2FF] group-hover:border-[#00C2FF]/50 transition-colors">
                <Zap className="w-4 h-4 fill-[#00C2FF]/20 text-[#00C2FF]" />
              </div>
              <div>
                <div className="font-mono font-bold tracking-wider text-base text-[#F5F7FA]">
                  TERMINAL<span className="text-[#00C2FF]">X</span>
                </div>
                <div className="text-[10px] text-[#8B949E] tracking-tight">
                  Markets · Data · Intelligence
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onToggleMobile}
              className="p-1.5 md:hidden text-[#8B949E] hover:text-[#F5F7FA] rounded hover:bg-[#1B222C]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#505A66]">
              Workspace
            </div>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id as ActiveTab);
                    if (mobileOpen) onToggleMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-[#11161D] text-[#00C2FF] border border-[#1B222C] shadow-sm font-semibold'
                      : 'text-[#8B949E] hover:text-[#F5F7FA] hover:bg-[#11161D]/50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#00C2FF]' : 'text-[#8B949E]'
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.id === 'alerts' && unreadAlerts > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#00C2FF]/15 text-[#00C2FF] font-semibold tabular-nums">
                      {unreadAlerts}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile / Settings Section */}
        <div className="p-3 border-t border-[#1B222C] space-y-1 bg-[#090C10]">
          <button
            onClick={() => {
              onNavigate('settings');
              if (mobileOpen) onToggleMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
              activeTab === 'settings'
                ? 'bg-[#11161D] text-[#00C2FF] border border-[#1B222C]'
                : 'text-[#8B949E] hover:text-[#F5F7FA] hover:bg-[#11161D]/50'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </button>

          {isAuthenticated && user ? (
            <div className="flex items-center justify-between p-2 rounded bg-[#11161D] border border-[#1B222C]">
              <div
                onClick={() => {
                  onNavigate('settings');
                  if (mobileOpen) onToggleMobile();
                }}
                className="flex items-center gap-2.5 truncate cursor-pointer flex-1 mr-1"
              >
                <div className="w-7 h-7 rounded bg-[#161D26] flex items-center justify-center font-mono text-xs font-bold text-[#00C2FF] shrink-0">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-[#F5F7FA] font-medium text-xs truncate leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-[#00C2FF] font-mono tabular-nums leading-tight mt-0.5">
                    {formatINR(balance, false)}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-[#8B949E] hover:text-[#EF4444] rounded hover:bg-[#161D26] transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onNavigate('login');
                if (mobileOpen) onToggleMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                activeTab === 'login'
                  ? 'bg-[#11161D] text-[#00C2FF] border border-[#1B222C]'
                  : 'text-[#8B949E] hover:text-[#F5F7FA] hover:bg-[#11161D]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 shrink-0" />
                <span>Sign In / Register</span>
              </div>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
