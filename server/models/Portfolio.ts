/**
 * TerminalX - Portfolio Model & Financial Snapshot Architecture
 * Tracks point-in-time portfolio equity states, cash balances, and P&L metrics.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPortfolioMetrics {
  userId: string;
  totalPortfolioValue: number;
  availableCash: number;
  totalInvestedCapital: number;
  currentHoldingsValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalReturn: number;
  totalReturnPercent: number;
  holdingsCount: number;
  lastUpdated: string;
}

export interface IPortfolioSnapshot extends Document {
  userId: mongoose.Types.ObjectId;
  totalValue: number;
  cash: number;
  investedValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  timestamp: Date;
}

const PortfolioSnapshotSchema = new Schema<IPortfolioSnapshot>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    totalValue: {
      type: Number,
      required: true,
    },
    cash: {
      type: Number,
      required: true,
    },
    investedValue: {
      type: Number,
      required: true,
    },
    realizedPnL: {
      type: Number,
      default: 0,
    },
    unrealizedPnL: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : '';
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

PortfolioSnapshotSchema.index({ userId: 1, timestamp: -1 });

export const PortfolioSnapshot: Model<IPortfolioSnapshot> =
  mongoose.models.PortfolioSnapshot ||
  mongoose.model<IPortfolioSnapshot>('PortfolioSnapshot', PortfolioSnapshotSchema);
