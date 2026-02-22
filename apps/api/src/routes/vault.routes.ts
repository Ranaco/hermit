/**
 * Vault Routes
 */

import { Router } from "express";
import * as vaultController from "../controllers/vault.controller";
import { authenticate } from "../middleware/auth";
import { generalRateLimiter } from "../middleware/security";
import { validate } from "../validators/validation.middleware";
import {
  createVaultSchema,
  updateVaultSchema,
  getVaultsQuerySchema,
  vaultIdParamSchema,
  grantUserPermissionSchema,
  grantTeamPermissionSchema,
  vaultUserIdParamSchema,
  vaultTeamIdParamSchema,
} from "../validators/vault.validator";

const router = Router();

// All vault routes require authentication
router.use(authenticate);

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
  vaultController.getVault,
);
router.patch(
  "/:id",
  validate({ params: vaultIdParamSchema, body: updateVaultSchema }),
  vaultController.updateVault,
);
router.delete(
  "/:id",
  validate({ params: vaultIdParamSchema }),
  vaultController.deleteVault,
);

/**
 * Permission management
 */
router.post(
  "/:id/permissions/users",
  validate({ params: vaultIdParamSchema, body: grantUserPermissionSchema }),
  vaultController.grantUserPermission,
);
router.delete(
  "/:id/permissions/users/:userId",
  validate({ params: vaultIdParamSchema.merge(vaultUserIdParamSchema) }),
  vaultController.revokeUserPermission,
);
router.post(
  "/:id/permissions/teams",
  validate({ params: vaultIdParamSchema, body: grantTeamPermissionSchema }),
  vaultController.grantTeamPermission,
);
router.delete(
  "/:id/permissions/teams/:teamId",
  validate({ params: vaultIdParamSchema.merge(vaultTeamIdParamSchema) }),
  vaultController.revokeTeamPermission,
);

export default router;
