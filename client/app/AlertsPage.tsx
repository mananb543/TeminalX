/**
 * TerminalX - Alerts & Automation Engine
 * Institutional-grade alert manager, real-time evaluation cockpit, and notification ledger.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Shield,
  TrendingUp,
  Percent,
  PieChart,
  Star,
  Newspaper,
  Calendar,
  X,
  Search,
  Filter,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import {
  alertClient,
  AlertRule,
  AlertNotificationItem,
  AlertType,
  AlertOperator,
  CreateAlertInput,
} from '../lib/alertClient.ts';
import { formatINR, formatUSD, formatPercent } from '../lib/formatters.ts';

interface AlertsPageProps {
  onSelectStock?: (symbol: string) => void;
}

type TabMode = 'rules' | 'notifications';
type TypeFilter = 'ALL' | AlertType;

export const AlertsPage: React.FC<AlertsPageProps> = ({ onSelectStock }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('rules');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [notifications, setNotifications] = useState<AlertNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [evaluationFeedback, setEvaluationFeedback] = useState<string | null>(null);

  // Form state for creating/editing alert
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AlertType>('PRICE');
  const [formSymbol, setFormSymbol] = useState('RELIANCE');
  const [formCondition, setFormCondition] = useState('');
  const [formOperator, setFormOperator] = useState<AlertOperator>('GREATER_THAN');
  const [formThreshold, setFormThreshold] = useState<number | string>(3000);
  const [formCooldown, setFormCooldown] = useState<number>(60);
  const [formKeyword, setFormKeyword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch alerts and notifications
  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedAlerts, notifData] = await Promise.all([
        alertClient.getAlerts(),
        alertClient.getNotifications({ limit: 60 }),
      ]);
      setAlerts(fetchedAlerts);
      setNotifications(notifData.notifications);
      setUnreadCount(notifData.unreadCount);
    } catch (err: any) {
      console.warn('Failed to load alert data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll every 30 seconds for background notifications
    const interval = setInterval(async () => {
      try {
        const notifData = await alertClient.getNotifications({ limit: 40 });
        setNotifications(notifData.notifications);
        setUnreadCount(notifData.unreadCount);
      } catch {
        // silent
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (typeFilter !== 'ALL' && a.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = a.name.toLowerCase().includes(q);
        const matchesSym = a.symbol?.toLowerCase().includes(q);
        const matchesType = a.type.toLowerCase().includes(q);
        if (!matchesName && !matchesSym && !matchesType) return false;
      }
      return true;
    });
  }, [alerts, typeFilter, searchQuery]);

  // Metric counts
  const totalRules = alerts.length;
  const activeRules = alerts.filter((a) => a.enabled).length;
  const triggeredToday = alerts.filter((a) => a.triggered).length;

  // Toggle alert status
  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      const updated = await alertClient.toggleAlert(id, !currentEnabled);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  // Delete alert
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete alert "${name}"?`)) return;
    try {
      await alertClient.deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Evaluate single alert
  const handleEvaluateSingle = async (id: string) => {
    try {
      const result = await alertClient.evaluateSingle(id);
      setEvaluationFeedback(
        result.triggered
          ? `Rule triggered: ${result.title}`
          : `Evaluated: condition not yet satisfied (current: ${result.currentValue ?? 'N/A'})`
      );
      setTimeout(() => setEvaluationFeedback(null), 5000);
      loadData();
    } catch (err: any) {
      setEvaluationFeedback(`Evaluation error: ${err.message}`);
      setTimeout(() => setEvaluationFeedback(null), 5000);
    }
  };

  // Evaluate all alerts now
  const handleEvaluateAll = async () => {
    try {
      setEvaluating(true);
      const res = await alertClient.evaluateAll();
      setEvaluationFeedback(
        `Evaluation cycle complete: ${res.evaluated} evaluated, ${res.triggered} triggered new incidents.`
      );
      setTimeout(() => setEvaluationFeedback(null), 5000);
      loadData();
    } catch (err: any) {
      setEvaluationFeedback(`Evaluation failed: ${err.message}`);
      setTimeout(() => setEvaluationFeedback(null), 5000);
    } finally {
      setEvaluating(false);
    }
  };

  // Notification actions
  const handleMarkAsRead = async (id: string) => {
    try {
      await alertClient.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertClient.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const handleClearNotifications = async () => {
    if (!window.confirm('Clear all notification history?')) return;
    try {
      await alertClient.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  // Apply quick preset into creation form
  const applyPreset = (preset: {
    name: string;
    type: AlertType;
    symbol: string;
    operator: AlertOperator;
    threshold: number;
    condition?: string;
  }) => {
    setFormName(preset.name);
    setFormType(preset.type);
    setFormSymbol(preset.symbol);
    setFormOperator(preset.operator);
    setFormThreshold(preset.threshold);
    setFormCondition(preset.condition || '');
    setFormError(null);
  };

  // Submit create alert
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Alert name is required');
      return;
    }

    if (['PRICE', 'PRICE_CHANGE'].includes(formType) && !formSymbol.trim()) {
      setFormError('Please enter a valid ticker symbol');
      return;
    }

    const numericThreshold = Number(formThreshold);
    if (isNaN(numericThreshold)) {
      setFormError('Threshold must be a valid number');
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateAlertInput = {
        name: formName.trim(),
        type: formType,
        symbol: formSymbol ? formSymbol.toUpperCase().trim() : undefined,
        condition: formCondition || undefined,
        operator: formOperator,
        threshold: numericThreshold,
        cooldownMinutes: Number(formCooldown) || 60,
        metadata: formKeyword ? { keyword: formKeyword.trim() } : {},
      };

      const created = await alertClient.createAlert(payload);
      setAlerts((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      resetForm();
      setEvaluationFeedback(`Alert "${created.name}" created and armed successfully.`);
      setTimeout(() => setEvaluationFeedback(null), 5000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create alert');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormType('PRICE');
    setFormSymbol('RELIANCE');
    setFormCondition('');
    setFormOperator('GREATER_THAN');
    setFormThreshold(3000);
    setFormCooldown(60);
    setFormKeyword('');
    setFormError(null);
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case 'PRICE':
        return <TrendingUp className="w-4 h-4 text-[#00C2FF]" />;
      case 'PRICE_CHANGE':
        return <Percent className="w-4 h-4 text-[#22C55E]" />;
      case 'PORTFOLIO_PNL':
        return <PieChart className="w-4 h-4 text-[#38BDF8]" />;
      case 'PORTFOLIO_DRAWDOWN':
        return <AlertTriangle className="w-4 h-4 text-[#EF4444]" />;
      case 'RISK':
        return <Shield className="w-4 h-4 text-[#F59E0B]" />;
      case 'WATCHLIST':
        return <Star className="w-4 h-4 text-[#EAB308]" />;
      case 'EVENT':
        return <Calendar className="w-4 h-4 text-[#A855F7]" />;
      case 'NEWS':
        return <Newspaper className="w-4 h-4 text-[#06B6D4]" />;
      default:
        return <Bell className="w-4 h-4 text-[#8B949E]" />;
    }
  };

  const formatRuleProse = (rule: AlertRule) => {
    const sym = rule.symbol ? rule.symbol : 'Portfolio';
    const isUSD = rule.symbol && ['S&P 500', 'NASDAQ', 'DOW JONES'].includes(rule.symbol);
    const curr = isUSD ? '$' : '₹';

    switch (rule.type) {
      case 'PRICE':
        return `${sym} price ${rule.operator.toLowerCase().replace(/_/g, ' ')} ${curr}${Number(rule.threshold).toLocaleString('en-IN')}`;
      case 'PRICE_CHANGE':
        return `${sym} daily change ${rule.operator.toLowerCase().replace(/_/g, ' ')} ${rule.threshold}%`;
      case 'PORTFOLIO_PNL':
        return `${rule.condition === 'DAY_PNL' ? "Today's P&L" : 'Total Portfolio P&L'} ${rule.operator.toLowerCase().replace(/_/g, ' ')} ₹${Number(rule.threshold).toLocaleString('en-IN')}`;
      case 'PORTFOLIO_DRAWDOWN':
        return `Portfolio maximum drawdown ${rule.operator.toLowerCase().replace(/_/g, ' ')} ${rule.threshold}%`;
      case 'RISK':
        return `Portfolio risk (${rule.condition || 'Volatility'}) ${rule.operator.toLowerCase().replace(/_/g, ' ')} ${rule.threshold}`;
      case 'WATCHLIST':
        return `Watchlist assets ${rule.operator.toLowerCase().replace(/_/g, ' ')} ${rule.threshold}% movement`;
      case 'EVENT':
        return `Corporate action within ${rule.threshold} days${rule.symbol ? ` for ${rule.symbol}` : ''}`;
      case 'NEWS':
        return `Breaking news dispatch${rule.condition ? ` (${rule.condition})` : ''}${rule.symbol ? ` for ${rule.symbol}` : ''}`;
      default:
        return `${sym} ${rule.operator} ${rule.threshold}`;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1B222C] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">
              Alerts & Automation Engine
            </h1>
            <span className="text-[11px] font-mono text-[#8B949E]">
              Stage 7 Institutional
            </span>
          </div>
          <p className="text-xs text-[#8B949E] mt-1">
            Real-time threshold triggers, volatility guardrails, corporate action monitors, and automated risk dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleEvaluateAll}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#11161D] hover:bg-[#161D26] border border-[#1B222C] rounded text-xs font-mono text-[#F5F7FA] transition-colors cursor-pointer disabled:opacity-50"
            title="Evaluate all active alert rules immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00C2FF] ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Evaluating...' : 'Evaluate Now'}</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00C2FF] hover:bg-[#00B0E8] text-[#07090C] rounded text-xs font-semibold font-mono transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Alert Rule</span>
          </button>
        </div>
      </div>

      {/* Operational Feedback Toast */}
      {evaluationFeedback && (
        <div className="p-3 rounded-lg bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-xs font-mono text-[#00C2FF] flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{evaluationFeedback}</span>
          </div>
          <button
            onClick={() => setEvaluationFeedback(null)}
            className="text-[#8B949E] hover:text-[#F5F7FA]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Key Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[11px] font-mono text-[#8B949E] uppercase">Monitored Rules</div>
          <div className="text-xl font-bold font-mono text-[#F5F7FA] mt-1 tabular-nums">
            {totalRules}
          </div>
          <div className="text-[10px] text-[#505A66] mt-0.5">Custom trigger definitions</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[11px] font-mono text-[#8B949E] uppercase">Active Engine</div>
          <div className="text-xl font-bold font-mono text-[#22C55E] mt-1 tabular-nums">
            {activeRules}
          </div>
          <div className="text-[10px] text-[#505A66] mt-0.5">Evaluating periodically</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[11px] font-mono text-[#8B949E] uppercase">Breached State</div>
          <div className="text-xl font-bold font-mono text-[#F59E0B] mt-1 tabular-nums">
            {triggeredToday}
          </div>
          <div className="text-[10px] text-[#505A66] mt-0.5">Conditions currently met</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1B222C]">
          <div className="text-[11px] font-mono text-[#8B949E] uppercase">Unread Incidents</div>
          <div className="text-xl font-bold font-mono text-[#00C2FF] mt-1 tabular-nums">
            {unreadCount}
          </div>
          <div className="text-[10px] text-[#505A66] mt-0.5">Awaiting user review</div>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-[#1B222C] pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded text-xs font-medium font-mono transition-colors cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-[#11161D] text-[#00C2FF] border border-[#1B222C]'
                : 'text-[#8B949E] hover:text-[#F5F7FA]'
            }`}
          >
            Configured Rules ({totalRules})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-1.5 rounded text-xs font-medium font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'bg-[#11161D] text-[#00C2FF] border border-[#1B222C]'
                : 'text-[#8B949E] hover:text-[#F5F7FA]'
            }`}
          >
            <span>Incident Ledger</span>
            {unreadCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF]" />
            )}
          </button>
        </div>

        {activeTab === 'notifications' && notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-mono text-[#8B949E] hover:text-[#00C2FF] transition-colors"
            >
              Mark all read
            </button>
            <span className="text-[#1B222C]">·</span>
            <button
              onClick={handleClearNotifications}
              className="text-[11px] font-mono text-[#8B949E] hover:text-[#EF4444] transition-colors"
            >
              Clear history
            </button>
          </div>
        )}
      </div>

      {/* RULES VIEW */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter buttons without pill badges */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'ALL', label: 'All Rules' },
                { id: 'PRICE', label: 'Price' },
                { id: 'PRICE_CHANGE', label: 'Movement %' },
                { id: 'PORTFOLIO_PNL', label: 'Portfolio P&L' },
                { id: 'PORTFOLIO_DRAWDOWN', label: 'Drawdown' },
                { id: 'RISK', label: 'Risk' },
                { id: 'WATCHLIST', label: 'Watchlist' },
                { id: 'EVENT', label: 'Events' },
                { id: 'NEWS', label: 'News' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTypeFilter(f.id as TypeFilter)}
                  className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap cursor-pointer ${
                    typeFilter === f.id
                      ? 'bg-[#161D26] text-[#F5F7FA] border border-[#2D3748]'
                      : 'text-[#8B949E] hover:text-[#F5F7FA] hover:bg-[#11161D]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search rule or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#1B222C] rounded pl-8 pr-3 py-1 text-xs text-[#F5F7FA] placeholder-[#505A66] focus:outline-none focus:border-[#00C2FF]/60 font-mono"
              />
            </div>
          </div>

          {/* Rules List / Table */}
          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-[#8B949E]">
              <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-[#00C2FF]" />
              Loading alert rules...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-12 rounded-lg bg-[#0D1117] border border-[#1B222C] text-center space-y-3">
              <div className="w-10 h-10 rounded bg-[#11161D] border border-[#1B222C] flex items-center justify-center mx-auto text-[#8B949E]">
                <Bell className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-[#F5F7FA]">No alert rules configured</div>
              <p className="text-xs text-[#8B949E] max-w-sm mx-auto">
                Arm the engine with price boundaries, volatility limits, corporate earnings announcements, or drawdown safety stops.
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00C2FF] hover:bg-[#00B0E8] text-[#07090C] rounded text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Configure First Rule</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map((rule) => {
                const isTriggered = rule.triggered;
                return (
                  <div
                    key={rule.id}
                    className={`p-3.5 rounded-lg bg-[#0D1117] border transition-all ${
                      isTriggered
                        ? 'border-[#F59E0B]/40 bg-[#16130B]/30'
                        : rule.enabled
                        ? 'border-[#1B222C] hover:border-[#2D3748]'
                        : 'border-[#1B222C]/50 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded bg-[#11161D] border border-[#1B222C] shrink-0 mt-0.5">
                          {getTypeIcon(rule.type)}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-[#F5F7FA] truncate">
                              {rule.name}
                            </span>
                            {rule.symbol && (
                              <button
                                onClick={() => onSelectStock?.(rule.symbol!)}
                                className="text-[11px] font-mono text-[#00C2FF] hover:underline flex items-center gap-0.5"
                                title="View live quote"
                              >
                                <span>{rule.symbol}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                            <span className="text-xs text-[#505A66]">·</span>
                            <span className="text-[11px] font-mono text-[#8B949E]">
                              {rule.type.replace(/_/g, ' ')}
                            </span>
                            {isTriggered && (
                              <span className="text-[10px] font-mono text-[#F59E0B] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-ping" />
                                Triggered
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-mono text-[#C9D1D9]">
                            {formatRuleProse(rule)}
                          </div>

                          {/* Metadata row with clean unboxed text and dot separators */}
                          <div className="flex items-center gap-2 text-[10px] font-mono text-[#505A66] flex-wrap">
                            <span>Cooldown: {rule.cooldownMinutes}m</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Evaluated:{' '}
                              {rule.lastEvaluatedAt
                                ? new Date(rule.lastEvaluatedAt).toLocaleTimeString()
                                : 'Pending'}
                            </span>
                            {rule.metadata?.lastObservedValue !== undefined && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#8B949E]">
                                  Observed: {Number(rule.metadata.lastObservedValue).toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* Evaluate test button */}
                        <button
                          onClick={() => handleEvaluateSingle(rule.id)}
                          className="p-1.5 rounded text-[#8B949E] hover:text-[#00C2FF] hover:bg-[#161D26] transition-colors"
                          title="Evaluate rule immediately"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>

                        {/* Enable/Disable switch */}
                        <button
                          onClick={() => handleToggle(rule.id, rule.enabled)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                            rule.enabled
                              ? 'bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]'
                              : 'bg-[#11161D] border border-[#1B222C] text-[#8B949E]'
                          }`}
                        >
                          {rule.enabled ? 'ACTIVE' : 'PAUSED'}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(rule.id, rule.name)}
                          className="p-1.5 rounded text-[#8B949E] hover:text-[#EF4444] hover:bg-[#161D26] transition-colors"
                          title="Delete alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* NOTIFICATIONS LEDGER VIEW */}
      {activeTab === 'notifications' && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="p-12 rounded-lg bg-[#0D1117] border border-[#1B222C] text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-[#22C55E] mx-auto" />
              <div className="text-sm font-semibold text-[#F5F7FA]">Incident ledger clear</div>
              <p className="text-xs text-[#8B949E] max-w-sm mx-auto">
                No active threshold breaches or risk violations recorded. The automation engine is monitoring conditions in the background.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => {
                const isCritical = notif.severity === 'CRITICAL';
                const isWarning = notif.severity === 'WARNING';
                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      !notif.read
                        ? 'bg-[#11161D] border-[#1B222C]'
                        : 'bg-[#0D1117]/60 border-[#1B222C]/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Severity icon indicator */}
                        <div className="mt-0.5 shrink-0">
                          {isCritical ? (
                            <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                          ) : isWarning ? (
                            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-[#00C2FF]" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-[#F5F7FA]">
                              {notif.title}
                            </span>
                            {notif.symbol && (
                              <button
                                onClick={() => onSelectStock?.(notif.symbol!)}
                                className="text-[11px] font-mono text-[#00C2FF] hover:underline"
                              >
                                {notif.symbol}
                              </button>
                            )}
                            <span className="text-xs text-[#505A66]">·</span>
                            <span
                              className={`text-[10px] font-mono uppercase ${
                                isCritical
                                  ? 'text-[#EF4444]'
                                  : isWarning
                                  ? 'text-[#F59E0B]'
                                  : 'text-[#00C2FF]'
                              }`}
                            >
                              {notif.severity}
                            </span>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF]" />
                            )}
                          </div>

                          <p className="text-xs text-[#8B949E] leading-relaxed">
                            {notif.message}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] font-mono text-[#505A66]">
                            <span>
                              {new Date(notif.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                            {notif.triggeredValue !== null && notif.triggeredValue !== undefined && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#8B949E]">
                                  Recorded Value: {String(notif.triggeredValue)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="p-1 rounded text-[#8B949E] hover:text-[#22C55E] hover:bg-[#161D26] transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            await alertClient.deleteNotification(notif.id);
                            setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
                          }}
                          className="p-1 rounded text-[#8B949E] hover:text-[#EF4444] hover:bg-[#161D26] transition-colors"
                          title="Delete incident log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE ALERT MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1B222C] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F5F7FA]">Configure Alert Rule</h3>
                <p className="text-[11px] text-[#8B949E] mt-0.5">
                  Institutional trigger configuration with deduplication & cooldown protection.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-[#8B949E] hover:text-[#F5F7FA] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets Strip */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono text-[#8B949E] uppercase">
                Quick Setup Presets
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {[
                  {
                    name: 'RELIANCE Breakout > ₹3,100',
                    type: 'PRICE' as AlertType,
                    symbol: 'RELIANCE',
                    operator: 'CROSSES_ABOVE' as AlertOperator,
                    threshold: 3100,
                  },
                  {
                    name: 'TCS Drop < ₹3,800',
                    type: 'PRICE' as AlertType,
                    symbol: 'TCS',
                    operator: 'CROSSES_BELOW' as AlertOperator,
                    threshold: 3800,
                  },
                  {
                    name: 'HDFCBANK Surge > 3%',
                    type: 'PRICE_CHANGE' as AlertType,
                    symbol: 'HDFCBANK',
                    operator: 'GREATER_THAN' as AlertOperator,
                    threshold: 3.0,
                  },
                  {
                    name: 'Portfolio Stop-Loss -₹25,000',
                    type: 'PORTFOLIO_PNL' as AlertType,
                    symbol: '',
                    operator: 'LESS_THAN' as AlertOperator,
                    threshold: -25000,
                  },
                  {
                    name: 'Drawdown Warning > 8%',
                    type: 'PORTFOLIO_DRAWDOWN' as AlertType,
                    symbol: '',
                    operator: 'GREATER_THAN' as AlertOperator,
                    threshold: 8,
                  },
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2 py-1 text-[11px] font-mono bg-[#11161D] hover:bg-[#161D26] border border-[#1B222C] rounded text-[#8B949E] hover:text-[#00C2FF] transition-colors whitespace-nowrap cursor-pointer shrink-0"
                  >
                    + {p.name.split(' ')[0]} {p.name.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono">
                  {formError}
                </div>
              )}

              {/* Rule Name */}
              <div>
                <label className="block font-mono text-[11px] text-[#8B949E] mb-1">
                  Alert Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RELIANCE crosses above ₹3,000"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#11161D] border border-[#1B222C] rounded px-3 py-2 text-[#F5F7FA] focus:outline-none focus:border-[#00C2FF]"
                />
              </div>

              {/* Type and Symbol Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] text-[#8B949E] mb-1">
                    Alert Category *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as AlertType)}
                    className="w-full bg-[#11161D] border border-[#1B222C] rounded px-3 py-2 text-[#F5F7FA] focus:outline-none focus:border-[#00C2FF]"
                  >
                    <option value="PRICE">Price Target (Quote)</option>
                    <option value="PRICE_CHANGE">Price Movement (% Change)</option>
                    <option value="PORTFOLIO_PNL">Portfolio P&L (₹ Target/Loss)</option>
                    <option value="PORTFOLIO_DRAWDOWN">Portfolio Drawdown (%)</option>
                    <option value="RISK">Risk Threshold (Volatility/VaR)</option>
                    <option value="WATCHLIST">Watchlist Movement</option>
                    <option value="EVENT">Corporate Event / Action</option>
                    <option value="NEWS">Financial News & Sentiment</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-[#8B949E] mb-1">
                    Target Symbol {['PRICE', 'PRICE_CHANGE'].includes(formType) ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RELIANCE, TCS, NIFTY 50"
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                    className="w-full bg-[#11161D] border border-[#1B222C] rounded px-3 py-2 text-[#F5F7FA] uppercase font-mono focus:outline-none focus:border-[#00C2FF]"
                  />
                </div>
              </div>

              {/* Condition / Operator / Threshold Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] text-[#8B949E] mb-1">
                    Evaluation Operator *
                  </label>
                  <select
                    value={formOperator}
                    onChange={(e) => setFormOperator(e.target.value as AlertOperator)}
                    className="w-full bg-[#11161D] border border-[#1B222C] rounded px-3 py-2 text-[#F5F7FA] focus:outline-none focus:border-[#00C2FF]"
                  >
                    <option value="GREATER_THAN">Greater Than (&gt;)</option>
                    <option value="LESS_THAN">Less Than (&lt;)</option>
                    <option value="GREATER_THAN_OR_EQUAL">Greater Than or Equal (&ge;)</option>
                    <option value="LESS_THAN_OR_EQUAL">Less Than or Equal (&le;)</option>
                    <option value="CROSSES_ABOVE">Crosses Above (State Transition)</option>
                    <option value="CROSSES_BELOW">Crosses Below (State Transition)</option>
                    <option value="EQUALS">Equals</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-[#8B949E] mb-1">
                    Threshold Value *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 3000, 5.0, -25000"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    className="w-full bg-[#11161D] border border-[#1B222C] rounded px-3 py-2 text-[#F5F7FA] font-mono focus:outline-none focus:border-[#00C2FF]"
                  />
                </div>
              </div>

              {/* Cooldown & Optional Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] text-[#8B949E] mb-1">
                    Cooldown Window (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formCooldown}
                    onChange={(e) => setFormCooldown(Number(e.target.value))}
                    className="w-full bg-[#11161D] border border-[#1B222C] rounded px-3 py-2 text-[#F5F7FA] font-mono focus:outline-none focus:border-[#00C2FF]"
                  />
                  <span className="text-[10px] text-[#505A66] mt-0.5 block">
                    Prevents duplicate spamming while condition remains satisfied.
                  </span>
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-[#8B949E] mb-1">
                    Specific Condition / Keyword (Optional)
                  </label>
                  {formType === 'NEWS' ? (
                    <input
                      type="text"
                      placeholder="e.g. quarterly, acquisition, rbi"
                      value={formKeyword}
                      onChange={(e) => setFormKeyword(e.target.value)}
                      className="w-full bg-[#11161D] border border-[#1B222C] rounded px-3 py-2 text-[#F5F7FA] font-mono focus:outline-none focus:border-[#00C2FF]"
                    />
                  ) : formType === 'PORTFOLIO_PNL' ? (
                    <select
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value)}
                      className="w-full bg-[#11161D] border border-[#1B222C] rounded px-3 py-2 text-[#F5F7FA] focus:outline-none focus:border-[#00C2FF]"
                    >
                      <option value="">Total Portfolio P&L</option>
                      <option value="DAY_PNL">Day P&L Only</option>
                    </select>
                  ) : formType === 'RISK' ? (
                    <select
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value)}
                      className="w-full bg-[#11161D] border border-[#1B222C] rounded px-3 py-2 text-[#F5F7FA] focus:outline-none focus:border-[#00C2FF]"
                    >
                      <option value="">Annualized Volatility (%)</option>
                      <option value="VAR">Value at Risk 95% (₹ Amount)</option>
                      <option value="SHARPE">Sharpe Ratio</option>
                    </select>
                  ) : formType === 'EVENT' ? (
                    <select
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value)}
                      className="w-full bg-[#11161D] border border-[#1B222C] rounded px-3 py-2 text-[#F5F7FA] focus:outline-none focus:border-[#00C2FF]"
                    >
                      <option value="">Any Corporate Action</option>
                      <option value="EARNINGS">Earnings Release</option>
                      <option value="DIVIDEND">Dividend Declaration</option>
                      <option value="BOARD_MEETING">Board Meeting</option>
                      <option value="SPLIT">Stock Split</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Optional rule criteria"
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value)}
                      className="w-full bg-[#11161D] border border-[#1B222C] rounded px-3 py-2 text-[#F5F7FA] font-mono focus:outline-none focus:border-[#00C2FF]"
                    />
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1B222C]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-mono text-[#8B949E] hover:text-[#F5F7FA] hover:bg-[#11161D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-[#00C2FF] hover:bg-[#00B0E8] text-[#07090C] font-semibold font-mono text-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Arming Rule...' : 'Arm Alert Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
