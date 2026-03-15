/**
 * Vault Controller
 * Handles vault creation, management, and permissions
 */

import type { Request, Response } from 'express';
import { asyncHandler, AuthenticationError, ValidationError, ErrorCode, NotFoundError, AuthorizationError } from '@hermit/error-handling';
import { vaultWrapper } from '../wrappers/vault.wrapper';

/**
 * Create a new vault
 * POST /api/v1/vaults
 */
export const createVault = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { name, description, organizationId, password } = req.body;

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
    password,
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
  const { name, description, password } = req.body;

  const result = await vaultWrapper.updateVault(req.user.id, id, {
    name,
    description,
    password,
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


