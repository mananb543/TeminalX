/**
 * TerminalX - Structured Logging & Observability Middleware
 * Produces structured HTTP logs with request IDs, response durations, and error telemetry.
 * Strict zero-secret-exposure discipline: NEVER logs passwords, JWT tokens, or credentials.
 */

import { Response, NextFunction } from 'express';
import { EnhancedRequest } from './securityMiddleware.ts';

export function requestLogger(req: EnhancedRequest, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  req.startTime = startTime;

  // Log upon response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const reqId = req.id || '-';
    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;

    // Determine log level
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    const timestamp = new Date().toISOString();

    // Do not log static assets or HMR noise
    if (url.startsWith('/@') || url.startsWith('/node_modules') || url.includes('.vite')) {
      return;
    }

    // Color/Badge indicator
    const statusColor =
      status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : status >= 300 ? '\x1b[36m' : '\x1b[32m';
    const resetColor = '\x1b[0m';

    console.log(
      `[${timestamp}] [${level}] [${reqId}] ${method} ${url} ${statusColor}${status}${resetColor} - ${duration}ms`
    );
  });

  next();
}
