/**
 * TerminalX - Holding Mongoose Model
 * Tracks currently held stock positions, quantities, average buy price, and cost basis per user
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHolding extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

const HoldingSchema = new Schema<IHolding>(
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
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be positive'],
    },
    averagePrice: {
      type: Number,
      required: [true, 'Average price is required'],
      min: [0.01, 'Average price must be positive'],
    },
    totalCost: {
      type: Number,
      required: [true, 'Total cost is required'],
      min: [0, 'Total cost cannot be negative'],
    },
  },
  {
    timestamps: true,
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

// Compound index to guarantee one holding document per user per symbol
HoldingSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export const Holding: Model<IHolding> =
  mongoose.models.Holding || mongoose.model<IHolding>('Holding', HoldingSchema);
