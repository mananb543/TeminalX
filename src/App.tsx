import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from '../client/components/layout/Sidebar.tsx';
import { TopMarketBar } from '../client/components/layout/TopMarketBar.tsx';
import { CommandSearchModal } from '../client/components/common/CommandSearchModal.tsx';
import { DashboardPage } from '../client/app/DashboardPage.tsx';
import { MarketsView } from '../client/components/markets/MarketsView.tsx';
import { StockDetailPage } from '../client/app/StockDetailPage.tsx';
import { WatchlistPage } from '../client/app/WatchlistPage.tsx';
import { PortfolioPage } from '../client/app/PortfolioPage.tsx';
import { OrdersPage } from '../client/app/OrdersPage.tsx';
import { AnalyticsPage } from '../client/app/AnalyticsPage.tsx';
import { IntelligencePage } from '../client/app/IntelligencePage.tsx';
import { NewsPage } from '../client/app/NewsPage.tsx';
import { SettingsPage } from '../client/app/SettingsPage.tsx';
import { LoginPage } from '../client/app/LoginPage.tsx';
import { useTradingStore } from '../client/stores/tradingStore.ts';
import { useAuthStore } from '../client/stores/authStore.ts';
import { CheckCircle2, AlertCircle, Info, X, Zap } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const { selectedSymbol, setSelectedSymbol, notification, clearNotification, setBalance } =
    useTradingStore();
  const { user, isAuthenticated, isCheckingAuth, checkAuth } = useAuthStore();

  // On mount, verify existing session token via /api/auth/me
  useEffect(() => {
    checkAuth().then((isAuthed) => {
      if (isAuthed) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          setBalance(currentUser.balance);
        }
      } else {
        // If unauthenticated, redirect to login
        setActiveTab('login');
      }
    });
  }, []);

  // Listen for global '/' keyboard shortcut to trigger search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !searchModalOpen) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setSearchModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen]);

  // Navigate directly to stock detail
  const handleSelectStock = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('stock');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading state while checking persistent session
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#07090C] text-[#F5F7FA] flex flex-col items-center justify-center font-mono selection:bg-[#00C2FF]/20 select-none">
        <div className="w-12 h-12 rounded-lg bg-[#11161D] border border-[#1B222C] flex items-center justify-center text-[#00C2FF] mb-4">
          <Zap className="w-6 h-6 animate-pulse fill-[#00C2FF]/20 text-[#00C2FF]" />
        </div>
        <div className="text-base font-bold tracking-wider text-[#F5F7FA]">
          TERMINAL<span className="text-[#00C2FF]">X</span>
        </div>
        <div className="text-xs text-[#8B949E] mt-1.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00C2FF] animate-ping" />
          <span>Verifying session & MongoDB Atlas connection...</span>
        </div>
      </div>
    );
  }

  // Render current active page with auth protection
  const renderCurrentPage = () => {
    // If user is unauthenticated and attempting to access private workspace pages, route to Login
    if (
      !isAuthenticated &&
      activeTab !== 'login' &&
      activeTab !== 'markets' &&
      activeTab !== 'news' &&
      activeTab !== 'stock'
    ) {
      return (
        <LoginPage
          onSuccess={() => {
            const currentUser = useAuthStore.getState().user;
            if (currentUser) setBalance(currentUser.balance);
            setActiveTab('dashboard');
          }}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onSelectStock={handleSelectStock} />;
      case 'markets':
        return <MarketsView onSelectStock={handleSelectStock} />;
      case 'stock':
        return <StockDetailPage symbol={selectedSymbol} />;
      case 'watchlist':
        return (
          <WatchlistPage
            onSelectStock={handleSelectStock}
            onOpenSearch={() => setSearchModalOpen(true)}
          />
        );
      case 'portfolio':
        return <PortfolioPage onSelectStock={handleSelectStock} />;
      case 'orders':
        return <OrdersPage onSelectStock={handleSelectStock} />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'intelligence':
        return <IntelligencePage />;
      case 'news':
        return <NewsPage onSelectStock={handleSelectStock} />;
      case 'settings':
        return <SettingsPage />;
      case 'login':
        return (
          <LoginPage
            onSuccess={() => {
              const currentUser = useAuthStore.getState().user;
              if (currentUser) setBalance(currentUser.balance);
              setActiveTab('dashboard');
            }}
          />
        );
      default:
        return <DashboardPage onSelectStock={handleSelectStock} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#07090C] text-[#F5F7FA] flex flex-col md:flex-row antialiased selection:bg-[#00C2FF]/20 selection:text-[#00C2FF]">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        mobileOpen={mobileSidebarOpen}
        onToggleMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* 2. Main Terminal Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Live Market Bar */}
        <TopMarketBar
          onOpenSearch={() => setSearchModalOpen(true)}
          onSelectStock={handleSelectStock}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-3 sm:p-5 max-w-7xl w-full mx-auto">
          {renderCurrentPage()}
        </main>
      </div>

      {/* 3. Global Command Search Modal */}
      <CommandSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectStock={handleSelectStock}
      />

      {/* 4. Global Paper Trade Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-2xl text-xs font-mono max-w-md ${
              notification.type === 'success'
                ? 'bg-[#0D1117] border-[#22C55E]/40 text-[#22C55E]'
                : notification.type === 'error'
                ? 'bg-[#0D1117] border-[#EF4444]/40 text-[#EF4444]'
                : 'bg-[#0D1117] border-[#00C2FF]/40 text-[#00C2FF]'
            }`}
          >
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {notification.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
            <span className="flex-1 text-[#F5F7FA] font-medium leading-tight">
              {notification.message}
            </span>
            <button
              onClick={clearNotification}
              className="p-1 rounded text-[#8B949E] hover:text-[#F5F7FA] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
