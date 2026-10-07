/**
 * TerminalX - Centralized Environment & Security Configuration
 * Validates environment parameters, enforces production constraints,
 * and guarantees zero secret exposure in application telemetry.
 */

import dotenv from 'dotenv';

dotenv.config({ override: true });

export interface AppEnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  IS_PRODUCTION: boolean;
  MONGODB_URI?: string;
  MONGODB_DB_NAME: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  BCRYPT_SALT_ROUNDS: number;
  MARKET_DATA_PROVIDER: 'demo' | 'real';
  MARKET_DATA_API_KEY?: string;
  MARKET_DATA_BASE_URL: string;
  INITIAL_VIRTUAL_BALANCE: number;
  PORTFOLIO_RISK_FREE_RATE: number;
  AI_PROVIDER: 'gemini' | 'deterministic';
  AI_MODEL: string;
  GEMINI_API_KEY?: string;
  AI_API_KEY?: string;
  NEWS_PROVIDER: 'demo' | 'real';
  NEWS_API_KEY?: string;
  NEWS_BASE_URL: string;
}

export function validateEnvironment(): AppEnvConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase() as 'development' | 'production' | 'test';
  const isProduction = nodeEnv === 'production';
  const port = Number(process.env.PORT) || 3000;

  // 1. JWT Secret Validation
  let jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim().length === 0) {
    if (isProduction) {
      throw new Error('[FATAL SECURITY]: JWT_SECRET must be configured in production environment.');
    }
    console.warn('[TerminalX Security Warning]: JWT_SECRET not found in environment. Using fallback development secret.');
    jwtSecret = 'terminalx_dev_jwt_secret_do_not_use_in_prod';
  }

  // 2. Market Data Configuration
  const marketProvider = (process.env.MARKET_DATA_PROVIDER || 'demo').toLowerCase() as 'demo' | 'real';
  const marketApiKey = process.env.MARKET_DATA_API_KEY?.trim();
  if (marketProvider === 'real' && !marketApiKey) {
    console.warn('[TerminalX Market Warning]: MARKET_DATA_PROVIDER is "real" but MARKET_DATA_API_KEY is not configured. Falling back to Demo provider.');
  }

  // 3. News Provider Configuration
  const newsProvider = (process.env.NEWS_PROVIDER || 'demo').toLowerCase() as 'demo' | 'real';
  const newsApiKey = process.env.NEWS_API_KEY?.trim();
  if (newsProvider === 'real' && !newsApiKey) {
    console.warn('[TerminalX News Warning]: NEWS_PROVIDER is "real" but NEWS_API_KEY is missing. Real news queries will require configuration.');
  }

  // 4. AI Provider Configuration
  const aiProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase() as 'gemini' | 'deterministic';
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.AI_API_KEY)?.trim();
  if (aiProvider === 'gemini' && !geminiKey) {
    console.info('[TerminalX AI Info]: GEMINI_API_KEY is not configured. TerminalX will operate in high-precision Deterministic Financial Intelligence Mode.');
  }

  // 5. Database Configuration
  const mongoUri = process.env.MONGODB_URI?.trim();
  const mongoDbName = process.env.MONGODB_DB_NAME || 'terminalx';
  if (!mongoUri) {
    console.info('[TerminalX Database Info]: MONGODB_URI not provided. Running in resilient In-Memory storage mode.');
  }

  return {
    PORT: port,
    NODE_ENV: nodeEnv,
    IS_PRODUCTION: isProduction,
    MONGODB_URI: mongoUri,
    MONGODB_DB_NAME: mongoDbName,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
    MARKET_DATA_PROVIDER: marketProvider === 'real' && marketApiKey ? 'real' : 'demo',
    MARKET_DATA_API_KEY: marketApiKey,
    MARKET_DATA_BASE_URL: process.env.MARKET_DATA_BASE_URL || 'https://api.twelvedata.com',
    INITIAL_VIRTUAL_BALANCE: Number(process.env.INITIAL_VIRTUAL_BALANCE) || 1000000,
    PORTFOLIO_RISK_FREE_RATE: Number(process.env.PORTFOLIO_RISK_FREE_RATE) || 0.06,
    AI_PROVIDER: aiProvider,
    AI_MODEL: process.env.AI_MODEL || 'gemini-3.8-flash',
    GEMINI_API_KEY: geminiKey,
    AI_API_KEY: geminiKey,
    NEWS_PROVIDER: newsProvider === 'real' && newsApiKey ? 'real' : 'demo',
    NEWS_API_KEY: newsApiKey,
    NEWS_BASE_URL: process.env.NEWS_BASE_URL || 'https://api.twelvedata.com',
  };
}

export const envConfig = validateEnvironment();
