/**
 * TerminalX - AlertEvent / Notification Mongoose Model
 * Historical ledger of triggered alert incidents, security disclosures, and portfolio risk breaches.
 */

import mongoose, { Schema, Document } from 'mongoose';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface IAlertEvent extends Document {
  userId: mongoose.Types.ObjectId;
  alertId?: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  symbol?: string;
  severity: AlertSeverity;
  metadata?: Record<string, any>;
  triggeredValue?: number | string;
  threshold?: number | string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AlertEventSchema = new Schema<IAlertEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    alertId: {
      type: Schema.Types.ObjectId,
      ref: 'Alert',
      default: null,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Alert event type is required'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    symbol: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    severity: {
      type: String,
      required: true,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      default: 'INFO',
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    triggeredValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    threshold: {
      type: Schema.Types.Mixed,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

AlertEventSchema.index({ userId: 1, read: 1, createdAt: -1 });
AlertEventSchema.index({ userId: 1, createdAt: -1 });

export const AlertEvent =
  mongoose.models.AlertEvent || mongoose.model<IAlertEvent>('AlertEvent', AlertEventSchema);
