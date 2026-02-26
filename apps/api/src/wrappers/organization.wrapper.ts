/**
 * Organization Wrapper
 * Business logic for organizations, members, invitations, and teams.
 */

import crypto from "crypto";
import {
  ValidationError,
  ErrorCode,
  NotFoundError,
  AuthorizationError,
  ConflictError,
} from "@hermes/error-handling";
import getPrismaClient from "../services/prisma.service";
import { createAuditLog } from "../services/audit.service";
import { RolePermissions } from "../constants/permissions";

const ADMIN_ROLES: string[] = ["ADMIN", "OWNER"];

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function requireMembership(userId: string, organizationId: string) {
  const prisma = getPrismaClient();
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: { role: true },
  });

  if (!membership) {
    throw new AuthorizationError(
      ErrorCode.NOT_ORGANIZATION_MEMBER,
      "You are not a member of this organization",
    );
  }

  return membership;
}

async function requireOrgAdmin(userId: string, organizationId: string) {
  const membership = await requireMembership(userId, organizationId);
  if (!membership.role || !ADMIN_ROLES.includes(membership.role.name)) {
    throw new AuthorizationError(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      "Admin or Owner role required",
    );
  }
  return membership;
}

export const organizationWrapper = {
  async createOrganization(
    userId: string,
    data: { name: string; description?: string },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { name, description } = data;

    if (!name?.trim()) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Organization name is required",
      );
    }

    const prisma = getPrismaClient();

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: name.trim(),
          slug: `${toSlug(name)}-${crypto.randomBytes(3).toString("hex")}`,
          description,
        },
      });

      const ownerRole = await tx.organizationRole.create({
        data: {
          organizationId: organization.id,
          name: "OWNER",
          description: "Full administrative access",
          permissions: RolePermissions["OWNER"],
          isDefault: false,
        },
      });

      await tx.organizationRole.createMany({
        data: [
          {
            organizationId: organization.id,
            name: "ADMIN",
            description: "Administrative access",
            permissions: RolePermissions["ADMIN"],
            isDefault: false,
          },
          {
            organizationId: organization.id,
            name: "MEMBER",
            description: "Standard member access",
            permissions: RolePermissions["MEMBER"],
            isDefault: true,
          },
        ],
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          roleId: ownerRole.id,
          onboardingState: "IN_PROGRESS",
          onboardingStep: 1,
        },
      });

      const defaultVault = await tx.vault.create({
        data: {
          name: "Default Vault",
          description: "Default secure vault",
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
      details: { name, defaultVaultId: result.defaultVault.id },
      ipAddress: auditData.ipAddress || "unknown",
      userAgent: auditData.userAgent || "unknown",
    });

    return { organization: result.organization, vault: result.defaultVault };
  },

  async getOrganizations(userId: string) {
    const prisma = getPrismaClient();

    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        role: true,
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                vaults: true,
                teams: true,
              },
            },
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
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      organizations: memberships.map((m) => ({
        ...m.organization,
        userRole: m.role?.name,
      })),
    };
  },

  async getOrganization(userId: string, organizationId: string) {
    const membership = await requireMembership(userId, organizationId);
    const prisma = getPrismaClient();

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            members: true,
            vaults: true,
            teams: true,
          },
        },
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
          orderBy: { createdAt: "asc" },
        },
        teams: {
          include: {
            _count: { select: { members: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!organization) {
      throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND);
    }

    return {
      organization: {
        ...organization,
        userRole: membership.role?.name,
      },
    };
  },

  async getMembers(
    userId: string,
    organizationId: string,
    params: { page?: number; limit?: number; search?: string },
  ) {
    await requireMembership(userId, organizationId);
    const prisma = getPrismaClient();

    const { page = 1, limit = 20, search } = params;
    const where = {
      organizationId,
      ...(search
        ? {
            user: {
              OR: [
                { email: { contains: search, mode: "insensitive" as const } },
                {
                  firstName: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  lastName: { contains: search, mode: "insensitive" as const },
                },
                {
                  username: { contains: search, mode: "insensitive" as const },
                },
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
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "asc" },
      }),
      prisma.organizationMember.count({ where }),
    ]);

    return {
      members,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async updateOrganization(
    userId: string,
    organizationId: string,
    data: { name?: string; description?: string },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    await requireOrgAdmin(userId, organizationId);
    const prisma = getPrismaClient();

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });

    await createAuditLog({
      userId,
      action: "UPDATE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: data,
      ipAddress: auditData.ipAddress || "unknown",
      userAgent: auditData.userAgent || "unknown",
    });

    return { organization };
  },

  async deleteOrganization(
    userId: string,
    organizationId: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const membership = await requireMembership(userId, organizationId);
    if (membership.role?.name !== "OWNER") {
      throw new AuthorizationError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Only owners can delete an organization",
      );
    }

    const prisma = getPrismaClient();
    await prisma.organization.delete({ where: { id: organizationId } });

    await createAuditLog({
      userId,
      action: "DELETE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: {},
      ipAddress: auditData.ipAddress || "unknown",
      userAgent: auditData.userAgent || "unknown",
    });

    return { success: true };
  },

  async inviteUser(
    userId: string,
    organizationId: string,
    data: { email: string; role?: string },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    await requireOrgAdmin(userId, organizationId);
    const prisma = getPrismaClient();

    const email = data.email.toLowerCase().trim();
    const role = data.role || "MEMBER";

    const existingInvite = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId,
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      throw new ConflictError(
        ErrorCode.VALIDATION_ERROR,
        "A pending invitation already exists for this email",
      );
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const targetUser = await prisma.user.findUnique({ where: { email } });
    const targetRole = await prisma.organizationRole.findFirst({ where: { organizationId, name: role } });

    let member: unknown = null;

    if (targetUser) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: targetUser.id,
          },
        },
      });

      if (existingMember) {
        throw new ConflictError(
          ErrorCode.VALIDATION_ERROR,
          "User is already a member of this organization",
        );
      }

      member = await prisma.organizationMember.create({
        data: {
          organizationId,
          userId: targetUser.id,
          roleId: targetRole?.id,
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
    }

    const invitation = await prisma.organizationInvitation.create({
      data: {
        email,
        organizationId,
        invitedById: userId,
        roleId: targetRole?.id,
        token,
        expiresAt,
        acceptedAt: targetUser ? new Date() : null,
      },
    });

    await createAuditLog({
      userId,
      action: "CREATE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: {
        type: "invitation",
        email,
        role,
        autoAccepted: !!targetUser,
      },
      ipAddress: auditData.ipAddress || "unknown",
      userAgent: auditData.userAgent || "unknown",
    });

    return { invitation, member };
  },

  async acceptInvitation(userId: string, token: string) {
    const prisma = getPrismaClient();

    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        token,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      throw new NotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        "Invitation token is invalid or expired",
      );
    }

    const existing = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
    });

    if (!existing) {
      await prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          roleId: invitation.roleId,
        },
      });
    }

    const updated = await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return { invitation: updated };
  },

  async removeMember(
    userId: string,
    organizationId: string,
    targetUserId: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    await requireOrgAdmin(userId, organizationId);
    const prisma = getPrismaClient();

    const target = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
      include: { role: true },
    });

    if (!target) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "Member not found");
    }

    if (target.role?.name === "OWNER") {
      const ownerRole = await prisma.organizationRole.findFirst({ where: { organizationId, name: "OWNER" }});
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId, roleId: ownerRole?.id },
      });

      if (ownerCount <= 1) {
        throw new ConflictError(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          "Cannot remove the last organization owner",
        );
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
      ipAddress: auditData.ipAddress || "unknown",
      userAgent: auditData.userAgent || "unknown",
    });

    return { success: true };
  },

  async updateMemberRole(
    userId: string,
    organizationId: string,
    targetUserId: string,
    role: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const membership = await requireMembership(userId, organizationId);
    if (membership.role?.name !== "OWNER") {
      throw new AuthorizationError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Only owners can update member roles",
      );
    }

    const prisma = getPrismaClient();
    const target = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
      include: { role: true },
    });

    if (!target) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "Member not found");
    }

    if (target.role?.name === "OWNER" && role !== "OWNER") {
      const ownerRole = await prisma.organizationRole.findFirst({ where: { organizationId, name: "OWNER" }});
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId, roleId: ownerRole?.id },
      });

      if (ownerCount <= 1) {
        throw new ConflictError(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          "Cannot demote the last owner",
        );
      }
    }

    const targetRole = await prisma.organizationRole.findFirst({ where: { organizationId, name: role } });
    if (!targetRole) throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Target role not found");

    const updatedMember = await prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
      data: { roleId: targetRole.id },
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
      details: { targetUserId, role },
      ipAddress: auditData.ipAddress || "unknown",
      userAgent: auditData.userAgent || "unknown",
    });

    return { member: updatedMember };
  },

  async getTeams(userId: string, organizationId: string) {
    await requireMembership(userId, organizationId);
    const prisma = getPrismaClient();

    const teams = await prisma.team.findMany({
      where: { organizationId },
      include: {
        _count: { select: { members: true } },
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
      orderBy: { createdAt: "asc" },
    });

    return { teams };
  },

  async createTeam(
    userId: string,
    organizationId: string,
    data: { name: string; description?: string },
  ) {
    await requireOrgAdmin(userId, organizationId);
    const prisma = getPrismaClient();

    const team = await prisma.team.create({
      data: {
        organizationId,
        name: data.name.trim(),
        description: data.description,
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return { team };
  },

  async updateTeam(
    userId: string,
    organizationId: string,
    teamId: string,
    data: { name?: string; description?: string },
  ) {
    await requireOrgAdmin(userId, organizationId);
    const prisma = getPrismaClient();

    const existingTeam = await prisma.team.findFirst({
      where: { id: teamId, organizationId },
      select: { id: true },
    });

    if (!existingTeam) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Team not found");
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return { team };
  },

  async deleteTeam(userId: string, organizationId: string, teamId: string) {
    await requireOrgAdmin(userId, organizationId);
    const prisma = getPrismaClient();

    const existingTeam = await prisma.team.findFirst({
      where: { id: teamId, organizationId },
      select: { id: true },
    });

    if (!existingTeam) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Team not found");
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    return { success: true };
  },

  async addTeamMember(
    userId: string,
    organizationId: string,
    teamId: string,
    targetUserId: string,
  ) {
    await requireOrgAdmin(userId, organizationId);
    const prisma = getPrismaClient();

    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId },
      select: { id: true },
    });

    if (!team) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Team not found");
    }

    const orgMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
    });

    if (!orgMember) {
      throw new ValidationError(
        ErrorCode.NOT_ORGANIZATION_MEMBER,
        "User must be an organization member before being added to a team",
      );
    }

    const membership = await prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
      create: {
        teamId,
        userId: targetUserId,
      },
      update: {},
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

    return { membership };
  },

  async removeTeamMember(
    userId: string,
    organizationId: string,
    teamId: string,
    targetUserId: string,
  ) {
    await requireOrgAdmin(userId, organizationId);
    const prisma = getPrismaClient();

    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId },
      select: { id: true },
    });

    if (!team) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Team not found");
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    return { success: true };
  },
};
