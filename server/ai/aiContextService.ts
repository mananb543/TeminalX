/**
 * TerminalX - AI Context Engine
 * Assembles sanitized, structured financial telemetry for AI inference.
 * Completely excludes credentials, passwords, tokens, and private user identifiers.
 */

import { portfolioAnalyticsService } from '../analytics/portfolioAnalyticsService.ts';
import { riskAnalyticsService } from '../analytics/riskAnalyticsService.ts';
import { performanceAnalyticsService } from '../analytics/performanceAnalyticsService.ts';
import { unifiedMarketService } from '../market/marketService.ts';
import { storageService } from '../services/storageService.ts';

export interface StructuredAIContext {
  timestamp: string;
  portfolio: {
    totalValue: number;
    cash: number;
    investedValue: number;
    totalCostBasis: number;
    totalPnL: number;
    totalReturnPercent: number;
    dailyReturnPercent: number;
    dayPnL: number;
    realizedPnL: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    initialCapital: number;
    positionsCount: number;
    winningPositionsCount: number;
    losingPositionsCount: number;
  };
  holdings: Array<{
    symbol: string;
    name: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    marketValue: number;
    portfolioWeightPercent: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    dayPnL: number;
    dayChangePercent: number;
    sector: string;
    exchange: string;
  }>;
  risk: {
    riskFreeRateAssumption: number;
    volatilityAnnualizedPercent: number | null;
    volatilityStatus: string;
    sharpeRatio: number | null;
    sharpeStatus: string;
    betaToNifty50: number | null;
    betaStatus: string;
    alphaAnnualizedPercent: number | null;
    alphaStatus: string;
    maxDrawdownPercent: number;
    maxDrawdownDurationDays: number;
    historicalVaR95Percent: number | null;
    historicalVaR95Amount: number | null;
    concentrationHHI: number;
    largestPositionPercent: number;
    top3PositionsPercent: number;
    cashWeightPercent: number;
  };
  trading: {
    totalTrades: number;
    winRatePercent: number;
    profitFactor: number | null;
    grossProfit: number;
    grossLoss: number;
    avgWinningTradeAmount: number;
    avgLosingTradeAmount: number;
    avgHoldingPeriodHours: number;
    recentTransactions: Array<{
      symbol: string;
      type: 'BUY' | 'SELL';
      quantity: number;
      price: number;
      total: number;
      date: string;
    }>;
  };
  benchmark: {
    benchmarkName: string;
    range: string;
    portfolioReturnPercent: number;
    benchmarkReturnPercent: number;
    relativeAlphaPercent: number;
    correlation: number | null;
  };
  marketContext: {
    activeProvider: string;
    nifty50Quote: {
      price: number;
      change: number;
      changePercent: number;
    } | null;
    topQuotes: Array<{
      symbol: string;
      price: number;
      changePercent: number;
    }>;
    recentMacroNews: Array<{
      title: string;
      summary: string;
      source: string;
      sentiment: string;
    }>;
  };
}

export class AIContextService {
  /**
   * Builds the comprehensive sanitized quantitative context for a specific user
   */
  public async buildContext(userId: string): Promise<StructuredAIContext> {
    const [summary, risk, allocation, trades, benchmark, rawTransactions, marketOverview] =
      await Promise.all([
        portfolioAnalyticsService.getPortfolioSummary(userId),
        riskAnalyticsService.getRiskMetrics(userId),
        riskAnalyticsService.getAllocation(userId),
        riskAnalyticsService.getTradeAnalytics(userId),
        performanceAnalyticsService.getBenchmarkComparison(userId, '1M').catch(() => null),
        storageService.getTransactions(userId),
        unifiedMarketService.getMarketOverview().catch(() => null),
      ]);

    // Sanitized transactions (top 8, excluding user ID or private metadata)
    const recentTransactions = rawTransactions.slice(0, 8).map((tx) => ({
      symbol: tx.symbol,
      type: tx.type,
      quantity: tx.quantity,
      price: tx.price,
      total: tx.totalValue,
      date: tx.timestamp.toISOString().split('T')[0],
    }));

    // Find benchmark quote
    const niftyQuote =
      marketOverview?.indianIndices.find((idx) => idx.symbol.includes('NIFTY 50')) || null;

    // Filter relevant market quotes based on user holdings or top equities
    const holdingSymbols = new Set(summary.holdings.map((h) => h.symbol.toUpperCase()));
    const relevantQuotes: Array<{ symbol: string; price: number; changePercent: number }> = [];

    if (marketOverview?.topEquities) {
      for (const eq of marketOverview.topEquities) {
        if (holdingSymbols.has(eq.symbol.toUpperCase()) || relevantQuotes.length < 5) {
          relevantQuotes.push({
            symbol: eq.symbol,
            price: eq.price,
            changePercent: eq.changePercent ?? 0,
          });
        }
      }
    }

    // Macro news summary
    const macroNews = unifiedMarketService
      .getNews()
      .slice(0, 3)
      .map((item) => ({
        title: item.title,
        summary: item.summary,
        source: item.source,
        sentiment: item.sentiment,
      }));

    return {
      timestamp: new Date().toISOString(),
      portfolio: {
        totalValue: summary.totalPortfolioValue,
        cash: summary.cashBalance,
        investedValue: summary.investedValue,
        totalCostBasis: summary.totalCostBasis,
        totalPnL: summary.totalPnL,
        totalReturnPercent: summary.totalReturnPercent,
        dailyReturnPercent: summary.dayReturnPercent,
        dayPnL: summary.dayPnL,
        realizedPnL: summary.realizedPnL,
        unrealizedPnL: summary.unrealizedPnL,
        unrealizedPnLPercent: summary.unrealizedPnLPercent,
        initialCapital: summary.initialCapital,
        positionsCount: summary.positionsCount,
        winningPositionsCount: summary.winningPositionsCount,
        losingPositionsCount: summary.losingPositionsCount,
      },
      holdings: summary.holdings.map((h) => ({
        symbol: h.symbol,
        name: h.name,
        quantity: h.quantity,
        averagePrice: h.averagePrice,
        currentPrice: h.currentPrice,
        marketValue: h.marketValue,
        portfolioWeightPercent: h.weightPercent,
        unrealizedPnL: h.unrealizedPnL,
        unrealizedPnLPercent: h.unrealizedPnLPercent,
        dayPnL: h.dayPnL,
        dayChangePercent: h.dayChangePercent,
        sector: h.sector,
        exchange: h.exchange,
      })),
      risk: {
        riskFreeRateAssumption: risk.riskFreeRate,
        volatilityAnnualizedPercent: risk.volatility.value,
        volatilityStatus: risk.volatility.status,
        sharpeRatio: risk.sharpeRatio.value,
        sharpeStatus: risk.sharpeRatio.status,
        betaToNifty50: risk.beta.value,
        betaStatus: risk.beta.status,
        alphaAnnualizedPercent: risk.alpha.value,
        alphaStatus: risk.alpha.status,
        maxDrawdownPercent: risk.maxDrawdown.maxDrawdownPercent,
        maxDrawdownDurationDays: risk.maxDrawdown.drawdownDurationDays,
        historicalVaR95Percent: risk.valueAtRisk95.value?.percent ?? null,
        historicalVaR95Amount: risk.valueAtRisk95.value?.amount ?? null,
        concentrationHHI: allocation.concentration.herfindahlIndex,
        largestPositionPercent: allocation.concentration.largestPositionPercent,
        top3PositionsPercent: allocation.concentration.top3PositionsPercent,
        cashWeightPercent: allocation.cashAllocation.weightPercent,
      },
      trading: {
        totalTrades: trades.totalTrades,
        winRatePercent: trades.winRatePercent,
        profitFactor: trades.profitFactor,
        grossProfit: trades.grossProfit,
        grossLoss: trades.grossLoss,
        avgWinningTradeAmount: trades.avgWinningTradeAmount,
        avgLosingTradeAmount: trades.avgLosingTradeAmount,
        avgHoldingPeriodHours: trades.avgHoldingPeriodHours,
        recentTransactions,
      },
      benchmark: {
        benchmarkName: benchmark?.name || 'NIFTY 50',
        range: benchmark?.range || '1M',
        portfolioReturnPercent: benchmark?.portfolioTotalReturnPercent || 0,
        benchmarkReturnPercent: benchmark?.benchmarkTotalReturnPercent || 0,
        relativeAlphaPercent: benchmark?.excessReturnPercent || 0,
        correlation: null,
      },
      marketContext: {
        activeProvider: marketOverview?.provider || 'demo',
        nifty50Quote: niftyQuote
          ? {
              price: niftyQuote.price,
              change: niftyQuote.change ?? 0,
              changePercent: niftyQuote.changePercent ?? 0,
            }
          : null,
        topQuotes: relevantQuotes,
        recentMacroNews: macroNews,
      },
    };
  }
}

export const aiContextService = new AIContextService();
