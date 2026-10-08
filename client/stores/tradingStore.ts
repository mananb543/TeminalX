/**
 * TerminalX - Paper Trading Zustand Store
 * Manages virtual funds (₹10,00,000), simulated trade execution, active portfolio positions,
 * order history, technical indicator overlays, and watchlists.
 */

import { create } from 'zustand';
import { Holding, Order, OrderSide, OrderType, PortfolioSummary } from '../types/trading.ts';
import { TimeframeOption } from '../types/market.ts';
import { clientMarketService } from '../lib/marketService.ts';

export interface IndicatorConfig {
  sma20: boolean;
  sma50: boolean;
  sma200: boolean;
  ema: boolean;
  rsi: boolean;
  macd: boolean;
  bollinger: boolean;
}

export interface TradingStoreState {
  // Virtual Cash & Positions
  balance: number; // ₹10,00,000
  holdings: Holding[];
  orders: Order[];
  watchlist: string[];

  // Chart & Interface State
  selectedSymbol: string;
  timeframe: TimeframeOption;
  indicators: IndicatorConfig;

  // Feedback notifications
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;

  // Actions
  setSelectedSymbol: (symbol: string) => void;
  setTimeframe: (tf: TimeframeOption) => void;
  toggleIndicator: (indicator: keyof IndicatorConfig) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  clearNotification: () => void;

  // Trading actions
  placeOrder: (params: {
    symbol: string;
    type: OrderSide;
    orderType: OrderType;
    quantity: number;
    limitPrice?: number;
  }) => { success: boolean; message: string };

  resetPortfolio: () => void;
  clearUserData: () => void;
  setBalance: (balance: number) => void;
  syncFromBackend: () => Promise<void>;
  getPortfolioSummary: () => PortfolioSummary;
}

const INITIAL_BALANCE = 1000000; // ₹10,00,000 INR

const INITIAL_HOLDINGS: Holding[] = [
  {
    id: 'hld-1',
    userId: 'usr-demo-001',
    symbol: 'RELIANCE',
    exchange: 'NSE',
    companyName: 'Reliance Industries Ltd.',
    quantity: 50,
    averagePrice: 2880.00,
    totalCost: 144000.00,
    currentPrice: 2945.60,
    currentValue: 147280.00,
    unrealizedPnL: 3280.00,
    unrealizedPnLPercent: 2.28,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'hld-2',
    userId: 'usr-demo-001',
    symbol: 'TCS',
    exchange: 'NSE',
    companyName: 'Tata Consultancy Services Ltd.',
    quantity: 25,
    averagePrice: 4120.00,
    totalCost: 103000.00,
    currentPrice: 4180.25,
    currentValue: 104506.25,
    unrealizedPnL: 1506.25,
    unrealizedPnLPercent: 1.46,
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    userId: 'usr-demo-001',
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries Ltd.',
    type: 'BUY',
    orderType: 'MARKET',
    quantity: 50,
    price: 2880.00,
    totalValue: 144000.00,
    status: 'EXECUTED',
    executionPrice: 2880.00,
    executedAt: new Date(Date.now() - 86400000).toISOString(),
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'ord-102',
    userId: 'usr-demo-001',
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services Ltd.',
    type: 'BUY',
    orderType: 'MARKET',
    quantity: 25,
    price: 4120.00,
    totalValue: 103000.00,
    status: 'EXECUTED',
    executionPrice: 4120.00,
    executedAt: new Date(Date.now() - 43200000).toISOString(),
    timestamp: new Date(Date.now() - 43200000).toISOString(),
  },
];

export const useTradingStore = create<TradingStoreState>((set, get) => ({
  balance: INITIAL_BALANCE - 247000, // Available virtual cash after initial seed holdings: ₹7,53,000
  holdings: INITIAL_HOLDINGS,
  orders: INITIAL_ORDERS,
  watchlist: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'TATAMOTORS', 'NIFTY 50'],

  selectedSymbol: 'RELIANCE',
  timeframe: '1D',
  indicators: {
    sma20: true,
    sma50: false,
    sma200: false,
    ema: true,
    rsi: true,
    macd: false,
    bollinger: false,
  },
  notification: null,

  setSelectedSymbol: (symbol: string) => set({ selectedSymbol: symbol.toUpperCase().trim() }),

  setTimeframe: (timeframe: TimeframeOption) => set({ timeframe }),

  toggleIndicator: (indicator: keyof IndicatorConfig) =>
    set((state) => ({
      indicators: {
        ...state.indicators,
        [indicator]: !state.indicators[indicator],
      },
    })),

  addToWatchlist: (symbol: string) => {
    const sym = symbol.toUpperCase().trim();
    set((state) => {
      if (state.watchlist.includes(sym)) return state;
      return {
        watchlist: [...state.watchlist, sym],
        notification: { message: `Added ${sym} to watchlist`, type: 'success' },
      };
    });
  },

  removeFromWatchlist: (symbol: string) => {
    const sym = symbol.toUpperCase().trim();
    set((state) => ({
      watchlist: state.watchlist.filter((s) => s !== sym),
      notification: { message: `Removed ${sym} from watchlist`, type: 'info' },
    }));
  },

  clearNotification: () => set({ notification: null }),

  setBalance: (balance: number) => set({ balance }),

  placeOrder: (params) => {
    const { symbol, type, orderType, quantity, limitPrice } = params;
    const cleanSym = symbol.toUpperCase().trim();

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      const msg = 'Quantity must be a positive whole integer.';
      set({ notification: { message: msg, type: 'error' } });
      return { success: false, message: msg };
    }

    const quote = clientMarketService.getQuote(cleanSym);
    const execPrice = orderType === 'LIMIT' && limitPrice && limitPrice > 0 ? limitPrice : quote.price;
    const totalOrderValue = +(execPrice * quantity).toFixed(2);
    const now = new Date().toISOString();
    const orderId = `ord-${Date.now().toString().slice(-6)}`;

    const currentBalance = get().balance;
    const currentHoldings = [...get().holdings];

    if (type === 'BUY') {
      if (currentBalance < totalOrderValue) {
        const msg = `Insufficient virtual cash. Required: ₹${totalOrderValue.toLocaleString('en-IN')}, Available: ₹${currentBalance.toLocaleString('en-IN')}`;
        set({ notification: { message: msg, type: 'error' } });
        return { success: false, message: msg };
      }

      const newBalance = +(currentBalance - totalOrderValue).toFixed(2);
      const existingIdx = currentHoldings.findIndex((h) => h.symbol === cleanSym);

      if (existingIdx >= 0) {
        const prev = currentHoldings[existingIdx];
        const newQty = prev.quantity + quantity;
        const newCost = +(prev.totalCost + totalOrderValue).toFixed(2);
        const newAvg = +(newCost / newQty).toFixed(2);

        currentHoldings[existingIdx] = {
          ...prev,
          quantity: newQty,
          averagePrice: newAvg,
          totalCost: newCost,
          currentPrice: quote.price,
          currentValue: +(newQty * quote.price).toFixed(2),
          unrealizedPnL: +(newQty * quote.price - newCost).toFixed(2),
          unrealizedPnLPercent: +(((newQty * quote.price - newCost) / newCost) * 100).toFixed(2),
          updatedAt: now,
        };
      } else {
        currentHoldings.push({
          id: `hld-${Date.now()}`,
          userId: 'usr-demo-001',
          symbol: cleanSym,
          exchange: quote.exchange,
          companyName: quote.name,
          quantity,
          averagePrice: execPrice,
          totalCost: totalOrderValue,
          currentPrice: quote.price,
          currentValue: totalOrderValue,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          updatedAt: now,
        });
      }

      const newOrder: Order = {
        id: orderId,
        userId: 'usr-demo-001',
        symbol: cleanSym,
        companyName: quote.name,
        type: 'BUY',
        orderType,
        quantity,
        price: execPrice,
        totalValue: totalOrderValue,
        status: 'EXECUTED',
        executionPrice: execPrice,
        executedAt: now,
        timestamp: now,
      };

      set((state) => ({
        balance: newBalance,
        holdings: currentHoldings,
        orders: [newOrder, ...state.orders],
        notification: {
          message: `Executed BUY for ${quantity} shares of ${cleanSym} at ₹${execPrice.toLocaleString('en-IN')}`,
          type: 'success',
        },
      }));

      // Persist to MongoDB in background
      const storedToken =
        sessionStorage.getItem('terminalx_token') || localStorage.getItem('terminalx_token');
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) authHeaders['Authorization'] = `Bearer ${storedToken}`;
      fetch('/api/trading/order', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          symbol: cleanSym,
          type: 'BUY',
          orderType,
          quantity,
          limitPrice: orderType === 'LIMIT' ? execPrice : undefined,
        }),
      }).catch(() => {});

      return {
        success: true,
        message: `Successfully executed BUY order for ${quantity} ${cleanSym}`,
      };
    } else {
      // SELL order
      const existingHolding = currentHoldings.find((h) => h.symbol === cleanSym);
      if (!existingHolding || existingHolding.quantity < quantity) {
        const available = existingHolding ? existingHolding.quantity : 0;
        const msg = `Insufficient shares. You hold ${available} shares of ${cleanSym}.`;
        set({ notification: { message: msg, type: 'error' } });
        return { success: false, message: msg };
      }

      const costBasisSold = +(existingHolding.averagePrice * quantity).toFixed(2);
      const newBalance = +(currentBalance + totalOrderValue).toFixed(2);

      let updatedHoldings: Holding[];
      if (existingHolding.quantity === quantity) {
        updatedHoldings = currentHoldings.filter((h) => h.symbol !== cleanSym);
      } else {
        const remainingQty = existingHolding.quantity - quantity;
        const remainingCost = +(existingHolding.totalCost - costBasisSold).toFixed(2);
        updatedHoldings = currentHoldings.map((h) =>
          h.symbol === cleanSym
            ? {
                ...h,
                quantity: remainingQty,
                totalCost: remainingCost,
                currentPrice: quote.price,
                currentValue: +(remainingQty * quote.price).toFixed(2),
                unrealizedPnL: +(remainingQty * quote.price - remainingCost).toFixed(2),
                unrealizedPnLPercent: +(((remainingQty * quote.price - remainingCost) / remainingCost) * 100).toFixed(2),
                updatedAt: now,
              }
            : h
        );
      }

      const newOrder: Order = {
        id: orderId,
        userId: 'usr-demo-001',
        symbol: cleanSym,
        companyName: quote.name,
        type: 'SELL',
        orderType,
        quantity,
        price: execPrice,
        totalValue: totalOrderValue,
        status: 'EXECUTED',
        executionPrice: execPrice,
        executedAt: now,
        timestamp: now,
      };

      set((state) => ({
        balance: newBalance,
        holdings: updatedHoldings,
        orders: [newOrder, ...state.orders],
        notification: {
          message: `Executed SELL for ${quantity} shares of ${cleanSym} at ₹${execPrice.toLocaleString('en-IN')}`,
          type: 'success',
        },
      }));

      // Persist to MongoDB in background
      const storedToken =
        sessionStorage.getItem('terminalx_token') || localStorage.getItem('terminalx_token');
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) authHeaders['Authorization'] = `Bearer ${storedToken}`;
      fetch('/api/trading/order', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          symbol: cleanSym,
          type: 'SELL',
          orderType,
          quantity,
          limitPrice: orderType === 'LIMIT' ? execPrice : undefined,
        }),
      }).catch(() => {});

      return {
        success: true,
        message: `Successfully executed SELL order for ${quantity} ${cleanSym}`,
      };
    }
  },

  resetPortfolio: () => {
    set({
      balance: INITIAL_BALANCE,
      holdings: [],
      orders: [],
      notification: {
        message: 'Virtual portfolio reset. ₹10,00,000 virtual balance restored.',
        type: 'info',
      },
    });
  },

  clearUserData: () => {
    set({
      balance: INITIAL_BALANCE,
      holdings: [],
      orders: [],
      notification: null,
    });
  },

  syncFromBackend: async () => {
    try {
      const storedToken =
        sessionStorage.getItem('terminalx_token') || localStorage.getItem('terminalx_token');
      const headers: Record<string, string> = {};
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const res = await fetch('/api/trading/portfolio', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          set({
            balance: data.data.availableCash,
            holdings: data.data.holdings || [],
          });
        }
      }

      const ordersRes = await fetch('/api/trading/orders', {
        headers,
        credentials: 'include',
      });
      if (ordersRes.ok) {
        const ordData = await ordersRes.json();
        if (ordData.success && Array.isArray(ordData.data)) {
          set({ orders: ordData.data });
        }
      }
    } catch (err) {
      // Keep optimistic client state if offline
    }
  },

  getPortfolioSummary: () => {
    const { balance, holdings } = get();
    let investedVal = 0;
    let costBasisVal = 0;
    let dailyPnLVal = 0;

    const enrichedHoldings: Holding[] = holdings.map((h) => {
      const q = clientMarketService.getQuote(h.symbol);
      const currVal = +(h.quantity * q.price).toFixed(2);
      const dayPnL = +(currVal * (q.changePercent / 100)).toFixed(2);
      const unrealizedPnL = +(currVal - h.totalCost).toFixed(2);
      const unrealizedPnLPercent = h.totalCost > 0 ? +((unrealizedPnL / h.totalCost) * 100).toFixed(2) : 0;

      investedVal += currVal;
      costBasisVal += h.totalCost;
      dailyPnLVal += dayPnL;

      return {
        ...h,
        currentPrice: q.price,
        currentValue: currVal,
        unrealizedPnL,
        unrealizedPnLPercent,
      };
    });

    const totalPortfolioValue = +(balance + investedVal).toFixed(2);
    const totalPnL = +(investedVal - costBasisVal).toFixed(2);
    const totalPnLPercent = costBasisVal > 0 ? +((totalPnL / costBasisVal) * 100).toFixed(2) : 0;
    const dailyPnLPercent = totalPortfolioValue > 0 ? +((dailyPnLVal / totalPortfolioValue) * 100).toFixed(2) : 0;

    return {
      totalPortfolioValue,
      cashBalance: balance,
      investedValue: +investedVal.toFixed(2),
      costBasis: +costBasisVal.toFixed(2),
      dailyPnL: +dailyPnLVal.toFixed(2),
      dailyPnLPercent,
      totalPnL,
      totalPnLPercent,
      holdings: enrichedHoldings,
    };
  },
}));
