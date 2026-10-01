/**
 * TerminalX - Paper Trading Execution Engine
 * Core simulated trading logic handling order placement, execution, balance verification,
 * portfolio holdings reconciliation, and realized/unrealized P&L calculations.
 */

import { OrderSide, OrderType, OrderStatus } from '../models/Order.ts';
import { marketService } from './marketService.ts';

export interface SimulatedUser {
  id: string;
  name: string;
  email: string;
  balance: number;
}

export interface SimulatedHolding {
  id?: string;
  userId: string;
  symbol: string;
  companyName?: string;
  exchange?: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice?: number;
  currentValue?: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;
  updatedAt?: Date;
}

export interface SimulatedOrder {
  id: string;
  userId: string;
  symbol: string;
  companyName: string;
  type: OrderSide;
  orderType: OrderType;
  quantity: number;
  price: number;
  totalValue: number;
  status: OrderStatus;
  executionPrice?: number;
  executedAt?: Date;
  timestamp: Date;
}

export interface SimulatedTransaction {
  id: string;
  userId: string;
  orderId: string;
  symbol: string;
  companyName: string;
  type: OrderSide;
  quantity: number;
  price: number;
  totalValue: number;
  brokerageFee: number;
  netAmount: number;
  realizedPnL?: number;
  timestamp: Date;
}

export interface ExecuteOrderParams {
  userId: string;
  symbol: string;
  type: OrderSide;
  orderType: OrderType;
  quantity: number;
  limitPrice?: number;
}

export interface TradingExecutionResult {
  success: boolean;
  message: string;
  order?: SimulatedOrder;
  transaction?: SimulatedTransaction;
  holding?: SimulatedHolding | null;
  updatedBalance?: number;
}

export class TradingService {
  /**
   * Validate and execute paper trade
   */
  public executeOrder(
    user: SimulatedUser,
    holdings: SimulatedHolding[],
    params: ExecuteOrderParams
  ): TradingExecutionResult {
    const { symbol, type, orderType, quantity, limitPrice } = params;

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return { success: false, message: 'Quantity must be a positive whole integer.' };
    }

    const quote = marketService.getQuote(symbol);
    if (!quote) {
      return { success: false, message: `Market quote for ${symbol} unavailable.` };
    }

    // Determine execution price
    const executionPrice = orderType === 'LIMIT' && limitPrice ? limitPrice : quote.price;
    const totalOrderCost = +(executionPrice * quantity).toFixed(2);

    const now = new Date();
    const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (type === 'BUY') {
      if (user.balance < totalOrderCost) {
        return {
          success: false,
          message: `Insufficient virtual cash. Required: ₹${totalOrderCost.toLocaleString('en-IN')}, Available: ₹${user.balance.toLocaleString('en-IN')}`,
        };
      }

      // Deduct cash
      const newBalance = +(user.balance - totalOrderCost).toFixed(2);

      // Find or create holding
      const existingHoldingIndex = holdings.findIndex((h) => h.symbol === symbol);
      let updatedHolding: SimulatedHolding;

      if (existingHoldingIndex >= 0) {
        const h = holdings[existingHoldingIndex];
        const newQty = h.quantity + quantity;
        const newTotalCost = +(h.totalCost + totalOrderCost).toFixed(2);
        const newAvgPrice = +(newTotalCost / newQty).toFixed(2);

        updatedHolding = {
          ...h,
          quantity: newQty,
          averagePrice: newAvgPrice,
          totalCost: newTotalCost,
          currentPrice: quote.price,
          currentValue: +(newQty * quote.price).toFixed(2),
          unrealizedPnL: +(newQty * quote.price - newTotalCost).toFixed(2),
          unrealizedPnLPercent: +(((newQty * quote.price - newTotalCost) / newTotalCost) * 100).toFixed(2),
          updatedAt: now,
        };
      } else {
        updatedHolding = {
          id: `hld-${Date.now()}`,
          userId: user.id,
          symbol: quote.symbol,
          companyName: quote.name,
          exchange: quote.exchange === 'MCX' || quote.exchange === 'FOREX' ? 'NSE' : quote.exchange,
          quantity,
          averagePrice: executionPrice,
          totalCost: totalOrderCost,
          currentPrice: quote.price,
          currentValue: totalOrderCost,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          updatedAt: now,
        };
      }

      const order: SimulatedOrder = {
        id: orderId,
        userId: user.id,
        symbol: quote.symbol,
        companyName: quote.name,
        type: 'BUY',
        orderType,
        quantity,
        price: executionPrice,
        totalValue: totalOrderCost,
        status: 'COMPLETED',
        executionPrice,
        executedAt: now,
        timestamp: now,
      };

      const transaction: SimulatedTransaction = {
        id: `txn-${Date.now()}`,
        userId: user.id,
        orderId,
        symbol: quote.symbol,
        companyName: quote.name,
        type: 'BUY',
        quantity,
        price: executionPrice,
        totalValue: totalOrderCost,
        brokerageFee: 0,
        netAmount: totalOrderCost,
        timestamp: now,
      };

      return {
        success: true,
        message: `Successfully executed BUY order for ${quantity} shares of ${quote.symbol} at ₹${executionPrice.toLocaleString('en-IN')}`,
        order,
        transaction,
        holding: updatedHolding,
        updatedBalance: newBalance,
      };
    } else {
      // SELL order
      const existingHolding = holdings.find((h) => h.symbol === symbol);
      if (!existingHolding || existingHolding.quantity < quantity) {
        const availableQty = existingHolding ? existingHolding.quantity : 0;
        return {
          success: false,
          message: `Insufficient shares to sell. You currently hold ${availableQty} shares of ${symbol}.`,
        };
      }

      const costBasisForSoldShares = +(existingHolding.averagePrice * quantity).toFixed(2);
      const realizedPnL = +(totalOrderCost - costBasisForSoldShares).toFixed(2);
      const newBalance = +(user.balance + totalOrderCost).toFixed(2);

      let updatedHolding: SimulatedHolding | null = null;
      if (existingHolding.quantity > quantity) {
        const remainingQty = existingHolding.quantity - quantity;
        const remainingCost = +(existingHolding.totalCost - costBasisForSoldShares).toFixed(2);
        updatedHolding = {
          ...existingHolding,
          quantity: remainingQty,
          totalCost: remainingCost,
          currentPrice: quote.price,
          currentValue: +(remainingQty * quote.price).toFixed(2),
          unrealizedPnL: +(remainingQty * quote.price - remainingCost).toFixed(2),
          unrealizedPnLPercent: remainingCost > 0 ? +(((remainingQty * quote.price - remainingCost) / remainingCost) * 100).toFixed(2) : 0,
          updatedAt: now,
        };
      }

      const order: SimulatedOrder = {
        id: orderId,
        userId: user.id,
        symbol: quote.symbol,
        companyName: quote.name,
        type: 'SELL',
        orderType,
        quantity,
        price: executionPrice,
        totalValue: totalOrderCost,
        status: 'COMPLETED',
        executionPrice,
        executedAt: now,
        timestamp: now,
      };

      const transaction: SimulatedTransaction = {
        id: `txn-${Date.now()}`,
        userId: user.id,
        orderId,
        symbol: quote.symbol,
        companyName: quote.name,
        type: 'SELL',
        quantity,
        price: executionPrice,
        totalValue: totalOrderCost,
        brokerageFee: 0,
        netAmount: totalOrderCost,
        realizedPnL,
        timestamp: now,
      };

      return {
        success: true,
        message: `Successfully executed SELL order for ${quantity} shares of ${quote.symbol} at ₹${executionPrice.toLocaleString('en-IN')}`,
        order,
        transaction,
        holding: updatedHolding,
        updatedBalance: newBalance,
      };
    }
  }

  /**
   * Calculate real-time portfolio metrics across all holdings
   */
  public calculatePortfolioSummary(balance: number, holdings: SimulatedHolding[]) {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalDailyPnL = 0;

    const enrichedHoldings = holdings.map((h) => {
      const quote = marketService.getQuote(h.symbol);
      const currentPrice = quote ? quote.price : h.averagePrice;
      const currentValue = +(h.quantity * currentPrice).toFixed(2);
      const unrealizedPnL = +(currentValue - h.totalCost).toFixed(2);
      const unrealizedPnLPercent = h.totalCost > 0 ? +((unrealizedPnL / h.totalCost) * 100).toFixed(2) : 0;

      const dayChangePercent = (quote && quote.changePercent !== null) ? quote.changePercent : 0;
      const dayPnL = +(currentValue * (dayChangePercent / 100)).toFixed(2);

      totalInvested += h.totalCost;
      totalCurrentValue += currentValue;
      totalDailyPnL += dayPnL;

      return {
        ...h,
        currentPrice,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPercent,
      };
    });

    const totalPortfolioValue = +(balance + totalCurrentValue).toFixed(2);
    const totalPnL = +(totalCurrentValue - totalInvested).toFixed(2);
    const totalPnLPercent = totalInvested > 0 ? +((totalPnL / totalInvested) * 100).toFixed(2) : 0;
    const dailyPnLPercent = totalPortfolioValue > 0 ? +((totalDailyPnL / totalPortfolioValue) * 100).toFixed(2) : 0;

    return {
      totalPortfolioValue,
      cashBalance: balance,
      investedValue: +totalCurrentValue.toFixed(2),
      costBasis: +totalInvested.toFixed(2),
      dailyPnL: +totalDailyPnL.toFixed(2),
      dailyPnLPercent,
      totalPnL,
      totalPnLPercent,
      holdings: enrichedHoldings,
    };
  }
}

export const tradingService = new TradingService();
