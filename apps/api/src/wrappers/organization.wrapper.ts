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
} from "@hermit/error-handling";
import getPrismaClient from "../services/prisma.service";
import { createAuditLog } from "../services/audit.service";
import { evaluateAccess } from "../services/policy-engine";
import {
  buildInvitationUrn,
  buildMemberUrn,
  buildOrganizationUrn,
  buildTeamUrn,
  ensureOrganizationIamBootstrap,
} from "../services/organization-iam.service";
import { RolePermissions } from "../constants/permissions";

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

async function requireOrganizationAction(
  userId: string,
  organizationId: string,
  action: string,
  resourceUrn: string,
  message: string,
) {
  await requireMembership(userId, organizationId);
  await ensureOrganizationIamBootstrap(organizationId);

  const allowed = await evaluateAccess(userId, organizationId, action, resourceUrn);
  if (!allowed) {
    throw new AuthorizationError(ErrorCode.INSUFFICIENT_PERMISSIONS, message);
  }
}

type InvitationRecord = {
  id: string;
  token: string;
  email: string;
  organizationId: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  organization: {
    id: string;
    name: string;
  };
  invitedBy: {
    id: string;
    email: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  role: {
    id: string;
    name: string;
  } | null;
};

function formatInvitation(invitation: InvitationRecord) {
  return {
    id: invitation.id,
    token: invitation.token,
    email: invitation.email,
    organizationId: invitation.organizationId,
    organizationName: invitation.organization.name,
    roleId: invitation.role?.id ?? null,
    roleName: invitation.role?.name ?? null,
    invitedBy: {
      id: invitation.invitedBy.id,
      email: invitation.invitedBy.email,
      username: invitation.invitedBy.username,
      firstName: invitation.invitedBy.firstName,
      lastName: invitation.invitedBy.lastName,
    },
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
  };
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
        },
      });

      return { organization, defaultVault };
    });

    await createAuditLog({
      userId,
      organizationId: result.organization.id,
      vaultId: result.defaultVault.id,
      action: "CREATE",
      resourceType: "ORGANIZATION",
      resourceId: result.organization.id,
      details: { name, defaultVaultId: result.defaultVault.id },
      ipAddress: auditData.ipAddress || "unknown",
      userAgent: auditData.userAgent || "unknown",
    });

    await ensureOrganizationIamBootstrap(result.organization.id);

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
    await requireOrganizationAction(
      userId,
      organizationId,
      "organizations:read",
      buildOrganizationUrn(organizationId),
      "You do not have access to this organization",
    );
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
    await requireOrganizationAction(
      userId,
      organizationId,
      "organizations:members:read",
      buildMemberUrn(organizationId, "*"),
      "You do not have permission to view organization members",
    );
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
    await requireOrganizationAction(
      userId,
      organizationId,
      "organizations:update",
      buildOrganizationUrn(organizationId),
      "You do not have permission to update this organization",
    );
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
      organizationId,
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
    await requireOrganizationAction(
      userId,
      organizationId,
      "organizations:delete",
      buildOrganizationUrn(organizationId),
      "You do not have permission to delete this organization",
    );

    const prisma = getPrismaClient();
    await prisma.organization.delete({ where: { id: organizationId } });

    await createAuditLog({
      userId,
      organizationId,
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
    data: { email: string; roleId?: string },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    await requireOrganizationAction(
      userId,
      organizationId,
      "organizations:invitations:create",
      buildInvitationUrn(organizationId, "*"),
      "You do not have permission to invite organization members",
    );
    const prisma = getPrismaClient();

    const email = data.email.toLowerCase().trim();

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
    
    let targetRole = null;
    if (data.roleId) {
      targetRole = await prisma.organizationRole.findFirst({
        where: { id: data.roleId, organizationId },
      });
    } else {
      targetRole = await prisma.organizationRole.findFirst({
        where: { organizationId, isDefault: true },
      });
    }

    if (data.roleId && !targetRole) {
      throw new NotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        "Target role not found in this organization",
      );
    }

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
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
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
      action: "CREATE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: {
        type: "invitation",
        email,
        role: targetRole?.name,
        autoAccepted: !!targetUser,
      },
      ipAddress: auditData.ipAddress || "unknown",
      userAgent: auditData.userAgent || "unknown",
    });

    return { invitation: formatInvitation(invitation), member };
  },

  async getMyPendingInvitations(userId: string, email: string) {
    const prisma = getPrismaClient();

    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        email: email.toLowerCase().trim(),
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      invitations: invitations.map(formatInvitation),
    };
  },

  async getOrganizationInvitations(userId: string, organizationId: string) {
    await requireOrganizationAction(
      userId,
      organizationId,
      "organizations:invitations:read",
      buildInvitationUrn(organizationId, "*"),
      "You do not have permission to view organization invitations",
    );

    const prisma = getPrismaClient();
    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      invitations: invitations.map(formatInvitation),
    };
  },

  async acceptInvitation(user: { id: string; email: string }, token: string) {
    const prisma = getPrismaClient();

    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        token,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        "Invitation token is invalid or expired",
      );
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new AuthorizationError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "This invitation was issued for a different email address",
      );
    }

    const existing = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
    });

    if (!existing) {
      await prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: user.id,
          roleId: invitation.roleId,
        },
      });
    }

    const updated = await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: invitation.organizationId,
      action: "UPDATE",
      resourceType: "ORGANIZATION",
      resourceId: invitation.organizationId,
      details: {
        type: "invitation-accepted",
        invitationId: invitation.id,
        email: invitation.email,
        role: invitation.role?.name ?? null,
      },
    });

    return { invitation: updated };
  },

  async revokeInvitation(
    userId: string,
    organizationId: string,
    invitationId: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    await requireOrganizationAction(
      userId,
      organizationId,
      "organizations:invitations:revoke",
      buildInvitationUrn(organizationId, invitationId),
      "You do not have permission to revoke organization invitations",
    );

    const prisma = getPrismaClient();
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        "Invitation not found",
      );
    }

    if (invitation.acceptedAt) {
      throw new ConflictError(
        ErrorCode.VALIDATION_ERROR,
        "Accepted invitations cannot be revoked",
      );
    }

    if (invitation.revokedAt || invitation.expiresAt <= new Date()) {
      throw new ConflictError(
        ErrorCode.VALIDATION_ERROR,
        "Invitation is no longer pending",
      );
    }

    const revokedInvitation = await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
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
      action: "DELETE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: {
        type: "invitation-revoked",
        invitationId,
        email: invitation.email,
        role: invitation.role?.name ?? null,
      },
      ipAddress: auditData.ipAddress || "unknown",
      userAgent: auditData.userAgent || "unknown",
    });

    return {
      invitation: formatInvitation(revokedInvitation),
    };
  },

  async removeMember(
    userId: string,
    organizationId: string,
    targetUserId: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    await requireOrganizationAction(
      userId,
      organizationId,
      "organizations:members:delete",
      buildMemberUrn(organizationId, targetUserId),
      "You do not have permission to remove organization members",
    );
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
      organizationId,
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
    roleId: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    await requireOrganizationAction(
      userId,
      organizationId,
      "roles:assign",
      buildMemberUrn(organizationId, targetUserId),
      "You do not have permission to update member roles",
    );

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

    const targetRole = await prisma.organizationRole.findUnique({ where: { id: roleId } });
    if (!targetRole) throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Target role not found");

    if (target.role?.name === "OWNER" && targetRole.name !== "OWNER") {
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
      organizationId,
      action: "UPDATE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: { targetUserId, role: targetRole.name },
      ipAddress: auditData.ipAddress || "unknown",
      userAgent: auditData.userAgent || "unknown",
    });

    return { member: updatedMember };
  },

  async getTeams(userId: string, organizationId: string) {
    await requireOrganizationAction(
      userId,
      organizationId,
      "teams:read",
      buildTeamUrn(organizationId, "*"),
      "You do not have permission to view teams",
    );
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
    await requireOrganizationAction(
      userId,
      organizationId,
      "teams:create",
      buildTeamUrn(organizationId, "*"),
      "You do not have permission to create teams",
    );
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
    await requireOrganizationAction(
      userId,
      organizationId,
      "teams:update",
      buildTeamUrn(organizationId, teamId),
      "You do not have permission to update this team",
    );
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
    await requireOrganizationAction(
      userId,
      organizationId,
      "teams:delete",
      buildTeamUrn(organizationId, teamId),
      "You do not have permission to delete this team",
    );
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
    await requireOrganizationAction(
      userId,
      organizationId,
      "teams:members:update",
      buildTeamUrn(organizationId, teamId),
      "You do not have permission to manage team members",
    );
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
    await requireOrganizationAction(
      userId,
      organizationId,
      "teams:members:update",
      buildTeamUrn(organizationId, teamId),
      "You do not have permission to manage team members",
    );
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
