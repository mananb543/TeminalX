/**
 * TerminalX - Watchlist Mongoose Model
 * Allows users to organize and track multiple custom ticker watchlists
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWatchlist extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  symbols: string[];
  createdAt: Date;
  updatedAt: Date;
}

const WatchlistSchema = new Schema<IWatchlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Watchlist name is required'],
      trim: true,
      default: 'Primary Watchlist',
    },
    symbols: {
      type: [String],
      default: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'TATAMOTORS', 'NIFTY 50'],
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

WatchlistSchema.index({ userId: 1, name: 1 });

export const Watchlist: Model<IWatchlist> =
  mongoose.models.Watchlist || mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);
