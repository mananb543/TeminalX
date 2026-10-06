/**
 * TerminalX - NewsArticle Mongoose Model
 * Persistent cache and store for verified financial news articles and dispatches.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface INewsArticle extends Document {
  providerArticleId: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: Date;
  imageUrl?: string;
  symbols: string[];
  categories: string[];
  language?: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null;
  createdAt: Date;
  updatedAt: Date;
}

const NewsArticleSchema = new Schema<INewsArticle>(
  {
    providerArticleId: {
      type: String,
      required: [true, 'Provider article ID is required'],
      unique: true,
      index: true,
      trim: true,
    },
    headline: {
      type: String,
      required: [true, 'Headline is required'],
      trim: true,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      required: [true, 'Source publisher is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Article URL is required'],
      trim: true,
    },
    publishedAt: {
      type: Date,
      required: [true, 'Publication date is required'],
      index: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    symbols: {
      type: [String],
      default: [],
      index: true,
    },
    categories: {
      type: [String],
      default: ['MARKET'],
      index: true,
    },
    language: {
      type: String,
      default: 'en',
    },
    sentiment: {
      type: String,
      enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE', null],
      default: null,
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

// Compound indexes
NewsArticleSchema.index({ symbols: 1, publishedAt: -1 });
NewsArticleSchema.index({ categories: 1, publishedAt: -1 });

export const NewsArticle = mongoose.models.NewsArticle || mongoose.model<INewsArticle>('NewsArticle', NewsArticleSchema);
