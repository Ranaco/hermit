/**
 * Authentication Validation Schemas
 */

import { z } from "zod";
import config from "../config";

// Password requirements
const passwordSchema = z
  .string()
  .min(
    config.security.passwordMinLength,
    `Password must be at least ${config.security.passwordMinLength} characters`,
  )
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

// Email validation
const emailSchema = z.string().email("Invalid email format").toLowerCase();

// UUID validation
const uuidSchema = z.string().uuid("Invalid UUID format");
const clientTypeSchema = z.enum(["BROWSER", "CLI"]).default("BROWSER");
const cliEnrollmentFields = {
  clientType: clientTypeSchema.optional(),
  cliPublicKey: z.string().min(32).max(4096).optional(),
  cliLabel: z.string().min(1).max(120).optional(),
  hardwareFingerprint: z.string().min(8).max(512).optional(),
};

// Register user schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens",
    )
    .optional(),
  organizationName: z.string().min(1).max(100).optional(),
  deviceFingerprint: z.string().optional(),
  ...cliEnrollmentFields,
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  mfaToken: z
    .string()
    .length(6, "MFA token must be 6 digits")
    .regex(/^\d+$/, "MFA token must contain only digits")
    .optional(),
  deviceFingerprint: z.string().optional(),
  ...cliEnrollmentFields,
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// Logout schema
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// MFA setup verify schema
export const verifyMfaSetupSchema = z.object({
  token: z
    .string()
    .length(6, "MFA token must be 6 digits")
    .regex(/^\d+$/, "MFA token must contain only digits"),
});

// Disable MFA schema
export const disableMfaSchema = z.object({
  token: z
    .string()
    .length(6, "MFA token must be 6 digits")
    .regex(/^\d+$/, "MFA token must contain only digits"),
  password: z.string().min(1, "Password is required"),
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

// Request password reset schema
export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});

// Verify email schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

// Resend verification schema
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const enrollCliDeviceSchema = z.object({
  cliPublicKey: z.string().min(32).max(4096),
  cliLabel: z.string().min(1).max(120).optional(),
  hardwareFingerprint: z.string().min(8).max(512),
});
