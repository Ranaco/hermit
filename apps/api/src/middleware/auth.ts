/**
 * Authentication Middleware
 * JWT verification and user attachment
 */

import type { Request, Response, NextFunction } from 'express';
import { AuthenticationError, ErrorCode, asyncHandler } from '@hermit/error-handling';
import { verifyAccessToken } from '../utils/jwt';
import getPrismaClient from '../services/prisma.service';
import { validateMfaToken } from '../utils/mfa';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        organizationId?: string;
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
