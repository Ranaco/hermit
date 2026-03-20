/**
 * Authentication Wrapper
 * Contains business logic for user authentication, registration, MFA, and device management
 */

import {
  AuthenticationError,
  ValidationError,
  ErrorCode,
  ConflictError,
  NotFoundError,
} from "@hermit/error-handling";
import getPrismaClient from "../services/prisma.service";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "../utils/password";
import { generateTokenPair, verifyRefreshToken } from "../utils/jwt";
import {
  generateTotpSecret,
  generateTotpQRCode,
  verifyTotpToken,
  generateBackupCodes,
  hashBackupCode,
  validateMfaToken,
} from "../utils/mfa";
import {
  getOrCreateDevice,
  createSession,
  enrollCliDevice as enrollCliDeviceRecord,
  finalizeDeviceEnrollment,
} from "../utils/device";
import { auditLog } from "../services/audit.service";
import config from "../config";

export const authWrapper = {
  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    organizationName?: string;
    deviceFingerprint?: string;
    clientType?: "BROWSER" | "CLI";
    cliPublicKey?: string;
    cliLabel?: string;
    hardwareFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const {
      email,
      password,
      firstName,
      lastName,
      username,
      organizationName,
      deviceFingerprint,
      clientType,
      cliPublicKey,
      cliLabel,
      hardwareFingerprint,
      ipAddress,
      userAgent,
    } = data;

    // Validate required fields
    if (!email || !password) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Email and password are required",
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(
        ErrorCode.INVALID_EMAIL,
        "Invalid email format",
      );
    }

    // Validate password strength (throws if invalid)
    validatePasswordStrength(password);

    const prisma = getPrismaClient();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError(
        ErrorCode.USER_ALREADY_EXISTS,
        "User with this email already exists",
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user WITHOUT organization - user must complete onboarding
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username || email.split("@")[0],
        firstName: firstName || null,
        lastName: lastName || null,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        createdAt: true,
      },
    });

    const result = { user, organization: null };

    let device = await getOrCreateDevice(
      result.user.id,
      {
        ip: ipAddress || "unknown",
        headers: { "user-agent": userAgent || "unknown" },
      } as any,
      deviceFingerprint,
    );

    device = (await finalizeDeviceEnrollment(device as any, {
      clientType,
      cliPublicKey,
      cliLabel,
      hardwareFingerprint,
    })) as typeof device;

    // Generate tokens without organization (user needs to complete onboarding)
    const tokens = generateTokenPair({
      userId: result.user.id,
      email: result.user.email,
      organizationId: undefined,
      deviceId: device.id,
      clientType: device.clientType as "BROWSER" | "CLI",
    });

    // Create session with device
    await createSession(
      result.user.id,
      device.id,
      tokens.refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    );

    // Audit log
    await auditLog.login(
      result.user.id,
      ipAddress || "unknown",
      userAgent || "unknown",
    );

    return {
      user: result.user,
      organization: result.organization,
      tokens,
      device: {
        id: device.id,
        isTrusted: device.isTrusted,
        clientType: device.clientType,
      },
    };
  },

  /**
   * Login user
   */
  async login(data: {
    email: string;
    password: string;
    mfaToken?: string;
    deviceFingerprint?: string;
    clientType?: "BROWSER" | "CLI";
    cliPublicKey?: string;
    cliLabel?: string;
    hardwareFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const {
      email,
      password,
      mfaToken,
      deviceFingerprint,
      clientType,
      cliPublicKey,
      cliLabel,
      hardwareFingerprint,
      ipAddress,
      userAgent,
    } = data;

    if (!email || !password) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Email and password are required",
      );
    }

    const prisma = getPrismaClient();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      await auditLog.loginFailed(
        email,
        ipAddress || "unknown",
        userAgent || "unknown",
        "User not found",
      );
      throw new AuthenticationError(
        ErrorCode.INVALID_CREDENTIALS,
        "Invalid email or password",
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new AuthenticationError(
        ErrorCode.ACCOUNT_LOCKED,
        `Account is locked. Try again in ${minutesRemaining} minutes.`,
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = user.consecutiveFailedLogins + 1;
      const shouldLock = failedAttempts >= config.security.maxLoginAttempts;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          consecutiveFailedLogins: failedAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + config.security.lockoutDuration)
            : null,
        },
      });

      await auditLog.loginFailed(
        email,
        ipAddress || "unknown",
        userAgent || "unknown",
        "Invalid password",
      );

      throw new AuthenticationError(
        ErrorCode.INVALID_CREDENTIALS,
        "Invalid email or password",
      );
    }

    // Check MFA if enabled
    if (user.isTwoFactorEnabled) {
      if (!mfaToken) {
        throw new AuthenticationError(
          ErrorCode.MFA_REQUIRED,
          "MFA token required",
        );
      }

      const mfaResult = await validateMfaToken(
        user.twoFactorSecret,
        user.backupCodes,
        mfaToken,
      );

      if (!mfaResult.valid) {
        await auditLog.loginFailed(
          email,
          ipAddress || "unknown",
          userAgent || "unknown",
          "Invalid MFA token",
        );
        throw new AuthenticationError(
          ErrorCode.MFA_INVALID,
          "Invalid MFA token",
        );
      }

      // If backup code was used, remove it
      if (mfaResult.usedBackupCode && mfaResult.backupCodeIndex !== undefined) {
        const updatedBackupCodes = [...user.backupCodes];
        updatedBackupCodes.splice(mfaResult.backupCodeIndex, 1);
        await prisma.user.update({
          where: { id: user.id },
          data: { backupCodes: updatedBackupCodes },
        });
      }
    }

    // Reset failed login attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        consecutiveFailedLogins: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Get or create device from request data
    let device = await getOrCreateDevice(
      user.id,
      {
        ip: ipAddress || "unknown",
        headers: { "user-agent": userAgent || "unknown" },
      } as any,
      deviceFingerprint,
    );

    device = (await finalizeDeviceEnrollment(device as any, {
      clientType,
      cliPublicKey,
      cliLabel,
      hardwareFingerprint,
    })) as typeof device;

    // Get user's primary organization
    const primaryOrg = user.organizations[0]?.organization;

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      organizationId: primaryOrg?.id,
      deviceId: device.id,
      clientType: device.clientType as "BROWSER" | "CLI",
    });

    // Create session with device
    await createSession(
      user.id,
      device.id,
      tokens.refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    );

    // Audit log
    await auditLog.login(
      user.id,
      ipAddress || "unknown",
      userAgent || "unknown",
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
      organization: primaryOrg
        ? { id: primaryOrg.id, name: primaryOrg.name }
        : null,
      device: device
        ? {
            id: device.id,
            isTrusted: device.isTrusted,
            clientType: device.clientType,
          }
        : null,
      tokens,
    };
  },

  /**
   * Logout user
   */
  async logout(data: {
    refreshToken: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const { refreshToken, userId, ipAddress, userAgent } = data;

    if (!refreshToken) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Refresh token is required",
      );
    }

    const prisma = getPrismaClient();

    // Delete session
    await prisma.session.deleteMany({
      where: { refreshToken },
    });

    // Audit log
    if (userId) {
      await auditLog.logout(
        userId,
        ipAddress || "unknown",
        userAgent || "unknown",
      );
    }

    return { success: true };
  },

  /**
   * Refresh access token
   */
  async refreshToken(data: { refreshToken: string }) {
    const { refreshToken: token } = data;

    if (!token) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Refresh token is required",
      );
    }

    // Verify refresh token
    const payload = verifyRefreshToken(token);

    const prisma = getPrismaClient();

    // Check if session exists and is valid
    const session = await prisma.session.findFirst({
      where: {
        refreshToken: token,
        userId: payload.userId,
        expiresAt: { gt: new Date() },
      },
      include: {
        device: {
          select: {
            id: true,
            clientType: true,
          },
        },
        user: {
          include: {
            organizations: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new AuthenticationError(
        ErrorCode.TOKEN_INVALID,
        "Invalid or expired refresh token",
      );
    }

    // Generate new token pair
    const primaryOrg = session.user.organizations[0]?.organization;
    const tokens = generateTokenPair({
      userId: session.user.id,
      email: session.user.email,
      organizationId: primaryOrg?.id,
      deviceId: session.device.id,
      clientType: session.device.clientType as "BROWSER" | "CLI",
    });

    // Update session with new refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { tokens };
  },

  /**
   * Setup MFA (get QR code)
   */
  async setupMfa(userId: string) {
    const prisma = getPrismaClient();

    // Check if MFA is already enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isTwoFactorEnabled: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "User not found");
    }

    if (user.isTwoFactorEnabled) {
      throw new ConflictError(
        ErrorCode.USER_ALREADY_EXISTS,
        "MFA is already enabled",
      );
    }

    // Generate TOTP secret
    const totpData = generateTotpSecret(user.email);

    // Generate QR code
    const qrCode = await generateTotpQRCode(totpData.otpauthUrl);

    // Store secret temporarily (not enabled yet)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: totpData.secret,
        // Don't enable yet - wait for verification
      },
    });

    return {
      secret: totpData.secret,
      qrCode,
    };
  },

  /**
   * Enable MFA (verify and activate)
   */
  async enableMfa(userId: string, token: string) {
    if (!token) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "MFA token is required",
      );
    }

    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        isTwoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "User not found");
    }

    if (user.isTwoFactorEnabled) {
      throw new ConflictError(
        ErrorCode.USER_ALREADY_EXISTS,
        "MFA is already enabled",
      );
    }

    if (!user.twoFactorSecret) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "MFA setup not initiated. Call /mfa/setup first",
      );
    }

    // Verify token
    const isValid = verifyTotpToken(user.twoFactorSecret, token);

    if (!isValid) {
      throw new AuthenticationError(ErrorCode.MFA_INVALID, "Invalid MFA token");
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => hashBackupCode(code)),
    );

    // Enable MFA and store backup codes
    await prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFactorEnabled: true,
        backupCodes: hashedBackupCodes,
      },
    });

    // Audit log
    await auditLog.enable2FA(userId, "TOTP");

    return { backupCodes };
  },

  /**
   * Disable MFA
   */
  async disableMfa(userId: string, password: string, mfaToken: string) {
    if (!password || !mfaToken) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Password and MFA token are required",
      );
    }

    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "User not found");
    }

    if (!user.isTwoFactorEnabled) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "MFA is not enabled",
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError(
        ErrorCode.INVALID_CREDENTIALS,
        "Invalid password",
      );
    }

    // Verify MFA token
    const mfaResult = await validateMfaToken(
      user.twoFactorSecret,
      user.backupCodes,
      mfaToken,
    );
    if (!mfaResult.valid) {
      throw new AuthenticationError(ErrorCode.MFA_INVALID, "Invalid MFA token");
    }

    // Disable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      },
    });

    // Audit log
    await auditLog.disable2FA(userId);

    return { success: true };
  },

  /**
   * Get user's devices
   */
  async getDevices(userId: string) {
    const prisma = getPrismaClient();

    const devices = await prisma.device.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        fingerprint: true,
        clientType: true,
        hardwareFingerprint: true,
        isTrusted: true,
        enrolledAt: true,
        lastUsedAt: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: "desc" },
    });

    return { devices };
  },

  /**
   * Remove a device
   */
  async removeDevice(userId: string, deviceId: string) {
    const prisma = getPrismaClient();

    // Check if device exists and belongs to user
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        userId,
      },
    });

    if (!device) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "Device not found");
    }

    // Delete device
    await prisma.device.delete({
      where: { id: deviceId },
    });

    // Audit log
    await auditLog.removeDevice(userId, deviceId);

    return { success: true };
  },

  async enrollCliDevice(
    userId: string,
    deviceId: string,
    data: {
      cliPublicKey: string;
      cliLabel?: string;
      hardwareFingerprint: string;
    },
  ) {
    const prisma = getPrismaClient();

    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        userId,
      },
    });

    if (!device) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "Device not found");
    }

    const enrolled = await enrollCliDeviceRecord(device.id, data);

    await auditLog.addDevice(
      userId,
      enrolled.id,
      {
        name: enrolled.name || data.cliLabel || "Official CLI",
        clientType: enrolled.clientType,
        hardwareFingerprint: enrolled.hardwareFingerprint,
      },
    );

    return {
      device: {
        id: enrolled.id,
        name: enrolled.name,
        isTrusted: enrolled.isTrusted,
        clientType: enrolled.clientType,
        enrolledAt: enrolled.enrolledAt,
      },
    };
  },
};
