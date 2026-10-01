/**
 * TerminalX - Portfolio Analytics Service
 * Quantitative portfolio summary, mark-to-market valuation, and position P&L attribution.
 */

import { storageService, StorageHolding, StorageTransaction } from '../services/storageService.ts';
import { unifiedMarketService } from '../market/marketService.ts';
import { INITIAL_VIRTUAL_BALANCE } from '../models/User.ts';

export interface EnrichedHoldingDetail {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  dayPnL: number;
  weightPercent: number;
  sector: string;
  exchange: string;
  currency: 'INR' | 'USD';
  isWinning: boolean;
}

export interface PortfolioSummaryMetrics {
  totalPortfolioValue: number;
  cashBalance: number;
  investedValue: number;
  totalCostBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalPnL: number;
  totalReturnPercent: number;
  dayPnL: number;
  dayReturnPercent: number;
  positionsCount: number;
  winningPositionsCount: number;
  losingPositionsCount: number;
  winRatePercent: number;
  initialCapital: number;
  holdings: EnrichedHoldingDetail[];
  updatedAt: string;
}

export class PortfolioAnalyticsService {
  /**
   * Calculate Realized P&L from all closed trade cycles (matching BUY and SELL transactions)
   */
  public calculateRealizedPnL(transactions: StorageTransaction[]): number {
    // Sort transactions chronologically
    const chronological = [...transactions].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Track buy inventory per symbol using FIFO: Array of { quantity, price }
    const inventory: Record<string, { quantity: number; price: number }[]> = {};
    let totalRealizedPnL = 0;

    for (const tx of chronological) {
      const sym = tx.symbol.toUpperCase().trim();
      if (!inventory[sym]) {
        inventory[sym] = [];
      }

      if (tx.type === 'BUY') {
        inventory[sym].push({ quantity: tx.quantity, price: tx.price });
      } else if (tx.type === 'SELL') {
        let remainingToSell = tx.quantity;
        const sellPrice = tx.price;

        while (remainingToSell > 0 && inventory[sym].length > 0) {
          const lot = inventory[sym][0];
          const matchedQty = Math.min(remainingToSell, lot.quantity);
          const pnlForLot = (sellPrice - lot.price) * matchedQty;
          totalRealizedPnL += pnlForLot;

          lot.quantity -= matchedQty;
          remainingToSell -= matchedQty;

          if (lot.quantity === 0) {
            inventory[sym].shift();
          }
        }
      }
    }

    return +totalRealizedPnL.toFixed(2);
  }

  /**
   * Get comprehensive live portfolio summary for an authenticated user
   */
  public async getPortfolioSummary(userId: string): Promise<PortfolioSummaryMetrics> {
    const user = await storageService.findUserById(userId);
    const cashBalance = user ? user.balance : INITIAL_VIRTUAL_BALANCE;
    const initialCapital = INITIAL_VIRTUAL_BALANCE;

    const [rawHoldings, rawTransactions] = await Promise.all([
      storageService.getHoldings(userId),
      storageService.getTransactions(userId),
    ]);

    // Calculate Realized P&L
    const realizedPnL = this.calculateRealizedPnL(rawTransactions);

    // Fetch live quotes for all active holdings
    let totalHoldingsMarketValue = 0;
    let totalCostBasis = 0;
    let totalDayPnL = 0;
    let winningCount = 0;
    let losingCount = 0;

    const enrichedHoldings: Omit<EnrichedHoldingDetail, 'weightPercent'>[] = await Promise.all(
      rawHoldings.map(async (h) => {
        let currentPrice = h.averagePrice;
        let dayChange = 0;
        let dayChangePercent = 0;
        let name = h.symbol;
        let sector = 'Indian Equities';
        let exchange = 'NSE';
        let currency: 'INR' | 'USD' = 'INR';

        try {
          const quote = await unifiedMarketService.getQuote(h.symbol);
          if (quote && quote.price) {
            currentPrice = quote.price;
            dayChange = quote.change || 0;
            dayChangePercent = quote.changePercent || 0;
            name = quote.name || h.symbol;
            sector = quote.sector || 'Indian Equities';
            exchange = quote.exchange || 'NSE';
            currency = quote.currency || 'INR';
          }
        } catch {
          // retain cost basis if upstream temporarily unreachable
        }

        const marketValue = +(h.quantity * currentPrice).toFixed(2);
        const unrealizedPnL = +(marketValue - h.totalCost).toFixed(2);
        const unrealizedPnLPercent =
          h.totalCost > 0 ? +((unrealizedPnL / h.totalCost) * 100).toFixed(2) : 0;
        const dayPnL = +(h.quantity * dayChange).toFixed(2);

        totalHoldingsMarketValue += marketValue;
        totalCostBasis += h.totalCost;
        totalDayPnL += dayPnL;

        const isWinning = unrealizedPnL > 0;
        if (isWinning) winningCount++;
        else if (unrealizedPnL < 0) losingCount++;

        return {
          id: h.id,
          symbol: h.symbol,
          name,
          quantity: h.quantity,
          averagePrice: h.averagePrice,
          totalCost: h.totalCost,
          currentPrice,
          marketValue,
          unrealizedPnL,
          unrealizedPnLPercent,
          dayChange,
          dayChangePercent,
          dayPnL,
          sector,
          exchange,
          currency,
          isWinning,
        };
      })
    );

    const totalPortfolioValue = +(cashBalance + totalHoldingsMarketValue).toFixed(2);
    const totalUnrealizedPnL = +(totalHoldingsMarketValue - totalCostBasis).toFixed(2);
    const unrealizedPnLPercent =
      totalCostBasis > 0 ? +((totalUnrealizedPnL / totalCostBasis) * 100).toFixed(2) : 0;
    const totalPnL = +(realizedPnL + totalUnrealizedPnL).toFixed(2);

    // Total return % based on initial virtual endowment (₹10,00,000)
    const totalReturnPercent =
      initialCapital > 0 ? +((totalPnL / initialCapital) * 100).toFixed(2) : 0;

    // Day return % against baseline morning equity
    const baseValueBeforeToday = totalPortfolioValue - totalDayPnL;
    const dayReturnPercent =
      baseValueBeforeToday > 0 ? +((totalDayPnL / baseValueBeforeToday) * 100).toFixed(2) : 0;

    const positionsCount = enrichedHoldings.length;
    const winRatePercent =
      positionsCount > 0 ? +((winningCount / positionsCount) * 100).toFixed(2) : 0;

    // Attach portfolio weights
    const holdingsWithWeights: EnrichedHoldingDetail[] = enrichedHoldings.map((h) => ({
      ...h,
      weightPercent:
        totalPortfolioValue > 0 ? +((h.marketValue / totalPortfolioValue) * 100).toFixed(2) : 0,
    }));

    // Record snapshot in MongoDB/resilient store asynchronously
    storageService
      .savePortfolioSnapshot({
        userId,
        totalValue: totalPortfolioValue,
        cash: cashBalance,
        investedValue: +totalHoldingsMarketValue.toFixed(2),
        realizedPnL,
        unrealizedPnL: totalUnrealizedPnL,
        timestamp: new Date(),
      })
      .catch(() => {});

    return {
      totalPortfolioValue,
      cashBalance,
      investedValue: +totalHoldingsMarketValue.toFixed(2),
      totalCostBasis: +totalCostBasis.toFixed(2),
      unrealizedPnL: totalUnrealizedPnL,
      unrealizedPnLPercent,
      realizedPnL,
      totalPnL,
      totalReturnPercent,
      dayPnL: +totalDayPnL.toFixed(2),
      dayReturnPercent,
      positionsCount,
      winningPositionsCount: winningCount,
      losingPositionsCount: losingCount,
      winRatePercent,
      initialCapital,
      holdings: holdingsWithWeights,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const portfolioAnalyticsService = new PortfolioAnalyticsService();
