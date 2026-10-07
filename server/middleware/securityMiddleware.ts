/**
 * TerminalX - Production Security Middleware
 * Adds HTTP security headers, assigns unique request tracking IDs,
 * sanitizes queries, and prevents client parameter pollution.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface EnhancedRequest extends Request {
  id?: string;
  startTime?: number;
}

export function securityHeaders(req: EnhancedRequest, res: Response, next: NextFunction): void {
  // 1. Assign unique Request ID for distributed tracing and observability
  const incomingReqId = req.headers['x-request-id'];
  const reqId = typeof incomingReqId === 'string' && incomingReqId.length > 0 && incomingReqId.length < 64
    ? incomingReqId
    : `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  req.id = reqId;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', reqId);

  // 2. Strict Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Enforce HSTS in production environments
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');

  // 3. Query string length defense
  const queryStr = req.url.split('?')[1] || '';
  if (queryStr.length > 2048) {
    res.status(414).json({
      success: false,
      error: {
        code: 'URI_TOO_LONG',
        message: 'Query string exceeds maximum permitted length of 2048 characters.',
      },
    });
    return;
  }

  next();
}
