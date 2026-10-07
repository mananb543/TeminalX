/**
 * TerminalX - Trading Controller
 * Request handlers for authenticated simulated paper orders, position tracking, and portfolio statistics.
 * Backed by storageService for dual-mode persistence (MongoDB Atlas + Resilient In-Memory).
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { INITIAL_VIRTUAL_BALANCE } from '../models/User.ts';
import { unifiedMarketService } from '../market/marketService.ts';
import { storageService } from '../services/storageService.ts';

export const tradingController = {
  /**
   * GET /api/trading/portfolio
   * Calculate live mark-to-market portfolio value for the authenticated user
   */
  async getPortfolio(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      let user = await storageService.findUserById(userId);
      if (!user) {
        // Fallback user if record was transient
        user = {
          id: userId,
          name: req.user?.name || 'Trader',
          email: req.user?.email || 'trader@terminalx.io',
          passwordHash: '',
          balance: INITIAL_VIRTUAL_BALANCE,
          createdAt: new Date(),
          updatedAt: new Date(),
          toSafeObject: () => ({
            id: userId,
            name: req.user?.name || 'Trader',
            email: req.user?.email || 'trader@terminalx.io',
            balance: INITIAL_VIRTUAL_BALANCE,
            createdAt: new Date().toISOString(),
          }),
        };
      }

      const userHoldings = await storageService.getHoldings(userId);

      let investedCapital = 0;
      let currentHoldingsValue = 0;
      let totalDailyPnL = 0;

      const enrichedHoldings = await Promise.all(
        userHoldings.map(async (h) => {
          let currentPrice = h.averagePrice;
          let dayChangePercent = 0;
          try {
            const quote = await unifiedMarketService.getQuote(h.symbol);
            if (quote && quote.price) {
              currentPrice = quote.price;
              dayChangePercent = quote.changePercent || 0;
            }
          } catch {
            // retain cost basis if provider offline
          }
          const currentValue = +(h.quantity * currentPrice).toFixed(2);
          const unrealizedPnL = +(currentValue - h.totalCost).toFixed(2);
          const unrealizedPnLPercent =
            h.totalCost > 0 ? +((unrealizedPnL / h.totalCost) * 100).toFixed(2) : 0;
          const dayPnL = +(currentValue * (dayChangePercent / 100)).toFixed(2);

          investedCapital += h.totalCost;
          currentHoldingsValue += currentValue;
          totalDailyPnL += dayPnL;

          return {
            id: h.id,
            symbol: h.symbol,
            quantity: h.quantity,
            averagePrice: h.averagePrice,
            totalCost: h.totalCost,
            currentPrice,
            currentValue,
            unrealizedPnL,
            unrealizedPnLPercent,
            updatedAt: h.updatedAt,
          };
        })
      );

      const totalPortfolioValue = +(user.balance + currentHoldingsValue).toFixed(2);
      const totalUnrealizedPnL = +(currentHoldingsValue - investedCapital).toFixed(2);
      const totalReturnPercent =
        investedCapital > 0 ? +((totalUnrealizedPnL / investedCapital) * 100).toFixed(2) : 0;
      const dailyPnLPercent =
        totalPortfolioValue > 0 ? +((totalDailyPnL / totalPortfolioValue) * 100).toFixed(2) : 0;

      return res.json({
        success: true,
        data: {
          user: user.toSafeObject(),
          totalPortfolioValue,
          availableCash: user.balance,
          investedCapital: +investedCapital.toFixed(2),
          currentHoldingsValue: +currentHoldingsValue.toFixed(2),
          dailyPnL: +totalDailyPnL.toFixed(2),
          dailyPnLPercent,
          unrealizedPnL: totalUnrealizedPnL,
          totalReturnPercent,
          holdings: enrichedHoldings,
          dbMode: storageService.isAtlasReady() ? 'mongodb-atlas' : 'resilient-in-memory',
        },
      });
    } catch (err: any) {
      console.warn('[TradingController getPortfolio warning]:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/trading/holdings
   */
  async getHoldings(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const holdings = await storageService.getHoldings(userId);
      return res.json({ success: true, count: holdings.length, data: holdings });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/trading/orders
   */
  async getOrders(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const orders = await storageService.getOrders(userId);
      return res.json({ success: true, count: orders.length, data: orders });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/trading/order
   * Places and executes simulated order
   */
  async placeOrder(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const { symbol, type, orderType, quantity, limitPrice } = req.body;

      if (!symbol || !type || !orderType || quantity === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required order fields (symbol, type, orderType, quantity)',
          code: 'VALIDATION_ERROR',
        });
      }

      if (type !== 'BUY' && type !== 'SELL') {
        return res.status(400).json({
          success: false,
          error: 'Order type must be either BUY or SELL',
          code: 'INVALID_ORDER_SIDE',
        });
      }

      if (orderType !== 'MARKET' && orderType !== 'LIMIT') {
        return res.status(400).json({
          success: false,
          error: 'Order execution type must be either MARKET or LIMIT',
          code: 'INVALID_ORDER_TYPE',
        });
      }

      const numQty = Number(quantity);
      if (!Number.isInteger(numQty) || numQty <= 0 || !Number.isFinite(numQty) || numQty > 1000000) {
        return res.status(400).json({
          success: false,
          error: 'Quantity must be a positive whole integer between 1 and 1,000,000',
          code: 'INVALID_QUANTITY',
        });
      }

      if (orderType === 'LIMIT') {
        const numLimit = Number(limitPrice);
        if (isNaN(numLimit) || !Number.isFinite(numLimit) || numLimit <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Limit price must be a valid positive number for LIMIT orders',
            code: 'INVALID_LIMIT_PRICE',
          });
        }
      }

      const cleanSymbol = String(symbol).toUpperCase().trim();
      if (!cleanSymbol || cleanSymbol.length > 20 || !/^[A-Z0-9\s.\-]+$/.test(cleanSymbol)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ticker symbol format',
          code: 'INVALID_SYMBOL',
        });
      }

      let quote;
      try {
        quote = await unifiedMarketService.getQuote(cleanSymbol);
      } catch (err: any) {
        return res.status(404).json({
          success: false,
          error: `Market quote for ${cleanSymbol} unavailable: ${err.message}`,
        });
      }

      const execPrice = orderType === 'LIMIT' && limitPrice ? Number(limitPrice) : quote.price;
      const totalOrderValue = +(execPrice * numQty).toFixed(2);

      let user = await storageService.findUserById(userId);
      if (!user) {
        user = await storageService.createUser({
          name: req.user?.name || 'Trader',
          email: req.user?.email || 'trader@terminalx.io',
          passwordHash: '',
          balance: INITIAL_VIRTUAL_BALANCE,
        });
      }

      if (type === 'BUY') {
        if (user.balance < totalOrderValue) {
          return res.status(400).json({
            success: false,
            error: `Insufficient virtual cash. Required: ₹${totalOrderValue.toLocaleString('en-IN')}, Available: ₹${user.balance.toLocaleString('en-IN')}`,
          });
        }

        // Deduct virtual balance
        const updatedBalance = +(user.balance - totalOrderValue).toFixed(2);
        await storageService.updateUserBalance(userId, updatedBalance);

        // Update or create holding
        const existingHolding = await storageService.getHolding(userId, cleanSymbol);
        if (existingHolding) {
          const newQty = existingHolding.quantity + numQty;
          const newTotalCost = +(existingHolding.totalCost + totalOrderValue).toFixed(2);
          const newAvgPrice = +(newTotalCost / newQty).toFixed(2);
          await storageService.saveHolding(userId, cleanSymbol, newQty, newAvgPrice, newTotalCost);
        } else {
          await storageService.saveHolding(userId, cleanSymbol, numQty, execPrice, totalOrderValue);
        }

        // Record Order
        const orderDoc = await storageService.createOrder({
          userId,
          symbol: cleanSymbol,
          type: 'BUY',
          orderType,
          quantity: numQty,
          price: execPrice,
          totalValue: totalOrderValue,
          status: 'COMPLETED',
        });

        // Record Transaction
        await storageService.createTransaction({
          userId,
          symbol: cleanSymbol,
          type: 'BUY',
          quantity: numQty,
          price: execPrice,
          totalValue: totalOrderValue,
        });

        return res.json({
          success: true,
          message: `Executed BUY order for ${numQty} shares of ${cleanSymbol} at ₹${execPrice.toLocaleString('en-IN')}`,
          data: {
            order: orderDoc,
            updatedBalance,
          },
        });
      } else {
        // SELL
        const existingHolding = await storageService.getHolding(userId, cleanSymbol);
        if (!existingHolding || existingHolding.quantity < numQty) {
          const held = existingHolding ? existingHolding.quantity : 0;
          return res.status(400).json({
            success: false,
            error: `Insufficient shares. You hold ${held} shares of ${cleanSymbol}.`,
          });
        }

        const costBasisSold = +(existingHolding.averagePrice * numQty).toFixed(2);
        const updatedBalance = +(user.balance + totalOrderValue).toFixed(2);
        await storageService.updateUserBalance(userId, updatedBalance);

        if (existingHolding.quantity === numQty) {
          await storageService.deleteHolding(userId, cleanSymbol);
        } else {
          const remainingQty = existingHolding.quantity - numQty;
          const remainingCost = +(existingHolding.totalCost - costBasisSold).toFixed(2);
          await storageService.saveHolding(
            userId,
            cleanSymbol,
            remainingQty,
            existingHolding.averagePrice,
            remainingCost
          );
        }

        // Record Order
        const orderDoc = await storageService.createOrder({
          userId,
          symbol: cleanSymbol,
          type: 'SELL',
          orderType,
          quantity: numQty,
          price: execPrice,
          totalValue: totalOrderValue,
          status: 'COMPLETED',
        });

        // Record Transaction
        await storageService.createTransaction({
          userId,
          symbol: cleanSymbol,
          type: 'SELL',
          quantity: numQty,
          price: execPrice,
          totalValue: totalOrderValue,
        });

        return res.json({
          success: true,
          message: `Executed SELL order for ${numQty} shares of ${cleanSymbol} at ₹${execPrice.toLocaleString('en-IN')}`,
          data: {
            order: orderDoc,
            updatedBalance,
          },
        });
      }
    } catch (err: any) {
      console.warn('[TradingController placeOrder warning]:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/trading/transactions
   */
  async getTransactions(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const txs = await storageService.getTransactions(userId);
      return res.json({ success: true, count: txs.length, data: txs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/trading/reset
   * Resets virtual balance to starting ₹10,00,000 INR
   */
  async resetPortfolio(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      await storageService.updateUserBalance(userId, INITIAL_VIRTUAL_BALANCE);

      return res.json({
        success: true,
        message: 'Portfolio reset to ₹10,00,000 initial virtual cash.',
        balance: INITIAL_VIRTUAL_BALANCE,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/trading/watchlists
   */
  async getWatchlists(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const watchlists = await storageService.getWatchlists(userId);
      return res.json({ success: true, count: watchlists.length, data: watchlists });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/trading/watchlist
   */
  async updateWatchlist(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const { name, symbols } = req.body;
      const cleanName =
        typeof name === 'string' && name.trim() ? name.trim().slice(0, 50) : 'Primary Watchlist';
      const cleanSymbols = Array.isArray(symbols)
        ? symbols
            .map((s) => String(s).toUpperCase().trim())
            .filter((s) => s && s.length <= 20 && /^[A-Z0-9\s.\-]+$/.test(s))
            .slice(0, 50)
        : [];

      const updated = await storageService.saveWatchlist(
        userId,
        cleanName,
        cleanSymbols
      );
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};
