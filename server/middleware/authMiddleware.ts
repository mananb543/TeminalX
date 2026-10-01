/**
 * TerminalX - Authentication Middleware
 * Enforces JWT verification from Authorization header or HTTP-only cookies.
 * Attaches verified User document to request context for zero-trust authorization.
 * Supports dual-mode persistence (MongoDB Atlas + Resilient In-Memory).
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.ts';
import { SafeUser } from '../models/User.ts';
import { storageService } from '../services/storageService.ts';

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
  userId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    let token: string | undefined;

    // 1. Check Authorization Header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]?.trim();
    }

    // 2. Check HTTP-only Cookie fallback if header not present
    if (!token && (req as any).cookies) {
      token = (req as any).cookies.terminalx_token || (req as any).cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to access this resource.',
      });
    }

    // 3. Verify token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token. Please log in again.',
      });
    }

    // 4. Query user via unified storage repository (MongoDB Atlas or Resilient Store)
    const userDoc = await storageService.findUserById(decoded.userId);
    if (!userDoc) {
      return res.status(401).json({
        success: false,
        error: 'User account associated with this token no longer exists.',
      });
    }

    // 5. Attach safe user information to request context
    req.userId = userDoc.id;
    req.user = userDoc.toSafeObject();

    return next();
  } catch (err: any) {
    console.warn('[TerminalX Auth Middleware Warning]:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server authentication error.',
    });
  }
}

export const authenticateToken = requireAuth;

