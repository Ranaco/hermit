/**
 * Secret Routes
 * Endpoints for managing encrypted secrets with three-tier security
 */

import express from "express";
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

const getSecretUrn = async (req: any) => {
  let orgId = req.headers["x-organization-id"] || req.query.orgId || req.body.orgId || req.query.organizationId || req.body.organizationId;
  let vaultId = req.body.vaultId || req.query.vaultId || req.params.vaultId;
  const secretId = req.params.id || req.body.secretId || req.query.secretId;
  
  const prisma = getPrismaClient();

  if (!orgId && secretId) {
     const secret = await prisma.secret.findUnique({ where: { id: secretId }, include: { vault: { select: { organizationId: true, id: true } } } });
     if (secret && secret.vault) {
       orgId = secret.vault.organizationId;
       vaultId = secret.vault.id;
       req.organizationId = orgId;
     } else {
       throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
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
  
  return `urn:hermes:org:${orgId || '*'}:vault:${vaultId || '*'}:secret:${secretId || '*'}`;
};

// Handle OPTIONS preflight requests before authentication
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

// All routes require authentication and vault health
router.use(authenticate);
router.use(requireVaultHealth);

/**
 * @route   POST /api/v1/secrets
 * @desc    Create a new encrypted secret
 * @access  Private (requires EDIT or ADMIN permission on vault)
 */
router.post(
  "/",
  validate({ body: createSecretSchema }),
  requirePolicy("secrets:create", getSecretUrn),
  createSecret
);

/**
 * @route   GET /api/v1/secrets
 * @desc    Get all secrets in a vault (metadata only, no values)
 * @access  Private (requires VIEW permission on vault)
 */
router.get(
  "/",
  validate({ query: getSecretsSchema }),
  requirePolicy("secrets:read", getSecretUrn),
  getSecrets
);

/**
 * @route   POST /api/v1/secrets/bulk-reveal
 * @desc    Bulk reveal all secrets in a vault (for CLI secret injection)
 * @access  Private (requires USE permission)
 */
router.post(
  "/bulk-reveal",
  validate({ body: bulkRevealSecretsSchema }),
  requirePolicy("secrets:use", getSecretUrn),
  bulkRevealSecrets,
);

/**
 * @route   POST /api/v1/secrets/:id/reveal
 * @desc    Reveal secret value (requires password if protected)
 * @access  Private (requires USE permission)
 */
router.post(
  "/:id/reveal",
  validate({ body: revealSecretSchema }),
  requirePolicy("secrets:use", getSecretUrn),
  revealSecret,
);

/**
 * @route   PUT /api/v1/secrets/:id
 * @desc    Update secret (creates new version)
 * @access  Private (requires EDIT permission)
 */
router.put(
  "/:id",
  validate({ body: updateSecretSchema }),
  requirePolicy("secrets:update", getSecretUrn),
  updateSecret
);

/**
 * @route   DELETE /api/v1/secrets/:id
 * @desc    Delete a secret permanently
 * @access  Private (requires ADMIN permission)
 */
router.delete(
  "/:id", 
  requirePolicy("secrets:delete", getSecretUrn), 
  deleteSecret
);

/**
 * @route   GET /api/v1/secrets/:id/versions
 * @desc    Get secret version history
 * @access  Private (requires VIEW permission)
 */
router.get(
  "/:id/versions", 
  requirePolicy("secrets:read", getSecretUrn), 
  getSecretVersions
);

export default router;
