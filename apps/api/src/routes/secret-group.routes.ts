import { Router } from "express";
import {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
} from "../controllers/secret-group.controller";
import { validate } from "../validators/validation.middleware";
import { authenticate } from "../middleware/auth";
import { requirePolicy } from "../middleware/policy";
import getPrismaClient from "../services/prisma.service";
import { requireVaultHealth } from "../middleware/vault-health";
import {
  createSecretGroupSchema,
  updateSecretGroupSchema,
  getSecretGroupsSchema,
} from "../validators/secret-group.validator";

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

const getGroupUrn = async (req: any) => {
  let orgId = req.headers["x-organization-id"] || req.query.orgId || req.body.orgId;
  let vaultId = req.body.vaultId || req.query.vaultId || req.params.vaultId;
  const groupId = req.params.groupId || req.params.id;
  
  const prisma = getPrismaClient();

  if (!orgId && groupId) {
     const group = await prisma.secretGroup.findUnique({ where: { id: groupId }, include: { vault: { select: { organizationId: true, id: true } } } });
     if (group && group.vault) {
       orgId = group.vault.organizationId;
       vaultId = group.vault.id;
       req.organizationId = orgId;
     }
  } else if (!orgId && vaultId) {
     const vault = await prisma.vault.findUnique({ where: { id: vaultId }, select: { organizationId: true } });
     if (vault) {
       orgId = vault.organizationId;
       req.organizationId = orgId;
     }
  }
  
  return `urn:hermes:org:${orgId || '*'}:vault:${vaultId || '*'}:group:${groupId || '*'}`;
};

// List groups
router.get(
  "/",
  validate({ query: getSecretGroupsSchema }),
  requirePolicy("groups:read", getGroupUrn),
  getGroups,
);

// Create a new group
router.post(
  "/",
  requireVaultHealth, // Ensure Vault is unsealed for modifications
  validate({ body: createSecretGroupSchema }),
  requirePolicy("groups:create", getGroupUrn),
  createGroup,
);

// Update a group
router.put(
  "/:groupId",
  requireVaultHealth,
  validate({ body: updateSecretGroupSchema }),
  requirePolicy("groups:update", getGroupUrn),
  updateGroup,
);

// Delete a group
router.delete("/:groupId", requirePolicy("groups:delete", getGroupUrn), deleteGroup);

export default router;
