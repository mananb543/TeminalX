/**
 * TerminalX - Portfolio Model & Financial Calculators
 * Derives real-time portfolio metrics dynamically from User balance, active Holdings, and Transactions.
 * Avoids redundant data duplication while providing standardized quantitative structures.
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

// Optional snapshot schema for historical equity curve tracking across dates
export interface IPortfolioSnapshot extends Document {
  userId: mongoose.Types.ObjectId;
  totalPortfolioValue: number;
  cashBalance: number;
  investedCapital: number;
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
    totalPortfolioValue: {
      type: Number,
      required: true,
    },
    cashBalance: {
      type: Number,
      required: true,
    },
    investedCapital: {
      type: Number,
      required: true,
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
