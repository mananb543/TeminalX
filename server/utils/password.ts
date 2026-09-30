/**
 * TerminalX - Password Hashing Utility
 * Implements bcrypt-based one-way password hashing and verification
 */

import bcrypt from 'bcryptjs';

const getSaltRounds = (): number => {
  const configured = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  return isNaN(configured) ? 10 : configured;
};

export async function hashPassword(plainPassword: string): Promise<string> {
  const rounds = getSaltRounds();
  const salt = await bcrypt.genSalt(rounds);
  return bcrypt.hash(plainPassword, salt);
}

export async function comparePassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}
