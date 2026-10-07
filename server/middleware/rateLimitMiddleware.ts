/**
 * TerminalX - Rate Limiting Middleware
 * Zero-dependency in-memory sliding-window rate limiter for production API defense.
 * Provides granular limits across authentication, trading execution, AI queries, and general API calls.
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  code?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const hits = new Map<string, RateLimitRecord>();
  const windowMs = options.windowMs || 60000;
  const max = options.max || 100;
  const message = options.message || 'Rate limit exceeded. Please try again shortly.';
  const code = options.code || 'RATE_LIMIT_EXCEEDED';

  // Periodic cleanup of expired keys every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 120000);

  // Unref timer so it doesn't block server shutdown
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip rate limits in unit test runner mode if disabled
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : (req.ip || req.socket.remoteAddress || 'unknown_ip');

    const now = Date.now();
    let record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(key, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, max - record.count);
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader('Retry-After', retryAfterSec);
      res.status(429).json({
        success: false,
        error: {
          code,
          message,
          retryAfterSeconds: retryAfterSec,
        },
      });
      return;
    }

    next();
  };
}

// 1. Strict Auth Limiter: protects login & registration from credential stuffing (30 req / min)
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please wait 1 minute before trying again.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});

// 2. Trading Limiter: prevents accidental high-frequency duplicate order submissions (60 orders / min)
export const tradingRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Order submission rate limit reached. Please throttle trade execution.',
  code: 'TRADING_RATE_LIMIT_EXCEEDED',
  keyGenerator: (req) => {
    const userId = (req as any).userId || (req as any).user?.id;
    return userId ? `trading_user_${userId}` : (req.ip || 'ip');
  },
});

// 3. AI Intelligence Query Limiter: throttles LLM inference (40 queries / min)
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  message: 'AI Financial Intelligence query limit reached. Please wait a moment before sending more queries.',
  code: 'AI_RATE_LIMIT_EXCEEDED',
  keyGenerator: (req) => {
    const userId = (req as any).userId || (req as any).user?.id;
    return userId ? `ai_user_${userId}` : (req.ip || 'ip');
  },
});

// 4. Global API Limiter: standard protection against DDoS / traffic floods (600 req / min)
export const globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 600,
  message: 'Too many requests. Please slow down your requests.',
  code: 'API_RATE_LIMIT_EXCEEDED',
});
