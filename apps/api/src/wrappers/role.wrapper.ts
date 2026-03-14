import {
  AuthorizationError,
  ConflictError,
  ErrorCode,
  NotFoundError,
  ValidationError,
} from "@hermes/error-handling";
import { AuditAction, ResourceType } from "@hermes/prisma";
import getPrismaClient from "../services/prisma.service";
import { createAuditLog } from "../services/audit.service";
import { evaluateAccess } from "../services/policy-engine";
import {
  buildMemberUrn,
  buildRoleUrn,
  buildTeamUrn,
  ensureOrganizationIamBootstrap,
} from "../services/organization-iam.service";

async function requireRoleAction(
  userId: string,
  organizationId: string,
  action: string,
  resourceUrn: string,
  message: string,
) {
  await ensureOrganizationIamBootstrap(organizationId);

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

  const allowed = await evaluateAccess(userId, organizationId, action, resourceUrn);
  if (!allowed) {
    throw new AuthorizationError(ErrorCode.INSUFFICIENT_PERMISSIONS, message);
  }
}

async function validatePolicyIds(organizationId: string, policyIds?: string[]) {
  if (!policyIds || policyIds.length === 0) {
    return;
  }

  const prisma = getPrismaClient();
  const count = await prisma.policy.count({
    where: {
      organizationId,
      id: { in: policyIds },
    },
  });

  if (count !== policyIds.length) {
    throw new ValidationError("One or more policies do not belong to this organization");
  }
}

export const roleWrapper = {
  async getRoles(userId: string, organizationId: string) {
    await requireRoleAction(
      userId,
      organizationId,
      "roles:read",
      buildRoleUrn(organizationId, "*"),
      "You do not have permission to view organization roles",
    );

    const prisma = getPrismaClient();
    const roles = await prisma.organizationRole.findMany({
      where: { organizationId },
      include: {
        policyAttachments: {
          include: {
            policy: {
              select: { id: true, name: true, description: true, isManaged: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { roles };
  },

  async createRole(
    userId: string,
    organizationId: string,
    data: {
      name: string;
      description?: string | null;
      policyIds?: string[];
    },
    auditInfo: { ipAddress?: string; userAgent?: string },
  ) {
    await requireRoleAction(
      userId,
      organizationId,
      "roles:create",
      buildRoleUrn(organizationId, "*"),
      "You do not have permission to create organization roles",
    );

    await validatePolicyIds(organizationId, data.policyIds);

    const prisma = getPrismaClient();
    const role = await prisma.organizationRole.create({
      data: {
        organizationId,
        name: data.name.trim(),
        description: data.description ?? undefined,
        policyAttachments: data.policyIds?.length
          ? {
              create: data.policyIds.map((policyId) => ({ policyId })),
            }
          : undefined,
      },
      include: {
        policyAttachments: {
          include: {
            policy: true,
          },
        },
      },
    });

    await createAuditLog({
      userId,
      action: AuditAction.CREATE,
      resourceType: ResourceType.ORGANIZATION,
      resourceId: role.id,
      details: {
        type: "role",
        roleName: role.name,
        organizationId,
        policyIds: data.policyIds || [],
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return { role };
  },

  async updateRole(
    userId: string,
    organizationId: string,
    roleId: string,
    data: {
      name?: string;
      description?: string | null;
      policyIds?: string[];
    },
    auditInfo: { ipAddress?: string; userAgent?: string },
  ) {
    await requireRoleAction(
      userId,
      organizationId,
      "roles:update",
      buildRoleUrn(organizationId, roleId),
      "You do not have permission to update organization roles",
    );

    const prisma = getPrismaClient();
    const existingRole = await prisma.organizationRole.findUnique({
      where: { id: roleId },
    });

    if (!existingRole || existingRole.organizationId !== organizationId) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Role not found in this organization");
    }

    if (existingRole.isDefault) {
      throw new ValidationError("Default system roles cannot be modified");
    }

    await validatePolicyIds(organizationId, data.policyIds);

    const updatedRole = await prisma.organizationRole.update({
      where: { id: roleId },
      data: {
        name: data.name?.trim(),
        description: data.description !== undefined ? data.description : undefined,
        policyAttachments: data.policyIds
          ? {
              deleteMany: {},
              create: data.policyIds.map((policyId) => ({ policyId })),
            }
          : undefined,
      },
      include: {
        policyAttachments: {
          include: {
            policy: true,
          },
        },
      },
    });

    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      resourceType: ResourceType.ORGANIZATION,
      resourceId: roleId,
      details: {
        type: "role",
        organizationId,
        updatedFields: Object.keys(data),
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return { role: updatedRole };
  },

  async assignUserRole(
    userId: string,
    organizationId: string,
    memberId: string,
    roleId: string,
    auditInfo: { ipAddress?: string; userAgent?: string },
  ) {
    await requireRoleAction(
      userId,
      organizationId,
      "roles:assign",
      buildMemberUrn(organizationId, memberId),
      "You do not have permission to assign organization roles",
    );

    const prisma = getPrismaClient();
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: { role: true },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Member not found in this organization");
    }

    const role = await prisma.organizationRole.findUnique({
      where: { id: roleId },
    });

    if (!role || role.organizationId !== organizationId) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Role not found in this organization");
    }

    if (member.role?.name === "OWNER" && role.name !== "OWNER") {
      const ownerRole = await prisma.organizationRole.findFirst({
        where: { organizationId, name: "OWNER" },
        select: { id: true },
      });

      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId, roleId: ownerRole?.id },
      });

      if (ownerCount <= 1) {
        throw new ConflictError("Cannot demote the last organization owner");
      }
    }

    const updatedMember = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { roleId },
      include: { role: true },
    });

    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      resourceType: ResourceType.ORGANIZATION,
      resourceId: roleId,
      details: {
        type: "role-assignment",
        organizationId,
        targetMemberId: memberId,
        assignedRoleId: roleId,
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return { member: updatedMember };
  },

  async assignTeamRole(
    userId: string,
    organizationId: string,
    teamId: string,
    roleId: string,
    auditInfo: { ipAddress?: string; userAgent?: string },
  ) {
    await requireRoleAction(
      userId,
      organizationId,
      "roles:assign",
      buildTeamUrn(organizationId, teamId),
      "You do not have permission to assign team roles",
    );

    const prisma = getPrismaClient();
    const [team, role] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamId } }),
      prisma.organizationRole.findUnique({ where: { id: roleId } }),
    ]);

    if (!team || team.organizationId !== organizationId) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Team not found in this organization");
    }

    if (!role || role.organizationId !== organizationId) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Role not found in this organization");
    }

    const assignment = await prisma.teamRoleAssignment.upsert({
      where: {
        teamId_roleId: {
          teamId,
          roleId,
        },
      },
      update: {},
      create: {
        teamId,
        roleId,
      },
      include: {
        role: true,
      },
    });

    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      resourceType: ResourceType.ORGANIZATION,
      resourceId: roleId,
      details: {
        type: "team-role-assignment",
        organizationId,
        teamId,
        assignedRoleId: roleId,
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return { assignment };
  },
};
