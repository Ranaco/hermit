import {
  ValidationError,
  ErrorCode,
  NotFoundError,
} from "@hermes/error-handling";
import getPrismaClient from "../services/prisma.service";
import { createAuditLog } from "../services/audit.service";

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

    if (parentId) {
      const parent = await prisma.secretGroup.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.vaultId !== vaultId) {
        throw new ValidationError(
          ErrorCode.VALIDATION_ERROR,
          "Parent Secret Group not found in this vault",
        );
      }
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
        name,
        description,
        vaultId,
        parentId,
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
    },
  ) {
    const { vaultId, parentId } = data;
    const prisma = getPrismaClient();

    const where: any = { vaultId };

    if (parentId !== undefined) {
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

    return groups;
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
