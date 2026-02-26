/**
 * Key Routes
 */

import { Router } from 'express';
import * as keyController from '../controllers/key.controller';
import { authenticate } from '../middleware/auth';
import { requireVaultHealth } from '../middleware/vault-health';
import { requireVaultPermission, requireKeyPermission } from '../middleware/rbac';
import { cryptoOperationsRateLimiter, generalRateLimiter } from '../middleware/security';
import { validate } from '../validators/validation.middleware';
import {
  createKeySchema,
  getKeysQuerySchema,
  keyIdParamSchema,
  encryptDataSchema,
  decryptDataSchema,
  batchEncryptSchema,
  batchDecryptSchema,
  rotateKeySchema,
} from '../validators/key.validator';

const router = Router();

// All key routes require authentication and vault health
router.use(authenticate);
router.use(requireVaultHealth);

/**
 * Key management
 */
router.post('/', generalRateLimiter, validate({ body: createKeySchema }), requireVaultPermission("EDIT"), keyController.createKey);
router.get('/', validate({ query: getKeysQuerySchema }), requireVaultPermission("VIEW"), keyController.getKeys);
router.get('/:id', validate({ params: keyIdParamSchema }), requireKeyPermission("VIEW"), keyController.getKey);
router.post('/:id/rotate', generalRateLimiter, validate({ params: keyIdParamSchema, body: rotateKeySchema }), requireKeyPermission("EDIT"), keyController.rotateKey);
router.delete('/:id', validate({ params: keyIdParamSchema }), requireKeyPermission("ADMIN"), keyController.deleteKey);

/**
 * Cryptographic operations
 */
router.post('/:id/encrypt', cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: encryptDataSchema }), requireKeyPermission("USE"), keyController.encryptData);
router.post('/:id/decrypt', cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: decryptDataSchema }), requireKeyPermission("USE"), keyController.decryptData);
router.post('/:id/encrypt/batch', cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: batchEncryptSchema }), requireKeyPermission("USE"), keyController.batchEncrypt);
router.post('/:id/decrypt/batch', cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: batchDecryptSchema }), requireKeyPermission("USE"), keyController.batchDecrypt);

export default router;
