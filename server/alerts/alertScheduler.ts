/**
 * TerminalX - Alert Automation Scheduler
 * Periodically processes all active alert rules across assets, portfolios, and news wires.
 */

import { alertService } from './alertService.ts';

export class AlertScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private intervalMs = 45000; // 45 seconds evaluation interval

  public start(): void {
    if (this.timer) return;

    this.timer = setInterval(async () => {
      if (this.isRunning) return; // prevent overlapping execution
      this.isRunning = true;

      try {
        await alertService.evaluateAllActiveAlerts();
      } catch (err: any) {
        console.warn('[AlertScheduler Error]:', err.message);
      } finally {
        this.isRunning = false;
      }
    }, this.intervalMs);

    // Initial non-blocking run after 5 seconds to warm up
    setTimeout(() => {
      alertService.evaluateAllActiveAlerts().catch(() => {});
    }, 5000);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const alertScheduler = new AlertScheduler();
