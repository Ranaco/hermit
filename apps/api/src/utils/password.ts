/**
 * Password Utilities
 * bcrypt hashing and verification
 */

import bcrypt from 'bcryptjs';
import config from '../config';
import { ValidationError, ErrorCode } from '@hermit/error-handling';

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);
  return bcrypt.hash(password, config.security.bcryptRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): void {
  const minLength = config.security.passwordMinLength;

  if (password.length < minLength) {
    throw new ValidationError(
      `Password must be at least ${minLength} characters long`,
      { minLength },
      ErrorCode.WEAK_PASSWORD
    );
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    throw new ValidationError(
      'Password must contain at least one uppercase letter',
      undefined,
      ErrorCode.WEAK_PASSWORD
    );
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    throw new ValidationError(
      'Password must contain at least one lowercase letter',
      undefined,
      ErrorCode.WEAK_PASSWORD
    );
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    throw new ValidationError(
      'Password must contain at least one number',
      undefined,
      ErrorCode.WEAK_PASSWORD
    );
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    throw new ValidationError(
      'Password must contain at least one special character',
      undefined,
      ErrorCode.WEAK_PASSWORD
    );
  }
}

/**
 * Generate a random password
 */
export function generateRandomPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{};\':"|,.<>/?';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
