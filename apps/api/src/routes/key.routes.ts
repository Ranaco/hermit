/**
 * Key Routes
 */

import { Router, type Request } from "express";
import * as keyController from "../controllers/key.controller";
import { authenticate } from "../middleware/auth";
import { requireVaultHealth } from "../middleware/vault-health";
import { requirePolicy } from "../middleware/policy";
import getPrismaClient from "../services/prisma.service";
import { cryptoOperationsRateLimiter, generalRateLimiter } from "../middleware/security";
import { validate } from "../validators/validation.middleware";
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
} from "../validators/key.validator";

const router = Router();

const getKeyUrn = async (req: Request & { organizationId?: string }) => {
  const keyId = req.params.id || req.body.keyId || req.query.keyId;
  const vaultId = req.body.vaultId || req.query.vaultId || req.params.vaultId;

  const prisma = getPrismaClient();

  if (keyId) {
    const key = await prisma.key.findUnique({ where: { id: keyId }, include: { vault: { select: { organizationId: true, id: true } } } });
    if (!key || !key.vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Key not found");
    }
    req.organizationId = key.vault.organizationId;
    return `urn:hermes:org:${key.vault.organizationId}:vault:${key.vault.id}:key:${keyId}`;
  }

  if (vaultId) {
    const vault = await prisma.vault.findUnique({ where: { id: vaultId }, select: { organizationId: true } });
    if (!vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Vault not found");
    }
    req.organizationId = vault.organizationId;
    return `urn:hermes:org:${vault.organizationId}:vault:${vaultId}:key:*`;
  }

  return "urn:hermes:org:*:vault:*:key:*";
};

router.use(authenticate);
router.use(requireVaultHealth);

router.post("/", generalRateLimiter, validate({ body: createKeySchema }), requirePolicy("keys:create", getKeyUrn), keyController.createKey);
router.get("/", validate({ query: getKeysQuerySchema }), requirePolicy("keys:read", getKeyUrn), keyController.getKeys);
router.get("/:id", validate({ params: keyIdParamSchema }), requirePolicy("keys:read", getKeyUrn), keyController.getKey);
router.post("/:id/rotate", generalRateLimiter, validate({ params: keyIdParamSchema, body: rotateKeySchema }), requirePolicy("keys:update", getKeyUrn), keyController.rotateKey);
router.delete("/:id", validate({ params: keyIdParamSchema }), requirePolicy("keys:delete", getKeyUrn), keyController.deleteKey);

router.post("/:id/encrypt", cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: encryptDataSchema }), requirePolicy("keys:use", getKeyUrn), keyController.encryptData);
router.post("/:id/decrypt", cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: decryptDataSchema }), requirePolicy("keys:use", getKeyUrn), keyController.decryptData);
router.post("/:id/encrypt/batch", cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: batchEncryptSchema }), requirePolicy("keys:use", getKeyUrn), keyController.batchEncrypt);
router.post("/:id/decrypt/batch", cryptoOperationsRateLimiter, validate({ params: keyIdParamSchema, body: batchDecryptSchema }), requirePolicy("keys:use", getKeyUrn), keyController.batchDecrypt);

export default router;
