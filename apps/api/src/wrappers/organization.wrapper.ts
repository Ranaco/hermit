/**
 * Organization Wrapper
 * Contains business logic for organization management and membership
 */

import {
  AuthenticationError,
  ValidationError,
  ErrorCode,
  NotFoundError,
  AuthorizationError,
  ConflictError,
} from "@hermes/error-handling";
import { Role } from "@hermes/prisma";
import getPrismaClient from "../services/prisma.service";
import { createAuditLog } from "../services/audit.service";

export const organizationWrapper = {
  /**
   * Create a new organization
   */
  async createOrganization(
    userId: string,
    data: {
      name: string;
      description?: string;
    },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { name, description } = data;
    const { ipAddress, userAgent } = auditData;

    if (!name) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Organization name is required",
      );
    }

    const prisma = getPrismaClient();

    // Create organization with default vault in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name,
          description,
          members: {
            create: {
              userId,
              role: "OWNER",
              onboardingStatus: "in_progress",
              onboardingStep: 1,
            },
          },
        },
        include: {
          members: {
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
          },
        },
      });

      // Auto-create default vault for the organization
      const defaultVault = await tx.vault.create({
        data: {
          name: "Default Vault",
          description: "Your default secure vault",
          organizationId: organization.id,
          createdById: userId,
          permissions: {
            create: {
              userId,
              permissionLevel: "ADMIN",
            },
          },
        },
      });

      return { organization, defaultVault };
    });

    await createAuditLog({
      userId,
      action: "CREATE",
      resourceType: "ORGANIZATION",
      resourceId: result.organization.id,
      details: { name, description, defaultVault: result.defaultVault.id },
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
    });

    return { organization: result.organization, vault: result.defaultVault };
  },

  /**
   * Get organizations user is a member of
   */
  async getOrganizations(userId: string) {
    const prisma = getPrismaClient();

    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
      },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                vaults: true,
              },
            },
          },
        },
      },
    });

    const organizations = memberships.map((m) => ({
      ...m.organization,
      userRole: m.role,
    }));

    return { organizations };
  },

  /**
   * Get a specific organization
   */
  async getOrganization(userId: string, organizationId: string) {
    const prisma = getPrismaClient();

    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                vaults: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND);
    }

    return {
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        description: membership.organization.description,
        createdAt: membership.organization.createdAt,
        updatedAt: membership.organization.updatedAt,
        _count: membership.organization._count,
        userRole: membership.role,
      },
    };
  },

  /**
   * Get organization members with pagination
   */
  async getMembers(
    userId: string,
    organizationId: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
    },
  ) {
    const { page = 1, limit = 20, search } = params;
    const prisma = getPrismaClient();

    // Check membership
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
    });

    if (!membership) {
      throw new AuthorizationError(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const where = {
      organizationId,
      ...(search
        ? {
            user: {
              OR: [
                { email: { contains: search, mode: "insensitive" } as any },
                { firstName: { contains: search, mode: "insensitive" } as any },
                { lastName: { contains: search, mode: "insensitive" } as any },
                { username: { contains: search, mode: "insensitive" } as any },
              ],
            },
          }
        : {}),
    };

    const [members, total] = await Promise.all([
      prisma.organizationMember.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.organizationMember.count({ where }),
    ]);

    return {
      members,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Update organization
   */
  async updateOrganization(
    userId: string,
    organizationId: string,
    data: {
      name?: string;
      description?: string;
    },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { name, description } = data;
    const { ipAddress, userAgent } = auditData;

    const prisma = getPrismaClient();

    // Check if user is admin or owner
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        role: {
          in: ["ADMIN", "OWNER"],
        },
      },
    });

    if (!membership) {
      throw new AuthorizationError(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    await createAuditLog({
      userId,
      action: "UPDATE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: { name, description },
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
    });

    return { organization };
  },

  /**
   * Delete organization
   */
  async deleteOrganization(
    userId: string,
    organizationId: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { ipAddress, userAgent } = auditData;

    const prisma = getPrismaClient();

    // Only owners can delete
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        role: "OWNER",
      },
    });

    if (!membership) {
      throw new AuthorizationError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Only owners can delete organizations",
      );
    }

    await prisma.organization.delete({
      where: { id: organizationId },
    });

    await createAuditLog({
      userId,
      action: "DELETE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: {},
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
    });

    return { success: true };
  },

  /**
   * Invite user to organization
   */
  async inviteUser(
    userId: string,
    organizationId: string,
    data: {
      email: string;
      role?: string;
    },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { email, role = "MEMBER" } = data;
    const { ipAddress, userAgent } = auditData;

    if (!email) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Email is required",
      );
    }

    const prisma = getPrismaClient();

    // Check if user is admin or owner
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        role: {
          in: ["ADMIN", "OWNER"],
        },
      },
    });

    if (!membership) {
      throw new AuthorizationError(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!targetUser) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "User not found");
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: targetUser.id,
      },
    });

    if (existingMember) {
      throw new ConflictError(
        ErrorCode.VALIDATION_ERROR,
        "User is already a member",
      );
    }

    // Add user to organization
    const newMember = await prisma.organizationMember.create({
      data: {
        organizationId,
        userId: targetUser.id,
        role: role as Role,
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
      action: "CREATE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: { userId: targetUser.id, role },
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
    });

    return { member: newMember };
  },

  /**
   * Remove member from organization
   */
  async removeMember(
    userId: string,
    organizationId: string,
    targetUserId: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { ipAddress, userAgent } = auditData;

    const prisma = getPrismaClient();

    // Check if user is admin or owner
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        role: {
          in: ["ADMIN", "OWNER"],
        },
      },
    });

    if (!membership) {
      throw new AuthorizationError(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Check if target is the last owner
    if (targetUserId !== userId) {
      const targetMembership = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          userId: targetUserId,
        },
      });

      if (targetMembership?.role === "OWNER") {
        const ownerCount = await prisma.organizationMember.count({
          where: {
            organizationId,
            role: "OWNER",
          },
        });

        if (ownerCount <= 1) {
          throw new ConflictError(
            ErrorCode.PERMISSION_DENIED,
            "Cannot remove the last owner. Transfer ownership first.",
          );
        }
      }
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
    });

    await createAuditLog({
      userId,
      action: "DELETE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: { removedUserId: targetUserId },
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
    });

    return { success: true };
  },

  /**
   * Update member role
   */
  async updateMemberRole(
    userId: string,
    organizationId: string,
    targetUserId: string,
    role: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { ipAddress, userAgent } = auditData;

    if (!role) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Role is required");
    }

    const prisma = getPrismaClient();

    // Only owners can change roles
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        role: "OWNER",
      },
    });

    if (!membership) {
      throw new AuthorizationError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Only owners can change member roles",
      );
    }

    const updatedMember = await prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
      data: { role: role as Role },
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
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: { targetUserId, newRole: role },
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
    });

    return { member: updatedMember };
  },
};
