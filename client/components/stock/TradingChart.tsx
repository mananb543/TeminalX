import React, { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
} from 'lightweight-charts';
import { CandleData } from '../../types/market.ts';
import { IndicatorConfig } from '../../stores/tradingStore.ts';

interface TradingChartProps {
  candles: CandleData[];
  indicators: IndicatorConfig;
  symbol: string;
}

export const TradingChart: React.FC<TradingChartProps> = ({ candles, indicators, symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Clear previous chart instance if any
    chartContainerRef.current.innerHTML = '';

    const container = chartContainerRef.current;
    const { clientWidth, clientHeight } = container;

    // Institutional Terminal Dark Palette
    const chart = createChart(container, {
      width: clientWidth || 800,
      height: clientHeight || 440,
      layout: {
        background: { color: '#07090C' },
        textColor: '#8B949E',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: '#161D26' },
        horzLines: { color: '#161D26' },
      },
      crosshair: {
        vertLine: {
          color: '#00C2FF',
          width: 1,
          style: 3,
          labelBackgroundColor: '#11161D',
        },
        horzLine: {
          color: '#00C2FF',
          width: 1,
          style: 3,
          labelBackgroundColor: '#11161D',
        },
      },
      rightPriceScale: {
        borderColor: '#1B222C',
        scaleMargins: {
          top: 0.1,
          bottom: 0.22, // Space for volume histogram
        },
      },
      timeScale: {
        borderColor: '#1B222C',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // 1. Candlestick Series (Lightweight Charts v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderUpColor: '#22C55E',
      borderDownColor: '#EF4444',
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    });

    const candleData: CandlestickData[] = candles.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(candleData);

    // 2. Volume Histogram Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#263140',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // align to bottom 20%
        bottom: 0,
      },
    });

    const volumeData: HistogramData[] = candles.map((c) => ({
      time: c.time as any,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
    }));

    volumeSeries.setData(volumeData);

    // 3. Technical Indicator Overlays
    const getSMAData = (period: number): LineData[] => {
      const res: LineData[] = [];
      if (candles.length < period) return res;
      for (let i = period - 1; i < candles.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += candles[i - j].close;
        }
        res.push({
          time: candles[i].time as any,
          value: +(sum / period).toFixed(2),
        });
      }
      return res;
    };

    // SMA 20
    if (indicators.sma20) {
      const sma20Series = chart.addSeries(LineSeries, {
        color: '#00C2FF',
        lineWidth: 1,
        title: 'SMA 20',
      });
      sma20Series.setData(getSMAData(20));
    }

    // SMA 50
    if (indicators.sma50) {
      const sma50Series = chart.addSeries(LineSeries, {
        color: '#F59E0B',
        lineWidth: 1,
        title: 'SMA 50',
      });
      sma50Series.setData(getSMAData(50));
    }

    // SMA 200
    if (indicators.sma200) {
      const sma200Series = chart.addSeries(LineSeries, {
        color: '#EC4899',
        lineWidth: 1,
        title: 'SMA 200',
      });
      sma200Series.setData(getSMAData(200));
    }

    // EMA 21
    if (indicators.ema) {
      const emaSeries = chart.addSeries(LineSeries, {
        color: '#A855F7',
        lineWidth: 1,
        title: 'EMA 21',
      });
      const period = 21;
      const k = 2 / (period + 1);
      const emaData: LineData[] = [];
      if (candles.length >= period) {
        let currentEma = candles.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;
        emaData.push({ time: candles[period - 1].time as any, value: +currentEma.toFixed(2) });
        for (let i = period; i < candles.length; i++) {
          currentEma = candles[i].close * k + currentEma * (1 - k);
          emaData.push({ time: candles[i].time as any, value: +currentEma.toFixed(2) });
        }
        emaSeries.setData(emaData);
      }
    }

    // Bollinger Bands (20, 2)
    if (indicators.bollinger) {
      const bbUpper = chart.addSeries(LineSeries, {
        color: 'rgba(0, 194, 255, 0.5)',
        lineWidth: 1,
        title: 'BB Upper',
      });
      const bbLower = chart.addSeries(LineSeries, {
        color: 'rgba(0, 194, 255, 0.5)',
        lineWidth: 1,
        title: 'BB Lower',
      });

      const period = 20;
      const upperData: LineData[] = [];
      const lowerData: LineData[] = [];

      if (candles.length >= period) {
        for (let i = period - 1; i < candles.length; i++) {
          let sum = 0;
          for (let j = 0; j < period; j++) {
            sum += candles[i - j].close;
          }
          const mean = sum / period;
          let variance = 0;
          for (let j = 0; j < period; j++) {
            variance += Math.pow(candles[i - j].close - mean, 2);
          }
          const stdDev = Math.sqrt(variance / period);
          upperData.push({ time: candles[i].time as any, value: +(mean + 2 * stdDev).toFixed(2) });
          lowerData.push({ time: candles[i].time as any, value: +(mean - 2 * stdDev).toFixed(2) });
        }
        bbUpper.setData(upperData);
        bbLower.setData(lowerData);
      }
    }

    chart.timeScale().fitContent();

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, indicators, symbol]);

  return (
    <div className="w-full h-full flex flex-col bg-[#07090C] rounded-lg border border-[#1B222C] overflow-hidden">
      <div ref={chartContainerRef} className="w-full flex-1 min-h-[380px]" />
    </div>
  );
};
