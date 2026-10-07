/**
 * TerminalX - Notification Service
 * Manages triggered alert events, in-app notifications, and dispatch history.
 * Resilient to database state (MongoDB Atlas with in-memory fallback).
 */

import mongoose from 'mongoose';
import { AlertEvent, IAlertEvent, AlertSeverity } from '../models/AlertEvent.ts';
import { dbState } from '../config/database.ts';
import { AlertNotification } from './alertTypes.ts';

// In-memory fallback notification store
const memoryNotifications: AlertNotification[] = [];

export class NotificationService {
  /**
   * Create and persist a new alert event / notification
   */
  public async createNotification(data: {
    userId: string;
    alertId?: string;
    type: string;
    title: string;
    message: string;
    symbol?: string;
    severity?: AlertSeverity;
    metadata?: Record<string, any>;
    triggeredValue?: number | string;
    threshold?: number | string;
  }): Promise<AlertNotification> {
    const cleanUserId = data.userId.trim();
    const severity: AlertSeverity = data.severity || 'INFO';

    // 1. Primary: MongoDB Atlas
    if (dbState.isConnected && mongoose.Types.ObjectId.isValid(cleanUserId)) {
      try {
        const doc = await AlertEvent.create({
          userId: new mongoose.Types.ObjectId(cleanUserId),
          alertId:
            data.alertId && mongoose.Types.ObjectId.isValid(data.alertId)
              ? new mongoose.Types.ObjectId(data.alertId)
              : null,
          type: data.type,
          title: data.title,
          message: data.message,
          symbol: data.symbol || '',
          severity,
          metadata: data.metadata || {},
          triggeredValue: data.triggeredValue ?? null,
          threshold: data.threshold ?? null,
          read: false,
        });

        return {
          id: doc._id.toString(),
          userId: doc.userId.toString(),
          alertId: doc.alertId ? doc.alertId.toString() : null,
          type: doc.type,
          title: doc.title,
          message: doc.message,
          symbol: doc.symbol,
          severity: doc.severity,
          metadata: doc.metadata,
          triggeredValue: doc.triggeredValue,
          threshold: doc.threshold,
          read: doc.read,
          createdAt: doc.createdAt.toISOString(),
        };
      } catch (err: any) {
        console.warn('[NotificationService MongoDB Atlas fallback]:', err.message);
      }
    }

    // 2. Resilient In-Memory Fallback
    const notification: AlertNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: cleanUserId,
      alertId: data.alertId || null,
      type: data.type,
      title: data.title,
      message: data.message,
      symbol: data.symbol || '',
      severity,
      metadata: data.metadata || {},
      triggeredValue: data.triggeredValue ?? null,
      threshold: data.threshold ?? null,
      read: false,
      createdAt: new Date().toISOString(),
    };

    memoryNotifications.unshift(notification);
    // Keep max 500 items in memory
    if (memoryNotifications.length > 500) {
      memoryNotifications.pop();
    }

    return notification;
  }

  /**
   * Retrieve notification history for a user
   */
  public async getNotifications(
    userId: string,
    filter?: { read?: boolean; limit?: number }
  ): Promise<AlertNotification[]> {
    const cleanUserId = userId.trim();
    const limit = filter?.limit || 50;

    if (dbState.isConnected && mongoose.Types.ObjectId.isValid(cleanUserId)) {
      try {
        const query: any = { userId: new mongoose.Types.ObjectId(cleanUserId) };
        if (typeof filter?.read === 'boolean') {
          query.read = filter.read;
        }

        const docs = await AlertEvent.find(query)
          .sort({ createdAt: -1 })
          .limit(limit);

        return docs.map((doc) => ({
          id: doc._id.toString(),
          userId: doc.userId.toString(),
          alertId: doc.alertId ? doc.alertId.toString() : null,
          type: doc.type,
          title: doc.title,
          message: doc.message,
          symbol: doc.symbol,
          severity: doc.severity,
          metadata: doc.metadata,
          triggeredValue: doc.triggeredValue,
          threshold: doc.threshold,
          read: doc.read,
          createdAt: doc.createdAt.toISOString(),
        }));
      } catch (err: any) {
        console.warn('[NotificationService MongoDB getNotifications fallback]:', err.message);
      }
    }

    return memoryNotifications
      .filter((n) => n.userId === cleanUserId && (typeof filter?.read !== 'boolean' || n.read === filter.read))
      .slice(0, limit);
  }

  /**
   * Get count of unread notifications for a user
   */
  public async getUnreadCount(userId: string): Promise<number> {
    const cleanUserId = userId.trim();

    if (dbState.isConnected && mongoose.Types.ObjectId.isValid(cleanUserId)) {
      try {
        return await AlertEvent.countDocuments({
          userId: new mongoose.Types.ObjectId(cleanUserId),
          read: false,
        });
      } catch (err: any) {
        console.warn('[NotificationService MongoDB getUnreadCount fallback]:', err.message);
      }
    }

    return memoryNotifications.filter((n) => n.userId === cleanUserId && !n.read).length;
  }

  /**
   * Mark a single notification as read
   */
  public async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const cleanUserId = userId.trim();
    const cleanId = notificationId.trim();

    if (
      dbState.isConnected &&
      mongoose.Types.ObjectId.isValid(cleanId) &&
      mongoose.Types.ObjectId.isValid(cleanUserId)
    ) {
      try {
        const res = await AlertEvent.updateOne(
          {
            _id: new mongoose.Types.ObjectId(cleanId),
            userId: new mongoose.Types.ObjectId(cleanUserId),
          },
          { $set: { read: true } }
        );
        return res.modifiedCount > 0;
      } catch (err: any) {
        console.warn('[NotificationService MongoDB markAsRead fallback]:', err.message);
      }
    }

    const item = memoryNotifications.find(
      (n) => n.id === cleanId && n.userId === cleanUserId
    );
    if (item) {
      item.read = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read for a user
   */
  public async markAllAsRead(userId: string): Promise<number> {
    const cleanUserId = userId.trim();

    if (dbState.isConnected && mongoose.Types.ObjectId.isValid(cleanUserId)) {
      try {
        const res = await AlertEvent.updateMany(
          { userId: new mongoose.Types.ObjectId(cleanUserId), read: false },
          { $set: { read: true } }
        );
        return res.modifiedCount;
      } catch (err: any) {
        console.warn('[NotificationService MongoDB markAllAsRead fallback]:', err.message);
      }
    }

    let count = 0;
    for (const item of memoryNotifications) {
      if (item.userId === cleanUserId && !item.read) {
        item.read = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Delete a single notification
   */
  public async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const cleanUserId = userId.trim();
    const cleanId = notificationId.trim();

    if (
      dbState.isConnected &&
      mongoose.Types.ObjectId.isValid(cleanId) &&
      mongoose.Types.ObjectId.isValid(cleanUserId)
    ) {
      try {
        const res = await AlertEvent.deleteOne({
          _id: new mongoose.Types.ObjectId(cleanId),
          userId: new mongoose.Types.ObjectId(cleanUserId),
        });
        return res.deletedCount > 0;
      } catch (err: any) {
        console.warn('[NotificationService MongoDB deleteNotification fallback]:', err.message);
      }
    }

    const index = memoryNotifications.findIndex(
      (n) => n.id === cleanId && n.userId === cleanUserId
    );
    if (index !== -1) {
      memoryNotifications.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all notification history for a user
   */
  public async clearAllNotifications(userId: string): Promise<number> {
    const cleanUserId = userId.trim();

    if (dbState.isConnected && mongoose.Types.ObjectId.isValid(cleanUserId)) {
      try {
        const res = await AlertEvent.deleteMany({
          userId: new mongoose.Types.ObjectId(cleanUserId),
        });
        return res.deletedCount;
      } catch (err: any) {
        console.warn('[NotificationService MongoDB clearAllNotifications fallback]:', err.message);
      }
    }

    const initialLen = memoryNotifications.length;
    const remaining = memoryNotifications.filter((n) => n.userId !== cleanUserId);
    memoryNotifications.length = 0;
    memoryNotifications.push(...remaining);
    return initialLen - remaining.length;
  }
}

export const notificationService = new NotificationService();
