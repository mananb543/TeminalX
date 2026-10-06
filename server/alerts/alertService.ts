/**
 * TerminalX - Alert Service
 * Manages lifecycle, persistence, and safe evaluation of user-defined alerts.
 * Supports dual-mode persistence (MongoDB Atlas + Resilient In-Memory).
 */

import mongoose from 'mongoose';
import { Alert, IAlert, AlertType, AlertOperator } from '../models/Alert.ts';
import { dbState } from '../config/database.ts';
import {
  AlertRule,
  CreateAlertDto,
  UpdateAlertDto,
  AlertEvaluationResult,
} from './alertTypes.ts';
import { alertEvaluator } from './alertEvaluator.ts';
import { notificationService } from './notificationService.ts';

// In-memory fallback alert store
const memoryAlerts: Map<string, AlertRule> = new Map();

export class AlertService {
  /**
   * Create a new alert rule
   */
  public async createAlert(userId: string, data: CreateAlertDto): Promise<AlertRule> {
    const cleanUserId = userId.trim();
    const cleanSymbol = data.symbol ? data.symbol.toUpperCase().trim() : '';

    const newAlertData = {
      userId: cleanUserId,
      name: data.name.trim(),
      type: data.type,
      symbol: cleanSymbol,
      condition: data.condition?.trim() || '',
      operator: data.operator,
      threshold: Number(data.threshold),
      secondaryThreshold:
        typeof data.secondaryThreshold === 'number' ? data.secondaryThreshold : undefined,
      timeframe: data.timeframe || '1D',
      enabled: data.enabled !== false,
      triggered: false,
      triggeredAt: null,
      cooldownMinutes: data.cooldownMinutes ?? 60,
      lastEvaluatedAt: null,
      lastTriggeredAt: null,
      notificationChannels: data.notificationChannels || ['IN_APP'],
      metadata: data.metadata || {},
    };

    // 1. Primary: MongoDB Atlas
    if (dbState.isConnected && mongoose.Types.ObjectId.isValid(cleanUserId)) {
      try {
        const doc = await Alert.create({
          ...newAlertData,
          userId: new mongoose.Types.ObjectId(cleanUserId),
        });

        const createdRule: AlertRule = this.formatMongooseDoc(doc);
        // Also perform an initial non-blocking evaluation
        this.evaluateAlert(createdRule.id, cleanUserId).catch(() => {});
        return createdRule;
      } catch (err: any) {
        console.warn('[AlertService MongoDB Atlas fallback]:', err.message);
      }
    }

    // 2. Resilient In-Memory Fallback
    const id = `alt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const nowStr = new Date().toISOString();
    const alertRule: AlertRule = {
      ...newAlertData,
      id,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    memoryAlerts.set(id, alertRule);

    // Initial evaluation
    this.evaluateAlert(id, cleanUserId).catch(() => {});
    return alertRule;
  }

  /**
   * Retrieve alerts for a user with optional filtering
   */
  public async getAlerts(
    userId: string,
    filter?: { enabled?: boolean; type?: AlertType; symbol?: string }
  ): Promise<AlertRule[]> {
    const cleanUserId = userId.trim();

    if (dbState.isConnected && mongoose.Types.ObjectId.isValid(cleanUserId)) {
      try {
        const query: any = { userId: new mongoose.Types.ObjectId(cleanUserId) };
        if (typeof filter?.enabled === 'boolean') {
          query.enabled = filter.enabled;
        }
        if (filter?.type) {
          query.type = filter.type;
        }
        if (filter?.symbol) {
          query.symbol = filter.symbol.toUpperCase().trim();
        }

        const docs = await Alert.find(query).sort({ createdAt: -1 });
        return docs.map((doc) => this.formatMongooseDoc(doc));
      } catch (err: any) {
        console.warn('[AlertService MongoDB getAlerts fallback]:', err.message);
      }
    }

    return Array.from(memoryAlerts.values())
      .filter((a) => {
        if (a.userId !== cleanUserId) return false;
        if (typeof filter?.enabled === 'boolean' && a.enabled !== filter.enabled) return false;
        if (filter?.type && a.type !== filter.type) return false;
        if (filter?.symbol && a.symbol !== filter.symbol.toUpperCase().trim()) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get single alert by ID
   */
  public async getAlertById(alertId: string, userId: string): Promise<AlertRule | null> {
    const cleanUserId = userId.trim();
    const cleanId = alertId.trim();

    if (dbState.isConnected && mongoose.Types.ObjectId.isValid(cleanId)) {
      try {
        const doc = await Alert.findOne({
          _id: new mongoose.Types.ObjectId(cleanId),
          userId: new mongoose.Types.ObjectId(cleanUserId),
        });
        if (doc) return this.formatMongooseDoc(doc);
      } catch (err: any) {
        console.warn('[AlertService MongoDB getAlertById fallback]:', err.message);
      }
    }

    const alert = memoryAlerts.get(cleanId);
    if (alert && alert.userId === cleanUserId) {
      return alert;
    }
    return null;
  }

  /**
   * Update an existing alert
   */
  public async updateAlert(
    alertId: string,
    userId: string,
    updates: UpdateAlertDto
  ): Promise<AlertRule | null> {
    const cleanUserId = userId.trim();
    const cleanId = alertId.trim();

    const cleanUpdates: any = { ...updates };
    if (cleanUpdates.symbol) {
      cleanUpdates.symbol = cleanUpdates.symbol.toUpperCase().trim();
    }
    if (typeof cleanUpdates.threshold === 'number') {
      cleanUpdates.threshold = Number(cleanUpdates.threshold);
    }
    // If threshold or operator changes, reset triggered state so it can evaluate afresh
    if (cleanUpdates.threshold !== undefined || cleanUpdates.operator !== undefined) {
      cleanUpdates.triggered = false;
      cleanUpdates.lastTriggeredAt = null;
    }

    if (dbState.isConnected && mongoose.Types.ObjectId.isValid(cleanId)) {
      try {
        const doc = await Alert.findOneAndUpdate(
          {
            _id: new mongoose.Types.ObjectId(cleanId),
            userId: new mongoose.Types.ObjectId(cleanUserId),
          },
          { $set: cleanUpdates },
          { new: true }
        );
        if (doc) return this.formatMongooseDoc(doc);
      } catch (err: any) {
        console.warn('[AlertService MongoDB updateAlert fallback]:', err.message);
      }
    }

    const alert = memoryAlerts.get(cleanId);
    if (alert && alert.userId === cleanUserId) {
      const updated: AlertRule = {
        ...alert,
        ...cleanUpdates,
        updatedAt: new Date().toISOString(),
      };
      memoryAlerts.set(cleanId, updated);
      return updated;
    }
    return null;
  }

  /**
   * Toggle enabled status of an alert
   */
  public async toggleAlert(
    alertId: string,
    userId: string,
    forceState?: boolean
  ): Promise<AlertRule | null> {
    const existing = await this.getAlertById(alertId, userId);
    if (!existing) return null;

    const newEnabled = typeof forceState === 'boolean' ? forceState : !existing.enabled;
    return this.updateAlert(alertId, userId, { enabled: newEnabled });
  }

  /**
   * Delete an alert
   */
  public async deleteAlert(alertId: string, userId: string): Promise<boolean> {
    const cleanUserId = userId.trim();
    const cleanId = alertId.trim();

    if (dbState.isConnected && mongoose.Types.ObjectId.isValid(cleanId)) {
      try {
        const res = await Alert.deleteOne({
          _id: new mongoose.Types.ObjectId(cleanId),
          userId: new mongoose.Types.ObjectId(cleanUserId),
        });
        return res.deletedCount > 0;
      } catch (err: any) {
        console.warn('[AlertService MongoDB deleteAlert fallback]:', err.message);
      }
    }

    const alert = memoryAlerts.get(cleanId);
    if (alert && alert.userId === cleanUserId) {
      memoryAlerts.delete(cleanId);
      return true;
    }
    return false;
  }

  /**
   * Evaluate a single alert rule and record notification if condition triggered
   */
  public async evaluateAlert(
    alertId: string,
    userId: string,
    quoteCache?: Map<string, any>
  ): Promise<AlertEvaluationResult> {
    const alert = await this.getAlertById(alertId, userId);
    if (!alert) {
      return { alertId, triggered: false, reason: 'Alert not found' };
    }

    const result = await alertEvaluator.evaluate(alert, quoteCache);
    const nowStr = new Date().toISOString();

    if (result.triggered) {
      // 1. Generate in-app alert event notification
      await notificationService.createNotification({
        userId,
        alertId: alert.id,
        type: alert.type,
        title: result.title || `Alert Triggered: ${alert.name}`,
        message: result.message || `Condition satisfied for ${alert.name}`,
        symbol: alert.symbol,
        severity: result.severity || 'INFO',
        triggeredValue: result.currentValue,
        threshold: alert.threshold,
        metadata: {
          ...alert.metadata,
          operator: alert.operator,
          triggeredAt: nowStr,
        },
      });

      // 2. Mark alert as triggered with cooldown
      await this.saveEvaluationState(alert.id, userId, {
        triggered: true,
        triggeredAt: nowStr,
        lastTriggeredAt: nowStr,
        lastEvaluatedAt: nowStr,
        metadata: alert.metadata,
      });
    } else if (result.inCooldown) {
      // Maintain triggered state while within cooldown
      await this.saveEvaluationState(alert.id, userId, {
        lastEvaluatedAt: nowStr,
        metadata: alert.metadata,
      });
    } else {
      // If condition is no longer satisfied, reset triggered flag to allow future re-triggers
      await this.saveEvaluationState(alert.id, userId, {
        triggered: false,
        lastEvaluatedAt: nowStr,
        metadata: alert.metadata,
      });
    }

    return result;
  }

  /**
   * Evaluate all enabled alerts for a specific user with shared quote cache
   */
  public async evaluateUserAlerts(
    userId: string
  ): Promise<{ evaluated: number; triggered: number; results: AlertEvaluationResult[] }> {
    const alerts = await this.getAlerts(userId, { enabled: true });
    let triggeredCount = 0;
    const results: AlertEvaluationResult[] = [];
    const quoteCache = new Map<string, any>();

    for (const alert of alerts) {
      try {
        const res = await this.evaluateAlert(alert.id, userId, quoteCache);
        results.push(res);
        if (res.triggered) triggeredCount++;
      } catch (err: any) {
        results.push({
          alertId: alert.id,
          triggered: false,
          reason: err.message,
        });
      }
    }

    return {
      evaluated: alerts.length,
      triggered: triggeredCount,
      results,
    };
  }

  /**
   * Evaluate all enabled alerts across all users (called by background scheduler) with shared quote cache
   */
  public async evaluateAllActiveAlerts(): Promise<{ evaluated: number; triggered: number }> {
    let allAlerts: AlertRule[] = [];

    if (dbState.isConnected) {
      try {
        const docs = await Alert.find({ enabled: true });
        allAlerts = docs.map((doc) => this.formatMongooseDoc(doc));
      } catch (err: any) {
        console.warn('[AlertService evaluateAllActiveAlerts Atlas fallback]:', err.message);
      }
    }

    if (allAlerts.length === 0) {
      allAlerts = Array.from(memoryAlerts.values()).filter((a) => a.enabled);
    }

    let triggeredCount = 0;
    const quoteCache = new Map<string, any>();

    for (const alert of allAlerts) {
      try {
        const res = await this.evaluateAlert(alert.id, alert.userId, quoteCache);
        if (res.triggered) triggeredCount++;
      } catch {
        // Continue evaluating remaining alerts
      }
    }

    return {
      evaluated: allAlerts.length,
      triggered: triggeredCount,
    };
  }

  /**
   * Internal helper: persist evaluation timestamps and metadata
   */
  private async saveEvaluationState(
    alertId: string,
    userId: string,
    updates: {
      triggered?: boolean;
      triggeredAt?: string | null;
      lastTriggeredAt?: string | null;
      lastEvaluatedAt?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    if (dbState.isConnected && mongoose.Types.ObjectId.isValid(alertId)) {
      try {
        const updateObj: any = {
          lastEvaluatedAt: updates.lastEvaluatedAt ? new Date(updates.lastEvaluatedAt) : new Date(),
        };
        if (updates.triggered !== undefined) updateObj.triggered = updates.triggered;
        if (updates.triggeredAt) updateObj.triggeredAt = new Date(updates.triggeredAt);
        if (updates.lastTriggeredAt) updateObj.lastTriggeredAt = new Date(updates.lastTriggeredAt);
        if (updates.metadata) updateObj.metadata = updates.metadata;

        await Alert.updateOne(
          {
            _id: new mongoose.Types.ObjectId(alertId),
            userId: new mongoose.Types.ObjectId(userId),
          },
          { $set: updateObj }
        );
        return;
      } catch (err: any) {
        console.warn('[AlertService saveEvaluationState Atlas fallback]:', err.message);
      }
    }

    const alert = memoryAlerts.get(alertId);
    if (alert && alert.userId === userId) {
      Object.assign(alert, updates, { updatedAt: new Date().toISOString() });
    }
  }

  /**
   * Internal helper: Normalize Mongoose document to clean AlertRule
   */
  private formatMongooseDoc(doc: IAlert): AlertRule {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      name: doc.name,
      type: doc.type,
      symbol: doc.symbol || '',
      condition: doc.condition || '',
      operator: doc.operator,
      threshold: doc.threshold,
      secondaryThreshold: doc.secondaryThreshold,
      timeframe: doc.timeframe || '1D',
      enabled: doc.enabled,
      triggered: doc.triggered,
      triggeredAt: doc.triggeredAt ? doc.triggeredAt.toISOString() : null,
      cooldownMinutes: doc.cooldownMinutes,
      lastEvaluatedAt: doc.lastEvaluatedAt ? doc.lastEvaluatedAt.toISOString() : null,
      lastTriggeredAt: doc.lastTriggeredAt ? doc.lastTriggeredAt.toISOString() : null,
      notificationChannels: doc.notificationChannels || ['IN_APP'],
      metadata: doc.metadata || {},
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}

export const alertService = new AlertService();
