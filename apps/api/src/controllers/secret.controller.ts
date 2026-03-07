/**
 * Secret Controller
 * Handles secure secret storage with encryption via HashiCorp Vault Transit Engine
 *
 * Three-tier security model:
 * 1. Secret-level password (highest) - requires password to decrypt specific secret
 * 2. Vault-level password (medium) - requires password to access any secret in vault
 * 3. Authentication only (basic) - just requires login
 */

import type { Request, Response } from "express";
import {
  asyncHandler,
  AuthenticationError,
  ValidationError,
  ErrorCode,
} from "@hermes/error-handling";
import { secretWrapper } from "../wrappers/secret.wrapper";

/**
 * Create a new secret
 * POST /api/v1/secrets
 */
export const createSecret = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await secretWrapper.createSecret(
      req.user.id,
      req.body,
      {
        ipAddress: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      },
    );

    res.status(201).json({
      success: true,
      data: result,
      message: "Secret created successfully",
    });
  },
);

/**
 * Get all secrets in a vault
 * GET /api/v1/secrets?vaultId=xxx
 */
export const getSecrets = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const result = await secretWrapper.getSecrets(req.user.id, {
    vaultId: req.query.vaultId as string,
    secretGroupId: req.query.secretGroupId as string | undefined,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Get a specific secret (requires password verification if protected)
 * POST /api/v1/secrets/:id/reveal
 */
export const revealSecret = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await secretWrapper.revealSecret(
      req.user.id,
      {
        secretId: req.params.id,
        password: req.body.password,
        vaultPassword: req.body.vaultPassword,
        versionNumber: req.body.versionNumber,
      },
      {
        ipAddress: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      },
    );

    // Handle password requirement responses
    if ("requiresPassword" in result) {
      return res.status(403).json({
        success: false,
        error: result.error,
        requiresPassword: result.requiresPassword,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  },
);

/**
 * Update a secret (creates a new version)
 * PUT /api/v1/secrets/:id
 */
export const updateSecret = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await secretWrapper.updateSecret(
      req.user.id,
      {
        secretId: req.params.id,
        ...req.body,
      },
      {
        ipAddress: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      },
    );

    res.json({
      success: true,
      data: result,
      message: "Secret updated successfully",
    });
  },
);

/**
 * Delete a secret
 * DELETE /api/v1/secrets/:id
 */
export const deleteSecret = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    await secretWrapper.deleteSecret(
      req.user.id,
      { secretId: req.params.id },
      {
        ipAddress: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      },
    );

    res.json({
      success: true,
      message: "Secret deleted successfully",
    });
  },
);

/**
 * Get secret version history
 * GET /api/v1/secrets/:id/versions
 */
export const getSecretVersions = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await secretWrapper.getSecretVersions(req.user.id, {
      secretId: req.params.id,
    });

    res.json({
      success: true,
      data: result,
    });
  },
);

/**
 * Bulk reveal secrets in a vault (for CLI `hermes run`)
 * POST /api/v1/secrets/bulk-reveal
 */
export const bulkRevealSecrets = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await secretWrapper.bulkRevealSecrets(
      req.user.id,
      {
        vaultId: req.body.vaultId,
        secretGroupId: req.body.secretGroupId,
        password: req.body.password,
        vaultPassword: req.body.vaultPassword,
      },
      {
        ipAddress: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      },
    );

    // Handle vault password requirement
    if ("error" in result && result.error) {
      return res.status(403).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  },
);
