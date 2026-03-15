/**
 * MFA (Multi-Factor Authentication) Utilities
 * TOTP generation and verification using Speakeasy
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import config from '../config';
import { AuthenticationError, ErrorCode } from '@hermit/error-handling';

/**
 * Generate a new TOTP secret for a user
 */
export function generateTotpSecret(userEmail: string): {
  secret: string;
  otpauthUrl: string;
} {
  const secret = speakeasy.generateSecret({
    name: `${config.security.mfaIssuer} (${userEmail})`,
    issuer: config.security.mfaIssuer,
    length: 32,
  });

  if (!secret.otpauth_url) {
    throw new Error('Failed to generate TOTP secret');
  }

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
}

/**
 * Generate QR code image for TOTP setup
 */
export async function generateTotpQRCode(otpauthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify TOTP token
 */
export function verifyTotpToken(secret: string, token: string, window: number = 1): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window, // Allow tokens from previous/next time window for clock drift
  });
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = Array.from({ length: 8 }, () => 
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 36)]
    ).join('');
    
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  
  return codes;
}

/**
 * Hash backup code for storage
 */
export async function hashBackupCode(code: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(code.replace('-', '').toUpperCase(), 10);
}

/**
 * Verify backup code
 */
export async function verifyBackupCode(code: string, hashedCode: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(code.replace('-', '').toUpperCase(), hashedCode);
}

/**
 * Validate MFA token (supports TOTP and backup codes)
 */
export async function validateMfaToken(
  secret: string | null,
  backupCodes: string[],
  token: string
): Promise<{ valid: boolean; usedBackupCode: boolean; backupCodeIndex?: number }> {
  // Try TOTP first if secret exists
  if (secret && verifyTotpToken(secret, token)) {
    return { valid: true, usedBackupCode: false };
  }

  // Try backup codes
  for (let i = 0; i < backupCodes.length; i++) {
    if (await verifyBackupCode(token, backupCodes[i])) {
      return { valid: true, usedBackupCode: true, backupCodeIndex: i };
    }
  }

  throw new AuthenticationError(ErrorCode.MFA_INVALID, 'Invalid MFA token');
}
