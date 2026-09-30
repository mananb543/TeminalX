/**
 * TerminalX - Unified Storage Repository Service
 * Provides a resilient dual-mode data layer:
 * 1. MongoDB Atlas via Mongoose when connected with valid credentials (PRIMARY).
 * 2. Resilient In-Memory + Local persistent store when Atlas authentication is pending or unreachable.
 * Guarantees zero downtime, seamless paper-trading, and identical API contract.
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { User, IUser, SafeUser, INITIAL_VIRTUAL_BALANCE } from '../models/User.ts';
import { Holding, IHolding } from '../models/Holding.ts';
import { Order, IOrder, OrderSide, OrderType, OrderStatus } from '../models/Order.ts';
import { Transaction, ITransaction } from '../models/Transaction.ts';
import { Watchlist, IWatchlist } from '../models/Watchlist.ts';
import { dbState } from '../config/database.ts';
import { hashPassword } from '../utils/password.ts';

export interface StorageUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  toSafeObject: () => SafeUser;
}

export interface StorageHolding {
  id: string;
  userId: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StorageOrder {
  id: string;
  userId: string;
  symbol: string;
  type: OrderSide;
  orderType: OrderType;
  quantity: number;
  price: number;
  totalValue: number;
  status: OrderStatus;
  timestamp: Date;
}

export interface StorageTransaction {
  id: string;
  userId: string;
  symbol: string;
  type: OrderSide;
  quantity: number;
  price: number;
  totalValue: number;
  timestamp: Date;
}

export interface StorageWatchlist {
  id: string;
  userId: string;
  name: string;
  symbols: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BACKUP_FILE = path.resolve('.data/terminalx_store.json');

class StorageService {
  private memoryUsers: Map<string, StorageUser> = new Map();
  private memoryHoldings: Map<string, StorageHolding> = new Map();
  private memoryOrders: StorageOrder[] = [];
  private memoryTransactions: StorageTransaction[] = [];
  private memoryWatchlists: Map<string, StorageWatchlist> = new Map();
  private initialized = false;

  constructor() {
    this.initDefaultSeedData();
  }

  private saveToDisk() {
    try {
      const dataDir = path.dirname(BACKUP_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const payload = {
        users: Array.from(this.memoryUsers.values()).map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        })),
        holdings: Array.from(this.memoryHoldings.values()).map((h) => ({
          ...h,
          createdAt: h.createdAt.toISOString(),
          updatedAt: h.updatedAt.toISOString(),
        })),
        orders: this.memoryOrders.map((o) => ({
          ...o,
          timestamp: o.timestamp.toISOString(),
        })),
        transactions: this.memoryTransactions.map((t) => ({
          ...t,
          timestamp: t.timestamp.toISOString(),
        })),
        watchlists: Array.from(this.memoryWatchlists.values()).map((w) => ({
          ...w,
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
        })),
      };

      fs.writeFileSync(BACKUP_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // non-blocking
    }
  }

  private loadFromDisk(): boolean {
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
        const data = JSON.parse(content);

        if (Array.isArray(data.users)) {
          for (const u of data.users) {
            const userObj: StorageUser = {
              id: u.id,
              name: u.name,
              email: u.email,
              passwordHash: u.passwordHash,
              balance: u.balance,
              createdAt: new Date(u.createdAt),
              updatedAt: new Date(u.updatedAt),
              toSafeObject() {
                return {
                  id: this.id,
                  name: this.name,
                  email: this.email,
                  balance: this.balance,
                  createdAt: this.createdAt.toISOString(),
                };
              },
            };
            this.memoryUsers.set(u.id, userObj);
          }
        }

        if (Array.isArray(data.holdings)) {
          for (const h of data.holdings) {
            this.memoryHoldings.set(`${h.userId}_${h.symbol}`, {
              ...h,
              createdAt: new Date(h.createdAt),
              updatedAt: new Date(h.updatedAt),
            });
          }
        }

        if (Array.isArray(data.orders)) {
          this.memoryOrders = data.orders.map((o: any) => ({
            ...o,
            timestamp: new Date(o.timestamp),
          }));
        }

        if (Array.isArray(data.transactions)) {
          this.memoryTransactions = data.transactions.map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp),
          }));
        }

        if (Array.isArray(data.watchlists)) {
          for (const w of data.watchlists) {
            this.memoryWatchlists.set(`${w.userId}_${w.name}`, {
              ...w,
              createdAt: new Date(w.createdAt),
              updatedAt: new Date(w.updatedAt),
            });
          }
        }

        return this.memoryUsers.size > 0;
      }
    } catch {
      // non-fatal
    }
    return false;
  }

  private async initDefaultSeedData() {
    if (this.initialized) return;
    this.initialized = true;

    // First try to load from persistent disk store
    const loaded = this.loadFromDisk();
    if (loaded) return;

    try {
      const demoHash = await hashPassword('password123');

      // Demo Student User
      const demoUser1: StorageUser = {
        id: '660000000000000000000001',
        name: 'Engineering Student',
        email: 'demo.student@terminalx.io',
        passwordHash: demoHash,
        balance: INITIAL_VIRTUAL_BALANCE,
        createdAt: new Date(),
        updatedAt: new Date(),
        toSafeObject() {
          return {
            id: this.id,
            name: this.name,
            email: this.email,
            balance: this.balance,
            createdAt: this.createdAt.toISOString(),
          };
        },
      };

      // General Demo Trader User
      const demoUser2: StorageUser = {
        id: '660000000000000000000002',
        name: 'Institutional Demo Trader',
        email: 'trader@terminalx.io',
        passwordHash: demoHash,
        balance: 785400,
        createdAt: new Date(),
        updatedAt: new Date(),
        toSafeObject() {
          return {
            id: this.id,
            name: this.name,
            email: this.email,
            balance: this.balance,
            createdAt: this.createdAt.toISOString(),
          };
        },
      };

      this.memoryUsers.set(demoUser1.id, demoUser1);
      this.memoryUsers.set(demoUser2.id, demoUser2);

      // Seed holdings for demo accounts
      const seedHoldings: StorageHolding[] = [
        {
          id: 'h_seed_1',
          userId: demoUser2.id,
          symbol: 'RELIANCE',
          quantity: 50,
          averagePrice: 2840,
          totalCost: 142000,
          createdAt: new Date(Date.now() - 86400000 * 3),
          updatedAt: new Date(),
        },
        {
          id: 'h_seed_2',
          userId: demoUser2.id,
          symbol: 'TCS',
          quantity: 25,
          averagePrice: 3920,
          totalCost: 98000,
          createdAt: new Date(Date.now() - 86400000 * 5),
          updatedAt: new Date(),
        },
        {
          id: 'h_seed_3',
          userId: demoUser2.id,
          symbol: 'INFY',
          quantity: 40,
          averagePrice: 1580,
          totalCost: 63200,
          createdAt: new Date(Date.now() - 86400000 * 2),
          updatedAt: new Date(),
        },
      ];

      for (const h of seedHoldings) {
        this.memoryHoldings.set(`${h.userId}_${h.symbol}`, h);
      }

      this.saveToDisk();
    } catch {
      // non-fatal seed failure
    }
  }

  public isAtlasReady(): boolean {
    return dbState.isConnected && mongoose.connection.readyState === 1;
  }

  public getStorageType(): 'MONGODB' | 'IN-MEMORY / DEMO' {
    return this.isAtlasReady() ? 'MONGODB' : 'IN-MEMORY / DEMO';
  }

  // ---------------- USER OPERATIONS ----------------

  public async findUserByEmail(email: string): Promise<StorageUser | null> {
    const cleanEmail = email.toLowerCase().trim();

    if (this.isAtlasReady()) {
      try {
        const doc = await User.findOne({ email: cleanEmail }).select('+passwordHash');
        if (doc) {
          return {
            id: doc._id.toString(),
            name: doc.name,
            email: doc.email,
            passwordHash: doc.passwordHash,
            balance: doc.balance,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            toSafeObject: () => doc.toSafeObject(),
          };
        }
      } catch (err: any) {
        console.warn('[StorageService Atlas findUserByEmail fallback]:', err.message);
      }
    }

    for (const u of this.memoryUsers.values()) {
      if (u.email === cleanEmail) {
        return u;
      }
    }
    return null;
  }

  public async findUserById(id: string): Promise<StorageUser | null> {
    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(id)) {
      try {
        const doc = await User.findById(id);
        if (doc) {
          return {
            id: doc._id.toString(),
            name: doc.name,
            email: doc.email,
            passwordHash: doc.passwordHash,
            balance: doc.balance,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            toSafeObject: () => doc.toSafeObject(),
          };
        }
      } catch (err: any) {
        console.warn('[StorageService Atlas findUserById fallback]:', err.message);
      }
    }

    const inMemory = this.memoryUsers.get(id);
    if (inMemory) return inMemory;
    return null;
  }

  public async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    balance?: number;
  }): Promise<StorageUser> {
    const cleanEmail = data.email.toLowerCase().trim();
    const balance = data.balance ?? INITIAL_VIRTUAL_BALANCE;

    if (this.isAtlasReady()) {
      try {
        const doc = await User.create({
          name: data.name.trim(),
          email: cleanEmail,
          passwordHash: data.passwordHash,
          balance,
        });

        return {
          id: doc._id.toString(),
          name: doc.name,
          email: doc.email,
          passwordHash: doc.passwordHash,
          balance: doc.balance,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          toSafeObject: () => doc.toSafeObject(),
        };
      } catch (err: any) {
        console.warn('[StorageService Atlas createUser fallback]:', err.message);
      }
    }

    const newId = new mongoose.Types.ObjectId().toString();
    const user: StorageUser = {
      id: newId,
      name: data.name.trim(),
      email: cleanEmail,
      passwordHash: data.passwordHash,
      balance,
      createdAt: new Date(),
      updatedAt: new Date(),
      toSafeObject() {
        return {
          id: this.id,
          name: this.name,
          email: this.email,
          balance: this.balance,
          createdAt: this.createdAt.toISOString(),
        };
      },
    };

    this.memoryUsers.set(newId, user);
    this.saveToDisk();
    return user;
  }

  public async updateUserBalance(id: string, newBalance: number): Promise<number> {
    const safeBalance = +Math.max(0, newBalance).toFixed(2);

    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(id)) {
      try {
        await User.findByIdAndUpdate(id, { balance: safeBalance });
        return safeBalance;
      } catch (err: any) {
        console.warn('[StorageService Atlas updateUserBalance fallback]:', err.message);
      }
    }

    const user = this.memoryUsers.get(id);
    if (user) {
      user.balance = safeBalance;
      user.updatedAt = new Date();
      this.saveToDisk();
    }
    return safeBalance;
  }

  // ---------------- HOLDINGS OPERATIONS ----------------

  public async getHoldings(userId: string): Promise<StorageHolding[]> {
    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const docs = await Holding.find({ userId }).sort({ updatedAt: -1 });
        return docs.map((d) => ({
          id: d._id.toString(),
          userId: d.userId.toString(),
          symbol: d.symbol,
          quantity: d.quantity,
          averagePrice: d.averagePrice,
          totalCost: d.totalCost,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }));
      } catch (err: any) {
        console.warn('[StorageService Atlas getHoldings fallback]:', err.message);
      }
    }

    const results: StorageHolding[] = [];
    for (const h of this.memoryHoldings.values()) {
      if (h.userId === userId && h.quantity > 0) {
        results.push({ ...h });
      }
    }
    return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  public async getHolding(userId: string, symbol: string): Promise<StorageHolding | null> {
    const cleanSymbol = symbol.toUpperCase().trim();

    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const doc = await Holding.findOne({ userId, symbol: cleanSymbol });
        if (doc) {
          return {
            id: doc._id.toString(),
            userId: doc.userId.toString(),
            symbol: doc.symbol,
            quantity: doc.quantity,
            averagePrice: doc.averagePrice,
            totalCost: doc.totalCost,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          };
        }
      } catch (err: any) {
        console.warn('[StorageService Atlas getHolding fallback]:', err.message);
      }
    }

    const key = `${userId}_${cleanSymbol}`;
    const h = this.memoryHoldings.get(key);
    return h ? { ...h } : null;
  }

  public async saveHolding(
    userId: string,
    symbol: string,
    quantity: number,
    averagePrice: number,
    totalCost: number
  ): Promise<StorageHolding> {
    const cleanSymbol = symbol.toUpperCase().trim();

    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const doc = await Holding.findOneAndUpdate(
          { userId, symbol: cleanSymbol },
          { quantity, averagePrice, totalCost },
          { new: true, upsert: true }
        );
        return {
          id: doc._id.toString(),
          userId: doc.userId.toString(),
          symbol: doc.symbol,
          quantity: doc.quantity,
          averagePrice: doc.averagePrice,
          totalCost: doc.totalCost,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        };
      } catch (err: any) {
        console.warn('[StorageService Atlas saveHolding fallback]:', err.message);
      }
    }

    const key = `${userId}_${cleanSymbol}`;
    const existing = this.memoryHoldings.get(key);
    const id = existing ? existing.id : `h_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const holding: StorageHolding = {
      id,
      userId,
      symbol: cleanSymbol,
      quantity,
      averagePrice: +averagePrice.toFixed(2),
      totalCost: +totalCost.toFixed(2),
      createdAt: existing ? existing.createdAt : new Date(),
      updatedAt: new Date(),
    };

    this.memoryHoldings.set(key, holding);
    this.saveToDisk();
    return holding;
  }

  public async deleteHolding(userId: string, symbol: string): Promise<boolean> {
    const cleanSymbol = symbol.toUpperCase().trim();

    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        await Holding.findOneAndDelete({ userId, symbol: cleanSymbol });
        return true;
      } catch (err: any) {
        console.warn('[StorageService Atlas deleteHolding fallback]:', err.message);
      }
    }

    const key = `${userId}_${cleanSymbol}`;
    const deleted = this.memoryHoldings.delete(key);
    if (deleted) this.saveToDisk();
    return deleted;
  }

  // ---------------- ORDER OPERATIONS ----------------

  public async createOrder(data: {
    userId: string;
    symbol: string;
    type: OrderSide;
    orderType: OrderType;
    quantity: number;
    price: number;
    totalValue: number;
    status?: OrderStatus;
  }): Promise<StorageOrder> {
    const cleanSymbol = data.symbol.toUpperCase().trim();
    const status = data.status || 'COMPLETED';

    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(data.userId)) {
      try {
        const doc = await Order.create({
          userId: data.userId,
          symbol: cleanSymbol,
          type: data.type,
          orderType: data.orderType,
          quantity: data.quantity,
          price: data.price,
          totalValue: data.totalValue,
          status,
          timestamp: new Date(),
        });

        return {
          id: doc._id.toString(),
          userId: doc.userId.toString(),
          symbol: doc.symbol,
          type: doc.type,
          orderType: doc.orderType,
          quantity: doc.quantity,
          price: doc.price,
          totalValue: doc.totalValue,
          status: doc.status,
          timestamp: doc.timestamp,
        };
      } catch (err: any) {
        console.warn('[StorageService Atlas createOrder fallback]:', err.message);
      }
    }

    const order: StorageOrder = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: data.userId,
      symbol: cleanSymbol,
      type: data.type,
      orderType: data.orderType,
      quantity: data.quantity,
      price: data.price,
      totalValue: data.totalValue,
      status,
      timestamp: new Date(),
    };

    this.memoryOrders.unshift(order);
    this.saveToDisk();
    return order;
  }

  public async getOrders(userId: string): Promise<StorageOrder[]> {
    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const docs = await Order.find({ userId }).sort({ timestamp: -1 });
        return docs.map((d) => ({
          id: d._id.toString(),
          userId: d.userId.toString(),
          symbol: d.symbol,
          type: d.type,
          orderType: d.orderType,
          quantity: d.quantity,
          price: d.price,
          totalValue: d.totalValue,
          status: d.status,
          timestamp: d.timestamp,
        }));
      } catch (err: any) {
        console.warn('[StorageService Atlas getOrders fallback]:', err.message);
      }
    }

    return this.memoryOrders
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // ---------------- TRANSACTION OPERATIONS ----------------

  public async createTransaction(data: {
    userId: string;
    symbol: string;
    type: OrderSide;
    quantity: number;
    price: number;
    totalValue: number;
  }): Promise<StorageTransaction> {
    const cleanSymbol = data.symbol.toUpperCase().trim();

    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(data.userId)) {
      try {
        const doc = await Transaction.create({
          userId: data.userId,
          symbol: cleanSymbol,
          type: data.type,
          quantity: data.quantity,
          price: data.price,
          totalValue: data.totalValue,
          timestamp: new Date(),
        });

        return {
          id: doc._id.toString(),
          userId: doc.userId.toString(),
          symbol: doc.symbol,
          type: doc.type,
          quantity: doc.quantity,
          price: doc.price,
          totalValue: doc.totalValue,
          timestamp: doc.timestamp,
        };
      } catch (err: any) {
        console.warn('[StorageService Atlas createTransaction fallback]:', err.message);
      }
    }

    const tx: StorageTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: data.userId,
      symbol: cleanSymbol,
      type: data.type,
      quantity: data.quantity,
      price: data.price,
      totalValue: data.totalValue,
      timestamp: new Date(),
    };

    this.memoryTransactions.unshift(tx);
    this.saveToDisk();
    return tx;
  }

  public async getTransactions(userId: string): Promise<StorageTransaction[]> {
    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const docs = await Transaction.find({ userId }).sort({ timestamp: -1 });
        return docs.map((d) => ({
          id: d._id.toString(),
          userId: d.userId.toString(),
          symbol: d.symbol,
          type: d.type,
          quantity: d.quantity,
          price: d.price,
          totalValue: d.totalValue,
          timestamp: d.timestamp,
        }));
      } catch (err: any) {
        console.warn('[StorageService Atlas getTransactions fallback]:', err.message);
      }
    }

    return this.memoryTransactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // ---------------- WATCHLIST OPERATIONS ----------------

  public async getWatchlists(userId: string): Promise<StorageWatchlist[]> {
    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const docs = await Watchlist.find({ userId });
        if (docs.length > 0) {
          return docs.map((d) => ({
            id: d._id.toString(),
            userId: d.userId.toString(),
            name: d.name,
            symbols: d.symbols,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          }));
        }
      } catch (err: any) {
        console.warn('[StorageService Atlas getWatchlists fallback]:', err.message);
      }
    }

    const defaultSymbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'TATAMOTORS', 'NIFTY 50'];
    const key = `${userId}_Primary Watchlist`;
    const existing = this.memoryWatchlists.get(key);
    if (!existing) {
      const defaultW: StorageWatchlist = {
        id: `wl_${Date.now()}`,
        userId,
        name: 'Primary Watchlist',
        symbols: defaultSymbols,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.memoryWatchlists.set(key, defaultW);
      this.saveToDisk();
      return [defaultW];
    }

    return [existing];
  }

  public async saveWatchlist(userId: string, name: string, symbols: string[]): Promise<StorageWatchlist> {
    if (this.isAtlasReady() && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const doc = await Watchlist.findOneAndUpdate(
          { userId, name },
          { symbols },
          { new: true, upsert: true }
        );
        return {
          id: doc._id.toString(),
          userId: doc.userId.toString(),
          name: doc.name,
          symbols: doc.symbols,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        };
      } catch (err: any) {
        console.warn('[StorageService Atlas saveWatchlist fallback]:', err.message);
      }
    }

    const key = `${userId}_${name}`;
    const wl: StorageWatchlist = {
      id: `wl_${Date.now()}`,
      userId,
      name,
      symbols,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.memoryWatchlists.set(key, wl);
    this.saveToDisk();
    return wl;
  }
}

export const storageService = new StorageService();
