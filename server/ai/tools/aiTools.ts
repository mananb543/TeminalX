/**
 * TerminalX - Controlled Server-Side AI Tools
 * Server-authoritative tool definitions and execution handlers for portfolio, risk, and market queries.
 */

import { Type, FunctionDeclaration } from '@google/genai';
import { portfolioAnalyticsService } from '../../analytics/portfolioAnalyticsService.ts';
import { riskAnalyticsService } from '../../analytics/riskAnalyticsService.ts';
import { performanceAnalyticsService } from '../../analytics/performanceAnalyticsService.ts';
import { unifiedMarketService } from '../../market/marketService.ts';
import { storageService } from '../../services/storageService.ts';

export const AI_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'getPortfolioSummary',
    description: 'Retrieve user current portfolio summary: total equity value, cash balance, invested capital, total P&L, day P&L, and win rate.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getPortfolioHoldings',
    description: 'Retrieve all current portfolio positions with real-time market prices, weights, day changes, and unrealized P&L.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getPortfolioPerformance',
    description: 'Retrieve historical portfolio performance equity curve, daily returns, and cumulative returns over a specific timeframe.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        range: {
          type: Type.STRING,
          description: 'Timeframe range: "1W", "1M", "3M", "6M", "1Y", or "ALL"',
        },
      },
      required: ['range'],
    },
  },
  {
    name: 'getPortfolioRisk',
    description: 'Retrieve institutional risk metrics: annualized volatility %, Sharpe ratio, Beta against NIFTY 50, Alpha %, Maximum Drawdown %, and 95% Historical Value-at-Risk (VaR).',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getPortfolioAllocation',
    description: 'Retrieve asset allocation breakdowns by individual securities, economic sectors, cash percentage, and Herfindahl-Hirschman Index (HHI) concentration score.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getTradeAnalytics',
    description: 'Retrieve trade execution metrics: win rate %, profit factor, gross profit/loss, average winning/losing trade, and average holding period.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getRecentTransactions',
    description: 'Retrieve recent trade transactions and order executions for the user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: {
          type: Type.NUMBER,
          description: 'Maximum number of transactions to return (default 10).',
        },
      },
    },
  },
  {
    name: 'getMarketQuote',
    description: 'Retrieve real-time market quote, day price change, high, low, and volume for a specific stock or index symbol (e.g. RELIANCE, TCS, NIFTY 50).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        symbol: {
          type: Type.STRING,
          description: 'Security symbol (e.g., RELIANCE, TCS, INFY, NIFTY 50)',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'getMarketHistory',
    description: 'Retrieve historical OHLCV candlestick data for a security over a timeframe.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        symbol: {
          type: Type.STRING,
          description: 'Security symbol',
        },
        range: {
          type: Type.STRING,
          description: 'Time range: 1D, 1W, 1M, 3M, 1Y',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'getBenchmarkComparison',
    description: 'Retrieve normalized performance comparison between user portfolio and the benchmark index (NIFTY 50).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        range: {
          type: Type.STRING,
          description: 'Comparison range: 1W, 1M, 3M, 6M, 1Y, or ALL',
        },
      },
      required: ['range'],
    },
  },
];

export async function executeAITool(
  toolName: string,
  args: Record<string, any>,
  userId: string
): Promise<any> {
  switch (toolName) {
    case 'getPortfolioSummary': {
      const summary = await portfolioAnalyticsService.getPortfolioSummary(userId);
      return {
        totalPortfolioValue: summary.totalPortfolioValue,
        cashBalance: summary.cashBalance,
        investedValue: summary.investedValue,
        totalCostBasis: summary.totalCostBasis,
        totalPnL: summary.totalPnL,
        totalReturnPercent: summary.totalReturnPercent,
        dayPnL: summary.dayPnL,
        dayReturnPercent: summary.dayReturnPercent,
        positionsCount: summary.positionsCount,
        winningPositionsCount: summary.winningPositionsCount,
        losingPositionsCount: summary.losingPositionsCount,
        winRatePercent: summary.winRatePercent,
        initialCapital: summary.initialCapital,
      };
    }

    case 'getPortfolioHoldings': {
      const summary = await portfolioAnalyticsService.getPortfolioSummary(userId);
      return summary.holdings.map((h) => ({
        symbol: h.symbol,
        name: h.name,
        quantity: h.quantity,
        averagePrice: h.averagePrice,
        currentPrice: h.currentPrice,
        marketValue: h.marketValue,
        weightPercent: h.weightPercent,
        unrealizedPnL: h.unrealizedPnL,
        unrealizedPnLPercent: h.unrealizedPnLPercent,
        dayPnL: h.dayPnL,
        dayChangePercent: h.dayChangePercent,
        sector: h.sector,
      }));
    }

    case 'getPortfolioPerformance': {
      const range = args.range || '1M';
      const history = await performanceAnalyticsService.getPerformanceHistory(userId, range as any);
      return {
        range,
        pointsCount: history.length,
        points: history.map((p) => ({
          date: p.date,
          totalValue: p.totalValue,
          dailyReturnPercent: p.dailyReturnPercent,
          cumulativeReturnPercent: p.cumulativeReturnPercent,
        })),
      };
    }

    case 'getPortfolioRisk': {
      const risk = await riskAnalyticsService.getRiskMetrics(userId);
      return {
        volatilityPercent: risk.volatility.value,
        volatilityStatus: risk.volatility.status,
        sharpeRatio: risk.sharpeRatio.value,
        sharpeStatus: risk.sharpeRatio.status,
        betaToNifty50: risk.beta.value,
        betaStatus: risk.beta.status,
        alphaPercent: risk.alpha.value,
        alphaStatus: risk.alpha.status,
        maxDrawdownPercent: risk.maxDrawdown.maxDrawdownPercent,
        maxDrawdownDurationDays: risk.maxDrawdown.drawdownDurationDays,
        valueAtRisk95Percent: risk.valueAtRisk95.value?.percent ?? null,
        valueAtRisk95Amount: risk.valueAtRisk95.value?.amount ?? null,
        riskFreeRateAssumption: risk.riskFreeRate,
        observationsCount: risk.observationsCount,
      };
    }

    case 'getPortfolioAllocation': {
      const allocation = await riskAnalyticsService.getAllocation(userId);
      return {
        totalPortfolioValue: allocation.totalPortfolioValue,
        cashWeightPercent: allocation.cashAllocation.weightPercent,
        largestPositionPercent: allocation.concentration.largestPositionPercent,
        top3PositionsPercent: allocation.concentration.top3PositionsPercent,
        herfindahlIndex: allocation.concentration.herfindahlIndex,
        sectors: allocation.sectors.map((s) => ({
          sector: s.sector,
          weightPercent: s.weightPercent,
          symbolsCount: s.symbolsCount,
        })),
        securities: allocation.securities.map((s) => ({
          symbol: s.symbol,
          weightPercent: s.weightPercent,
          marketValue: s.marketValue,
        })),
      };
    }

    case 'getTradeAnalytics': {
      const trades = await riskAnalyticsService.getTradeAnalytics(userId);
      return {
        totalTrades: trades.totalTrades,
        closedTradesCount: trades.closedTradesCount,
        winningTradesCount: trades.winningTradesCount,
        losingTradesCount: trades.losingTradesCount,
        winRatePercent: trades.winRatePercent,
        grossProfit: trades.grossProfit,
        grossLoss: trades.grossLoss,
        profitFactor: trades.profitFactor,
        avgWinningTradeAmount: trades.avgWinningTradeAmount,
        avgLosingTradeAmount: trades.avgLosingTradeAmount,
        avgHoldingPeriodHours: trades.avgHoldingPeriodHours,
      };
    }

    case 'getRecentTransactions': {
      const limit = Number(args.limit) || 10;
      const transactions = await storageService.getTransactions(userId);
      return transactions.slice(0, limit).map((t) => ({
        id: t.id,
        symbol: t.symbol,
        type: t.type,
        quantity: t.quantity,
        price: t.price,
        total: t.totalValue,
        timestamp: t.timestamp.toISOString(),
      }));
    }

    case 'getMarketQuote': {
      const sym = String(args.symbol || '').toUpperCase().trim();
      if (!sym) throw new Error('Missing symbol parameter');
      const quote = await unifiedMarketService.getQuote(sym);
      if (!quote) return { error: `Quote not found for ${sym}` };
      return {
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        high: quote.high,
        low: quote.low,
        volume: quote.volume,
        currency: quote.currency,
        updatedAt: quote.timestamp,
      };
    }

    case 'getMarketHistory': {
      const sym = String(args.symbol || '').toUpperCase().trim();
      const range = String(args.range || '1M');
      const candles = await unifiedMarketService.getHistoricalData(sym, '1D', range);
      return {
        symbol: sym,
        range,
        candleCount: candles.length,
        candles: candles.slice(-30), // return last 30 candles for context
      };
    }

    case 'getBenchmarkComparison': {
      const range = args.range || '1M';
      const benchmark = await performanceAnalyticsService.getBenchmarkComparison(userId, range as any);
      return benchmark;
    }

    default:
      throw new Error(`Unknown AI tool declaration: ${toolName}`);
  }
}
