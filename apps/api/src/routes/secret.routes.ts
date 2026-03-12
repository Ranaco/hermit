/**
 * Secret Routes
 * Endpoints for managing encrypted secrets with three-tier security
 */

import express, { type Request } from "express";
import { authenticate } from "../middleware/auth";
import { requireVaultHealth } from "../middleware/vault-health";
import { requirePolicy } from "../middleware/policy";
import getPrismaClient from "../services/prisma.service";
import { validate } from "../validators/validation.middleware";
import { NotFoundError, ErrorCode } from "@hermes/error-handling";
import {
  createSecretSchema,
  revealSecretSchema,
  updateSecretSchema,
  getSecretsSchema,
  bulkRevealSecretsSchema,
} from "../validators/secret.validator";
import {
  createSecret,
  getSecrets,
  revealSecret,
  updateSecret,
  deleteSecret,
  getSecretVersions,
  bulkRevealSecrets,
} from "../controllers/secret.controller";

const router = express.Router();

const getSecretUrn = async (req: Request & { organizationId?: string }) => {
  const secretId = req.params.id || req.body.secretId || req.query.secretId;
  const vaultId = req.body.vaultId || req.query.vaultId || req.params.vaultId;

  const prisma = getPrismaClient();

  if (secretId) {
    const secret = await prisma.secret.findUnique({ where: { id: secretId }, include: { vault: { select: { organizationId: true, id: true } } } });
    if (!secret || !secret.vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }
    req.organizationId = secret.vault.organizationId;
    return `urn:hermes:org:${secret.vault.organizationId}:vault:${secret.vault.id}:secret:${secretId}`;
  }

  if (vaultId) {
    const vault = await prisma.vault.findUnique({ where: { id: vaultId }, select: { organizationId: true } });
    if (!vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Vault not found");
    }
    req.organizationId = vault.organizationId;
    return `urn:hermes:org:${vault.organizationId}:vault:${vaultId}:secret:*`;
  }

  return "urn:hermes:org:*:vault:*:secret:*";
};

router.options("/:id/reveal", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, X-Device-Fingerprint, X-MFA-Token",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  });
  res.status(200).end();
});

router.use(authenticate);
router.use(requireVaultHealth);

router.post(
  "/",
  validate({ body: createSecretSchema }),
  requirePolicy("secrets:create", getSecretUrn),
  createSecret,
);
router.get(
  "/",
  validate({ query: getSecretsSchema }),
  requirePolicy("secrets:read", getSecretUrn),
  getSecrets,
);
router.post(
  "/bulk-reveal",
  validate({ body: bulkRevealSecretsSchema }),
  requirePolicy("secrets:use", getSecretUrn),
  bulkRevealSecrets,
);
router.post(
  "/:id/reveal",
  validate({ body: revealSecretSchema }),
  requirePolicy("secrets:use", getSecretUrn),
  revealSecret,
);
router.put(
  "/:id",
  validate({ body: updateSecretSchema }),
  requirePolicy("secrets:update", getSecretUrn),
  updateSecret,
);
router.delete(
  "/:id",
  requirePolicy("secrets:delete", getSecretUrn),
  deleteSecret,
);
router.get(
  "/:id/versions",
  requirePolicy("secrets:read", getSecretUrn),
  getSecretVersions,
);

export default router;
