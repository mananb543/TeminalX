import React, { useState } from 'react';
import { clientMarketService } from '../lib/marketService.ts';
import { MarketNewsItem } from '../types/market.ts';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Clock, Filter } from 'lucide-react';

interface NewsPageProps {
  onSelectStock: (symbol: string) => void;
}

export const NewsPage: React.FC<NewsPageProps> = ({ onSelectStock }) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const newsItems = clientMarketService.getNews();

  const filteredNews =
    activeCategory === 'ALL'
      ? newsItems
      : newsItems.filter((n) => n.category === activeCategory);

  const categories = [
    { id: 'ALL', label: 'All Feeds' },
    { id: 'MARKETS', label: 'Markets' },
    { id: 'EARNINGS', label: 'Earnings' },
    { id: 'MACRO', label: 'Macro' },
    { id: 'COMMODITIES', label: 'Commodities' },
  ];

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7FA] font-mono tracking-tight">
            Financial News & Market Dispatches
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Institutional wire dispatches, central bank commentary, and corporate earnings disclosures
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 p-2 bg-[#0D1117] border border-[#1B222C] rounded-lg overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-[#161D26] text-[#00C2FF] font-semibold border border-[#1B222C]'
                : 'text-[#8B949E] hover:text-[#F5F7FA]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* News Feed Items */}
      <div className="space-y-3">
        {filteredNews.map((item) => {
          const isPositive = item.sentiment === 'POSITIVE';
          const isNegative = item.sentiment === 'NEGATIVE';

          return (
            <div
              key={item.id}
              className="p-4 bg-[#0D1117] border border-[#1B222C] rounded-lg hover:border-[#263140] transition-colors"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#00C2FF] font-semibold">{item.source}</span>
                  <span className="text-[#505A66]">·</span>
                  <span className="text-[#8B949E] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.publishedAt}
                  </span>
                </div>

                {/* Sentiment Tag */}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isPositive
                      ? 'bg-[#22C55E]/15 text-[#22C55E]'
                      : isNegative
                      ? 'bg-[#EF4444]/15 text-[#EF4444]'
                      : 'bg-[#161D26] text-[#8B949E]'
                  }`}
                >
                  {item.sentiment} SENTIMENT
                </span>
              </div>

              <h2 className="text-sm sm:text-base font-semibold text-[#F5F7FA] leading-snug">
                {item.title}
              </h2>
              <p className="text-xs text-[#8B949E] mt-1.5 leading-relaxed">{item.summary}</p>

              {/* Related Tickers */}
              <div className="mt-3 pt-3 border-t border-[#1B222C] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono text-[#505A66]">Securities:</span>
                  {item.symbols.map((sym) => (
                    <button
                      key={sym}
                      onClick={() => onSelectStock(sym)}
                      className="px-2 py-0.5 rounded bg-[#11161D] hover:bg-[#00C2FF] text-[#00C2FF] hover:text-[#07090C] font-mono text-[11px] font-semibold transition-colors"
                    >
                      {sym}
                    </button>
                  ))}
                </div>

                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="flex items-center gap-1 text-[11px] font-mono text-[#8B949E] hover:text-[#F5F7FA]"
                >
                  <span>Read Full Wire</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
