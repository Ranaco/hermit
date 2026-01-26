/**
 * User Wrapper
 * Contains business logic for user profile management and settings
 */

import { AuthenticationError, ValidationError, ErrorCode, ConflictError } from '@hermes/error-handling';
import getPrismaClient from '../services/prisma.service';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import { createAuditLog } from '../services/audit.service';
import { validateMfaToken } from '../utils/mfa';

import { emailService } from '../services/email.service';

export const userWrapper = {
  /**
   * Get current user profile

   */
  async getCurrentUser(userId: string) {
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        requiresMfaForSensitiveOps: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AuthenticationError(ErrorCode.USER_NOT_FOUND);
    }

    return { user };
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    requiresMfaForSensitiveOps?: boolean;
  }, auditData: { ipAddress?: string; userAgent?: string }) {
    const { firstName, lastName, requiresMfaForSensitiveOps } = data;
    const { ipAddress, userAgent } = auditData;

    const prisma = getPrismaClient();

    const updateData: Partial<{ firstName: string | null; lastName: string | null; requiresMfaForSensitiveOps: boolean }> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (requiresMfaForSensitiveOps !== undefined) updateData.requiresMfaForSensitiveOps = requiresMfaForSensitiveOps;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        requiresMfaForSensitiveOps: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      userId,
      action: 'UPDATE',
      resourceType: 'USER',
      resourceId: userId,
      details: { fields: Object.keys(updateData) },
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
    });

    return { user };
  },

  /**
   * Change password
   */
  async changePassword(userId: string, data: { currentPassword: string; newPassword: string }, auditData: { ipAddress?: string; userAgent?: string }) {
    const { currentPassword, newPassword } = data;
    const { ipAddress, userAgent } = auditData;

    if (!currentPassword || !newPassword) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Current and new password are required');
    }

    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthenticationError(ErrorCode.USER_NOT_FOUND);
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError(ErrorCode.INVALID_CREDENTIALS, 'Current password is incorrect');
    }

    // Validate new password strength (throws if invalid)
    validatePasswordStrength(newPassword);

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    });

    // Invalidate all sessions except current one
    await prisma.session.deleteMany({
      where: {
        userId,
        // Keep sessions from the last hour (current session)
        createdAt: {
          lt: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    });

    await createAuditLog({
      userId,
      action: 'UPDATE',
      resourceType: 'USER',
      resourceId: userId,
      details: { passwordChanged: true },
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
    });

    return { success: true };
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string, auditData: { ipAddress?: string; userAgent?: string }) {
    const { ipAddress, userAgent } = auditData;

    if (!email) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Email is required');
    }

    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists or not
    if (!user) {
      return { success: true };
    }

    // Generate reset token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send email with reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    await emailService.sendPasswordResetEmail(email, resetToken, resetLink);

    await createAuditLog({
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'USER',
      resourceId: user.id,
      details: { passwordResetRequested: true },
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
    });

    return { success: true };
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string, auditData: { ipAddress?: string; userAgent?: string }) {
    const { ipAddress, userAgent } = auditData;

    if (!token || !newPassword) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Token and new password are required');
    }

    const prisma = getPrismaClient();

    const resetRequest = await prisma.passwordReset.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: {
        user: true,
      },
    });

    if (!resetRequest) {
      throw new AuthenticationError(ErrorCode.TOKEN_INVALID, 'Invalid or expired reset token');
    }

    // Validate password strength (throws if invalid)
    validatePasswordStrength(newPassword);

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and mark reset as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRequest.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          consecutiveFailedLogins: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordReset.update({
        where: { id: resetRequest.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions
      prisma.session.deleteMany({
        where: { userId: resetRequest.userId },
      }),
    ]);

    await createAuditLog({
      userId: resetRequest.userId,
      action: 'UPDATE',
      resourceType: 'USER',
      resourceId: resetRequest.userId,
      details: { passwordReset: true },
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
    });

    return { success: true };
  },

  /**
   * Verify email
   */
  async verifyEmail(token: string, auditData: { ipAddress?: string; userAgent?: string }) {
    const { ipAddress, userAgent } = auditData;

    if (!token) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Verification token is required');
    }

    const prisma = getPrismaClient();

    // Find email verification record
    const verification = await prisma.emailVerification.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        isVerified: false,
      },
    });

    if (!verification) {
      throw new AuthenticationError(ErrorCode.TOKEN_INVALID, 'Invalid or expired verification token');
    }

    // Update user and mark verification as complete
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.userId },
        data: { isEmailVerified: true },
      }),
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { isVerified: true, verifiedAt: new Date() },
      }),
    ]);

    await createAuditLog({
      userId: verification.userId,
      action: 'UPDATE',
      resourceType: 'USER',
      resourceId: verification.userId,
      details: { emailVerified: true },
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
    });

    return { success: true };
  },

  /**
   * Resend email verification
   */
  async resendVerification(userId: string) {
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthenticationError(ErrorCode.USER_NOT_FOUND);
    }

    if (user.isEmailVerified) {
      throw new ConflictError(ErrorCode.USER_ALREADY_EXISTS, 'Email is already verified');
    }

    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    // Create new email verification record
    await prisma.emailVerification.create({
      data: {
        userId,
        email: user.email,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send email with verification link
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;
    await emailService.sendVerificationEmail(user.email, token, verificationLink);

    return { success: true };
  },

  /**
   * Delete account
   */
  async deleteAccount(userId: string, data: { password: string; mfaToken?: string }) {
    const { password, mfaToken } = data;

    if (!password) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Password is required');
    }

    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthenticationError(ErrorCode.USER_NOT_FOUND);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError(ErrorCode.INVALID_CREDENTIALS, 'Invalid password');
    }

    // Verify MFA if enabled
    if (user.isTwoFactorEnabled) {
      if (!mfaToken) {
        throw new AuthenticationError(ErrorCode.MFA_REQUIRED);
      }

      const mfaResult = await validateMfaToken(user.twoFactorSecret, user.backupCodes, mfaToken);
      if (!mfaResult.valid) {
        throw new AuthenticationError(ErrorCode.MFA_INVALID);
      }
    }

    // Check if user is the only owner of any organizations
    const ownerships = await prisma.organizationMember.findMany({
      where: {
        userId,
        role: 'OWNER',
      },
      include: {
        organization: {
          include: {
            members: {
              where: { role: 'OWNER' },
            },
          },
        },
      },
    });

    const soloOwnerships = ownerships.filter(o => o.organization.members.length === 1);
    if (soloOwnerships.length > 0) {
      throw new ConflictError(
        ErrorCode.PERMISSION_DENIED,
        'You are the only owner of one or more organizations. Transfer ownership or delete the organizations first.'
      );
    }

    await createAuditLog({
      userId,
      action: 'DELETE',
      resourceType: 'USER',
      resourceId: userId,
      details: { accountDeleted: true },
    });

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  },
};