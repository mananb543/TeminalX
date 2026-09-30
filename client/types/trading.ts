export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'EXECUTED';

export interface Holding {
  id: string;
  userId: string;
  symbol: string;
  exchange: string;
  companyName: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  updatedAt: string;
}

export interface Order {
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
  executedAt?: string;
  timestamp: string;
}

export interface Transaction {
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
  timestamp: string;
}

export interface PortfolioSummary {
  totalPortfolioValue: number;
  cashBalance: number;
  investedValue: number;
  costBasis: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  totalPnL: number;
  totalPnLPercent: number;
  holdings: Holding[];
}
