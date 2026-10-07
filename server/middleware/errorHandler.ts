/**
 * TerminalX - Centralized Error Handler Middleware
 * Captures synchronous and asynchronous errors across all API routes.
 * Sanitizes production errors to avoid leaking database internals, secrets, or stack traces.
 * Enforces standardized API error contract:
 * { success: false, error: string, code?: string, requestId?: string }
 */

import { Response, NextFunction } from 'express';
import { EnhancedRequest } from './securityMiddleware.ts';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: any,
  req: EnhancedRequest,
  res: Response,
  _next: NextFunction
): void {
  const reqId = req.id || req.headers['x-request-id'] || 'unknown';
  const isProduction = process.env.NODE_ENV === 'production';

  // Determine HTTP status code
  let statusCode = 500;
  if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
  } else if (typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
    statusCode = err.status;
  }

  // Determine error code
  const code = err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');

  // Sanitize error message for production security
  let userMessage = err.message || 'An unexpected internal server error occurred.';

  // If internal error in production, disguise sensitive database details
  if (isProduction && statusCode >= 500) {
    userMessage = 'An internal system error occurred. Our operations desk has been notified.';
  }

  // Safe logging with Request ID
  console.error(
    `[TerminalX Error] [${reqId}] ${req.method} ${req.originalUrl || req.url} -> Status: ${statusCode} Code: ${code} Error:`,
    err.message
  );

  res.status(statusCode).json({
    success: false,
    error: userMessage,
    code,
    requestId: reqId,
    timestamp: new Date().toISOString(),
    ...(isProduction ? {} : { stack: err.stack }),
  });
}
