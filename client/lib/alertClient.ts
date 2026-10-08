/**
 * TerminalX - Alert & Notification API Client
 * Provides typed frontend client methods for alert lifecycle and notification feeds.
 */

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

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AlertRule {
  id: string;
  userId: string;
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
  triggeredAt?: string | null;
  cooldownMinutes: number;
  lastEvaluatedAt?: string | null;
  lastTriggeredAt?: string | null;
  notificationChannels: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertInput {
  name: string;
  type: AlertType;
  symbol?: string;
  condition?: string;
  operator: AlertOperator;
  threshold: number;
  secondaryThreshold?: number;
  timeframe?: string;
  enabled?: boolean;
  cooldownMinutes?: number;
  notificationChannels?: string[];
  metadata?: Record<string, any>;
}

export interface AlertNotificationItem {
  id: string;
  userId: string;
  alertId?: string | null;
  type: string;
  title: string;
  message: string;
  symbol?: string;
  severity: AlertSeverity;
  metadata?: Record<string, any>;
  triggeredValue?: number | string | null;
  threshold?: number | string | null;
  read: boolean;
  createdAt: string;
}

class AlertClient {
  private getHeaders(): HeadersInit {
    const token =
      sessionStorage.getItem('terminalx_token') || localStorage.getItem('terminalx_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Fetch all user alerts
   */
  public async getAlerts(filter?: {
    enabled?: boolean;
    type?: AlertType;
    symbol?: string;
  }): Promise<AlertRule[]> {
    const params = new URLSearchParams();
    if (typeof filter?.enabled === 'boolean') {
      params.append('enabled', String(filter.enabled));
    }
    if (filter?.type) {
      params.append('type', filter.type);
    }
    if (filter?.symbol) {
      params.append('symbol', filter.symbol);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/alerts${query}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch alerts');
    return json.alerts || [];
  }

  /**
   * Create a new alert rule
   */
  public async createAlert(data: CreateAlertInput): Promise<AlertRule> {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create alert');
    return json.alert;
  }

  /**
   * Update an existing alert rule
   */
  public async updateAlert(id: string, updates: Partial<CreateAlertInput>): Promise<AlertRule> {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update alert');
    return json.alert;
  }

  /**
   * Toggle enabled status of an alert
   */
  public async toggleAlert(id: string, enabled?: boolean): Promise<AlertRule> {
    const res = await fetch(`/api/alerts/${id}/toggle`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ enabled }),
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to toggle alert');
    return json.alert;
  }

  /**
   * Delete an alert
   */
  public async deleteAlert(id: string): Promise<boolean> {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete alert');
    return true;
  }

  /**
   * Trigger immediate evaluation of all alerts
   */
  public async evaluateAll(): Promise<{ evaluated: number; triggered: number }> {
    const res = await fetch('/api/alerts/evaluate', {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Evaluation failed');
    return { evaluated: json.evaluated || 0, triggered: json.triggered || 0 };
  }

  /**
   * Evaluate a single alert rule
   */
  public async evaluateSingle(id: string): Promise<any> {
    const res = await fetch(`/api/alerts/${id}/evaluate`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await res.json();
    return json.result;
  }

  /**
   * Fetch triggered notification events
   */
  public async getNotifications(filter?: {
    read?: boolean;
    limit?: number;
  }): Promise<{ notifications: AlertNotificationItem[]; unreadCount: number }> {
    const params = new URLSearchParams();
    if (typeof filter?.read === 'boolean') {
      params.append('read', String(filter.read));
    }
    if (filter?.limit) {
      params.append('limit', String(filter.limit));
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/alerts/notifications${query}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch notifications');
    return {
      notifications: json.notifications || [],
      unreadCount: json.unreadCount || 0,
    };
  }

  /**
   * Get unread notification count
   */
  public async getUnreadCount(): Promise<number> {
    const res = await fetch('/api/alerts/notifications/unread-count', {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await res.json();
    return json.unreadCount || 0;
  }

  /**
   * Mark single notification as read
   */
  public async markAsRead(id: string): Promise<boolean> {
    const res = await fetch(`/api/alerts/notifications/${id}/read`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await res.json();
    return json.success || false;
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(): Promise<number> {
    const res = await fetch('/api/alerts/notifications/read-all', {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await res.json();
    return json.markedCount || 0;
  }

  /**
   * Delete single notification
   */
  public async deleteNotification(id: string): Promise<boolean> {
    const res = await fetch(`/api/alerts/notifications/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await res.json();
    return json.success || false;
  }

  /**
   * Clear all notification history
   */
  public async clearAllNotifications(): Promise<number> {
    const res = await fetch('/api/alerts/notifications', {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await res.json();
    return json.clearedCount || 0;
  }
}

export const alertClient = new AlertClient();
