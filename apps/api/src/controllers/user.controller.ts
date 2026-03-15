/**
 * User Controller
 * Handles user profile management and settings
 */

import type { Request, Response } from 'express';
import { asyncHandler, AuthenticationError, ValidationError, ErrorCode } from '@hermit/error-handling';
import { userWrapper } from '../wrappers/user.wrapper';

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const result = await userWrapper.getCurrentUser(req.user.id);

  res.json({
    success: true,
    data: { user: result.user },
  });
});

/**
 * Update user profile
 * PATCH /api/v1/users/me
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { firstName, lastName, requiresMfaForSensitiveOps } = req.body;

  const result = await userWrapper.updateProfile(req.user.id, {
    firstName,
    lastName,
    requiresMfaForSensitiveOps,
  }, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    data: { user: result.user },
    message: 'Profile updated successfully',
  });
});

/**
 * Change password
 * POST /api/v1/users/me/password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Current and new password are required');
  }

  await userWrapper.changePassword(req.user.id, {
    currentPassword,
    newPassword,
  }, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    message: 'Password changed successfully. Other sessions have been logged out.',
  });
});

/**
 * Request password reset
 * POST /api/v1/users/password/reset-request
 */
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Email is required');
  }

  await userWrapper.requestPasswordReset(email.toLowerCase(), {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    message: 'If the email exists, a password reset link will be sent.',
  });
});

/**
 * Reset password with token
 * POST /api/v1/users/password/reset
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Token and new password are required');
  }

  await userWrapper.resetPassword(token, newPassword, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    message: 'Password reset successfully. Please log in with your new password.',
  });
});

/**
 * Verify email
 * POST /api/v1/users/verify-email
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Verification token is required');
  }

  await userWrapper.verifyEmail(token, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    message: 'Email verified successfully',
  });
});

/**
 * Resend email verification
 * POST /api/v1/users/resend-verification
 */
export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  await userWrapper.resendVerification(req.user.id);

  res.json({
    success: true,
    message: 'Verification email sent',
  });
});

/**
 * Delete account
 * DELETE /api/v1/users/me
 */
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { password, mfaToken } = req.body;

  if (!password) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Password is required');
  }

  await userWrapper.deleteAccount(req.user.id, {
    password,
    mfaToken,
  });

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
});
