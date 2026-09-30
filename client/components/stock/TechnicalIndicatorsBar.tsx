import React from 'react';
import { TimeframeOption } from '../../types/market.ts';
import { IndicatorConfig } from '../../stores/tradingStore.ts';
import { Activity, SlidersHorizontal } from 'lucide-react';

interface TechnicalIndicatorsBarProps {
  timeframe: TimeframeOption;
  onSelectTimeframe: (tf: TimeframeOption) => void;
  indicators: IndicatorConfig;
  onToggleIndicator: (indicator: keyof IndicatorConfig) => void;
}

export const TechnicalIndicatorsBar: React.FC<TechnicalIndicatorsBarProps> = ({
  timeframe,
  onSelectTimeframe,
  indicators,
  onToggleIndicator,
}) => {
  const timeframes: TimeframeOption[] = ['1D', '5D', '1M', '6M', '1Y', '5Y'];

  const indicatorList: { key: keyof IndicatorConfig; label: string; color: string }[] = [
    { key: 'sma20', label: 'SMA 20', color: '#00C2FF' },
    { key: 'sma50', label: 'SMA 50', color: '#F59E0B' },
    { key: 'sma200', label: 'SMA 200', color: '#EC4899' },
    { key: 'ema', label: 'EMA 21', color: '#A855F7' },
    { key: 'bollinger', label: 'Bollinger', color: '#00C2FF' },
    { key: 'rsi', label: 'RSI 14', color: '#22C55E' },
    { key: 'macd', label: 'MACD', color: '#3B82F6' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#0D1117] border border-[#1B222C] rounded-lg text-xs">
      {/* Timeframes */}
      <div className="flex items-center gap-1 bg-[#11161D] p-0.5 rounded border border-[#1B222C]">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => onSelectTimeframe(tf)}
            className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
              timeframe === tf
                ? 'bg-[#1B222C] text-[#00C2FF] font-semibold'
                : 'text-[#8B949E] hover:text-[#F5F7FA]'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Indicator Toggles */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1 text-[11px] text-[#8B949E] mr-1 shrink-0">
          <Activity className="w-3.5 h-3.5 text-[#00C2FF]" />
          <span>Studies:</span>
        </div>
        {indicatorList.map((item) => {
          const isActive = indicators[item.key];
          return (
            <button
              key={item.key}
              onClick={() => onToggleIndicator(item.key)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#161D26] text-[#F5F7FA] border border-[#1B222C] font-semibold'
                  : 'text-[#8B949E] hover:text-[#F5F7FA] border border-transparent'
              }`}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: isActive ? item.color : '#505A66' }}
              />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
