import { Router, type Request } from "express";
import {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
} from "../controllers/secret-group.controller";
import { validate } from "../validators/validation.middleware";
import { authenticate, requireOfficialCli } from "../middleware/auth";
import { requirePolicy } from "../middleware/policy";
import getPrismaClient from "../services/prisma.service";
import { requireVaultHealth } from "../middleware/vault-health";
import { NotFoundError, ErrorCode } from "@hermit/error-handling";
import {
  buildGroupCandidateResourceUrns,
  buildGroupUrn,
} from "../services/iam-resource.service";
import { buildPolicyUrn } from "../services/organization-iam.service";
import {
  createSecretGroupSchema,
  updateSecretGroupSchema,
  getSecretGroupsSchema,
} from "../validators/secret-group.validator";

const router = Router({ mergeParams: true });

const getGroupUrn = async (req: Request & { organizationId?: string }) => {
  const groupId = req.params.groupId || req.params.id || req.query.groupId || req.body.groupId;
  const parentId = req.query.parentId || req.body.parentId;
  const vaultId = req.body.vaultId || req.query.vaultId || req.params.vaultId;

  const prisma = getPrismaClient();

  if (groupId) {
    const group = await prisma.secretGroup.findUnique({
      where: { id: groupId as string },
      include: { vault: { select: { organizationId: true, id: true } } },
    });
    if (!group || !group.vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Group not found");
    }
    req.organizationId = group.vault.organizationId;
    return buildGroupCandidateResourceUrns({
      orgId: group.vault.organizationId,
      vaultId: group.vault.id,
      groupId: group.id,
      path: group.path,
    });
  }

  if (parentId) {
    const parent = await prisma.secretGroup.findUnique({
      where: { id: parentId as string },
      include: { vault: { select: { organizationId: true, id: true } } },
    });
    if (!parent || !parent.vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Group not found");
    }
    req.organizationId = parent.vault.organizationId;

    return [
      buildGroupUrn(parent.vault.organizationId, parent.vault.id, "*"),
      ...buildGroupCandidateResourceUrns({
        orgId: parent.vault.organizationId,
        vaultId: parent.vault.id,
        groupId: parent.id,
        path: parent.path,
      }),
    ];
  }

  if (vaultId) {
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId as string },
      select: { id: true, organizationId: true },
    });
    if (!vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Vault not found");
    }
    req.organizationId = vault.organizationId;
    const groups = await prisma.secretGroup.findMany({
      where: { vaultId: vault.id },
      select: { id: true, path: true },
    });

    return Array.from(
      new Set([
        buildGroupUrn(vault.organizationId, vault.id, "*"),
        ...groups.flatMap((group) =>
          buildGroupCandidateResourceUrns({
            orgId: vault.organizationId,
            vaultId: vault.id,
            groupId: group.id,
            path: group.path,
          }),
        ),
      ]),
    );
  }

  return "urn:hermit:org:*:vault:*:group:*";
};

const getPolicyBuilderUrn = async (req: Request & { organizationId?: string }) => {
  const vaultId = req.body.vaultId || req.query.vaultId || req.params.vaultId;
  const prisma = getPrismaClient();

  if (vaultId) {
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId as string },
      select: { organizationId: true },
    });

    if (!vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Vault not found");
    }

    req.organizationId = vault.organizationId;
    return buildPolicyUrn(vault.organizationId, "*");
  }

  return buildPolicyUrn(req.organizationId || "*", "*");
};

router.use(authenticate);

router.get(
  "/",
  validate({ query: getSecretGroupsSchema }),
  async (req, res, next) => {
    if (req.query.cliScope === "true") {
      return requireOfficialCli(req, res, () =>
        requirePolicy(["groups:read", "secrets:read", "secrets:cli-use"], getGroupUrn)(req, res, next),
      );
    }

    if (req.query.forPolicyBuilder === "true") {
      return requirePolicy(
        ["policies:read", "policies:create", "policies:update"],
        getPolicyBuilderUrn,
      )(req, res, next);
    }

    return requirePolicy(["groups:read", "secrets:read"], getGroupUrn)(req, res, next);
  },
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
