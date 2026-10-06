/**
 * TerminalX - Alert Evaluator Engine
 * Strictly delegates market pricing, quantitative risk, and news analysis
 * to existing core services without duplicate calculation logic.
 * Supports request grouping and in-memory quote caching to prevent upstream rate limits.
 */

import { AlertRule, AlertEvaluationResult, AlertSeverity } from './alertTypes.ts';
import { unifiedMarketService } from '../market/marketService.ts';
import { portfolioAnalyticsService } from '../analytics/portfolioAnalyticsService.ts';
import { riskAnalyticsService } from '../analytics/riskAnalyticsService.ts';
import { newsService } from '../news/newsService.ts';
import { storageService } from '../services/storageService.ts';
import { NormalizedQuote } from '../market/providers/MarketDataProvider.ts';

export class AlertEvaluator {
  /**
   * Evaluate a single alert rule against real-time data sources.
   * Optional quoteCache avoids redundant quote lookups when evaluating multiple alerts.
   */
  public async evaluate(
    alert: AlertRule,
    quoteCache?: Map<string, NormalizedQuote>
  ): Promise<AlertEvaluationResult> {
    if (!alert.enabled) {
      return { alertId: alert.id, triggered: false, reason: 'Alert is disabled' };
    }

    const now = new Date();

    // Check cooldown window if already triggered
    if (alert.lastTriggeredAt && alert.cooldownMinutes > 0) {
      const lastTriggeredTime = new Date(alert.lastTriggeredAt).getTime();
      const elapsedMinutes = (now.getTime() - lastTriggeredTime) / (60 * 1000);

      if (elapsedMinutes < alert.cooldownMinutes) {
        return {
          alertId: alert.id,
          triggered: false,
          inCooldown: true,
          reason: `In cooldown (${Math.ceil(alert.cooldownMinutes - elapsedMinutes)}m remaining)`,
        };
      }
    }

    try {
      switch (alert.type) {
        case 'PRICE':
          return await this.evaluatePriceAlert(alert, quoteCache);

        case 'PRICE_CHANGE':
          return await this.evaluatePriceChangeAlert(alert, quoteCache);

        case 'PORTFOLIO_PNL':
          return await this.evaluatePortfolioPnLAlert(alert);

        case 'PORTFOLIO_DRAWDOWN':
          return await this.evaluatePortfolioDrawdownAlert(alert);

        case 'RISK':
          return await this.evaluateRiskAlert(alert);

        case 'WATCHLIST':
          return await this.evaluateWatchlistAlert(alert, quoteCache);

        case 'EVENT':
          return await this.evaluateEventAlert(alert);

        case 'NEWS':
          return await this.evaluateNewsAlert(alert);

        default:
          return {
            alertId: alert.id,
            triggered: false,
            reason: `Unsupported alert type: ${alert.type}`,
          };
      }
    } catch (err: any) {
      return {
        alertId: alert.id,
        triggered: false,
        reason: `Evaluation error: ${err.message}`,
      };
    }
  }

  /**
   * Helper to retrieve quote using optional batch cache or unified service
   */
  private async getQuoteWithCache(
    symbol: string,
    quoteCache?: Map<string, NormalizedQuote>
  ): Promise<NormalizedQuote> {
    const cleanSym = symbol.toUpperCase().trim();
    if (quoteCache && quoteCache.has(cleanSym)) {
      return quoteCache.get(cleanSym)!;
    }
    const quote = await unifiedMarketService.getQuote(cleanSym);
    if (quoteCache) {
      quoteCache.set(cleanSym, quote);
    }
    return quote;
  }

  /**
   * 1. Price Alert: Absolute stock price check & crossing detection
   */
  private async evaluatePriceAlert(
    alert: AlertRule,
    quoteCache?: Map<string, NormalizedQuote>
  ): Promise<AlertEvaluationResult> {
    const symbol = (alert.symbol || '').toUpperCase().trim();
    if (!symbol) {
      return { alertId: alert.id, triggered: false, reason: 'Missing symbol' };
    }

    const quote = await this.getQuoteWithCache(symbol, quoteCache);
    const currentPrice = quote.price;
    const threshold = alert.threshold;
    const currency = quote.currency === 'USD' ? '$' : '₹';
    const lastObserved = alert.metadata?.lastObservedPrice ?? alert.metadata?.lastObservedValue;

    const { satisfied, severity } = this.checkOperatorCondition(
      currentPrice,
      threshold,
      alert.operator,
      lastObserved
    );

    // Save current price as observed for future crossing state checks
    if (!alert.metadata) alert.metadata = {};
    alert.metadata.lastObservedPrice = currentPrice;
    alert.metadata.lastObservedValue = currentPrice;

    if (!satisfied) {
      return { alertId: alert.id, triggered: false, currentValue: currentPrice };
    }

    const opLabel = this.formatOperatorLabel(alert.operator);
    const title = `Price Alert: ${symbol} ${opLabel} ${currency}${threshold.toLocaleString('en-IN')}`;
    const message = `${symbol} is currently trading at ${currency}${currentPrice.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    })}, satisfying your trigger condition (${opLabel} ${currency}${threshold.toLocaleString('en-IN')}).`;

    return {
      alertId: alert.id,
      triggered: true,
      severity,
      title,
      message,
      currentValue: currentPrice,
    };
  }

  /**
   * 2. Price Change Alert: Percentage movement (e.g. daily change > 5% or < -3%)
   */
  private async evaluatePriceChangeAlert(
    alert: AlertRule,
    quoteCache?: Map<string, NormalizedQuote>
  ): Promise<AlertEvaluationResult> {
    const symbol = (alert.symbol || '').toUpperCase().trim();
    if (!symbol) {
      return { alertId: alert.id, triggered: false, reason: 'Missing symbol' };
    }

    const quote = await this.getQuoteWithCache(symbol, quoteCache);
    if (quote.changePercent === null || quote.changePercent === undefined) {
      return {
        alertId: alert.id,
        triggered: false,
        reason: 'Change percentage not available for symbol',
      };
    }

    const changePercent = quote.changePercent;
    const threshold = alert.threshold;

    const { satisfied } = this.checkNumericThreshold(changePercent, threshold, alert.operator);

    if (!alert.metadata) alert.metadata = {};
    alert.metadata.lastObservedChangePercent = changePercent;
    alert.metadata.lastObservedValue = changePercent;

    if (!satisfied) {
      return { alertId: alert.id, triggered: false, currentValue: changePercent };
    }

    const severity: AlertSeverity = changePercent <= -5 ? 'CRITICAL' : changePercent < 0 ? 'WARNING' : 'INFO';
    const title = `Price Movement: ${symbol} ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    const message = `${symbol} daily movement reached ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(
      2
    )}% (Condition: ${this.formatOperatorLabel(alert.operator)} ${threshold}%).`;

    return {
      alertId: alert.id,
      triggered: true,
      severity,
      title,
      message,
      currentValue: changePercent,
    };
  }

  /**
   * 3. Portfolio P&L Alert: Profit target or stop loss
   */
  private async evaluatePortfolioPnLAlert(alert: AlertRule): Promise<AlertEvaluationResult> {
    const summary = await portfolioAnalyticsService.getPortfolioSummary(alert.userId);
    const isDayPnL = alert.condition === 'DAY_PNL';
    const pnlValue = isDayPnL ? summary.dayPnL : summary.totalPnL;
    const threshold = alert.threshold;

    const { satisfied } = this.checkNumericThreshold(pnlValue, threshold, alert.operator);

    if (!satisfied) {
      return { alertId: alert.id, triggered: false, currentValue: pnlValue };
    }

    const isLoss = pnlValue < 0;
    const severity: AlertSeverity = isLoss && Math.abs(pnlValue) >= Math.abs(threshold) ? 'CRITICAL' : 'INFO';
    const label = isDayPnL ? "Today's P&L" : 'Total Portfolio P&L';
    const title = `${label} Alert: ₹${pnlValue.toLocaleString('en-IN')}`;
    const message = `Your ${label.toLowerCase()} is ₹${pnlValue.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    })}, breaching threshold of ₹${threshold.toLocaleString('en-IN')}.`;

    return {
      alertId: alert.id,
      triggered: true,
      severity,
      title,
      message,
      currentValue: pnlValue,
    };
  }

  /**
   * 4. Portfolio Drawdown Alert: Maximum drawdown percentage
   */
  private async evaluatePortfolioDrawdownAlert(alert: AlertRule): Promise<AlertEvaluationResult> {
    const risk = await riskAnalyticsService.getRiskMetrics(alert.userId);
    const drawdown = risk.maxDrawdown?.maxDrawdownPercent || 0;
    const threshold = alert.threshold;

    const { satisfied } = this.checkNumericThreshold(drawdown, threshold, alert.operator);

    if (!satisfied) {
      return { alertId: alert.id, triggered: false, currentValue: drawdown };
    }

    const severity: AlertSeverity = drawdown >= 15 ? 'CRITICAL' : 'WARNING';
    const title = `Portfolio Drawdown Alert: ${drawdown.toFixed(2)}%`;
    const message = `Portfolio peak-to-trough drawdown has reached ${drawdown.toFixed(
      2
    )}%, exceeding safety threshold of ${threshold}%.`;

    return {
      alertId: alert.id,
      triggered: true,
      severity,
      title,
      message,
      currentValue: drawdown,
    };
  }

  /**
   * 5. Quantitative Risk Threshold Alert: Volatility, VaR, or Sharpe
   * Handles insufficient data gracefully without inventing false values.
   */
  private async evaluateRiskAlert(alert: AlertRule): Promise<AlertEvaluationResult> {
    const risk = await riskAnalyticsService.getRiskMetrics(alert.userId);
    let metricValue = 0;
    let metricName = 'Volatility';

    if (alert.condition === 'VAR') {
      metricName = '95% Value at Risk (VaR)';
      if (risk.valueAtRisk95?.status === 'INSUFFICIENT_DATA' || !risk.valueAtRisk95?.value) {
        return {
          alertId: alert.id,
          triggered: false,
          reason: risk.valueAtRisk95?.message || 'Insufficient data for VaR calculation',
        };
      }
      metricValue = risk.valueAtRisk95.value.amount;
    } else if (alert.condition === 'SHARPE') {
      metricName = 'Sharpe Ratio';
      if (risk.sharpeRatio?.status === 'INSUFFICIENT_DATA' || risk.sharpeRatio?.value === null) {
        return {
          alertId: alert.id,
          triggered: false,
          reason: risk.sharpeRatio?.message || 'Insufficient data for Sharpe ratio calculation',
        };
      }
      metricValue = risk.sharpeRatio.value;
    } else {
      metricName = 'Annualized Volatility';
      if (risk.volatility?.status === 'INSUFFICIENT_DATA' || risk.volatility?.value === null) {
        return {
          alertId: alert.id,
          triggered: false,
          reason: risk.volatility?.message || 'Insufficient data for volatility calculation',
        };
      }
      metricValue = risk.volatility.value;
    }

    const { satisfied } = this.checkNumericThreshold(metricValue, alert.threshold, alert.operator);

    if (!satisfied) {
      return { alertId: alert.id, triggered: false, currentValue: metricValue };
    }

    const severity: AlertSeverity = 'WARNING';
    const title = `Risk Alert: ${metricName} Threshold Breached`;
    const message = `Portfolio ${metricName} is at ${metricValue.toFixed(2)}, satisfying rule: ${this.formatOperatorLabel(
      alert.operator
    )} ${alert.threshold}.`;

    return {
      alertId: alert.id,
      triggered: true,
      severity,
      title,
      message,
      currentValue: metricValue,
    };
  }

  /**
   * 6. Watchlist Alert: Condition on watchlist equities
   */
  private async evaluateWatchlistAlert(
    alert: AlertRule,
    quoteCache?: Map<string, NormalizedQuote>
  ): Promise<AlertEvaluationResult> {
    const watchlists = await storageService.getWatchlists(alert.userId);
    const allSymbols = new Set<string>();
    watchlists.forEach((w) => w.symbols.forEach((s) => allSymbols.add(s.toUpperCase().trim())));

    if (allSymbols.size === 0) {
      return { alertId: alert.id, triggered: false, reason: 'Watchlist is empty' };
    }

    // If specific symbol configured:
    const targetSymbol = alert.symbol ? alert.symbol.toUpperCase().trim() : null;
    const symbolsToEvaluate = targetSymbol
      ? [targetSymbol]
      : Array.from(allSymbols).slice(0, 10);

    const quotes: NormalizedQuote[] = [];
    for (const sym of symbolsToEvaluate) {
      try {
        const q = await this.getQuoteWithCache(sym, quoteCache);
        quotes.push(q);
      } catch {
        // Continue
      }
    }

    for (const quote of quotes) {
      if (!quote || quote.changePercent === null || quote.changePercent === undefined) continue;
      const changePct = Math.abs(quote.changePercent);
      const targetThreshold = alert.threshold;

      if (alert.operator === 'GREATER_THAN' || alert.operator === 'GREATER_THAN_OR_EQUAL') {
        if (changePct >= targetThreshold) {
          const title = `Watchlist Mover: ${quote.symbol} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`;
          const message = `Watchlist stock ${quote.symbol} experienced significant movement of ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%, exceeding threshold of ${targetThreshold}%.`;

          return {
            alertId: alert.id,
            triggered: true,
            severity: quote.changePercent < 0 ? 'WARNING' : 'INFO',
            title,
            message,
            currentValue: quote.changePercent,
          };
        }
      }
    }

    return { alertId: alert.id, triggered: false };
  }

  /**
   * 7. Corporate Event Alert: Earnings, dividend dates, board meetings
   */
  private async evaluateEventAlert(alert: AlertRule): Promise<AlertEvaluationResult> {
    const symbol = alert.symbol ? alert.symbol.toUpperCase().trim() : undefined;
    const events = await newsService.getEvents({ symbol });

    if (events.length === 0) {
      return { alertId: alert.id, triggered: false, reason: 'No upcoming events found' };
    }

    const now = new Date();
    // Look ahead window (default 7 days)
    const lookaheadDays = alert.threshold || 7;
    const cutoff = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

    const matchingEvents = events.filter((e) => {
      const eventDate = new Date(e.eventDate);
      const isUpcoming = eventDate >= now && eventDate <= cutoff;
      if (!isUpcoming) return false;

      if (alert.condition) {
        return e.type.toUpperCase() === alert.condition.toUpperCase();
      }
      return true;
    });

    if (matchingEvents.length > 0) {
      const event = matchingEvents[0];
      const title = `Corporate Event: ${event.symbol} ${event.title}`;
      const message = `Upcoming ${event.type.toLowerCase().replace(/_/g, ' ')} for ${event.symbol} on ${event.eventDate}: ${event.description}`;

      return {
        alertId: alert.id,
        triggered: true,
        severity: 'INFO',
        title,
        message,
        currentValue: event.eventDate,
      };
    }

    return { alertId: alert.id, triggered: false };
  }

  /**
   * 8. News Alert: Negative sentiment, breaking news, or holdings wire
   */
  private async evaluateNewsAlert(alert: AlertRule): Promise<AlertEvaluationResult> {
    const symbol = alert.symbol ? alert.symbol.toUpperCase().trim() : undefined;
    const articles = symbol
      ? await newsService.getCompanyNews(symbol, 5)
      : await newsService.getPortfolioNews(alert.userId, 10);

    if (articles.length === 0) {
      return { alertId: alert.id, triggered: false, reason: 'No articles found' };
    }

    const lastEval = alert.lastEvaluatedAt ? new Date(alert.lastEvaluatedAt).getTime() : 0;
    const keyword = alert.metadata?.keyword?.toLowerCase();

    // Check newly published articles since last evaluation or recent 24h
    const candidate = articles.find((art) => {
      const pubTime = new Date(art.publishedAt).getTime();
      const isRecent = lastEval > 0 ? pubTime > lastEval : pubTime > Date.now() - 24 * 3600 * 1000;
      if (!isRecent) return false;

      if (alert.condition === 'NEGATIVE_SENTIMENT') {
        return art.sentiment === 'NEGATIVE';
      }
      if (alert.condition === 'POSITIVE_SENTIMENT') {
        return art.sentiment === 'POSITIVE';
      }
      if (keyword) {
        return (
          art.headline.toLowerCase().includes(keyword) ||
          art.summary.toLowerCase().includes(keyword)
        );
      }
      return true;
    });

    if (candidate) {
      const severity: AlertSeverity = candidate.sentiment === 'NEGATIVE' ? 'WARNING' : 'INFO';
      const title = `News Alert: ${candidate.symbols.join(', ') || 'Market'} - ${candidate.source}`;
      const message = `${candidate.headline}: ${candidate.summary}`;

      return {
        alertId: alert.id,
        triggered: true,
        severity,
        title,
        message,
        currentValue: candidate.headline,
      };
    }

    return { alertId: alert.id, triggered: false };
  }

  /**
   * Helper: Check numerical threshold with crossing state
   */
  public checkOperatorCondition(
    current: number,
    threshold: number,
    operator: string,
    previous?: number
  ): { satisfied: boolean; severity: AlertSeverity } {
    let satisfied = false;
    let severity: AlertSeverity = 'INFO';

    switch (operator) {
      case 'GREATER_THAN':
        satisfied = current > threshold;
        severity = 'INFO';
        break;

      case 'LESS_THAN':
        satisfied = current < threshold;
        severity = 'WARNING';
        break;

      case 'GREATER_THAN_OR_EQUAL':
        satisfied = current >= threshold;
        severity = 'INFO';
        break;

      case 'LESS_THAN_OR_EQUAL':
        satisfied = current <= threshold;
        severity = 'WARNING';
        break;

      case 'EQUALS':
        satisfied = Math.abs(current - threshold) <= 0.05;
        severity = 'INFO';
        break;

      case 'CROSSES_ABOVE':
        // Crossing requires transition from <= threshold to > threshold
        if (typeof previous === 'number') {
          satisfied = previous <= threshold && current > threshold;
        } else {
          // First observation establishes baseline state without false triggering
          satisfied = false;
        }
        severity = 'INFO';
        break;

      case 'CROSSES_BELOW':
        // Crossing requires transition from >= threshold to < threshold
        if (typeof previous === 'number') {
          satisfied = previous >= threshold && current < threshold;
        } else {
          // First observation establishes baseline state without false triggering
          satisfied = false;
        }
        severity = 'WARNING';
        break;
    }

    return { satisfied, severity };
  }

  /**
   * Helper: Numeric threshold check without crossing history
   */
  private checkNumericThreshold(
    current: number,
    threshold: number,
    operator: string
  ): { satisfied: boolean } {
    switch (operator) {
      case 'GREATER_THAN':
        return { satisfied: current > threshold };
      case 'LESS_THAN':
        return { satisfied: current < threshold };
      case 'GREATER_THAN_OR_EQUAL':
        return { satisfied: current >= threshold };
      case 'LESS_THAN_OR_EQUAL':
        return { satisfied: current <= threshold };
      case 'EQUALS':
        return { satisfied: Math.abs(current - threshold) < 0.01 };
      case 'CROSSES_ABOVE':
        return { satisfied: current > threshold };
      case 'CROSSES_BELOW':
        return { satisfied: current < threshold };
      default:
        return { satisfied: false };
    }
  }

  private formatOperatorLabel(op: string): string {
    switch (op) {
      case 'GREATER_THAN':
        return 'above';
      case 'LESS_THAN':
        return 'below';
      case 'GREATER_THAN_OR_EQUAL':
        return 'at or above';
      case 'LESS_THAN_OR_EQUAL':
        return 'at or below';
      case 'EQUALS':
        return 'equals';
      case 'CROSSES_ABOVE':
        return 'crossed above';
      case 'CROSSES_BELOW':
        return 'crossed below';
      default:
        return op.toLowerCase().replace(/_/g, ' ');
    }
  }
}

export const alertEvaluator = new AlertEvaluator();
