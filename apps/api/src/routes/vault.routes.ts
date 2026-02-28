/**
 * Vault Routes
 */

import { Router } from "express";
import * as vaultController from "../controllers/vault.controller";
import { authenticate } from "../middleware/auth";
import { requireVaultHealth } from "../middleware/vault-health";
import { requirePolicy } from "../middleware/policy";
import { generalRateLimiter } from "../middleware/security";
import { validate } from "../validators/validation.middleware";
import getPrismaClient from "../services/prisma.service";
import {
  createVaultSchema,
  updateVaultSchema,
  getVaultsQuerySchema,
  vaultIdParamSchema,
} from "../validators/vault.validator";

const router = Router();

const getVaultUrn = async (req: any) => {
  let orgId = req.headers["x-organization-id"] || req.query.orgId || req.body.orgId;
  const vaultId = req.params.id || req.body.vaultId;

  if (!orgId && vaultId) {
    const prisma = getPrismaClient();
    const vault = await prisma.vault.findUnique({ where: { id: vaultId }, select: { organizationId: true } });
    if (vault) {
      orgId = vault.organizationId;
      req.organizationId = orgId;
    }
  }

  return `urn:hermes:org:${orgId || "*"}:vault:${vaultId || "*"}`;
};

// All vault routes require authentication and vault health
router.use(authenticate);
router.use(requireVaultHealth);

/**
 * Vault CRUD operations
 */
router.post(
  "/",
  generalRateLimiter,
  validate({ body: createVaultSchema }),
  vaultController.createVault,
);
router.get(
  "/",
  validate({ query: getVaultsQuerySchema }),
  vaultController.getVaults,
);
router.get(
  "/:id",
  validate({ params: vaultIdParamSchema }),
  requirePolicy("vaults:read", getVaultUrn),
  vaultController.getVault,
);
router.patch(
  "/:id",
  validate({ params: vaultIdParamSchema, body: updateVaultSchema }),
  requirePolicy("vaults:update", getVaultUrn),
  vaultController.updateVault,
);
router.delete(
  "/:id",
  validate({ params: vaultIdParamSchema }),
  requirePolicy("vaults:delete", getVaultUrn),
  vaultController.deleteVault,
);

export default router;
