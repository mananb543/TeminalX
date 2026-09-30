/**
 * TerminalX - JWT Utility
 * Signs and verifies lightweight tokens containing only user ID.
 * Never encapsulates passwords, balances, or private personal data.
 */

import jwt, { SignOptions } from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  return secret;
};

export function signToken(userId: string): string {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  const payload: TokenPayload = { userId };
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as TokenPayload;
    if (decoded && decoded.userId) {
      return decoded;
    }
    return null;
  } catch (err) {
    return null;
  }
}
