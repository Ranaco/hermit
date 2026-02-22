/**
 * Key Controller
 * Handles encryption key management and cryptographic operations
 */

import type { Request, Response } from 'express';
import { asyncHandler, AuthenticationError, ValidationError, ErrorCode, NotFoundError } from '@hermes/error-handling';
import { keyWrapper } from '../wrappers/key.wrapper';

/**
 * Create a new encryption key
 * POST /api/v1/keys
 */
export const createKey = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { name, description, vaultId } = req.body;

  if (!name || !vaultId) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Name and vault ID are required');
  }

  const result = await keyWrapper.createKey(req.user.id, {
    name,
    description,
    vaultId,
  }, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.status(201).json({
    success: true,
    data: { key: result.key },
    message: 'Encryption key created successfully',
  });
});

/**
 * Get all keys in a vault
 * GET /api/v1/keys?vaultId=xxx
 */
export const getKeys = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { vaultId } = req.query;

  if (!vaultId) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Vault ID is required');
  }

  const result = await keyWrapper.getKeys(req.user.id, vaultId as string);

  res.json({
    success: true,
    data: { keys: result.keys },
  });
});

/**
 * Get a specific key
 * GET /api/v1/keys/:id
 */
export const getKey = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;

  const result = await keyWrapper.getKey(req.user.id, id);

  res.json({
    success: true,
    data: { key: result.key },
  });
});

/**
 * Rotate a key (create new version)
 * POST /api/v1/keys/:id/rotate
 */
export const rotateKey = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;

  const result = await keyWrapper.rotateKey(req.user.id, id, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    data: { versionNumber: result.versionNumber },
    message: 'Key rotated successfully',
  });
});

/**
 * Encrypt data
 * POST /api/v1/keys/:id/encrypt
 */
export const encryptData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;
  const { plaintext } = req.body;

  if (!plaintext) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Plaintext is required');
  }

  const result = await keyWrapper.encryptData(req.user.id, id, plaintext);

  res.json({
    success: true,
    data: { ciphertext: result.ciphertext },
  });
});

/**
 * Decrypt data
 * POST /api/v1/keys/:id/decrypt
 */
export const decryptData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;
  const { ciphertext } = req.body;

  if (!ciphertext) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Ciphertext is required');
  }

  const result = await keyWrapper.decryptData(req.user.id, id, ciphertext);

  res.json({
    success: true,
    data: { plaintext: result.plaintext },
  });
});

/**
 * Batch encrypt multiple values
 * POST /api/v1/keys/:id/encrypt/batch
 */
export const batchEncrypt = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;
  const plaintexts = Array.isArray(req.body.plaintexts)
    ? req.body.plaintexts
    : Array.isArray(req.body.items)
      ? req.body.items.map((item: { plaintext: string }) => item.plaintext)
      : [];

  if (!Array.isArray(plaintexts) || plaintexts.length === 0) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Plaintexts array is required');
  }

  const result = await keyWrapper.batchEncrypt(req.user.id, id, plaintexts);

  res.json({
    success: true,
    data: { ciphertexts: result.ciphertexts },
  });
});

/**
 * Batch decrypt multiple values
 * POST /api/v1/keys/:id/decrypt/batch
 */
export const batchDecrypt = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;
  const ciphertexts = Array.isArray(req.body.ciphertexts)
    ? req.body.ciphertexts
    : Array.isArray(req.body.items)
      ? req.body.items.map((item: { ciphertext: string }) => item.ciphertext)
      : [];

  if (!Array.isArray(ciphertexts) || ciphertexts.length === 0) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Ciphertexts array is required');
  }

  const result = await keyWrapper.batchDecrypt(req.user.id, id, ciphertexts);

  res.json({
    success: true,
    data: { plaintexts: result.plaintexts },
  });
});

/**
 * Delete a key
 * DELETE /api/v1/keys/:id
 */
export const deleteKey = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;

  await keyWrapper.deleteKey(req.user.id, id);

  res.json({
    success: true,
    message: 'Key deleted successfully',
  });
});

