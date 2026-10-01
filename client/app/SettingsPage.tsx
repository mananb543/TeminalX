import React, { useState, useEffect } from 'react';
import { useTradingStore } from '../stores/tradingStore.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { formatINR } from '../lib/formatters.ts';
import { RotateCcw, Database, User, LogOut, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck, Radio, Activity } from 'lucide-react';

interface DatabaseStatusInfo {
  isConnected: boolean;
  mode: 'mongodb-atlas' | 'resilient-in-memory';
  dbName: string;
  lastAuthError?: string;
  connectedAt?: string;
}

export const SettingsPage: React.FC = () => {
  const { balance, resetPortfolio } = useTradingStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [defaultOrderType, setDefaultOrderType] = useState('MARKET');
  const [defaultLots, setDefaultLots] = useState(10);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

  // Database status
  const [dbStatus, setDbStatus] = useState<DatabaseStatusInfo | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectResult, setReconnectResult] = useState<string | null>(null);

  // Market Data Provider status
  const [providerInfo, setProviderInfo] = useState<{ provider: 'demo' | 'real'; name: string } | null>(null);
  const [isSwitchingProvider, setIsSwitchingProvider] = useState(false);
  const [providerSwitchNotice, setProviderSwitchNotice] = useState<string | null>(null);

  const fetchProviderStatus = async () => {
    try {
      const res = await fetch('/api/markets/provider');
      if (res.ok) {
        const data = await res.json();
        setProviderInfo(data);
      }
    } catch {
      // ignore
    }
  };

  const handleSwitchProvider = async (mode: 'demo' | 'real') => {
    setIsSwitchingProvider(true);
    setProviderSwitchNotice(null);
    try {
      const res = await fetch('/api/markets/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: mode }),
      });
      const data = await res.json();
      if (data.success) {
        setProviderInfo({ provider: data.provider, name: data.name });
        setProviderSwitchNotice(`Market data provider changed to ${data.provider.toUpperCase()} (${data.name}).`);
        setTimeout(() => setProviderSwitchNotice(null), 4000);
      }
    } catch (err: any) {
      setProviderSwitchNotice(`Failed to switch provider: ${err.message}`);
    } finally {
      setIsSwitchingProvider(false);
    }
  };

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchDbStatus();
    fetchProviderStatus();
  }, []);

  const handleReconnectDb = async () => {
    setIsReconnecting(true);
    setReconnectResult(null);
    try {
      const res = await fetch('/api/database/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setDbStatus(data);
      if (data.isConnected) {
        setReconnectResult('Successfully connected to MongoDB Atlas!');
      } else {
        setReconnectResult(
          data.message || 'Atlas authentication requires valid credentials in .env. Resilient mode active.'
        );
      }
    } catch (err: any) {
      setReconnectResult(`Reconnect attempt failed: ${err.message}`);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all virtual positions and restore starting balance of ₹10,00,000?')) {
      resetPortfolio();
      try {
        await fetch('/api/trading/reset', {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        // fallback
      }
      setConfirmationNotice('Portfolio reset successfully. Starting cash ₹10,00,000 restored.');
      setTimeout(() => setConfirmationNotice(null), 4000);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Sign out of your TerminalX account?')) {
      await logout();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-[#F5F7FA] font-mono tracking-tight">
          Terminal Preferences & Parameters
        </h1>
        <p className="text-xs text-[#8B949E] mt-0.5">
          Configure paper trading parameters, MongoDB authentication context, and virtual capital allocations
        </p>
      </div>

      {confirmationNotice && (
        <div className="p-3 rounded bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs font-mono text-[#22C55E] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{confirmationNotice}</span>
        </div>
      )}

      {/* Authenticated Account Context */}
      {isAuthenticated && user && (
        <div className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#00C2FF]" />
              <span className="text-sm font-bold font-mono text-[#F5F7FA]">
                Authenticated User Account
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161D26] hover:bg-[#EF4444] text-[#8B949E] hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#11161D] border border-[#1B222C]">
              <span className="text-[#8B949E] block text-[10px] uppercase">User Name</span>
              <span className="text-[#F5F7FA] font-bold mt-0.5 block">{user.name}</span>
            </div>
            <div className="p-2.5 rounded bg-[#11161D] border border-[#1B222C]">
              <span className="text-[#8B949E] block text-[10px] uppercase">Email</span>
              <span className="text-[#F5F7FA] font-bold mt-0.5 block truncate">{user.email}</span>
            </div>
            <div className="p-2.5 rounded bg-[#11161D] border border-[#1B222C]">
              <span className="text-[#8B949E] block text-[10px] uppercase">Account ID</span>
              <span className="text-[#00C2FF] font-semibold mt-0.5 block truncate text-[11px]">{user.id}</span>
            </div>
          </div>
        </div>
      )}

      {/* Database & MongoDB Atlas Integration Status */}
      <div className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg text-xs font-mono">
        <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#00C2FF]" />
            <span className="text-sm font-bold text-[#F5F7FA]">
              MongoDB Architecture & Persistence Status
            </span>
          </div>

          <button
            onClick={handleReconnectDb}
            disabled={isReconnecting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161D26] hover:bg-[#1B222C] text-[#00C2FF] border border-[#1B222C] text-xs font-mono transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>{isReconnecting ? 'Checking Connection...' : 'Check / Reconnect MongoDB'}</span>
          </button>
        </div>

        {reconnectResult && (
          <div className="mt-3 p-2.5 rounded bg-[#11161D] border border-[#1B222C] text-xs text-[#8B949E]">
            {reconnectResult}
          </div>
        )}

        <div className="mt-3 space-y-2 text-[#8B949E]">
          <div className="flex items-center justify-between">
            <span>Persistence Status:</span>
            {dbStatus?.isConnected ? (
              <span className="text-[#22C55E] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                CONNECTED / MONGODB
              </span>
            ) : (
              <span className="text-[#EAB308] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
                DISCONNECTED / IN-MEMORY
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span>Cluster Host:</span>
            <span className="text-[#F5F7FA]">cluster0.pq34zzq.mongodb.net</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Database Name:</span>
            <span className="text-[#F5F7FA]">{dbStatus?.dbName || 'terminalx'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Mongoose Models:</span>
            <span className="text-[#F5F7FA]">User · Holding · Order · Transaction · Watchlist</span>
          </div>

          {!dbStatus?.isConnected && (
            <div className="mt-3 p-3 rounded bg-[#11161D] border border-[#1B222C] text-[11px] leading-relaxed">
              <div className="flex items-center gap-1.5 text-[#EAB308] font-semibold mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Notice: Atlas Credentials Verification Required</span>
              </div>
              <p className="text-[#8B949E]">
                MongoDB Atlas reported an authentication check for the configured user. The terminal is running in 
                <strong className="text-[#F5F7FA]"> Resilient Storage Mode</strong>, so you can freely register, log in, execute simulated trades, and analyze portfolios without disruption. To bind to your live Atlas cluster, verify the database user password in MongoDB Atlas and update <code className="text-[#00C2FF]">MONGODB_URI</code> in <code className="text-[#00C2FF]">.env</code>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Market Data Provider Architecture & Mode */}
      <div className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg text-xs font-mono">
        <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#00C2FF]" />
            <span className="text-sm font-bold text-[#F5F7FA]">
              Market Data Provider Architecture
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#8B949E] text-[11px]">Active Mode:</span>
            <div className="flex items-center rounded bg-[#11161D] border border-[#1B222C] p-0.5">
              <button
                onClick={() => handleSwitchProvider('demo')}
                disabled={isSwitchingProvider}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  providerInfo?.provider === 'demo'
                    ? 'bg-[#00C2FF] text-[#07090C] font-bold'
                    : 'text-[#8B949E] hover:text-[#F5F7FA]'
                }`}
              >
                DEMO
              </button>
              <button
                onClick={() => handleSwitchProvider('real')}
                disabled={isSwitchingProvider}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  providerInfo?.provider === 'real'
                    ? 'bg-[#00C2FF] text-[#07090C] font-bold'
                    : 'text-[#8B949E] hover:text-[#F5F7FA]'
                }`}
              >
                REAL (Twelve Data)
              </button>
            </div>
          </div>
        </div>

        {providerSwitchNotice && (
          <div className="mt-3 p-2.5 rounded bg-[#11161D] border border-[#1B222C] text-xs text-[#00C2FF] flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{providerSwitchNotice}</span>
          </div>
        )}

        <div className="mt-3 space-y-2 text-[#8B949E]">
          <div className="flex items-center justify-between">
            <span>Provider Engine:</span>
            <span className="text-[#F5F7FA] font-semibold">{providerInfo?.name || 'Institutional Demo Market Engine'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Configured Endpoint:</span>
            <span className="text-[#00C2FF]">https://api.twelvedata.com</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Indian Equity Symbols:</span>
            <span className="text-[#F5F7FA]">RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, SBIN, ITC, LT, BHARTIARTL, AXISBANK</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Caching Strategy:</span>
            <span className="text-[#F5F7FA]">15s Quote TTL · 5m OHLCV TTL · Request Deduplication Active</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Paper Trading Sync:</span>
            <span className="text-[#22C55E] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              Mark-to-Market Real-Time Execution Connected
            </span>
          </div>
        </div>
      </div>

      {/* Virtual Balance Management */}
      <div className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg">
        <div className="flex items-center justify-between pb-3 border-b border-[#1B222C]">
          <div>
            <div className="text-sm font-bold font-mono text-[#F5F7FA]">Virtual Capital Allocation</div>
            <div className="text-xs text-[#8B949E]">
              Current available virtual cash: <span className="text-[#00C2FF] font-mono font-semibold">{formatINR(balance)}</span>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#EF4444]/15 hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[#EF4444]/30 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to ₹10,00,000</span>
          </button>
        </div>
        <p className="text-xs text-[#8B949E] mt-3 leading-relaxed">
          TerminalX operates exclusively as a simulated educational environment. No real funds are at risk. Resetting will close all active stock positions and restore your starting capital to ₹10,00,000 INR.
        </p>
      </div>

      {/* Order Presets */}
      <div className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg">
        <div className="text-sm font-bold font-mono text-[#F5F7FA] pb-3 border-b border-[#1B222C]">
          Order Execution Presets
        </div>

        <div className="divide-y divide-[#161D26] text-xs font-mono">
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="text-[#F5F7FA]">Default Order Type</div>
              <div className="text-[11px] text-[#8B949E]">Default selection when opening stock order ticket</div>
            </div>
            <select
              value={defaultOrderType}
              onChange={(e) => setDefaultOrderType(e.target.value)}
              className="bg-[#11161D] border border-[#1B222C] text-[#F5F7FA] rounded px-3 py-1 text-xs focus:outline-none"
            >
              <option value="MARKET">MARKET</option>
              <option value="LIMIT">LIMIT</option>
            </select>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="text-[#F5F7FA]">Default Share Quantity Increment</div>
              <div className="text-[11px] text-[#8B949E]">Baseline order size populated on trade ticket</div>
            </div>
            <input
              type="number"
              min="1"
              value={defaultLots}
              onChange={(e) => setDefaultLots(parseInt(e.target.value) || 10)}
              className="w-20 bg-[#11161D] border border-[#1B222C] text-[#F5F7FA] text-right rounded px-3 py-1 text-xs focus:outline-none"
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="text-[#F5F7FA]">Execution Confirmation Notification</div>
              <div className="text-[11px] text-[#8B949E]">Visual toast upon simulated fill</div>
            </div>
            <input
              type="checkbox"
              checked={soundAlerts}
              onChange={(e) => setSoundAlerts(e.target.checked)}
              className="w-4 h-4 accent-[#00C2FF] rounded"
            />
          </div>
        </div>
      </div>

      {/* Security & Token Architecture */}
      <div className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg text-xs font-mono">
        <div className="text-sm font-bold text-[#F5F7FA] pb-3 border-b border-[#1B222C] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          <span>Security & Authentication Specifications</span>
        </div>

        <div className="mt-3 space-y-2 text-[#8B949E]">
          <div className="flex justify-between">
            <span>Password Cryptography:</span>
            <span className="text-[#F5F7FA]">bcrypt (10 salt rounds, one-way hash, never plaintext)</span>
          </div>
          <div className="flex justify-between">
            <span>Session Authorization:</span>
            <span className="text-[#F5F7FA]">Signed JWT (7-day validity) + Bearer / HTTP-Only Cookies</span>
          </div>
          <div className="flex justify-between">
            <span>Virtual Cash Guarantee:</span>
            <span className="text-[#00C2FF]">₹10,00,000 starting paper balance (strictly virtual)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
