/**
 * Key Routes
 */

import { Router } from 'express';
import * as keyController from '../controllers/key.controller';
import { authenticate } from '../middleware/auth';
import { requireVaultHealth } from '../middleware/vault-health';
import { requirePolicy } from '../middleware/policy';
import getPrismaClient from "../services/prisma.service";
import { cryptoOperationsRateLimiter, generalRateLimiter } from '../middleware/security';
import { validate } from '../validators/validation.middleware';
import { NotFoundError, ErrorCode } from "@hermes/error-handling";
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

const getKeyUrn = async (req: any) => {
  let orgId = req.headers["x-organization-id"] || req.query.orgId || req.body.orgId || req.query.organizationId || req.body.organizationId;
  let vaultId = req.body.vaultId || req.query.vaultId || req.params.vaultId || req.params.id;
  const keyId = req.params.id;
  
  const prisma = getPrismaClient();

  if (!orgId && keyId) {
     const key = await prisma.key.findUnique({ where: { id: keyId }, include: { vault: { select: { organizationId: true, id: true } } } });
     if (key && key.vault) {
       orgId = key.vault.organizationId;
       vaultId = key.vault.id;
       req.organizationId = orgId;
     } else {
       throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Key not found");
     }
  } else if (!orgId && vaultId) {
     const vault = await prisma.vault.findUnique({ where: { id: vaultId }, select: { organizationId: true } });
     if (vault) {
       orgId = vault.organizationId;
       req.organizationId = orgId;
     } else {
       throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Vault not found");
     }
  }
  
  return `urn:hermes:org:${orgId || '*'}:vault:${vaultId || '*'}:key:${keyId || '*'}`;
};

// All key routes require authentication and vault health
router.use(authenticate);
router.use(requireVaultHealth);

/**
 * Key management
 */
router.post('/', generalRateLimiter, validate({ body: createKeySchema }), requirePolicy("keys:create", getKeyUrn), keyController.createKey);
router.get('/', validate({ query: getKeysQuerySchema }), requirePolicy("keys:read", getKeyUrn), keyController.getKeys);
router.get('/:id', validate({ params: keyIdParamSchema }), requirePolicy("keys:read", getKeyUrn), keyController.getKey);
router.post('/:id/rotate', generalRateLimiter, validate({ params: keyIdParamSchema, body: rotateKeySchema }), requirePolicy("keys:update", getKeyUrn), keyController.rotateKey);
router.delete('/:id', validate({ params: keyIdParamSchema }), requirePolicy("keys:delete", getKeyUrn), keyController.deleteKey);

/**
 * Cryptographic operations
 */
router.post('/:id/encrypt', cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: encryptDataSchema }), requirePolicy("keys:use", getKeyUrn), keyController.encryptData);
router.post('/:id/decrypt', cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: decryptDataSchema }), requirePolicy("keys:use", getKeyUrn), keyController.decryptData);
router.post('/:id/encrypt/batch', cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: batchEncryptSchema }), requirePolicy("keys:use", getKeyUrn), keyController.batchEncrypt);
router.post('/:id/decrypt/batch', cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: batchDecryptSchema }), requirePolicy("keys:use", getKeyUrn), keyController.batchDecrypt);

export default router;
