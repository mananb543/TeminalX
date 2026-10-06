/**
 * TerminalX - Alert Engine Type Definitions
 * Normalized types, operators, trigger conditions, and evaluation contracts.
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

export interface CreateAlertDto {
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

export interface UpdateAlertDto {
  name?: string;
  type?: AlertType;
  symbol?: string;
  condition?: string;
  operator?: AlertOperator;
  threshold?: number;
  secondaryThreshold?: number;
  timeframe?: string;
  enabled?: boolean;
  cooldownMinutes?: number;
  notificationChannels?: string[];
  metadata?: Record<string, any>;
}

export interface AlertNotification {
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

export interface AlertEvaluationResult {
  alertId: string;
  triggered: boolean;
  inCooldown?: boolean;
  severity?: AlertSeverity;
  title?: string;
  message?: string;
  currentValue?: number | string;
  reason?: string;
}
