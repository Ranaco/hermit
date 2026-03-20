/**
 * Authentication Middleware
 * JWT verification and user attachment
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthenticationError, ErrorCode, asyncHandler } from '@hermit/error-handling';
import { verifyAccessToken } from '../utils/jwt';
import getPrismaClient from '../services/prisma.service';
import { validateMfaToken } from '../utils/mfa';
import { cleanupExpiredCliNonces, registerRequestNonce } from '../utils/device';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        organizationId?: string;
        deviceId?: string;
        clientType?: "BROWSER" | "CLI";
      };
      cliDevice?: {
        id: string;
        hardwareFingerprint?: string | null;
      };
    }
  }
}

/**
 * Verify JWT and attach user to request
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED, 'No authentication token provided');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      deviceId: payload.deviceId,
      clientType: payload.clientType,
    };

    // Update context with user ID
    if (req.context) {
      req.context.userId = payload.userId;
      req.context.organizationId = payload.organizationId;
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Require authenticated user (throws if not authenticated)
 */
export const requireAuth = authenticate;

/**
 * Optional authentication (doesn't throw if no token)
 */
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      deviceId: payload.deviceId,
      clientType: payload.clientType,
    };

    if (req.context) {
      req.context.userId = payload.userId;
      req.context.organizationId = payload.organizationId;
    }
  } catch {
    // Ignore authentication errors for optional auth
  }

  next();
});

/**
 * Require MFA verification for sensitive operations
 */
export const requireMfa = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      isTwoFactorEnabled: true,
      requiresMfaForSensitiveOps: true,
      twoFactorSecret: true,
      backupCodes: true,
    },
  });

  if (!user) {
    throw new AuthenticationError(ErrorCode.USER_NOT_FOUND);
  }

  if (user.isTwoFactorEnabled && user.requiresMfaForSensitiveOps) {
    const mfaToken = req.headers['x-mfa-token'] as string;
    
    if (!mfaToken) {
      throw new AuthenticationError(ErrorCode.MFA_REQUIRED, 'MFA verification required for this operation');
    }

    // Verify MFA token
    const result = await validateMfaToken(
      user.twoFactorSecret,
      user.backupCodes as string[], // Cast assumes backupCodes is string[] in DB/Prisma type
      mfaToken
    );

    if (!result.valid) {
      throw new AuthenticationError(ErrorCode.MFA_INVALID, 'Invalid MFA token');
    }
  }

  next();
});

/**
 * Require specific organization membership
 */
export function requireOrganization(organizationId?: string) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const orgId = organizationId || req.params.organizationId || req.body.organizationId;

    if (!orgId) {
      throw new AuthenticationError(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization ID required');
    }

    const prisma = getPrismaClient();
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: req.user.id,
      },
    });

    if (!membership) {
      throw new AuthenticationError(
        ErrorCode.NOT_ORGANIZATION_MEMBER,
        'You are not a member of this organization'
      );
    }

    next();
  });
}

function getRequestBodyHash(req: Request) {
  const payload = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "";
  return crypto.createHash("sha256").update(payload).digest("base64");
}

function getCliSigningPayload(req: Request, timestamp: string, nonce: string) {
  return [
    req.method.toUpperCase(),
    req.originalUrl,
    timestamp,
    nonce,
    getRequestBodyHash(req),
  ].join("\n");
}

export const requireOfficialCli = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.deviceId || req.user.clientType !== "CLI") {
    throw new AuthenticationError(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      "Official CLI authentication is required for this operation",
    );
  }

  const deviceIdHeader = req.headers["x-hermit-device-id"];
  const signatureHeader = req.headers["x-hermit-signature"];
  const nonceHeader = req.headers["x-hermit-nonce"];
  const timestampHeader = req.headers["x-hermit-timestamp"];

  if (
    typeof deviceIdHeader !== "string" ||
    typeof signatureHeader !== "string" ||
    typeof nonceHeader !== "string" ||
    typeof timestampHeader !== "string"
  ) {
    throw new AuthenticationError(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      "Official CLI request signature is required",
    );
  }

  if (deviceIdHeader !== req.user.deviceId) {
    throw new AuthenticationError(ErrorCode.TOKEN_INVALID, "CLI device binding mismatch");
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    throw new AuthenticationError(ErrorCode.TOKEN_INVALID, "CLI request signature expired");
  }

  const prisma = getPrismaClient();
  const device = await prisma.device.findFirst({
    where: {
      id: req.user.deviceId,
      userId: req.user.id,
      clientType: "CLI",
      isTrusted: true,
    },
    select: {
      id: true,
      publicKey: true,
      hardwareFingerprint: true,
    },
  });

  if (!device?.publicKey) {
    throw new AuthenticationError(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      "CLI device enrollment is required",
    );
  }

  const verified = crypto.verify(
    null,
    Buffer.from(getCliSigningPayload(req, timestampHeader, nonceHeader)),
    device.publicKey,
    Buffer.from(signatureHeader, "base64"),
  );

  if (!verified) {
    throw new AuthenticationError(ErrorCode.TOKEN_INVALID, "Invalid CLI request signature");
  }

  await cleanupExpiredCliNonces(device.id);
  const nonceRecorded = await registerRequestNonce(
    device.id,
    nonceHeader,
    new Date(timestamp + 5 * 60 * 1000),
  );

  if (!nonceRecorded) {
    throw new AuthenticationError(ErrorCode.TOKEN_INVALID, "CLI request nonce has already been used");
  }

  req.cliDevice = {
    id: device.id,
    hardwareFingerprint: device.hardwareFingerprint,
  };

  next();
});

/**
 * Require minimum role in organization
 */
export function requireRole(minimumRole: 'MEMBER' | 'ADMIN' | 'OWNER') {
  const roleHierarchy = { MEMBER: 1, ADMIN: 2, OWNER: 3 };

  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const organizationId = req.params.organizationId || req.body.organizationId;

    if (!organizationId) {
      throw new AuthenticationError(ErrorCode.ORGANIZATION_NOT_FOUND);
    }

    const prisma = getPrismaClient();
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: req.user.id,
      },
      include: { role: true },
    });

    if (!membership) {
      throw new AuthenticationError(ErrorCode.NOT_ORGANIZATION_MEMBER);
    }

    if (!membership.role || roleHierarchy[membership.role.name as keyof typeof roleHierarchy] < roleHierarchy[minimumRole as keyof typeof roleHierarchy]) {
      throw new AuthenticationError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        `${minimumRole} role required`
      );
    }

    next();
  });
}
