import {
  ValidationError,
  ErrorCode,
  NotFoundError,
  ForbiddenError,
} from "@hermes/error-handling";
import { randomUUID } from "crypto";
import getPrismaClient from "../services/prisma.service";
import { createAuditLog } from "../services/audit.service";
import {
  evaluateStatementsAgainstAny,
  getUserPolicies,
  evaluateAccess,
  type PolicyStatement,
} from "../services/policy-engine";
import {
  buildGroupCandidateResourceUrns,
  buildGroupUrn,
  buildSecretCandidateResourceUrns,
} from "../services/iam-resource.service";
import { buildPolicyUrn } from "../services/organization-iam.service";

type AccessContext = {
  canBypass: boolean;
  policyStatements: PolicyStatement[];
};

async function getAccessContext(
  prisma: ReturnType<typeof getPrismaClient>,
  userId: string,
  orgId: string,
): Promise<AccessContext> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId,
      },
    },
    include: {
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  const canBypass = membership?.role?.name === "OWNER";

  return {
    canBypass,
    policyStatements: canBypass ? [] : await getUserPolicies(userId, orgId),
  };
}

function canAccessGroupAction(
  accessContext: AccessContext,
  action: string,
  data: {
    orgId: string;
    vaultId: string;
    groupId?: string | null;
    groupPath?: string | null;
  },
) {
  if (accessContext.canBypass) {
    return true;
  }

  if (data.groupId) {
    return evaluateStatementsAgainstAny(
      accessContext.policyStatements,
      action,
      buildGroupCandidateResourceUrns({
        orgId: data.orgId,
        vaultId: data.vaultId,
        groupId: data.groupId,
        path: data.groupPath,
      }),
    );
  }

  return evaluateStatementsAgainstAny(accessContext.policyStatements, action, [
    buildGroupUrn(data.orgId, data.vaultId, "*"),
  ]);
}

function canAccessSecretAction(
  accessContext: AccessContext,
  action: string,
  data: {
    orgId: string;
    vaultId: string;
    secretId: string;
    groupPath?: string | null;
  },
) {
  if (accessContext.canBypass) {
    return true;
  }

  return evaluateStatementsAgainstAny(
    accessContext.policyStatements,
    action,
    buildSecretCandidateResourceUrns({
      orgId: data.orgId,
      vaultId: data.vaultId,
      secretId: data.secretId,
      groupPath: data.groupPath,
    }),
  );
}

export const secretGroupWrapper = {
  /**
   * Create a new Secret Group
   */
  async createGroup(
    userId: string,
    data: {
      name: string;
      description?: string;
      vaultId: string;
      parentId?: string;
    },
    auditInfo: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const { name, description, vaultId, parentId } = data;
    const prisma = getPrismaClient();

    // Check vault exists
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
    });

    if (!vault) {
      throw new NotFoundError(ErrorCode.VAULT_NOT_FOUND, "Vault not found");
    }

    const accessContext = await getAccessContext(prisma, userId, vault.organizationId);
    let path = "";
    let depth = 0;
    const groupId = randomUUID();

    if (parentId) {
      const parent = await prisma.secretGroup.findUnique({
        where: { id: parentId },
        select: {
          id: true,
          vaultId: true,
          path: true,
          depth: true,
        },
      });
      if (!parent || parent.vaultId !== vaultId) {
        throw new ValidationError(
          ErrorCode.VALIDATION_ERROR,
          "Parent Secret Group not found in this vault",
        );
      }

      if (
        !canAccessGroupAction(accessContext, "groups:create", {
          orgId: vault.organizationId,
          vaultId,
          groupId: parent.id,
          groupPath: parent.path,
        })
      ) {
        throw new ForbiddenError(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          "Access denied by IAM policy",
        );
      }

      path = `${parent.path}/${groupId}`;
      depth = parent.depth + 1;
    } else {
      if (
        !canAccessGroupAction(accessContext, "groups:create", {
          orgId: vault.organizationId,
          vaultId,
        })
      ) {
        throw new ForbiddenError(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          "Access denied by IAM policy",
        );
      }

      path = groupId;
    }

    // Check for duplicate name in the same hierarchy level
    const existing = await prisma.secretGroup.findFirst({
      where: {
        vaultId,
        parentId: parentId ?? null,
        name,
      },
    });

    if (existing) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "A group with this name already exists at this level",
      );
    }

    const group = await prisma.secretGroup.create({
      data: {
        id: groupId,
        name,
        description,
        vaultId,
        parentId,
        path,
        depth,
      },
    });

    await createAuditLog({
      userId,
      action: "CREATE" as any,
      resourceType: "SECRET" as any,
      resourceId: group.id,
      details: {
        groupName: name,
        vaultId,
        parentId,
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return group;
  },

  /**
   * Get all Secret Groups in a vault, optionally filtered by parentId
   */
  async getGroups(
    userId: string,
    data: {
      vaultId: string;
      parentId?: string;
      includeChildren?: boolean;
      forPolicyBuilder?: boolean;
    },
  ) {
    const { vaultId, parentId, includeChildren, forPolicyBuilder } = data;
    const prisma = getPrismaClient();

    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
      select: { organizationId: true }
    });
    
    if (!vault) {
      throw new NotFoundError(ErrorCode.VAULT_NOT_FOUND, "Vault not found");
    }

    const where: any = { vaultId };

    if (includeChildren) {
      // Return the full folder tree in this vault for scoped pickers and tree-aware UIs.
    } else if (parentId !== undefined) {
      where.parentId = parentId ?? null;
    } else {
      // By default, only return root level groups
      where.parentId = null;
    }

    const groups = await prisma.secretGroup.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { secrets: true, children: true },
        },
      },
    });
    const accessContext = await getAccessContext(prisma, userId, vault.organizationId);

    if (!accessContext.canBypass && forPolicyBuilder) {
      const canManagePolicies = await Promise.all([
        evaluateAccess(userId, vault.organizationId, "policies:read", buildPolicyUrn(vault.organizationId, "*")),
        evaluateAccess(userId, vault.organizationId, "policies:create", buildPolicyUrn(vault.organizationId, "*")),
        evaluateAccess(userId, vault.organizationId, "policies:update", buildPolicyUrn(vault.organizationId, "*")),
      ]);

      if (canManagePolicies.some(Boolean)) {
        return groups;
      }
    }

    if (accessContext.canBypass) {
      return groups;
    }

    const groupPaths = groups.map((group) => group.path);

    if (groupPaths.length === 0) {
      return groups;
    }

    const [descendantGroups, descendantSecrets] = await Promise.all([
      prisma.secretGroup.findMany({
        where: {
          vaultId,
          OR: groupPaths.map((path) => ({
            path: {
              startsWith: `${path}/`,
            },
          })),
        },
        select: {
          id: true,
          path: true,
        },
      }),
      prisma.secret.findMany({
        where: {
          vaultId,
          secretGroupId: { not: null },
          OR: groupPaths.map((path) => ({
            secretGroup: {
              path: {
                startsWith: `${path}/`,
              },
            },
          })),
        },
        select: {
          id: true,
          secretGroup: {
            select: {
              path: true,
            },
          },
        },
      }),
    ]);

    return groups.filter((group) => {
      if (
        canAccessGroupAction(accessContext, "groups:read", {
          orgId: vault.organizationId,
          vaultId,
          groupId: group.id,
          groupPath: group.path,
        })
      ) {
        return true;
      }

      if (
        evaluateStatementsAgainstAny(
          accessContext.policyStatements,
          "secrets:read",
          buildGroupCandidateResourceUrns({
            orgId: vault.organizationId,
            vaultId,
            groupId: group.id,
            path: group.path,
          }),
        )
      ) {
        return true;
      }

      if (
        descendantGroups.some(
          (descendantGroup) =>
            descendantGroup.path.startsWith(`${group.path}/`) &&
            (canAccessGroupAction(accessContext, "groups:read", {
              orgId: vault.organizationId,
              vaultId,
              groupId: descendantGroup.id,
              groupPath: descendantGroup.path,
            }) ||
              evaluateStatementsAgainstAny(
                accessContext.policyStatements,
                "secrets:read",
                buildGroupCandidateResourceUrns({
                  orgId: vault.organizationId,
                  vaultId,
                  groupId: descendantGroup.id,
                  path: descendantGroup.path,
                }),
              )),
        )
      ) {
        return true;
      }

      return descendantSecrets.some(
        (secret) =>
          secret.secretGroup?.path?.startsWith(`${group.path}/`) &&
          canAccessSecretAction(accessContext, "secrets:read", {
            orgId: vault.organizationId,
            vaultId,
            secretId: secret.id,
            groupPath: secret.secretGroup?.path,
          }),
      );
    });
  },

  /**
   * Update a Secret Group
   */
  async updateGroup(
    userId: string,
    data: {
      groupId: string;
      name?: string;
      description?: string;
    },
    auditInfo: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const { groupId, name, description } = data;
    const prisma = getPrismaClient();

    let group = await prisma.secretGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Secret Group not found");
    }

    const vault = await prisma.vault.findUnique({
      where: { id: group.vaultId },
      select: { organizationId: true },
    });

    if (!vault) {
      throw new NotFoundError(ErrorCode.VAULT_NOT_FOUND, "Vault not found");
    }

    const accessContext = await getAccessContext(prisma, userId, vault.organizationId);
    if (
      !canAccessGroupAction(accessContext, "groups:update", {
        orgId: vault.organizationId,
        vaultId: group.vaultId,
        groupId: group.id,
        groupPath: group.path,
      })
    ) {
      throw new ForbiddenError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Access denied by IAM policy",
      );
    }

    if (name && name !== group.name) {
      const existing = await prisma.secretGroup.findFirst({
        where: {
          vaultId: group.vaultId,
          parentId: group.parentId,
          name,
        },
      });

      if (existing) {
        throw new ValidationError(
          ErrorCode.VALIDATION_ERROR,
          "A group with this name already exists at this level",
        );
      }
    }

    group = await prisma.secretGroup.update({
      where: { id: groupId },
      data: {
        name: name ?? group.name,
        description: description ?? group.description,
      },
    });

    await createAuditLog({
      userId,
      action: "UPDATE" as any,
      resourceType: "SECRET" as any,
      resourceId: group.id,
      details: {
        changes: { name, description },
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return group;
  },

  /**
   * Delete a Secret Group
   */
  async deleteGroup(
    userId: string,
    data: { groupId: string },
    auditInfo: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const prisma = getPrismaClient();

    const group = await prisma.secretGroup.findUnique({
      where: { id: data.groupId },
      include: {
        _count: {
          select: { children: true, secrets: true },
        },
      },
    });

    if (!group) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Secret Group not found");
    }

    const vault = await prisma.vault.findUnique({
      where: { id: group.vaultId },
      select: { organizationId: true },
    });

    if (!vault) {
      throw new NotFoundError(ErrorCode.VAULT_NOT_FOUND, "Vault not found");
    }

    const accessContext = await getAccessContext(prisma, userId, vault.organizationId);
    if (
      !canAccessGroupAction(accessContext, "groups:delete", {
        orgId: vault.organizationId,
        vaultId: group.vaultId,
        groupId: group.id,
        groupPath: group.path,
      })
    ) {
      throw new ForbiddenError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Access denied by IAM policy",
      );
    }

    if (group._count.children > 0 || group._count.secrets > 0) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Cannot delete a Secret Group that contains secrets or subgroups. Empty it first.",
      );
    }

    await prisma.secretGroup.delete({
      where: { id: data.groupId },
    });

    await createAuditLog({
      userId,
      action: "DELETE" as any,
      resourceType: "SECRET" as any,
      resourceId: group.id,
      details: {
        groupName: group.name,
        vaultId: group.vaultId,
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return true;
  },
};
