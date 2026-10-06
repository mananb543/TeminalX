/**
 * TerminalX - Stage 6 Financial News & Event Intelligence Workspace
 * Institutional wire dispatches, personalized portfolio developments,
 * corporate actions, and macroeconomic event calendar.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Newspaper,
  ExternalLink,
  Clock,
  Search,
  RefreshCw,
  Calendar,
  Briefcase,
  Globe,
  Tag,
  AlertCircle,
  X,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { newsClient, NewsArticle, MarketEvent } from '../lib/newsClient.ts';
import { useAuthStore } from '../stores/authStore.ts';

interface NewsPageProps {
  onSelectStock: (symbol: string) => void;
}

type MainTab = 'MARKET' | 'PORTFOLIO' | 'EVENTS';

const CATEGORIES = [
  { id: 'ALL', label: 'All Wire' },
  { id: 'MARKET', label: 'Market' },
  { id: 'STOCKS', label: 'Stocks' },
  { id: 'ECONOMY', label: 'Economy' },
  { id: 'TECHNOLOGY', label: 'Technology' },
  { id: 'CORPORATE', label: 'Corporate' },
  { id: 'EARNINGS', label: 'Earnings' },
  { id: 'COMMODITIES', label: 'Commodities' },
  { id: 'GLOBAL MARKETS', label: 'Global' },
];

function formatRelativeTime(dateString: string): string {
  try {
    const published = new Date(dateString).getTime();
    const now = Date.now();
    const diffMs = now - published;

    if (diffMs < 0) return 'Just now';
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export const NewsPage: React.FC<NewsPageProps> = ({ onSelectStock }) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<MainTab>('MARKET');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [portfolioArticles, setPortfolioArticles] = useState<NewsArticle[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [eventScope, setEventScope] = useState<'ALL' | 'PORTFOLIO'>('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<{ mode: string; providerName: string }>({
    mode: 'demo',
    providerName: 'TerminalX Institutional Wire',
  });

  // Modal State for article detail
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  // Fetch initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch provider info
      newsClient.getProviderStatus().then(setProviderInfo).catch(() => {});

      if (activeTab === 'MARKET') {
        if (activeSearch.trim()) {
          const results = await newsClient.searchNews(activeSearch.trim());
          setArticles(results);
        } else {
          const results = await newsClient.getMarketNews(30, selectedCategory);
          setArticles(results);
        }
      } else if (activeTab === 'PORTFOLIO') {
        if (user) {
          const results = await newsClient.getPortfolioNews(25);
          setPortfolioArticles(results);
        } else {
          setPortfolioArticles([]);
        }
      } else if (activeTab === 'EVENTS') {
        if (eventScope === 'PORTFOLIO' && user) {
          const evts = await newsClient.getPortfolioEvents();
          setEvents(evts);
        } else {
          const evts = await newsClient.getUpcomingEvents(30);
          setEvents(evts);
        }
      }
    } catch (err: any) {
      console.error('[NewsPage loadData]:', err);
      setError(err.message || 'Failed to load news intelligence feed.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedCategory, activeSearch, eventScope, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery.trim());
    if (activeTab !== 'MARKET') {
      setActiveTab('MARKET');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (eventTypeFilter === 'ALL') return events;
    return events.filter((e) => e.type === eventTypeFilter);
  }, [events, eventTypeFilter]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header & Terminal Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-[#1B222C]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#F5F7FA] font-mono tracking-tight flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[#00C2FF]" />
              Financial News & Event Intelligence
            </h1>
            <span className="text-[10px] font-mono text-[#00C2FF] bg-[#00C2FF]/10 px-2 py-0.5 rounded border border-[#00C2FF]/30">
              STAGE 6 VERIFIED
            </span>
          </div>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Real-time exchange filings, central bank dispatches, corporate actions, and verified portfolio context
          </p>
        </div>

        {/* Status Badges & Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0D1117] border border-[#1B222C] rounded text-[#8B949E]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
            <span className="text-[11px]">FEED:</span>
            <span className="text-[#F5F7FA] font-semibold">{providerInfo.providerName}</span>
          </div>

          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#161D26] hover:bg-[#1B222C] text-[#8B949E] hover:text-[#00C2FF] border border-[#1B222C] rounded transition-colors"
            title="Refresh News Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00C2FF]' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Main Tabs & Search Bar Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#0D1117] border border-[#1B222C] rounded-lg">
          <button
            onClick={() => {
              setActiveTab('MARKET');
              setActiveSearch('');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
              activeTab === 'MARKET'
                ? 'bg-[#161D26] text-[#00C2FF] font-semibold border border-[#1B222C]'
                : 'text-[#8B949E] hover:text-[#F5F7FA]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Market Wire</span>
          </button>

          <button
            onClick={() => setActiveTab('PORTFOLIO')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
              activeTab === 'PORTFOLIO'
                ? 'bg-[#161D26] text-[#00C2FF] font-semibold border border-[#1B222C]'
                : 'text-[#8B949E] hover:text-[#F5F7FA]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>My Holdings</span>
          </button>

          <button
            onClick={() => setActiveTab('EVENTS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
              activeTab === 'EVENTS'
                ? 'bg-[#161D26] text-[#00C2FF] font-semibold border border-[#1B222C]'
                : 'text-[#8B949E] hover:text-[#F5F7FA]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Event Calendar</span>
          </button>
        </div>

        {/* Global Search Wire */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news by ticker (RELIANCE, TCS) or topic (RBI, 5G)..."
            className="w-full bg-[#0D1117] border border-[#1B222C] focus:border-[#00C2FF] rounded-lg px-3 py-1.5 pl-9 pr-8 text-xs font-mono text-[#F5F7FA] placeholder-[#505A66] focus:outline-none transition-colors"
          />
          <Search className="w-4 h-4 text-[#505A66] absolute left-3 top-2.5" />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-2.5 text-[#505A66] hover:text-[#F5F7FA]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Active Search Filter Banner */}
      {activeSearch && (
        <div className="flex items-center justify-between px-3 py-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 rounded-lg text-xs font-mono text-[#00C2FF]">
          <div className="flex items-center gap-2">
            <span>FILTERED BY QUERY:</span>
            <span className="font-bold underline">"{activeSearch}"</span>
          </div>
          <button
            onClick={handleClearSearch}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Category Filter Pills (Market Tab Only) */}
      {activeTab === 'MARKET' && !activeSearch && (
        <div className="flex items-center gap-1.5 p-2 bg-[#0D1117] border border-[#1B222C] rounded-lg overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#161D26] text-[#00C2FF] font-semibold border border-[#1B222C]'
                  : 'text-[#8B949E] hover:text-[#F5F7FA]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Events Sub-Filter (Events Tab Only) */}
      {activeTab === 'EVENTS' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 bg-[#0D1117] border border-[#1B222C] rounded-lg text-xs font-mono">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEventScope('ALL')}
              className={`px-3 py-1 rounded ${
                eventScope === 'ALL'
                  ? 'bg-[#161D26] text-[#00C2FF] border border-[#1B222C]'
                  : 'text-[#8B949E] hover:text-[#F5F7FA]'
              }`}
            >
              All Market Events
            </button>
            <button
              onClick={() => setEventScope('PORTFOLIO')}
              className={`px-3 py-1 rounded ${
                eventScope === 'PORTFOLIO'
                  ? 'bg-[#161D26] text-[#00C2FF] border border-[#1B222C]'
                  : 'text-[#8B949E] hover:text-[#F5F7FA]'
              }`}
            >
              My Holdings Only
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'EARNINGS', 'DIVIDEND', 'CORPORATE_ACTION', 'ECONOMIC_EVENT'].map((t) => (
              <button
                key={t}
                onClick={() => setEventTypeFilter(t)}
                className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap ${
                  eventTypeFilter === t
                    ? 'bg-[#00C2FF]/15 text-[#00C2FF] border border-[#00C2FF]/30'
                    : 'text-[#8B949E] hover:text-[#F5F7FA]'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-xs font-mono text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg animate-pulse space-y-2"
            >
              <div className="h-4 bg-[#161D26] rounded w-3/4"></div>
              <div className="h-3 bg-[#161D26] rounded w-full"></div>
              <div className="h-3 bg-[#161D26] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- ARTICLE FEED (MARKET OR PORTFOLIO) ---------------- */}
      {!isLoading && (activeTab === 'MARKET' || activeTab === 'PORTFOLIO') && (
        <div className="space-y-3">
          {activeTab === 'PORTFOLIO' && !user && (
            <div className="p-6 bg-[#0D1117] border border-[#1B222C] rounded-lg text-center space-y-2 font-mono">
              <Briefcase className="w-8 h-8 text-[#505A66] mx-auto" />
              <p className="text-sm text-[#F5F7FA]">Authentication Required</p>
              <p className="text-xs text-[#8B949E]">
                Sign in to view personalized financial wire reports and regulatory filings for your held securities.
              </p>
            </div>
          )}

          {((activeTab === 'MARKET' ? articles : portfolioArticles).length === 0 && !error) && (
            <div className="p-8 bg-[#0D1117] border border-[#1B222C] rounded-lg text-center font-mono space-y-2">
              <Newspaper className="w-8 h-8 text-[#505A66] mx-auto" />
              <p className="text-sm text-[#F5F7FA]">No Wire Dispatches Found</p>
              <p className="text-xs text-[#8B949E]">
                {activeTab === 'PORTFOLIO'
                  ? 'No current holdings found or no specific dispatches published for your portfolio securities.'
                  : 'No articles matched your category or search filter.'}
              </p>
            </div>
          )}

          {(activeTab === 'MARKET' ? articles : portfolioArticles).map((item) => {
            const isPositive = item.sentiment === 'POSITIVE';
            const isNegative = item.sentiment === 'NEGATIVE';
            const isNeutral = item.sentiment === 'NEUTRAL';

            return (
              <div
                key={item.id}
                className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg hover:border-[#263140] transition-colors"
              >
                {/* Meta Row: Publisher · Published Time · Sentiment */}
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-2 flex-wrap">
                  <div className="flex items-center gap-2 text-[#8B949E]">
                    <span className="text-[#00C2FF] font-semibold">{item.source}</span>
                    <span className="text-[#505A66]">·</span>
                    <span className="flex items-center gap-1" title={item.publishedAt}>
                      <Clock className="w-3 h-3 text-[#505A66]" />
                      {formatRelativeTime(item.publishedAt)}
                    </span>
                    {item.categories && item.categories.length > 0 && (
                      <>
                        <span className="text-[#505A66]">·</span>
                        <span className="text-[#8B949E] uppercase">{item.categories.join(' / ')}</span>
                      </>
                    )}
                  </div>

                  {/* Sentiment: Render only if supplied by provider (do not invent) */}
                  {item.sentiment && (
                    <span
                      className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                        isPositive
                          ? 'text-[#22C55E]'
                          : isNegative
                          ? 'text-[#EF4444]'
                          : 'text-[#8B949E]'
                      }`}
                    >
                      {isPositive && <TrendingUp className="w-3 h-3" />}
                      {isNegative && <TrendingDown className="w-3 h-3" />}
                      {item.sentiment} SENTIMENT
                    </span>
                  )}
                </div>

                {/* Original Unaltered Headline */}
                <h2
                  onClick={() => setSelectedArticle(item)}
                  className="text-sm sm:text-base font-semibold text-[#F5F7FA] leading-snug cursor-pointer hover:text-[#00C2FF] transition-colors"
                >
                  {item.headline}
                </h2>

                {/* Summary (if available) */}
                {item.summary && (
                  <p className="text-xs text-[#8B949E] mt-1.5 leading-relaxed line-clamp-2">
                    {item.summary}
                  </p>
                )}

                {/* Related Securities & Actions */}
                <div className="mt-3 pt-3 border-t border-[#1B222C] flex items-center justify-between text-xs font-mono flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-[#505A66]">Securities:</span>
                    {item.symbols && item.symbols.length > 0 ? (
                      item.symbols.map((sym: string) => (
                        <button
                          key={sym}
                          onClick={() => onSelectStock(sym)}
                          className="px-2 py-0.5 rounded bg-[#11161D] hover:bg-[#00C2FF] text-[#00C2FF] hover:text-[#07090C] text-[11px] font-semibold transition-colors"
                        >
                          {sym}
                        </button>
                      ))
                    ) : (
                      <span className="text-[11px] text-[#505A66]">Broad Market</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedArticle(item)}
                      className="text-[11px] text-[#8B949E] hover:text-[#00C2FF] transition-colors"
                    >
                      View Details
                    </button>

                    {item.url && item.url !== '#' && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-[#8B949E] hover:text-[#F5F7FA] transition-colors"
                      >
                        <span>Full Wire</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- EVENT INTELLIGENCE TAB ---------------- */}
      {!isLoading && activeTab === 'EVENTS' && (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="p-8 bg-[#0D1117] border border-[#1B222C] rounded-lg text-center font-mono space-y-2">
              <Calendar className="w-8 h-8 text-[#505A66] mx-auto" />
              <p className="text-sm text-[#F5F7FA]">No Upcoming Events Scheduled</p>
              <p className="text-xs text-[#8B949E]">
                No corporate actions or regulatory calendar events match the selected criteria.
              </p>
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg hover:border-[#263140] transition-colors"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#161D26] text-[#00C2FF] border border-[#1B222C] rounded font-semibold">
                      {evt.eventDate}
                    </span>
                    <span className="text-[#505A66]">·</span>
                    <span className="text-[#8B949E]">{evt.type.replace('_', ' ')}</span>
                  </div>

                  <span className="text-[11px] text-[#505A66] font-mono">Source: {evt.source}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F5F7FA] leading-snug">{evt.title}</h3>
                    <p className="text-xs text-[#8B949E] mt-1 leading-relaxed">{evt.description}</p>
                  </div>

                  <button
                    onClick={() => onSelectStock(evt.symbol)}
                    className="px-2.5 py-1 rounded bg-[#11161D] hover:bg-[#00C2FF] text-[#00C2FF] hover:text-[#07090C] font-mono text-xs font-bold shrink-0 transition-colors"
                  >
                    {evt.symbol}
                  </button>
                </div>

                {evt.url && evt.url !== '#' && (
                  <div className="mt-3 pt-2 border-t border-[#1B222C] flex items-center justify-end">
                    <a
                      href={evt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-mono text-[#8B949E] hover:text-[#F5F7FA] transition-colors"
                    >
                      <span>Filing Disclosure</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ---------------- ARTICLE DETAIL MODAL ---------------- */}
      {selectedArticle && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#07090C]/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#0D1117] border border-[#1B222C] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#1B222C] pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#8B949E]">
                  <span className="text-[#00C2FF] font-semibold">{selectedArticle.source}</span>
                  <span className="text-[#505A66]">·</span>
                  <span>{new Date(selectedArticle.publishedAt).toLocaleString()}</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-[#F5F7FA] leading-tight">
                  {selectedArticle.headline}
                </h2>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-[#8B949E] hover:text-[#F5F7FA] p-1 rounded hover:bg-[#161D26] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Section */}
            <div className="flex items-center gap-4 text-xs font-mono text-[#8B949E] flex-wrap">
              <div>
                <span className="text-[#505A66]">Relative:</span>{' '}
                <span className="text-[#F5F7FA]">{formatRelativeTime(selectedArticle.publishedAt)}</span>
              </div>
              <div>
                <span className="text-[#505A66]">Categories:</span>{' '}
                <span className="text-[#F5F7FA]">
                  {selectedArticle.categories?.join(', ') || 'Market'}
                </span>
              </div>
              {selectedArticle.sentiment && (
                <div>
                  <span className="text-[#505A66]">Sentiment:</span>{' '}
                  <span
                    className={`font-bold ${
                      selectedArticle.sentiment === 'POSITIVE'
                        ? 'text-[#22C55E]'
                        : selectedArticle.sentiment === 'NEGATIVE'
                        ? 'text-[#EF4444]'
                        : 'text-[#8B949E]'
                    }`}
                  >
                    {selectedArticle.sentiment}
                  </span>
                </div>
              )}
            </div>

            {/* Summary Text */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono text-[#505A66] uppercase tracking-wider">
                Article Wire Summary
              </h4>
              <p className="text-sm text-[#F5F7FA] leading-relaxed bg-[#11161D] p-4 rounded-lg border border-[#1B222C]">
                {selectedArticle.summary || 'No extended summary provided by upstream publisher wire.'}
              </p>
            </div>

            {/* Tagged Securities */}
            {selectedArticle.symbols && selectedArticle.symbols.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-[#505A66]">Associated Tickers:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedArticle.symbols.map((sym: string) => (
                    <button
                      key={sym}
                      onClick={() => {
                        setSelectedArticle(null);
                        onSelectStock(sym);
                      }}
                      className="px-2.5 py-1 rounded bg-[#161D26] hover:bg-[#00C2FF] text-[#00C2FF] hover:text-[#07090C] font-mono text-xs font-semibold border border-[#1B222C] transition-colors"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[#1B222C] flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-[#161D26] hover:bg-[#1B222C] text-[#8B949E] hover:text-[#F5F7FA] rounded font-mono text-xs transition-colors"
              >
                Close
              </button>

              {selectedArticle.url && selectedArticle.url !== '#' && (
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#00C2FF] hover:bg-[#00A3D9] text-[#07090C] font-bold rounded font-mono text-xs transition-colors"
                >
                  <span>Read Full Article on {selectedArticle.source}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
