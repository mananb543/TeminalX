/**
 * TerminalX - Transaction Mongoose Model
 * Permanent audit ledger of executed paper trades
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { OrderSide } from './Order.ts';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  type: OrderSide;
  quantity: number;
  price: number;
  totalValue: number;
  timestamp: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    symbol: {
      type: String,
      required: [true, 'Ticker symbol is required'],
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: [true, 'Transaction side is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
    },
    totalValue: {
      type: Number,
      required: [true, 'Total value is required'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
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

TransactionSchema.index({ userId: 1, timestamp: -1 });

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
