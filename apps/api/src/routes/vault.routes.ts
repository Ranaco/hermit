/**
 * Vault Routes
 */

import { Router, type Request } from "express";
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
import { ErrorCode, NotFoundError } from "@hermes/error-handling";

const router = Router();

const getVaultUrn = async (req: Request & { organizationId?: string }) => {
  const vaultId = req.params.id || req.params.vaultId || req.body.vaultId || req.query.vaultId;
  const explicitOrgId = req.params.orgId || req.body.orgId || req.query.orgId || req.body.organizationId || req.query.organizationId;

  if (vaultId) {
    const prisma = getPrismaClient();
    const vault = await prisma.vault.findUnique({ where: { id: vaultId }, select: { organizationId: true } });
    if (!vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Vault not found");
    }
    req.organizationId = vault.organizationId;
    return `urn:hermes:org:${vault.organizationId}:vault:${vaultId}`;
  }

  if (explicitOrgId) {
    req.organizationId = explicitOrgId;
    return `urn:hermes:org:${explicitOrgId}:vault:*`;
  }

  return "urn:hermes:org:*:vault:*";
};

router.use(authenticate);
router.use(requireVaultHealth);

router.post(
  "/",
  generalRateLimiter,
  validate({ body: createVaultSchema }),
  requirePolicy("vaults:create", getVaultUrn),
  vaultController.createVault,
);
router.get(
  "/",
  validate({ query: getVaultsQuerySchema }),
  requirePolicy("vaults:read", getVaultUrn),
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
