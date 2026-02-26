import { Router } from "express";
import {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
} from "../controllers/secret-group.controller";
import { validate } from "../validators/validation.middleware";
import { authenticate } from "../middleware/auth";
import { requireVaultPermission } from "../middleware/rbac";
import { requireVaultHealth } from "../middleware/vault-health";
import {
  createSecretGroupSchema,
  updateSecretGroupSchema,
  getSecretGroupsSchema,
} from "../validators/secret-group.validator";

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// List groups
router.get(
  "/",
  validate({ query: getSecretGroupsSchema }),
  requireVaultPermission("VIEW"),
  getGroups,
);

// Create a new group
router.post(
  "/",
  requireVaultHealth, // Ensure Vault is unsealed for modifications
  validate({ body: createSecretGroupSchema }),
  requireVaultPermission("EDIT"),
  createGroup,
);

// Update a group
router.put(
  "/:groupId",
  requireVaultHealth,
  validate({ body: updateSecretGroupSchema }),
  requireVaultPermission("EDIT"),
  updateGroup,
);

// Delete a group
router.delete("/:groupId", requireVaultPermission("ADMIN"), deleteGroup);

export default router;
