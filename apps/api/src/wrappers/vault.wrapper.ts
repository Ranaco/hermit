/**
 * Vault Wrapper
 * Contains business logic for vault creation, management, and permissions
 */

import {
  AuthenticationError,
  ValidationError,
  ErrorCode,
  NotFoundError,
  AuthorizationError,
} from "@hermes/error-handling";
import { PermissionLevel } from "@hermes/prisma";
import getPrismaClient from "../services/prisma.service";
import { createAuditLog } from "../services/audit.service";

async function requireVaultAdmin(userId: string, vaultId: string) {
  const prisma = getPrismaClient();

  const vault = await prisma.vault.findFirst({
    where: {
      id: vaultId,
      OR: [
        {
          permissions: {
            some: {
              userId,
              permissionLevel: "ADMIN" as const,
            },
          },
        },
        {
          permissions: { some: { team: {
                members: {
                  some: {
                    userId,
                  },
                },
              },
              permissionLevel: "ADMIN" as const,
            },
          },
        },
      ],
    },
    include: {
      organization: true,
    },
  });

  if (!vault) {
    throw new NotFoundError(
      ErrorCode.VAULT_NOT_FOUND,
      "Vault not found or insufficient permissions",
    );
  }

  return vault;
}

export const vaultWrapper = {
  /**
   * Create a new vault
   */
  async createVault(
    userId: string,
    data: {
      name: string;
      description?: string;
      organizationId?: string;
    },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { name, description, organizationId } = data;
    const { ipAddress, userAgent } = auditData;

    if (!name) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Vault name is required",
      );
    }

    const prisma = getPrismaClient();

    // organizationId is now required - user must have an organization first
    if (!organizationId) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Organization ID is required. Please create or join an organization first.",
      );
    }

    // Verify user is a member of the organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
    });

    if (!membership) {
      throw new AuthorizationError(ErrorCode.NOT_ORGANIZATION_MEMBER);
    }

    const vault = await prisma.vault.create({
      data: {
        name,
        description,
        organization: {
          connect: { id: organizationId },
        },
        createdBy: {
          connect: { id: userId },
        },
        permissions: {
          create: {
            userId,
            permissionLevel: "ADMIN" as PermissionLevel,
          },
        },
      },
      include: {
        permissions: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await createAuditLog({
      userId,
      action: "CREATE",
      resourceType: "VAULT",
      resourceId: vault.id,
      details: { vaultName: name },
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
    });

    return { vault };
  },

  /**
   * Get all vaults accessible to user
   */
  async getVaults(userId: string, filters: { organizationId?: string }) {
    const { organizationId } = filters;

    const prisma = getPrismaClient();

    const whereClause = {
      OR: [
        {
          permissions: {
            some: {
              userId,
              permissionLevel: {
                in: [
                  "VIEW" as const,
                  "USE" as const,
                  "EDIT" as const,
                  "ADMIN" as const,
                ],
              },
            },
          },
        },
        {
          permissions: { some: { team: {
                members: {
                  some: {
                    userId,
                  },
                },
              },
              permissionLevel: {
                in: [
                  "VIEW" as const,
                  "USE" as const,
                  "EDIT" as const,
                  "ADMIN" as const,
                ],
              },
            },
          },
        },
      ],
      ...(organizationId ? { organizationId } : {}),
    };

    const vaults = await prisma.vault.findMany({
      where: whereClause,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            keys: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { vaults };
  },

  /**
   * Get a specific vault
   */
  async getVault(userId: string, vaultId: string) {
    const prisma = getPrismaClient();

    const vault = await prisma.vault.findFirst({
      where: {
        id: vaultId,
        OR: [
          {
            permissions: {
              some: {
                userId,
                permissionLevel: {
                  in: [
                    "VIEW" as const,
                    "USE" as const,
                    "EDIT" as const,
                    "ADMIN" as const,
                  ],
                },
              },
            },
          },
          {
            permissions: { some: { team: {
                  members: {
                    some: {
                      userId,
                    },
                  },
                },
                permissionLevel: {
                  in: [
                    "VIEW" as const,
                    "USE" as const,
                    "EDIT" as const,
                    "ADMIN" as const,
                  ],
                },
              },
            },
          },
        ],
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            keys: true,
          },
        },
      },
    });

    if (!vault) {
      throw new NotFoundError(ErrorCode.VAULT_NOT_FOUND);
    }

    return { vault };
  },

  /**
   * Update a vault
   */
  async updateVault(
    userId: string,
    vaultId: string,
    data: {
      name?: string;
      description?: string;
    },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { name, description } = data;
    const { ipAddress, userAgent } = auditData;

    const prisma = getPrismaClient();

    // Check if user has write permission (USE, EDIT, or ADMIN level)
    const vault = await prisma.vault.findFirst({
      where: {
        id: vaultId,
        OR: [
          {
            permissions: {
              some: {
                userId,
                permissionLevel: {
                  in: ["USE" as const, "EDIT" as const, "ADMIN" as const],
                },
              },
            },
          },
          {
            permissions: { some: { team: {
                  members: {
                    some: {
                      userId,
                    },
                  },
                },
                permissionLevel: {
                  in: ["USE" as const, "EDIT" as const, "ADMIN" as const],
                },
              },
            },
          },
        ],
      },
    });

    if (!vault) {
      throw new NotFoundError(
        ErrorCode.VAULT_NOT_FOUND,
        "Vault not found or insufficient permissions",
      );
    }

    const updateData: Partial<{ name: string; description: string | null }> =
      {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const updatedVault = await prisma.vault.update({
      where: { id: vaultId },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await createAuditLog({
      userId,
      action: "UPDATE",
      resourceType: "VAULT",
      resourceId: vaultId,
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
      details: { changes: updateData },
    });

    return { vault: updatedVault };
  },

  /**
   * Delete a vault
   */
  async deleteVault(
    userId: string,
    vaultId: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { ipAddress, userAgent } = auditData;

    const prisma = getPrismaClient();

    // Check if user has delete permission (ADMIN level required)
    const vault = await prisma.vault.findFirst({
      where: {
        id: vaultId,
        OR: [
          {
            permissions: {
              some: {
                userId,
                permissionLevel: "ADMIN" as const,
              },
            },
          },
          {
            permissions: { some: { team: {
                  members: {
                    some: {
                      userId,
                    },
                  },
                },
                permissionLevel: "ADMIN" as const,
              },
            },
          },
        ],
      },
      include: {
        _count: {
          select: {
            keys: true,
          },
        },
      },
    });

    if (!vault) {
      throw new NotFoundError(
        ErrorCode.VAULT_NOT_FOUND,
        "Vault not found or insufficient permissions",
      );
    }

    // Delete vault (cascade will handle keys and permissions)
    await prisma.vault.delete({
      where: { id: vaultId },
    });

    await createAuditLog({
      userId,
      action: "DELETE",
      resourceType: "VAULT",
      resourceId: vaultId,
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
      details: { vaultName: vault.name },
    });

    return { success: true };
  },

  /**
   * Grant vault permissions to a user
   */
  async grantUserPermission(
    userId: string,
    vaultId: string,
    data: {
      targetUserId: string;
      permissionLevel: string;
    },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { targetUserId, permissionLevel } = data;
    const { ipAddress, userAgent } = auditData;

    if (!targetUserId || !permissionLevel) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "User ID and permission level are required",
      );
    }

    const prisma = getPrismaClient();
    const vault = await requireVaultAdmin(userId, vaultId);

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND);
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: vault.organizationId,
          userId: targetUserId,
        },
      },
    });

    if (!membership) {
      throw new AuthorizationError(
        ErrorCode.NOT_ORGANIZATION_MEMBER,
        "User must be an organization member to receive vault permissions",
      );
    }

    // Create or update permission
    const permission = await prisma.vaultBinding.upsert({
      where: {
        userId_vaultId: {
          vaultId,
          userId: targetUserId,
        },
      },
      create: {
        vaultId,
        userId: targetUserId,
        permissionLevel: permissionLevel as PermissionLevel,
      },
      update: {
        permissionLevel: permissionLevel as PermissionLevel,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await createAuditLog({
      userId,
      action: "UPDATE",
      resourceType: "VAULT",
      resourceId: vaultId,
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
      details: { targetUserId, permissionLevel },
    });

    return { permission };
  },

  /**
   * Revoke vault permissions from a user
   */
  async revokeUserPermission(
    userId: string,
    vaultId: string,
    targetUserId: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { ipAddress, userAgent } = auditData;

    const prisma = getPrismaClient();
    await requireVaultAdmin(userId, vaultId);

    // Delete permission
    await prisma.vaultBinding.delete({
      where: {
        userId_vaultId: {
          vaultId,
          userId: targetUserId,
        },
      },
    });

    await createAuditLog({
      userId,
      action: "DELETE",
      resourceType: "VAULT",
      resourceId: vaultId,
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
      details: { targetUserId },
    });

    return { success: true };
  },

  /**
   * Grant vault permissions to a team (team)
   */
  async grantTeamPermission(
    userId: string,
    vaultId: string,
    data: {
      targetTeamId: string;
      permissionLevel: string;
    },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { targetTeamId, permissionLevel } = data;
    const { ipAddress, userAgent } = auditData;

    if (!targetTeamId || !permissionLevel) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Team ID and permission level are required",
      );
    }

    const prisma = getPrismaClient();
    const vault = await requireVaultAdmin(userId, vaultId);

    const team = await prisma.team.findFirst({
      where: {
        id: targetTeamId,
        organizationId: vault.organizationId,
      },
    });

    if (!team) {
      throw new NotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        "Team not found in this organization",
      );
    }

    const permission = await prisma.vaultBinding.upsert({
      where: {
        teamId_vaultId: {
          teamId: targetTeamId,
          vaultId,
        },
      },
      create: {
        vaultId,
        teamId: targetTeamId,
        permissionLevel: permissionLevel as PermissionLevel,
      },
      update: {
        permissionLevel: permissionLevel as PermissionLevel,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
      },
    });

    await createAuditLog({
      userId,
      action: "UPDATE",
      resourceType: "VAULT",
      resourceId: vaultId,
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
      details: { targetTeamId, permissionLevel },
    });

    return { permission };
  },

  /**
   * Revoke vault permissions from a team (team)
   */
  async revokeTeamPermission(
    userId: string,
    vaultId: string,
    targetTeamId: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { ipAddress, userAgent } = auditData;
    const prisma = getPrismaClient();
    await requireVaultAdmin(userId, vaultId);

    await prisma.vaultBinding.delete({
      where: {
        teamId_vaultId: {
          teamId: targetTeamId,
          vaultId,
        },
      },
    });

    await createAuditLog({
      userId,
      action: "DELETE",
      resourceType: "VAULT",
      resourceId: vaultId,
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
      details: { targetTeamId },
    });

    return { success: true };
  },
};
