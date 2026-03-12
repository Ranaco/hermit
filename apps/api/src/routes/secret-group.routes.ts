import { Router, type Request } from "express";
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
import { NotFoundError, ErrorCode } from "@hermes/error-handling";
import {
  createSecretGroupSchema,
  updateSecretGroupSchema,
  getSecretGroupsSchema,
} from "../validators/secret-group.validator";

const router = Router({ mergeParams: true });

const getGroupUrn = async (req: Request & { organizationId?: string }) => {
  const groupId = req.params.groupId || req.params.id || req.query.groupId || req.body.groupId;
  const vaultId = req.body.vaultId || req.query.vaultId || req.params.vaultId;

  const prisma = getPrismaClient();

  if (groupId) {
    const group = await prisma.secretGroup.findUnique({ where: { id: groupId }, include: { vault: { select: { organizationId: true, id: true } } } });
    if (!group || !group.vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Group not found");
    }
    req.organizationId = group.vault.organizationId;
    return `urn:hermes:org:${group.vault.organizationId}:vault:${group.vault.id}:group:${groupId}`;
  }

  if (vaultId) {
    const vault = await prisma.vault.findUnique({ where: { id: vaultId }, select: { organizationId: true } });
    if (!vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Vault not found");
    }
    req.organizationId = vault.organizationId;
    return `urn:hermes:org:${vault.organizationId}:vault:${vaultId}:group:*`;
  }

  return "urn:hermes:org:*:vault:*:group:*";
};

router.use(authenticate);

router.get(
  "/",
  validate({ query: getSecretGroupsSchema }),
  requirePolicy(["groups:read", "secrets:read"], getGroupUrn),
  getGroups,
);

router.post(
  "/",
  requireVaultHealth,
  validate({ body: createSecretGroupSchema }),
  requirePolicy("groups:create", getGroupUrn),
  createGroup,
);

router.put(
  "/:groupId",
  requireVaultHealth,
  validate({ body: updateSecretGroupSchema }),
  requirePolicy("groups:update", getGroupUrn),
  updateGroup,
);

router.delete("/:groupId", requirePolicy("groups:delete", getGroupUrn), deleteGroup);

export default router;
