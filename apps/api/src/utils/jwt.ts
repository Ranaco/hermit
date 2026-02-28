/**
 * JWT Utilities
 * Token generation and verification
 */

import jwt from "jsonwebtoken";
import config from "../config";
import { AuthenticationError, ErrorCode } from "@hermes/error-handling";

export interface JwtPayload {
  userId: string;
  email: string;
  organizationId?: string;
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

/**
 * Generate access token
 */
export function generateAccessToken(
  payload: Omit<JwtPayload, "type" | "iat" | "exp">,
): string {
  return jwt.sign(
    { ...payload, type: "access" },
    config.jwt.accessTokenSecret as any,
    {
      expiresIn: config.jwt.accessTokenExpiry,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithm: "HS256",
    } as jwt.SignOptions,
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(
  payload: Omit<JwtPayload, "type" | "iat" | "exp">,
): string {
  return jwt.sign(
    { ...payload, type: "refresh" },
    config.jwt.refreshTokenSecret as any,
    {
      expiresIn: config.jwt.refreshTokenExpiry,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithm: "HS256",
    } as jwt.SignOptions,
  );
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.accessTokenSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as JwtPayload;

    if (decoded.type !== "access") {
      throw new AuthenticationError(
        ErrorCode.TOKEN_INVALID,
        "Invalid token type",
      );
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError(
        ErrorCode.TOKEN_EXPIRED,
        "Token has expired",
      );
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError(ErrorCode.TOKEN_INVALID, "Invalid token");
    }
    throw error;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshTokenSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as JwtPayload;

    if (decoded.type !== "refresh") {
      throw new AuthenticationError(
        ErrorCode.TOKEN_INVALID,
        "Invalid token type",
      );
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError(
        ErrorCode.TOKEN_EXPIRED,
        "Refresh token has expired",
      );
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError(
        ErrorCode.TOKEN_INVALID,
        "Invalid refresh token",
      );
    }
    throw error;
  }
}

/**
 * Generate token pair (access + refresh)
 */
export function generateTokenPair(
  payload: Omit<JwtPayload, "type" | "iat" | "exp">,
): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}
