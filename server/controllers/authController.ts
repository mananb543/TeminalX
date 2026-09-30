/**
 * TerminalX - Authentication Controller
 * Handles user registration, bcrypt password verification, JWT issuance, HTTP-only cookie management, and user profiles.
 * Backed by storageService for dual-mode persistence (MongoDB Atlas + Resilient In-Memory).
 */

import { Request, Response } from 'express';
import { INITIAL_VIRTUAL_BALANCE } from '../models/User.ts';
import { hashPassword, comparePassword } from '../utils/password.ts';
import { signToken } from '../utils/jwt.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { storageService } from '../services/storageService.ts';
import { dbState } from '../config/database.ts';

const COOKIE_NAME = 'terminalx_token';

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
};

export const authController = {
  /**
   * Register a new user with real persistence (Atlas or resilient storage)
   */
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, password } = req.body;

      // 1. Input Validation
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Name must be at least 2 characters long.',
        });
      }

      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'A valid email address is required.',
        });
      }

      const emailRegex = /^\S+@\S+\.\S+$/;
      const normalizedEmail = email.toLowerCase().trim();
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid email address format.',
        });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long.',
        });
      }

      // 2. Duplicate Email Check
      const existingUser = await storageService.findUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email address already exists. Please sign in.',
        });
      }

      // 3. Hash Password with bcrypt
      const passwordHash = await hashPassword(password);

      // 4. Create User with ₹10,00,000 initial balance
      const newUser = await storageService.createUser({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        balance: INITIAL_VIRTUAL_BALANCE,
      });

      // 5. Generate JWT token
      const token = signToken(newUser.id);

      // 6. Set HTTP-only Cookie
      res.cookie(COOKIE_NAME, token, getCookieOptions());

      // 7. Return safe user information (never passwordHash)
      return res.status(201).json({
        success: true,
        message: 'Account registered successfully with ₹10,00,000 virtual balance.',
        token,
        user: newUser.toSafeObject(),
        dbMode: storageService.isAtlasReady() ? 'mongodb-atlas' : 'resilient-in-memory',
      });
    } catch (err: any) {
      console.warn('[TerminalX Auth Register Warning]:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Unable to register account. Please check your data and try again.',
      });
    }
  },

  /**
   * Authenticate existing user with bcrypt + JWT
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required.',
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // 1. Find user in unified storage
      const user = await storageService.findUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.',
        });
      }

      // 2. Compare password with bcrypt
      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.',
        });
      }

      // 3. Generate JWT
      const token = signToken(user.id);

      // 4. Set HTTP-only Cookie
      res.cookie(COOKIE_NAME, token, getCookieOptions());

      // 5. Return safe user data
      return res.json({
        success: true,
        message: 'Authenticated successfully.',
        token,
        user: user.toSafeObject(),
        dbMode: storageService.isAtlasReady() ? 'mongodb-atlas' : 'resilient-in-memory',
      });
    } catch (err: any) {
      console.warn('[TerminalX Auth Login Warning]:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed due to an internal server error.',
      });
    }
  },

  /**
   * Clear session cookie and sign out
   */
  async logout(req: Request, res: Response): Promise<Response> {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.clearCookie('token', { path: '/' });
    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  },

  /**
   * Fetch current authenticated user
   */
  async me(req: AuthenticatedRequest, res: Response): Promise<Response> {
    if (!req.user || !req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const latestUser = await storageService.findUserById(req.userId);

    return res.json({
      success: true,
      user: latestUser ? latestUser.toSafeObject() : req.user,
      dbStatus: {
        isConnected: dbState.isConnected,
        status: dbState.status,
        storageType: dbState.storageType,
        mode: dbState.mode,
        dbName: dbState.dbName,
      },
    });
  },
};
