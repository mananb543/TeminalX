/**
 * TerminalX - Quantitative Risk & Trade Analytics Engine
 * Calculates annualized volatility, Sharpe ratio, beta against NIFTY 50, alpha,
 * maximum drawdown, historical VaR, asset/sector allocations, and trade attribution.
 */

import { storageService, StorageTransaction, StorageHolding } from '../services/storageService.ts';
import { portfolioAnalyticsService, PortfolioSummaryMetrics } from './portfolioAnalyticsService.ts';
import { performanceAnalyticsService } from './performanceAnalyticsService.ts';
import { unifiedMarketService } from '../market/marketService.ts';
import { OHLCVCandle } from '../market/providers/MarketDataProvider.ts';

export interface MetricWithSufficiency<T> {
  value: T | null;
  status: 'CALCULATED' | 'INSUFFICIENT_DATA';
  message?: string;
}

export interface RiskMetricsResult {
  riskFreeRate: number;
  observationsCount: number;
  volatility: MetricWithSufficiency<number>; // Annualized %
  sharpeRatio: MetricWithSufficiency<number>;
  maxDrawdown: {
    maxDrawdownPercent: number;
    drawdownDurationDays: number;
    peakValue: number;
    troughValue: number;
    peakDate: string;
    troughDate: string;
  };
  beta: MetricWithSufficiency<number>;
  alpha: MetricWithSufficiency<number>; // Annualized %
  valueAtRisk95: MetricWithSufficiency<{
    amount: number;
    percent: number;
    confidenceLevel: string;
    horizon: string;
  }>;
  updatedAt: string;
}

export interface SecurityAllocationItem {
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  weightPercent: number;
  sector: string;
  exchange: string;
}

export interface SectorAllocationItem {
  sector: string;
  marketValue: number;
  weightPercent: number;
  symbolsCount: number;
  symbols: string[];
}

export interface AssetClassAllocationItem {
  assetClass: 'EQUITIES' | 'CASH';
  label: string;
  marketValue: number;
  weightPercent: number;
}

export interface PortfolioAllocationResult {
  totalPortfolioValue: number;
  cashAllocation: {
    marketValue: number;
    weightPercent: number;
  };
  securities: SecurityAllocationItem[];
  sectors: SectorAllocationItem[];
  assetClasses: AssetClassAllocationItem[];
  concentration: {
    largestPositionPercent: number;
    top3PositionsPercent: number;
    top5PositionsPercent: number;
    numberOfPositions: number;
    cashAllocationPercent: number;
    herfindahlIndex: number;
  };
}

export interface ClosedTradeRecord {
  id: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyTotal: number;
  sellTotal: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  buyDate: Date;
  sellDate: Date;
  holdingPeriodHours: number;
  isWinning: boolean;
}

export interface TradeAnalyticsResult {
  totalTrades: number;
  buyOrdersCount: number;
  sellOrdersCount: number;
  closedTradesCount: number;
  winningTradesCount: number;
  losingTradesCount: number;
  breakEvenTradesCount: number;
  winRatePercent: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  avgWinningTradeAmount: number;
  avgLosingTradeAmount: number;
  largestWinningTrade: number;
  largestLosingTrade: number;
  avgHoldingPeriodHours: number;
  recentClosedTrades: ClosedTradeRecord[];
}

export class RiskAnalyticsService {
  private getRiskFreeRate(): number {
    return parseFloat(process.env.PORTFOLIO_RISK_FREE_RATE || '0.06');
  }

  /**
   * Calculate all institutional risk metrics
   */
  public async getRiskMetrics(userId: string): Promise<RiskMetricsResult> {
    const riskFreeRate = this.getRiskFreeRate();
    const history = await performanceAnalyticsService.getPerformanceHistory(userId, '3M');

    // Extract non-zero daily returns for volatility and Sharpe calculation
    // Daily returns array: r_t = (V_t - V_{t-1}) / V_{t-1}
    const dailyReturns = history
      .slice(1)
      .map((pt) => pt.dailyReturnPercent / 100);

    const observationsCount = dailyReturns.length;

    // 1. Calculate Maximum Drawdown across the history
    let peakValue = history.length > 0 ? history[0].totalValue : 0;
    let peakDate = history.length > 0 ? history[0].date : '';
    let maxDrawdownPercent = 0;
    let troughValue = peakValue;
    let troughDate = peakDate;
    let maxDrawdownDurationDays = 0;
    let currentDrawdownStartDays = 0;

    for (let i = 0; i < history.length; i++) {
      const pt = history[i];
      if (pt.totalValue > peakValue) {
        peakValue = pt.totalValue;
        peakDate = pt.date;
        currentDrawdownStartDays = 0;
      } else {
        currentDrawdownStartDays++;
        const dd = peakValue > 0 ? (pt.totalValue - peakValue) / peakValue : 0;
        if (dd < maxDrawdownPercent) {
          maxDrawdownPercent = dd;
          troughValue = pt.totalValue;
          troughDate = pt.date;
        }
        if (currentDrawdownStartDays > maxDrawdownDurationDays) {
          maxDrawdownDurationDays = currentDrawdownStartDays;
        }
      }
    }

    const maxDrawdown = {
      maxDrawdownPercent: +(maxDrawdownPercent * 100).toFixed(2),
      drawdownDurationDays: maxDrawdownDurationDays,
      peakValue,
      troughValue,
      peakDate,
      troughDate,
    };

    // Check data sufficiency threshold: minimum 5 observations required for statistically meaningful parameters
    const MIN_OBSERVATIONS = 5;

    // Volatility calculation
    let volatility: MetricWithSufficiency<number>;
    let sharpeRatio: MetricWithSufficiency<number>;
    let beta: MetricWithSufficiency<number>;
    let alpha: MetricWithSufficiency<number>;
    let valueAtRisk95: MetricWithSufficiency<{
      amount: number;
      percent: number;
      confidenceLevel: string;
      horizon: string;
    }>;

    if (observationsCount < MIN_OBSERVATIONS) {
      volatility = {
        value: null,
        status: 'INSUFFICIENT_DATA',
        message: `Insufficient history (minimum ${MIN_OBSERVATIONS} daily snapshots required).`,
      };
      sharpeRatio = {
        value: null,
        status: 'INSUFFICIENT_DATA',
        message: `Insufficient history (minimum ${MIN_OBSERVATIONS} daily observations required).`,
      };
      beta = {
        value: null,
        status: 'INSUFFICIENT_DATA',
        message: `Insufficient history (minimum ${MIN_OBSERVATIONS} daily observations required).`,
      };
      alpha = {
        value: null,
        status: 'INSUFFICIENT_DATA',
        message: `Insufficient history (minimum ${MIN_OBSERVATIONS} daily observations required).`,
      };
      valueAtRisk95 = {
        value: null,
        status: 'INSUFFICIENT_DATA',
        message: `Insufficient history (minimum ${MIN_OBSERVATIONS} daily returns required for historical VaR).`,
      };
    } else {
      // Mean return
      const meanReturn = dailyReturns.reduce((acc, r) => acc + r, 0) / observationsCount;

      // Sample variance & standard deviation
      const variance =
        dailyReturns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / (observationsCount - 1);
      const dailyStdDev = Math.sqrt(variance);

      // Annualized Volatility: sigma_annual = sigma_daily * sqrt(252)
      const annualizedVol = dailyStdDev * Math.sqrt(252);
      volatility = {
        value: +(annualizedVol * 100).toFixed(2),
        status: 'CALCULATED',
      };

      // Sharpe Ratio: (Annualized Return - Risk Free Rate) / Annualized Volatility
      const annualizedReturn = meanReturn * 252;
      if (annualizedVol > 0.0001) {
        const sharpe = (annualizedReturn - riskFreeRate) / annualizedVol;
        sharpeRatio = {
          value: +sharpe.toFixed(2),
          status: 'CALCULATED',
        };
      } else {
        sharpeRatio = {
          value: null,
          status: 'INSUFFICIENT_DATA',
          message: 'Portfolio volatility is zero or negligible.',
        };
      }

      // Historical VaR (95% Confidence 1-Day)
      // Sort daily returns in ascending order and find the 5th percentile
      const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
      const p5Index = Math.max(0, Math.floor(sortedReturns.length * 0.05));
      const p5Return = sortedReturns[p5Index];
      const latestValue = history.length > 0 ? history[history.length - 1].totalValue : 0;
      const varLossPercent = Math.max(0, -p5Return * 100);
      const varLossAmount = +((varLossPercent / 100) * latestValue).toFixed(2);

      valueAtRisk95 = {
        value: {
          amount: varLossAmount,
          percent: +varLossPercent.toFixed(2),
          confidenceLevel: '95%',
          horizon: '1-Day',
        },
        status: 'CALCULATED',
      };

      // Calculate Beta and Alpha against NIFTY 50
      let niftyCandles: OHLCVCandle[] = [];
      try {
        niftyCandles = await unifiedMarketService.getHistoricalData('NIFTY 50', '1D', '3M');
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

      // Build matched daily return pairs
      const matchedPairs: { rP: number; rM: number }[] = [];
      for (let i = 1; i < history.length; i++) {
        const prevDate = history[i - 1].date;
        const currDate = history[i].date;
        const prevNifty = niftyMap.get(prevDate);
        const currNifty = niftyMap.get(currDate);

        if (prevNifty && currNifty && prevNifty > 0) {
          const rP = (history[i].totalValue - history[i - 1].totalValue) / history[i - 1].totalValue;
          const rM = (currNifty - prevNifty) / prevNifty;
          matchedPairs.push({ rP, rM });
        }
      }

      if (matchedPairs.length >= MIN_OBSERVATIONS) {
        const meanP = matchedPairs.reduce((acc, p) => acc + p.rP, 0) / matchedPairs.length;
        const meanM = matchedPairs.reduce((acc, p) => acc + p.rM, 0) / matchedPairs.length;

        let cov = 0;
        let varM = 0;
        for (const p of matchedPairs) {
          cov += (p.rP - meanP) * (p.rM - meanM);
          varM += Math.pow(p.rM - meanM, 2);
        }
        cov /= matchedPairs.length - 1;
        varM /= matchedPairs.length - 1;

        if (varM > 0.000001) {
          const betaVal = cov / varM;
          beta = {
            value: +betaVal.toFixed(2),
            status: 'CALCULATED',
          };

          // Jensen's Alpha = (R_p - R_f) - Beta * (R_m - R_f)
          const benchmarkAnnualizedReturn = meanM * 252;
          const alphaVal = (annualizedReturn - riskFreeRate) - betaVal * (benchmarkAnnualizedReturn - riskFreeRate);
          alpha = {
            value: +(alphaVal * 100).toFixed(2),
            status: 'CALCULATED',
          };
        } else {
          beta = {
            value: null,
            status: 'INSUFFICIENT_DATA',
            message: 'Benchmark variance insufficient.',
          };
          alpha = {
            value: null,
            status: 'INSUFFICIENT_DATA',
            message: 'Beta unavailable for alpha estimation.',
          };
        }
      } else {
        beta = {
          value: null,
          status: 'INSUFFICIENT_DATA',
          message: `Insufficient concurrent trading observations with NIFTY 50 (${matchedPairs.length}/${MIN_OBSERVATIONS}).`,
        };
        alpha = {
          value: null,
          status: 'INSUFFICIENT_DATA',
          message: 'Insufficient history for alpha calculation.',
        };
      }
    }

    return {
      riskFreeRate,
      observationsCount,
      volatility,
      sharpeRatio,
      maxDrawdown,
      beta,
      alpha,
      valueAtRisk95,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate Portfolio Asset & Sector Allocations and Concentration Analysis
   */
  public async getAllocation(userId: string): Promise<PortfolioAllocationResult> {
    const summary = await portfolioAnalyticsService.getPortfolioSummary(userId);
    const totalVal = summary.totalPortfolioValue;

    const securities: SecurityAllocationItem[] = summary.holdings.map((h) => ({
      symbol: h.symbol,
      name: h.name,
      quantity: h.quantity,
      currentPrice: h.currentPrice,
      marketValue: h.marketValue,
      weightPercent: h.weightPercent,
      sector: h.sector,
      exchange: h.exchange,
    }));

    // Group by Sector
    const sectorMap = new Map<string, { value: number; symbols: string[] }>();
    for (const s of securities) {
      const sec = s.sector || 'Unclassified';
      const existing = sectorMap.get(sec) || { value: 0, symbols: [] };
      existing.value += s.marketValue;
      existing.symbols.push(s.symbol);
      sectorMap.set(sec, existing);
    }

    const sectors: SectorAllocationItem[] = Array.from(sectorMap.entries())
      .map(([secName, data]) => ({
        sector: secName,
        marketValue: +data.value.toFixed(2),
        weightPercent: totalVal > 0 ? +((data.value / totalVal) * 100).toFixed(2) : 0,
        symbolsCount: data.symbols.length,
        symbols: data.symbols,
      }))
      .sort((a, b) => b.marketValue - a.marketValue);

    // Cash and Equities Asset Classes
    const cashAllocation = {
      marketValue: summary.cashBalance,
      weightPercent: totalVal > 0 ? +((summary.cashBalance / totalVal) * 100).toFixed(2) : 100,
    };

    const assetClasses: AssetClassAllocationItem[] = [
      {
        assetClass: 'EQUITIES',
        label: 'Indian Equities',
        marketValue: summary.investedValue,
        weightPercent: totalVal > 0 ? +((summary.investedValue / totalVal) * 100).toFixed(2) : 0,
      },
      {
        assetClass: 'CASH',
        label: 'Virtual Cash Balance',
        marketValue: summary.cashBalance,
        weightPercent: cashAllocation.weightPercent,
      },
    ];

    // Concentration analysis: factual metrics
    const sortedHoldings = [...securities].sort((a, b) => b.weightPercent - a.weightPercent);
    const largestPositionPercent = sortedHoldings.length > 0 ? sortedHoldings[0].weightPercent : 0;
    const top3PositionsPercent = sortedHoldings
      .slice(0, 3)
      .reduce((acc, h) => acc + h.weightPercent, 0);
    const top5PositionsPercent = sortedHoldings
      .slice(0, 5)
      .reduce((acc, h) => acc + h.weightPercent, 0);

    // Herfindahl-Hirschman Index (HHI)
    // HHI = sum of squared market share percentages (ranges from 0 to 10,000)
    let herfindahlIndex = 0;
    if (totalVal > 0) {
      herfindahlIndex += Math.pow(cashAllocation.weightPercent, 2);
      for (const h of securities) {
        herfindahlIndex += Math.pow(h.weightPercent, 2);
      }
    }

    return {
      totalPortfolioValue: totalVal,
      cashAllocation,
      securities,
      sectors,
      assetClasses,
      concentration: {
        largestPositionPercent: +largestPositionPercent.toFixed(2),
        top3PositionsPercent: +top3PositionsPercent.toFixed(2),
        top5PositionsPercent: +top5PositionsPercent.toFixed(2),
        numberOfPositions: securities.length,
        cashAllocationPercent: cashAllocation.weightPercent,
        herfindahlIndex: Math.round(herfindahlIndex),
      },
    };
  }

  /**
   * Trade Analytics: evaluate completed buy/sell executions
   */
  public async getTradeAnalytics(userId: string): Promise<TradeAnalyticsResult> {
    const transactions = await storageService.getTransactions(userId);

    // Sort chronologically
    const chronological = [...transactions].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    let buyOrdersCount = 0;
    let sellOrdersCount = 0;

    // FIFO inventory queue to pair BUY and SELL trades into closed trade rounds
    const inventory: Record<
      string,
      { quantity: number; price: number; timestamp: Date; id: string }[]
    > = {};

    const closedTrades: ClosedTradeRecord[] = [];

    for (const tx of chronological) {
      const sym = tx.symbol.toUpperCase().trim();
      if (!inventory[sym]) inventory[sym] = [];

      if (tx.type === 'BUY') {
        buyOrdersCount++;
        inventory[sym].push({
          quantity: tx.quantity,
          price: tx.price,
          timestamp: tx.timestamp,
          id: tx.id,
        });
      } else if (tx.type === 'SELL') {
        sellOrdersCount++;
        let qtyToMatch = tx.quantity;

        while (qtyToMatch > 0 && inventory[sym].length > 0) {
          const buyLot = inventory[sym][0];
          const matched = Math.min(qtyToMatch, buyLot.quantity);
          const buyTotal = +(matched * buyLot.price).toFixed(2);
          const sellTotal = +(matched * tx.price).toFixed(2);
          const realizedPnL = +(sellTotal - buyTotal).toFixed(2);
          const realizedPnLPercent = buyTotal > 0 ? +((realizedPnL / buyTotal) * 100).toFixed(2) : 0;
          const holdingPeriodHours =
            +(Math.abs(tx.timestamp.getTime() - buyLot.timestamp.getTime()) / (1000 * 60 * 60)).toFixed(1);

          closedTrades.push({
            id: `ct_${tx.id}_${buyLot.id}`,
            symbol: sym,
            quantity: matched,
            buyPrice: buyLot.price,
            sellPrice: tx.price,
            buyTotal,
            sellTotal,
            realizedPnL,
            realizedPnLPercent,
            buyDate: buyLot.timestamp,
            sellDate: tx.timestamp,
            holdingPeriodHours,
            isWinning: realizedPnL > 0,
          });

          buyLot.quantity -= matched;
          qtyToMatch -= matched;
          if (buyLot.quantity === 0) {
            inventory[sym].shift();
          }
        }
      }
    }

    const closedTradesCount = closedTrades.length;
    let winningCount = 0;
    let losingCount = 0;
    let breakEvenCount = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let totalHoldingHours = 0;

    for (const ct of closedTrades) {
      totalHoldingHours += ct.holdingPeriodHours;
      if (ct.realizedPnL > 0) {
        winningCount++;
        grossProfit += ct.realizedPnL;
        if (ct.realizedPnL > largestWin) largestWin = ct.realizedPnL;
      } else if (ct.realizedPnL < 0) {
        losingCount++;
        const lossAbs = Math.abs(ct.realizedPnL);
        grossLoss += lossAbs;
        if (lossAbs > largestLoss) largestLoss = lossAbs;
      } else {
        breakEvenCount++;
      }
    }

    const winRatePercent =
      closedTradesCount > 0 ? +((winningCount / closedTradesCount) * 100).toFixed(2) : 0;

    // Profit factor = Gross Profit / Gross Loss (safe division by zero)
    let profitFactor: number | null = null;
    if (closedTradesCount > 0) {
      if (grossLoss > 0) {
        profitFactor = +(grossProfit / grossLoss).toFixed(2);
      } else if (grossProfit > 0) {
        profitFactor = +grossProfit.toFixed(2); // no losses
      } else {
        profitFactor = 1.0;
      }
    }

    const avgWinningTradeAmount =
      winningCount > 0 ? +(grossProfit / winningCount).toFixed(2) : 0;
    const avgLosingTradeAmount =
      losingCount > 0 ? +(grossLoss / losingCount).toFixed(2) : 0;
    const avgHoldingPeriodHours =
      closedTradesCount > 0 ? +(totalHoldingHours / closedTradesCount).toFixed(1) : 0;

    return {
      totalTrades: transactions.length,
      buyOrdersCount,
      sellOrdersCount,
      closedTradesCount,
      winningTradesCount: winningCount,
      losingTradesCount: losingCount,
      breakEvenTradesCount: breakEvenCount,
      winRatePercent,
      grossProfit: +grossProfit.toFixed(2),
      grossLoss: +grossLoss.toFixed(2),
      profitFactor,
      avgWinningTradeAmount,
      avgLosingTradeAmount,
      largestWinningTrade: +largestWin.toFixed(2),
      largestLosingTrade: +largestLoss.toFixed(2),
      avgHoldingPeriodHours,
      recentClosedTrades: closedTrades.slice(-10).reverse(),
    };
  }
}

export const riskAnalyticsService = new RiskAnalyticsService();
