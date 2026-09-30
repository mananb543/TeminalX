/**
 * TerminalX - Order Mongoose Model
 * Represents simulated buy/sell orders placed by users
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED';

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  type: OrderSide;
  orderType: OrderType;
  quantity: number;
  price: number;
  totalValue: number;
  status: OrderStatus;
  timestamp: Date;
}

const OrderSchema = new Schema<IOrder>(
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
      required: [true, 'Order side is required'],
    },
    orderType: {
      type: String,
      enum: ['MARKET', 'LIMIT'],
      default: 'MARKET',
      required: [true, 'Order type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    totalValue: {
      type: Number,
      required: [true, 'Total order value is required'],
      min: [0, 'Total value cannot be negative'],
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'PENDING', 'CANCELLED'],
      default: 'COMPLETED',
      required: true,
      index: true,
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

OrderSchema.index({ userId: 1, timestamp: -1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
