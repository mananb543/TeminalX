/**
 * TerminalX - Alert Mongoose Model
 * Persistent definitions for price, volatility, portfolio, watchlist, and corporate action triggers.
 */

import mongoose, { Schema, Document } from 'mongoose';

export type AlertType =
  | 'PRICE'
  | 'PRICE_CHANGE'
  | 'PORTFOLIO_PNL'
  | 'PORTFOLIO_DRAWDOWN'
  | 'RISK'
  | 'WATCHLIST'
  | 'NEWS'
  | 'EVENT';

export type AlertOperator =
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL'
  | 'EQUALS'
  | 'CROSSES_ABOVE'
  | 'CROSSES_BELOW';

export interface IAlert extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: AlertType;
  symbol?: string;
  condition: string;
  operator: AlertOperator;
  threshold: number;
  secondaryThreshold?: number;
  timeframe?: string;
  enabled: boolean;
  triggered: boolean;
  triggeredAt?: Date;
  cooldownMinutes: number;
  lastEvaluatedAt?: Date;
  lastTriggeredAt?: Date;
  notificationChannels: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Alert name is required'],
      trim: true,
      maxlength: 120,
    },
    type: {
      type: String,
      required: [true, 'Alert type is required'],
      enum: [
        'PRICE',
        'PRICE_CHANGE',
        'PORTFOLIO_PNL',
        'PORTFOLIO_DRAWDOWN',
        'RISK',
        'WATCHLIST',
        'NEWS',
        'EVENT',
      ],
      index: true,
    },
    symbol: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    condition: {
      type: String,
      trim: true,
      default: '',
    },
    operator: {
      type: String,
      required: [true, 'Evaluation operator is required'],
      enum: [
        'GREATER_THAN',
        'LESS_THAN',
        'GREATER_THAN_OR_EQUAL',
        'LESS_THAN_OR_EQUAL',
        'EQUALS',
        'CROSSES_ABOVE',
        'CROSSES_BELOW',
      ],
    },
    threshold: {
      type: Number,
      required: [true, 'Threshold value is required'],
    },
    secondaryThreshold: {
      type: Number,
      default: null,
    },
    timeframe: {
      type: String,
      default: '1D',
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    triggered: {
      type: Boolean,
      default: false,
    },
    triggeredAt: {
      type: Date,
      default: null,
    },
    cooldownMinutes: {
      type: Number,
      default: 60,
      min: 1,
    },
    lastEvaluatedAt: {
      type: Date,
      default: null,
    },
    lastTriggeredAt: {
      type: Date,
      default: null,
    },
    notificationChannels: {
      type: [String],
      default: ['IN_APP'],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

AlertSchema.index({ userId: 1, enabled: 1 });
AlertSchema.index({ userId: 1, symbol: 1 });
AlertSchema.index({ userId: 1, type: 1 });

export const Alert =
  mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);
