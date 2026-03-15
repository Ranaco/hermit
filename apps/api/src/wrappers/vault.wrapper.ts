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
} from "@hermit/error-handling";
import getPrismaClient from "../services/prisma.service";
import { createAuditLog } from "../services/audit.service";
import { hashPassword } from "../utils/password";

async function requireVaultAdmin(userId: string, vaultId: string) {
  const prisma = getPrismaClient();

  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
    include: {
      organization: true,
    },
  });

  if (!vault) {
    throw new NotFoundError(
      ErrorCode.VAULT_NOT_FOUND,
      "Vault not found",
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
      password?: string;
    },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { name, description, organizationId, password } = data;
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

    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    const vault = await prisma.vault.create({
      data: {
        name,
        description,
        passwordHash,
        organization: {
          connect: { id: organizationId },
        },
        createdBy: {
          connect: { id: userId },
        },
      },
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
      organizationId,
      vaultId: vault.id,
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

    const orgMemberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: { role: true },
    });
    
    const orgIds = orgMemberships.map(m => m.organizationId);

    if (organizationId && !orgIds.includes(organizationId)) {
        return { vaults: [] };
    }

    const whereClause = {
      organizationId: organizationId ? organizationId : { in: orgIds },
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

    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
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
      password?: string;
    },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { name, description, password } = data;
    const { ipAddress, userAgent } = auditData;

    const prisma = getPrismaClient();

    // Check if vault exists
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId }
    });

    if (!vault) {
      throw new NotFoundError(
        ErrorCode.VAULT_NOT_FOUND,
        "Vault not found",
      );
    }

    const updateData: Partial<{ name: string; description: string | null; passwordHash: string | null }> =
      {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (password !== undefined) {
      updateData.passwordHash = password ? await hashPassword(password) : null;
    }

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
      organizationId: updatedVault.organization.id,
      vaultId,
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

    // Check if vault exists
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
      include: {
        organization: {
          select: {
            id: true,
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
      throw new NotFoundError(
        ErrorCode.VAULT_NOT_FOUND,
        "Vault not found",
      );
    }

    // Delete vault (cascade will handle keys and permissions)
    await prisma.vault.delete({
      where: { id: vaultId },
    });

    await createAuditLog({
      userId,
      organizationId: vault.organization.id,
      vaultId,
      action: "DELETE",
      resourceType: "VAULT",
      resourceId: vaultId,
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
      details: { vaultName: vault.name },
    });

    return { success: true };
  },

};
