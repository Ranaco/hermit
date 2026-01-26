/**
 * Vault Controller
 * Handles vault creation, management, and permissions
 */

import type { Request, Response } from 'express';
import { asyncHandler, AuthenticationError, ValidationError, ErrorCode, NotFoundError, AuthorizationError } from '@hermes/error-handling';
import { vaultWrapper } from '../wrappers/vault.wrapper';

/**
 * Create a new vault
 * POST /api/v1/vaults
 */
export const createVault = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { name, description, organizationId } = req.body;

  if (!name) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Vault name is required');
  }

  if (!organizationId) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Organization ID is required');
  }

  const result = await vaultWrapper.createVault(req.user.id, {
    name,
    description,
    organizationId,
  }, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.status(201).json({
    success: true,
    data: { vault: result.vault },
    message: 'Vault created successfully',
  });
});

/**
 * Get all vaults accessible to user
 * GET /api/v1/vaults
 */
export const getVaults = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { organizationId } = req.query;

  const result = await vaultWrapper.getVaults(req.user.id, {
    organizationId: organizationId as string,
  });

  res.json({
    success: true,
    data: { vaults: result.vaults },
  });
});

/**
 * Get a specific vault
 * GET /api/v1/vaults/:id
 */
export const getVault = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;

  const result = await vaultWrapper.getVault(req.user.id, id);

  res.json({
    success: true,
    data: { vault: result.vault },
  });
});

/**
 * Update a vault
 * PATCH /api/v1/vaults/:id
 */
export const updateVault = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;
  const { name, description } = req.body;

  const result = await vaultWrapper.updateVault(req.user.id, id, {
    name,
    description,
  }, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    data: { vault: result.vault },
    message: 'Vault updated successfully',
  });
});

/**
 * Delete a vault
 * DELETE /api/v1/vaults/:id
 */
export const deleteVault = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;

  await vaultWrapper.deleteVault(req.user.id, id, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    message: 'Vault deleted successfully',
  });
});

/**
 * Grant vault permissions to a user
 * POST /api/v1/vaults/:id/permissions/users
 */
export const grantUserPermission = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;
  const { userId, permissionLevel } = req.body;

  if (!userId || !permissionLevel) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'User ID and permission level are required');
  }

  const result = await vaultWrapper.grantUserPermission(req.user.id, id, {
    targetUserId: userId,
    permissionLevel,
  }, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.status(201).json({
    success: true,
    data: { permission: result.permission },
    message: 'Permission granted successfully',
  });
});

/**
 * Revoke vault permissions from a user
 * DELETE /api/v1/vaults/:id/permissions/users/:userId
 */
export const revokeUserPermission = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id, userId } = req.params;

  await vaultWrapper.revokeUserPermission(req.user.id, id, userId, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    message: 'Permission revoked successfully',
  });
});

