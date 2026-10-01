/**
 * TerminalX - Performance Analytics Service
 * Reconstructs portfolio equity curves, daily returns, cumulative returns,
 * and normalized benchmark comparisons against NIFTY 50.
 */

import { storageService, StoragePortfolioSnapshot, StorageTransaction } from '../services/storageService.ts';
import { unifiedMarketService } from '../market/marketService.ts';
import { portfolioAnalyticsService } from './portfolioAnalyticsService.ts';
import { INITIAL_VIRTUAL_BALANCE } from '../models/User.ts';
import { OHLCVCandle } from '../market/providers/MarketDataProvider.ts';

export interface PerformanceDataPoint {
  date: string;
  timestamp: string;
  totalValue: number;
  cash: number;
  investedValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dailyReturnPercent: number;
  cumulativeReturnPercent: number;
}

export interface BenchmarkComparisonPoint {
  date: string;
  timestamp: string;
  portfolioNormalized: number;
  benchmarkNormalized: number;
  portfolioValue: number;
  benchmarkPrice: number;
}

export interface BenchmarkComparisonResult {
  symbol: string;
  name: string;
  range: string;
  points: BenchmarkComparisonPoint[];
  portfolioTotalReturnPercent: number;
  benchmarkTotalReturnPercent: number;
  excessReturnPercent: number;
  disclaimer: string;
}

export class PerformanceAnalyticsService {
  /**
   * Convert time range parameter to start date and interval length in days
   */
  public getRangeStartDate(range = '1M'): { startDate: Date; days: number } {
    const now = new Date();
    const upper = range.toUpperCase().trim();
    let days = 30;

    if (upper === '1W') days = 7;
    else if (upper === '1M') days = 30;
    else if (upper === '3M') days = 90;
    else if (upper === '6M') days = 180;
    else if (upper === '1Y') days = 365;
    else if (upper === 'ALL') days = 730;

    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, days };
  }

  /**
   * Generate equity curve for user across specified time range
   */
  public async getPerformanceHistory(userId: string, range = '1M'): Promise<PerformanceDataPoint[]> {
    const { startDate, days } = this.getRangeStartDate(range);
    const user = await storageService.findUserById(userId);
    const userCreationDate = user ? new Date(user.createdAt) : startDate;

    const [currentSummary, rawSnapshots, rawTransactions] = await Promise.all([
      portfolioAnalyticsService.getPortfolioSummary(userId),
      storageService.getPortfolioSnapshots(userId, startDate),
      storageService.getTransactions(userId),
    ]);

    // Unique active symbols that user has traded
    const tradedSymbols = Array.from(new Set(rawTransactions.map((t) => t.symbol.toUpperCase().trim())));

    // Fetch historical candles for each traded symbol to compute historical marks
    const symbolCandlesMap: Record<string, Map<string, number>> = {};
    await Promise.all(
      tradedSymbols.map(async (sym) => {
        try {
          const candles = await unifiedMarketService.getHistoricalData(sym, '1D', range);
          const map = new Map<string, number>();
          for (const c of candles) {
            const dateStr = typeof c.time === 'string'
              ? c.time.split('T')[0]
              : new Date((c.time as number) * 1000).toISOString().split('T')[0];
            map.set(dateStr, c.close);
          }
          symbolCandlesMap[sym] = map;
        } catch {
          symbolCandlesMap[sym] = new Map();
        }
      })
    );

    // Build timeline of dates from startDate to today
    const datePoints: string[] = [];
    const now = new Date();
    for (let i = days; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      datePoints.push(d.toISOString().split('T')[0]);
    }

    // Map snapshots by date
    const snapshotDateMap = new Map<string, StoragePortfolioSnapshot>();
    for (const snap of rawSnapshots) {
      const dateStr = snap.timestamp.toISOString().split('T')[0];
      snapshotDateMap.set(dateStr, snap);
    }

    // Chronological transactions
    const sortedTx = [...rawTransactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const result: PerformanceDataPoint[] = [];
    let previousValue = INITIAL_VIRTUAL_BALANCE;

    for (let i = 0; i < datePoints.length; i++) {
      const dateStr = datePoints[i];
      const pointDateEnd = new Date(`${dateStr}T23:59:59.999Z`);
      const isToday = i === datePoints.length - 1;

      if (isToday) {
        // Today's point: use live mark-to-market summary
        const dailyReturnPercent =
          previousValue > 0 ? +(((currentSummary.totalPortfolioValue - previousValue) / previousValue) * 100).toFixed(2) : 0;
        const cumulativeReturnPercent =
          INITIAL_VIRTUAL_BALANCE > 0
            ? +(((currentSummary.totalPortfolioValue - INITIAL_VIRTUAL_BALANCE) / INITIAL_VIRTUAL_BALANCE) * 100).toFixed(2)
            : 0;

        result.push({
          date: dateStr,
          timestamp: pointDateEnd.toISOString(),
          totalValue: currentSummary.totalPortfolioValue,
          cash: currentSummary.cashBalance,
          investedValue: currentSummary.investedValue,
          unrealizedPnL: currentSummary.unrealizedPnL,
          realizedPnL: currentSummary.realizedPnL,
          dailyReturnPercent,
          cumulativeReturnPercent,
        });
        continue;
      }

      // Check if a persisted snapshot exists for this date
      const existingSnap = snapshotDateMap.get(dateStr);
      if (existingSnap) {
        const val = existingSnap.totalValue;
        const dailyReturnPercent = previousValue > 0 ? +(((val - previousValue) / previousValue) * 100).toFixed(2) : 0;
        const cumulativeReturnPercent =
          INITIAL_VIRTUAL_BALANCE > 0
            ? +(((val - INITIAL_VIRTUAL_BALANCE) / INITIAL_VIRTUAL_BALANCE) * 100).toFixed(2)
            : 0;

        result.push({
          date: dateStr,
          timestamp: existingSnap.timestamp.toISOString(),
          totalValue: val,
          cash: existingSnap.cash,
          investedValue: existingSnap.investedValue,
          unrealizedPnL: existingSnap.unrealizedPnL,
          realizedPnL: existingSnap.realizedPnL,
          dailyReturnPercent,
          cumulativeReturnPercent,
        });
        previousValue = val;
        continue;
      }

      // If prior to account registration or no transactions up to this point
      const txUpToDate = sortedTx.filter((t) => t.timestamp <= pointDateEnd);
      if (txUpToDate.length === 0 || pointDateEnd < userCreationDate) {
        // User held 100% cash balance prior to their first trade
        const dailyReturnPercent = 0;
        const cumulativeReturnPercent = 0;
        result.push({
          date: dateStr,
          timestamp: pointDateEnd.toISOString(),
          totalValue: INITIAL_VIRTUAL_BALANCE,
          cash: INITIAL_VIRTUAL_BALANCE,
          investedValue: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          dailyReturnPercent,
          cumulativeReturnPercent,
        });
        previousValue = INITIAL_VIRTUAL_BALANCE;
        continue;
      }

      // Calculate state from transactions up to this date
      let cash = INITIAL_VIRTUAL_BALANCE;
      const positions: Record<string, { qty: number; costBasis: number }> = {};

      for (const tx of txUpToDate) {
        const sym = tx.symbol.toUpperCase().trim();
        if (!positions[sym]) positions[sym] = { qty: 0, costBasis: 0 };

        if (tx.type === 'BUY') {
          cash -= tx.totalValue;
          positions[sym].qty += tx.quantity;
          positions[sym].costBasis += tx.totalValue;
        } else if (tx.type === 'SELL') {
          cash += tx.totalValue;
          const avgBuy = positions[sym].qty > 0 ? positions[sym].costBasis / positions[sym].qty : tx.price;
          positions[sym].qty -= tx.quantity;
          positions[sym].costBasis -= avgBuy * tx.quantity;
          if (positions[sym].qty <= 0) {
            positions[sym].qty = 0;
            positions[sym].costBasis = 0;
          }
        }
      }

      let investedValue = 0;
      let costBasisTotal = 0;

      for (const [sym, pos] of Object.entries(positions)) {
        if (pos.qty > 0) {
          costBasisTotal += pos.costBasis;
          const priceMap = symbolCandlesMap[sym];
          let historicalClose = priceMap ? priceMap.get(dateStr) : undefined;
          if (!historicalClose) {
            // fallback to cost basis if holiday or candle unavailable
            historicalClose = pos.costBasis / pos.qty;
          }
          investedValue += pos.qty * historicalClose;
        }
      }

      const totalValue = +(cash + investedValue).toFixed(2);
      const unrealizedPnL = +(investedValue - costBasisTotal).toFixed(2);
      const realizedPnL = portfolioAnalyticsService.calculateRealizedPnL(txUpToDate);

      const dailyReturnPercent =
        previousValue > 0 ? +(((totalValue - previousValue) / previousValue) * 100).toFixed(2) : 0;
      const cumulativeReturnPercent =
        INITIAL_VIRTUAL_BALANCE > 0
          ? +(((totalValue - INITIAL_VIRTUAL_BALANCE) / INITIAL_VIRTUAL_BALANCE) * 100).toFixed(2)
          : 0;

      result.push({
        date: dateStr,
        timestamp: pointDateEnd.toISOString(),
        totalValue,
        cash: +cash.toFixed(2),
        investedValue: +investedValue.toFixed(2),
        unrealizedPnL,
        realizedPnL,
        dailyReturnPercent,
        cumulativeReturnPercent,
      });

      previousValue = totalValue;
    }

    return result;
  }

  /**
   * Compare portfolio equity against NIFTY 50 benchmark
   * Both normalized to 100 at the starting date
   */
  public async getBenchmarkComparison(userId: string, range = '1M'): Promise<BenchmarkComparisonResult> {
    const portfolioHistory = await this.getPerformanceHistory(userId, range);

    // Fetch NIFTY 50 benchmark historical data
    let niftyCandles: OHLCVCandle[] = [];
    try {
      niftyCandles = await unifiedMarketService.getHistoricalData('NIFTY 50', '1D', range);
    } catch {
      niftyCandles = [];
    }

    const niftyMap = new Map<string, number>();
    for (const c of niftyCandles) {
      const dateStr = typeof c.time === 'string'
        ? c.time.split('T')[0]
        : new Date((c.time as number) * 1000).toISOString().split('T')[0];
      niftyMap.set(dateStr, c.close);
    }

    // Base values at start of period
    const basePortfolioValue = portfolioHistory.length > 0 ? portfolioHistory[0].totalValue : INITIAL_VIRTUAL_BALANCE;
    const firstNiftyCandle = niftyCandles.length > 0 ? niftyCandles[0].close : 24850.25;
    let baseBenchmarkPrice = firstNiftyCandle;

    // Find first date where benchmark price exists
    for (const pt of portfolioHistory) {
      const p = niftyMap.get(pt.date);
      if (p && p > 0) {
        baseBenchmarkPrice = p;
        break;
      }
    }

    let lastKnownNifty = baseBenchmarkPrice;
    const points: BenchmarkComparisonPoint[] = [];

    for (const pt of portfolioHistory) {
      const benchmarkPrice = niftyMap.get(pt.date) ?? lastKnownNifty;
      lastKnownNifty = benchmarkPrice;

      const portfolioNormalized =
        basePortfolioValue > 0 ? +((pt.totalValue / basePortfolioValue) * 100).toFixed(2) : 100;
      const benchmarkNormalized =
        baseBenchmarkPrice > 0 ? +((benchmarkPrice / baseBenchmarkPrice) * 100).toFixed(2) : 100;

      points.push({
        date: pt.date,
        timestamp: pt.timestamp,
        portfolioNormalized,
        benchmarkNormalized,
        portfolioValue: pt.totalValue,
        benchmarkPrice: +benchmarkPrice.toFixed(2),
      });
    }

    const lastPoint = points[points.length - 1];
    const portfolioTotalReturnPercent = lastPoint ? +(lastPoint.portfolioNormalized - 100).toFixed(2) : 0;
    const benchmarkTotalReturnPercent = lastPoint ? +(lastPoint.benchmarkNormalized - 100).toFixed(2) : 0;
    const excessReturnPercent = +(portfolioTotalReturnPercent - benchmarkTotalReturnPercent).toFixed(2);

    return {
      symbol: 'NIFTY 50',
      name: 'NIFTY 50 Benchmark Index',
      range: range.toUpperCase(),
      points,
      portfolioTotalReturnPercent,
      benchmarkTotalReturnPercent,
      excessReturnPercent,
      disclaimer: 'Benchmark comparison is provided strictly for educational performance attribution and does not constitute an investment recommendation or financial advice.',
    };
  }
}

export const performanceAnalyticsService = new PerformanceAnalyticsService();
